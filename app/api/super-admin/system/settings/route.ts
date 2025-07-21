import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const systemSettingsSchema = z.object({
  // Feature flags
  maintenanceMode: z.boolean(),
  newUserRegistration: z.boolean(),
  emailNotifications: z.boolean(),
  auditLogging: z.boolean(),
  
  // Limits and quotas
  maxUsersPerAgency: z.number().min(1).max(1000),
  maxRequestsPerUser: z.number().min(1).max(10000),
  maxFileUploadSize: z.number().min(1).max(100),
  
  // Email settings
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpFromEmail: z.string().email().optional(),
  
  // System messages
  maintenanceMessage: z.string().optional(),
  welcomeMessage: z.string().optional(),
  
  // API settings
  rateLimitPerMinute: z.number().min(1).max(1000),
  sessionTimeoutMinutes: z.number().min(5).max(1440), // 5 minutes to 24 hours
})

// Default system settings
const defaultSettings = {
  maintenanceMode: false,
  newUserRegistration: true,
  emailNotifications: true,
  auditLogging: true,
  maxUsersPerAgency: 50,
  maxRequestsPerUser: 1000,
  maxFileUploadSize: 10,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpFromEmail: '',
  maintenanceMessage: 'The system is currently under maintenance.Please try again later.',
  welcomeMessage: 'Welcome to our SEO management platform! Get started by exploring your dashboard.',
  rateLimitPerMinute: 60,
  sessionTimeoutMinutes: 480, // 8 hours
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    // Try to get settings from database, create if they don't exist
    let systemSettings = await prisma.system_settings.findFirst()
    
    if (!systemSettings) {
      // Create default settings
      systemSettings = await prisma.system_settings.create({
        data: defaultSettings
      })
    }

    return NextResponse.json({ settings: systemSettings })

  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = systemSettingsSchema.parse(body)

    // Check if settings exist, create or update accordingly
    const existingSettings = await prisma.system_settings.findFirst()
    
    let updatedSettings
    if (existingSettings) {
      updatedSettings = await prisma.system_settings.update({
        where: { id: existingSettings.id },
        data: validatedData
      })
    } else {
      updatedSettings = await prisma.system_settings.create({
        data: validatedData
      })
    }

    // Log the settings change for audit purposes
    if (validatedData.auditLogging) {
      try {
        await prisma.audit_logs.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            action: 'SYSTEM_SETTINGS_UPDATE',
            resource: 'SystemSettings',
            entityType: 'SystemSettings',
            entityId: updatedSettings.id,
            details: {
              changes: validatedData,
              timestamp: new Date().toISOString()
            },
            users: {
              connect: { id: session.user.id }
            }
          }
        })
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError)
        // Don't fail the request if audit logging fails
      }
    }

    return NextResponse.json({ 
      settings: updatedSettings,
      message: 'System settings updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

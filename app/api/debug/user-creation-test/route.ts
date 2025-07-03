import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailgun/client'
import { welcomeEmailTemplate } from '@/lib/mailgun/templates'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('mode') || 'check'

    if (testMode === 'check') {
      // Check current state of user creation process
      const recentUsers = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          onboardingCompleted: true,
          preferences: {
            select: {
              emailNotifications: true,
              requestCreated: true
            }
          },
          _count: {
            select: {
              requests: true
            }
          }
        }
      })

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        recentUsers: recentUsers.map(user => ({
          ...user,
          hasEmailPreferences: !!user.preferences,
          emailNotificationsEnabled: user.preferences?.emailNotifications ?? null,
          requestCreatedNotificationsEnabled: user.preferences?.requestCreated ?? null
        })),
        analysis: {
          totalRecentUsers: recentUsers.length,
          usersWithoutRequests: recentUsers.filter(u => u._count.requests === 0).length,
          usersWithoutOnboarding: recentUsers.filter(u => !u.onboardingCompleted).length,
          usersWithoutEmailPreferences: recentUsers.filter(u => !u.preferences).length
        },
        diagnosis: {
          issue: 'Users are created but may not receive invitation emails',
          possibleCauses: [
            'No invitation email sent during user creation',
            'Welcome emails only sent after first request creation',
            'Email preferences not initialized for new users',
            'Mailgun configuration issues'
          ]
        }
      })
    }

    if (testMode === 'simulate' && searchParams.get('email')) {
      // Simulate the invitation process
      const testEmail = searchParams.get('email')!
      const testUser = {
        id: 'test-invitation-' + Date.now(),
        name: 'Test Invitation User',
        email: testEmail
      }

      // Test welcome email template generation
      const welcomeTemplate = welcomeEmailTemplate(testUser as any)
      
      // Test direct email sending
      const directEmailResult = await sendEmail({
        to: testEmail,
        subject: '[TEST INVITATION] ' + welcomeTemplate.subject,
        html: welcomeTemplate.html,
        tags: ['test', 'invitation', 'debug']
      })

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        simulation: {
          testUser,
          welcomeTemplate: {
            subject: welcomeTemplate.subject,
            htmlLength: welcomeTemplate.html.length
          },
          directEmailResult,
          recommendation: directEmailResult 
            ? 'Email system works - need to add invitation emails to user creation process'
            : 'Email system not working - check Mailgun configuration'
        }
      })
    }

    return NextResponse.json({
      error: 'Invalid test mode',
      availableModes: ['check', 'simulate'],
      usage: {
        check: '/api/debug/user-creation-test?mode=check',
        simulate: '/api/debug/user-creation-test?mode=simulate&email=test@example.com'
      }
    }, { status: 400 })

  } catch (error) {
    logger.error('User creation test failed', error)
    return NextResponse.json({
      error: 'User creation test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
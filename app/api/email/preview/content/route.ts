import { NextRequest } from 'next/server'
import { contentAddedTemplate } from '@/lib/mailgun/content-notifications'
import { successResponse, errorResponse } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { taskType, title, url } = await request.json()
    
    // Mock data for demo
    const mockRequest = {
      id: 'demo-request',
      packageType: 'GOLD',
      pagesCompleted: 5,
      blogsCompleted: 10,
      gbpPostsCompleted: 20,
      improvementsCompleted: 3
    } as any
    
    const mockUser = {
      id: 'demo-user',
      name: 'Demo Dealership',
      email: 'demo@dealership.com'
    } as any
    
    const taskDetails = {
      title: title || getDemoTitle(taskType),
      type: taskType || 'page',
      url: url || getDemoUrl(taskType)
    }
    
    const emailContent = contentAddedTemplate(mockRequest, mockUser, taskDetails)
    
    return successResponse({ ...emailContent,
      previewUrl: `data:text/html;charset=utf-8,${encodeURIComponent(emailContent.html)}`,
      taskDetails
    })
  } catch (error) {
    return errorResponse('Failed to generate preview', 500)
  }
}

function getDemoTitle(taskType: string): string {
  switch (taskType) {
    case 'blog':
      return 'Winter Car Maintenance Tips for 2024'
    case 'gbp_post':
    case 'gbp-post':
      return 'Black Friday Special - 0% APR on All Models'
    case 'improvement':
      return 'Homepage Speed Optimization'
    case 'maintenance':
      return 'SSL Certificate Update'
    default:
      return '2024 Toyota Camry Deals in Chicago'
  }
}

function getDemoUrl(taskType: string): string {
  switch (taskType) {
    case 'blog':
      return 'https://dealership.com/blog/winter-maintenance-tips'
    case 'gbp_post':
    case 'gbp-post':
      return 'https://posts.gle/abc123'
    case 'improvement':
    case 'maintenance':
      return 'https://dealership.com'
    default:
      return 'https://dealership.com/2024-toyota-camry-chicago'
  }
}

// GET endpoint for quick demo without POST data
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const taskType = url.searchParams.get('type') || 'page'
  
  try {
    const mockRequest = {
      id: 'demo-request',
      packageType: 'GOLD',
      pagesCompleted: 5,
      blogsCompleted: 10,
      gbpPostsCompleted: 20,
      improvementsCompleted: 3
    } as any
    
    const mockUser = {
      id: 'demo-user',
      name: 'Demo Dealership',
      email: 'demo@dealership.com'
    } as any
    
    const taskDetails = {
      title: getDemoTitle(taskType),
      type: taskType,
      url: getDemoUrl(taskType)
    }
    
    const emailContent = contentAddedTemplate(mockRequest, mockUser, taskDetails)
    
    return new Response(emailContent.html, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  } catch (error) {
    return errorResponse('Failed to generate preview', 500)
  }
}

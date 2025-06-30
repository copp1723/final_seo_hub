import { useEffect, useState } from 'react'

export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null)
  
  useEffect(() => {
    // Get initial CSRF token
    fetchCSRFToken()
  }, [])
  
  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const token = response.headers.get('x-csrf-token')
        if (token) {
          setCSRFToken(token)
          // Store in memory (not localStorage for security)
          window.__CSRF_TOKEN__ = token
        }
      }
    } catch (error) {
      // Silently handle CSRF token fetch errors on client-side
    }
  }
  
  const getHeaders = (additionalHeaders?: HeadersInit): HeadersInit => {
    const token = csrfToken || window.__CSRF_TOKEN__
    
    return {
      ...additionalHeaders,
      ...(token ? { 'x-csrf-token': token } : {})
    }
  }
  
  const secureRequest = async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    const token = csrfToken || window.__CSRF_TOKEN__
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        ...(token ? { 'x-csrf-token': token } : {})
      },
      credentials: 'include'
    })
    
    // If CSRF token is invalid, try to refresh it
    if (response.status === 403) {
      const errorData = await response.json()
      if (errorData.error?.includes('CSRF')) {
        await fetchCSRFToken()
        // Retry the request with new token
        const newToken = window.__CSRF_TOKEN__
        if (newToken) {
          return fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'x-csrf-token': newToken
            },
            credentials: 'include'
          })
        }
      }
    }
    
    return response
  }
  
  return {
    csrfToken,
    getHeaders,
    secureRequest,
    refreshToken: fetchCSRFToken
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    __CSRF_TOKEN__?: string
  }
}
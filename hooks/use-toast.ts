import { useCallback } from 'react'
import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  title?: string
  description?: string
  duration?: number
}

// Direct toast function for use outside of React components
export const toast = (message: string, type: 'success' | 'error' | 'info' = 'info', options?: ToastOptions) => {
  const { title, description, duration } = options || {}
  
  switch (type) {
    case 'success':
      sonnerToast.success(title || message, {
        description,
        duration: duration || 4000
      })
      break
    case 'error':
      sonnerToast.error(title || message, {
        description,
        duration: duration || 5000
      })
      break
    default:
      sonnerToast(title || message, {
        description,
        duration: duration || 4000
      })
  }
}

export function useToast() {
  const toastFn = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', options?: ToastOptions) => {
    toast(message, type, options)
  }, [])

  return { toast: toastFn }
}

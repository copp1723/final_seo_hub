import { useState, useEffect, useCallback, useRef } from 'react'

interface UseAsyncState<T> {
  loading: boolean
  error: Error | null
  value: T | null
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): UseAsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<UseAsyncState<T>>({
    loading: false,
    error: null,
    value: null
  })

  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(async () => {
    setState({ loading: true, error: null, value: null })

    try {
      const response = await asyncFunction()
      if (mountedRef.current) {
        setState({ loading: false, error: null, value: response })
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ loading: false, error: error as Error, value: null })
      }
    }
  }, [asyncFunction])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return { ...state, execute }
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface TransitionState {
  isTransitioning: boolean
  previousData: any
  currentData: any
  transitionProgress: number
}

interface UseDashboardTransitionsProps {
  data: any
  dealershipId?: string
  transitionDuration?: number
}

export function useDashboardTransitions({
  data,
  dealershipId,
  transitionDuration = 800
}: UseDashboardTransitionsProps) {
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    previousData: null,
    currentData: data,
    transitionProgress: 0
  })
  
  const [isStale, setIsStale] = useState(false)
  const previousDealershipId = useRef<string | undefined>(dealershipId)
  const transitionTimer = useRef<NodeJS.Timeout>()
  const progressTimer = useRef<NodeJS.Timeout>()

  // Handle dealership changes
  useEffect(() => {
    if (dealershipId && previousDealershipId.current && dealershipId !== previousDealershipId.current) {
      // Mark current data as stale when dealership changes
      setIsStale(true)
      
      // Start transition
      setTransitionState(prev => ({
        ...prev,
        isTransitioning: true,
        previousData: prev.currentData,
        transitionProgress: 0
      }))

      // Animate transition progress
      let progress = 0
      const progressInterval = 50 // Update every 50ms
      const progressStep = (progressInterval / transitionDuration) * 100

      progressTimer.current = setInterval(() => {
        progress += progressStep
        if (progress >= 100) {
          progress = 100
          if (progressTimer.current) {
            clearInterval(progressTimer.current)
          }
        }
        
        setTransitionState(prev => ({
          ...prev,
          transitionProgress: Math.min(progress, 100)
        }))
      }, progressInterval)
    }
    
    previousDealershipId.current = dealershipId
  }, [dealershipId, transitionDuration])

  // Handle new data arriving
  useEffect(() => {
    if (data && data !== transitionState.currentData) {
      // Clear stale state when new data arrives
      setIsStale(false)
      
      // Update current data
      setTransitionState(prev => ({
        ...prev,
        currentData: data
      }))

      // End transition after animation completes
      if (transitionState.isTransitioning) {
        transitionTimer.current = setTimeout(() => {
          setTransitionState(prev => ({
            ...prev,
            isTransitioning: false,
            previousData: null,
            transitionProgress: 0
          }))
        }, transitionDuration)
      }
    }
  }, [data, transitionState.currentData, transitionState.isTransitioning, transitionDuration])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current)
      }
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
      }
    }
  }, [])

  const forceEndTransition = useCallback(() => {
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current)
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
    }
    
    setTransitionState(prev => ({
      ...prev,
      isTransitioning: false,
      previousData: null,
      transitionProgress: 0
    }))
    setIsStale(false)
  }, [])

  const getTransitionStyles = useCallback((element: 'card' | 'value' | 'container') => {
    if (!transitionState.isTransitioning) return {}

    const progress = transitionState.transitionProgress / 100
    const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic

    switch (element) {
      case 'container':
        return {
          transform: `scale(${0.98 + (0.02 * easeProgress)})`,
          opacity: 0.7 + (0.3 * easeProgress),
          transition: 'all 0.3s ease-out'
        }
      case 'card':
        return {
          transform: `translateY(${(1 - easeProgress) * 4}px)`,
          opacity: 0.8 + (0.2 * easeProgress),
          transition: 'all 0.4s ease-out'
        }
      case 'value':
        return {
          transform: `scale(${0.95 + (0.05 * easeProgress)})`,
          opacity: 0.6 + (0.4 * easeProgress),
          transition: 'all 0.2s ease-out'
        }
      default:
        return {}
    }
  }, [transitionState.isTransitioning, transitionState.transitionProgress])

  return {
    isTransitioning: transitionState.isTransitioning,
    isStale,
    previousData: transitionState.previousData,
    currentData: transitionState.currentData,
    transitionProgress: transitionState.transitionProgress,
    getTransitionStyles,
    forceEndTransition
  }
}
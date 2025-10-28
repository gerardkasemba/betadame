// hooks/useMarketRealtime.ts
import { useEffect, useRef, useState } from 'react'
import { marketRealtime, MarketUpdate, TradeUpdate, RealtimeCallbacks } from '@/lib/supabase/realtime'

export function useMarketRealtime(marketId: string | undefined, callbacks: RealtimeCallbacks) {
  const [isConnected, setIsConnected] = useState(false)
  const callbacksRef = useRef(callbacks)
  const marketTypeRef = useRef<'binary' | '3outcome' | null>(null)

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!marketId) return

    console.log('🎯 Setting up real-time for market:', marketId)

    const unsubscribe = marketRealtime.subscribeToMarket(marketId, {
      onMarketUpdate: (update) => {
        console.log('📡 Real-time market update received:', update)
        
        // CRITICAL: Validate and sanitize market update
        const sanitizedUpdate = sanitizeMarketUpdate(update, marketTypeRef.current)
        
        console.log('✅ Sanitized update:', sanitizedUpdate)
        
        callbacksRef.current.onMarketUpdate?.(sanitizedUpdate)
      },
      onTradeUpdate: (update) => {
        console.log('📡 Real-time trade update received:', update)
        callbacksRef.current.onTradeUpdate?.(update)
      },
      onError: (error) => {
        console.error('❌ Real-time error:', error)
        callbacksRef.current.onError?.(error)
      }
    })

    // Check connection status
    const checkConnection = setInterval(() => {
      setIsConnected(marketRealtime.getConnectionStatus())
    }, 1000)

    return () => {
      console.log('🧹 Cleaning up real-time for market:', marketId)
      unsubscribe()
      clearInterval(checkConnection)
      marketRealtime.unsubscribeFromMarket(marketId)
    }
  }, [marketId])

  return { isConnected }
}

// CRITICAL: Sanitize market updates to preserve market type
function sanitizeMarketUpdate(
  update: MarketUpdate, 
  currentMarketType: 'binary' | '3outcome' | null
): MarketUpdate {
  // If we have liquidity pool data in the update
  if (update.liquidity_pools) {
    const drawReserve = update.liquidity_pools.draw_reserve
    
    // Determine actual market type from draw_reserve
    const updateMarketType = drawReserve && drawReserve > 0.000001 ? '3outcome' : 'binary'
    
    // If no current type set, initialize it
    if (!currentMarketType) {
      currentMarketType = updateMarketType
    }
    
    console.log('🔍 Market type check in real-time update:', {
      currentMarketType,
      updateMarketType,
      draw_reserve: drawReserve,
      yes_reserve: update.liquidity_pools.yes_reserve,
      no_reserve: update.liquidity_pools.no_reserve
    })
    
    // CRITICAL: If market was binary, force draw_reserve to stay 0
    if (currentMarketType === 'binary') {
      if (updateMarketType === '3outcome') {
        console.warn('⚠️ PREVENTING BINARY → 3OUTCOME CONVERSION IN REAL-TIME UPDATE!')
        console.warn('   Original draw_reserve:', drawReserve)
        console.warn('   Forcing draw_reserve to 0')
      }
      
      return {
        ...update,
        liquidity_pools: {
          ...update.liquidity_pools,
          draw_reserve: 0 // Force to 0 for binary markets
        }
      }
    }
    
    // For 3-outcome markets, validate draw_reserve is positive
    if (currentMarketType === '3outcome') {
      if (updateMarketType === 'binary') {
        console.error('❌ 3-OUTCOME MARKET BECAME BINARY! This should not happen!')
        console.error('   draw_reserve was:', drawReserve)
        // Don't modify - let error bubble up
      }
    }
  }
  
  return update
}

// Hook for user positions
export function useUserPositionsRealtime(userId: string | undefined) {
  const [positions, setPositions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    console.log('🎯 Setting up real-time for user positions:', userId)
    setIsLoading(true)
    setError(null)

    const unsubscribe = marketRealtime.subscribeToUserPositions(userId, {
      onPositionUpdate: (position) => {
        console.log('📡 Position update received:', position)
        
        setPositions((prev) => {
          const existingIndex = prev.findIndex(p => p.id === position.id)

          if (position.eventType === 'DELETE') {
            console.log('🗑️ Removing position:', position.id)
            return prev.filter(p => p.id !== position.id)
          }

          if (existingIndex >= 0) {
            console.log('🔄 Updating existing position:', position.id)
            const updated = [...prev]
            updated[existingIndex] = position
            return updated
          } else {
            console.log('➕ Adding new position:', position.id)
            return [...prev, position]
          }
        })
        
        setIsLoading(false)
      },
      onError: (error) => {
        console.error('❌ Position real-time error:', error)
        setError(error.message || 'Real-time connection error')
        setIsLoading(false)
      }
    })

    // Initial load complete after first batch
    const initialLoadTimeout = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    // ✅ React expects cleanup to be synchronous
    return () => {
      console.log('🧹 Cleaning up real-time for user positions:', userId)
      clearTimeout(initialLoadTimeout)
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [userId])

  return { positions, isLoading, error }
}

// Hook for monitoring specific market type integrity
export function useMarketTypeIntegrity(marketId: string | undefined, expectedType: 'binary' | '3outcome') {
  const [violations, setViolations] = useState<string[]>([])
  
  useMarketRealtime(marketId, {
    onMarketUpdate: (update) => {
      if (!update.liquidity_pools) return
      
      const drawReserve = update.liquidity_pools.draw_reserve || 0
      const actualType = drawReserve > 0.000001 ? '3outcome' : 'binary'
      
      if (actualType !== expectedType) {
        const violation = `Market type violation detected! Expected ${expectedType} but got ${actualType} (draw_reserve: ${drawReserve})`
        console.error('🚨', violation)
        setViolations(prev => [...prev, `${new Date().toISOString()}: ${violation}`])
      }
    }
  })
  
  return violations
}

// Export types
export type { MarketUpdate, TradeUpdate, RealtimeCallbacks }
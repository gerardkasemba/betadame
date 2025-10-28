// lib/supabase/realtime.ts
import { createClient } from '@/lib/supabase/client'

export type LiquidityPoolData = {
  yes_reserve: number
  no_reserve: number
  draw_reserve: number
  constant_product: number
  total_liquidity: number
}

export type MarketUpdate = {
  market_id: string
  yes_price: number
  no_price: number
  draw_price?: number
  total_volume: number
  updated_at: string
  liquidity_pools?: LiquidityPoolData
  market_type?: 'binary' | 'sports' | '3outcome'
   outcomes?: MarketOutcome[]
}

export interface MarketOutcome {
  id: string
  market_id: string
  title: string
  description?: string
  image_url?: string
  yes_price: number
  no_price: number
  total_yes_shares: number
  total_no_shares: number
  total_volume: number
  total_shares: number
}

export type TradeUpdate = {
  id: string
  market_id: string
  user_id: string
  outcome: 'yes' | 'no' | 'draw'
  shares: number
  price_per_share: number
  total_amount: number
  created_at: string
}

export type RealtimeCallbacks = {
  onMarketUpdate?: (update: MarketUpdate) => void
  onTradeUpdate?: (update: TradeUpdate) => void
  onError?: (error: any) => void
}

class MarketRealtime {
  private supabase = createClient()
  private subscriptions: Map<string, any> = new Map()
  private marketTypes: Map<string, 'binary' | '3outcome'> = new Map()
  private isConnected = false

  // CRITICAL: Determine and cache market type
  private determineMarketType(marketId: string, poolData?: LiquidityPoolData | any): 'binary' | '3outcome' {
    // Check cache first
    if (this.marketTypes.has(marketId)) {
      return this.marketTypes.get(marketId)!
    }

    // Determine from pool data
    if (poolData) {
      const drawReserve = Number(poolData.draw_reserve) || 0
      const marketType = drawReserve > 0.000001 ? '3outcome' : 'binary'
      this.marketTypes.set(marketId, marketType)
      
      console.log('🔍 Market type determined:', {
        marketId,
        marketType,
        draw_reserve: drawReserve
      })
      
      return marketType
    }

    // Default to binary if unknown (will be updated on first update)
    return 'binary'
  }

  // CRITICAL: Sanitize liquidity pool data based on market type
  private sanitizePoolData(
    marketId: string, 
    poolData: any
  ): LiquidityPoolData {
    // Convert payload data to proper types
    const yes_reserve = Number(poolData.yes_reserve) || 0
    const no_reserve = Number(poolData.no_reserve) || 0
    const draw_reserve = Number(poolData.draw_reserve) || 0
    const total_liquidity = Number(poolData.total_liquidity) || 0

    const typedPoolData: LiquidityPoolData = {
      yes_reserve,
      no_reserve,
      draw_reserve,
      constant_product: Number(poolData.constant_product) || 0,
      total_liquidity
    }

    const marketType = this.determineMarketType(marketId, typedPoolData)
    
    if (marketType === 'binary') {
      // FORCE draw_reserve to exactly 0 for binary markets
      if (draw_reserve > 0) {
        console.warn('⚠️ SANITIZING: Binary market had non-zero draw_reserve:', {
          marketId,
          original_draw_reserve: draw_reserve,
          forcing_to: 0
        })
      }
      
      return {
        yes_reserve,
        no_reserve,
        draw_reserve: 0, // CRITICAL: Force to 0
        constant_product: yes_reserve * no_reserve,
        total_liquidity: yes_reserve + no_reserve
      }
    } else {
      // For 3-outcome markets, validate draw_reserve is positive
      if (draw_reserve <= 0) {
        console.error('❌ 3-outcome market has invalid draw_reserve:', {
          marketId,
          draw_reserve
        })
      }
      
      return {
        yes_reserve,
        no_reserve,
        draw_reserve,
        constant_product: yes_reserve * no_reserve * draw_reserve,
        total_liquidity: yes_reserve + no_reserve + draw_reserve
      }
    }
  }

  // Subscribe to market updates (includes liquidity pool data)
  subscribeToMarket(marketId: string, callbacks: RealtimeCallbacks) {
    console.log('🔔 Subscribing to market:', marketId)

    // Unsubscribe from existing subscription if any
    this.unsubscribeFromMarket(marketId)

    // Subscribe to market price changes
    const marketChannel = this.supabase
      .channel(`market:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'markets',
          filter: `id=eq.${marketId}`
        },
        (payload) => {
          console.log('📈 Market update received:', payload)
          if (callbacks.onMarketUpdate) {
            callbacks.onMarketUpdate({
              market_id: payload.new.id,
              yes_price: Number(payload.new.yes_price) || 0,
              no_price: Number(payload.new.no_price) || 0,
              draw_price: payload.new.draw_price ? Number(payload.new.draw_price) : undefined,
              total_volume: Number(payload.new.total_volume) || 0,
              updated_at: payload.new.updated_at,
              market_type: payload.new.market_type
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('Market subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
        }
      })

    // Subscribe to new trades for this market
    const tradeChannel = this.supabase
      .channel(`trades:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_trades',
          filter: `market_id=eq.${marketId}`
        },
        (payload) => {
          console.log('💰 New trade received:', payload)
          if (callbacks.onTradeUpdate) {
            callbacks.onTradeUpdate(payload.new as TradeUpdate)
          }
        }
      )
      .subscribe()

    // CRITICAL: Subscribe to liquidity pool updates
    const liquidityChannel = this.supabase
      .channel(`liquidity:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'liquidity_pools',
          filter: `market_id=eq.${marketId}`
        },
        (payload) => {
          console.log('💧 Liquidity pool update received:', payload.new)
          
          // CRITICAL: Sanitize pool data before sending to callback
          const sanitizedPool = this.sanitizePoolData(marketId, payload.new)
          
          console.log('✅ Sanitized pool data:', sanitizedPool)
          
          // Calculate prices from reserves
          const totalReserve = sanitizedPool.yes_reserve + sanitizedPool.no_reserve + sanitizedPool.draw_reserve
          
          if (callbacks.onMarketUpdate) {
            callbacks.onMarketUpdate({
              market_id: marketId,
              yes_price: totalReserve > 0 ? sanitizedPool.no_reserve / totalReserve : 0.5,
              no_price: totalReserve > 0 ? sanitizedPool.yes_reserve / totalReserve : 0.5,
              draw_price: sanitizedPool.draw_reserve > 0 && totalReserve > 0 
                ? sanitizedPool.draw_reserve / totalReserve 
                : undefined,
              total_volume: 0, // Will be updated from market table
              updated_at: payload.new.updated_at,
              liquidity_pools: sanitizedPool
            })
          }
        }
      )
      .subscribe()

    // Store all channels
    this.subscriptions.set(`market:${marketId}`, marketChannel)
    this.subscriptions.set(`trades:${marketId}`, tradeChannel)
    this.subscriptions.set(`liquidity:${marketId}`, liquidityChannel)

    return () => this.unsubscribeFromMarket(marketId)
  }

  // Subscribe to liquidity pool updates separately
  subscribeToLiquidity(marketId: string, callbacks: {
    onPoolUpdate?: (pool: LiquidityPoolData) => void
    onError?: (error: any) => void
  }) {
    console.log('💧 Subscribing to liquidity pool:', marketId)

    const poolChannel = this.supabase
      .channel(`liquidity-only:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'liquidity_pools',
          filter: `market_id=eq.${marketId}`
        },
        (payload) => {
          console.log('💧 Liquidity pool update:', payload.new)
          
          // CRITICAL: Sanitize pool data
          const sanitizedPool = this.sanitizePoolData(marketId, payload.new)
          
          if (callbacks.onPoolUpdate) {
            callbacks.onPoolUpdate(sanitizedPool)
          }
        }
      )
      .subscribe((status) => {
        console.log('Liquidity subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
        } else if (status === 'CHANNEL_ERROR') {
          callbacks.onError?.({ message: 'Failed to subscribe to liquidity updates' })
        }
      })

    this.subscriptions.set(`liquidity-only:${marketId}`, poolChannel)
    return () => {
      poolChannel.unsubscribe()
      this.subscriptions.delete(`liquidity-only:${marketId}`)
    }
  }

  // Subscribe to user's positions
  subscribeToUserPositions(userId: string, callbacks: {
    onPositionUpdate?: (position: any) => void
    onError?: (error: any) => void
  }) {
    console.log('👤 Subscribing to user positions:', userId)

    const positionChannel = this.supabase
      .channel(`positions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_positions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📊 Position update:', payload)
          if (callbacks.onPositionUpdate) {
            callbacks.onPositionUpdate({
              ...payload.new,
              eventType: payload.eventType
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('Position subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
        } else if (status === 'CHANNEL_ERROR') {
          callbacks.onError?.({ message: 'Failed to subscribe to position updates' })
        }
      })

    this.subscriptions.set(`positions:${userId}`, positionChannel)
    return () => {
      positionChannel.unsubscribe()
      this.subscriptions.delete(`positions:${userId}`)
    }
  }

  // Unsubscribe from specific market
  unsubscribeFromMarket(marketId: string) {
    console.log('🔕 Unsubscribing from market:', marketId)
    
    const channelsToRemove = [
      `market:${marketId}`,
      `trades:${marketId}`,
      `liquidity:${marketId}`
    ]

    channelsToRemove.forEach(channelKey => {
      const channel = this.subscriptions.get(channelKey)
      if (channel) {
        channel.unsubscribe()
        this.subscriptions.delete(channelKey)
        console.log('✅ Unsubscribed from:', channelKey)
      }
    })

    // Clear cached market type
    this.marketTypes.delete(marketId)
  }

  // Unsubscribe from all
  unsubscribeAll() {
    console.log('🔕 Unsubscribing from all channels')
    
    this.subscriptions.forEach((channel, key) => {
      console.log('Unsubscribing from:', key)
      channel.unsubscribe()
    })
    
    this.subscriptions.clear()
    this.marketTypes.clear()
    this.isConnected = false
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected
  }

  // Get cached market type
  getCachedMarketType(marketId: string): 'binary' | '3outcome' | undefined {
    return this.marketTypes.get(marketId)
  }

  // Force set market type (for initialization)
  setMarketType(marketId: string, marketType: 'binary' | '3outcome') {
    console.log('🔧 Manually setting market type:', { marketId, marketType })
    this.marketTypes.set(marketId, marketType)
  }
}

export const marketRealtime = new MarketRealtime()
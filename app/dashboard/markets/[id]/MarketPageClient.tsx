// app/markets/[id]/MarketPageClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { MarketHeader } from './components/MarketHeader'
import { MarketTrading } from './components/MarketTrading'
import { MarketStats } from './components/MarketStats'
import { TradeHistory } from './components/TradeHistory'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'
import { createClient } from '@/lib/supabase/client'
import { CommentsSection } from './CommentsSection'

interface MarketPageClientProps {
  market: any
}

export function MarketPageClient({ market: initialMarket }: MarketPageClientProps) {
  const [market, setMarket] = useState(initialMarket)
  const [activeTab, setActiveTab] = useState<'trade' | 'stats' | 'history' | 'comments'>('comments') // Changed default to 'comments'
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // Real-time market updates - enhanced to update liquidity pools too
  useMarketRealtime(initialMarket.id, {
    onMarketUpdate: (update) => {
      setMarket((prev: any) => ({
        ...prev,
        yes_price: update.yes_price,
        no_price: update.no_price,
        total_volume: update.total_volume,
        updated_at: update.updated_at,
        // Also update liquidity pools based on price changes
        liquidity_pools: prev.liquidity_pools ? {
          ...prev.liquidity_pools,
          // Estimate reserve changes based on price movements
          yes_reserve: update.yes_price * (prev.liquidity_pools.total_liquidity || 1000),
          no_reserve: update.no_price * (prev.liquidity_pools.total_liquidity || 1000),
          draw_reserve: prev.liquidity_pools.draw_reserve > 0 
            ? (1 - update.yes_price - update.no_price) * (prev.liquidity_pools.total_liquidity || 1000)
            : 0
        } : prev.liquidity_pools
      }))
    }
  })

  // Also subscribe to liquidity pool updates
  useEffect(() => {
    if (!initialMarket.id) return

    const channel = supabase
      .channel(`liquidity-updates-${initialMarket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'liquidity_pools',
          filter: `market_id=eq.${initialMarket.id}`
        },
        (payload) => {
          console.log('💧 Liquidity pool updated:', payload.new)
          setMarket((prev: any) => ({
            ...prev,
            liquidity_pools: {
              ...prev.liquidity_pools,
              ...payload.new
            }
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialMarket.id, supabase])

  // Determine market type
  const isSportsMarket = market.liquidity_pools?.draw_reserve > 0
  const marketType = isSportsMarket ? 'sports' : 'binary'

  return (
    <div className="min-h-screen ">
      <div className="">
        {/* User Status Bar */}

        {/* Market Header */}
        {/* <MarketHeader 
          market={market}
          marketType={marketType}
        /> */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Trading Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trading Card */}
            <div className="">
              <MarketTrading 
                market={market}
                marketType={marketType}
              />
            </div>

            {/* Tabs for additional content */}
            <div className="">
              <div className="">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === 'comments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Discussion
                  </button>
                  <button
                    onClick={() => setActiveTab('stats')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === 'stats'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Market Stats
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === 'history'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Trade History
                  </button>
                </nav>
              </div>

              <div className="">
                {activeTab === 'stats' && (
                  <MarketStats market={market} />
                )}
                {activeTab === 'history' && (
                  <TradeHistory marketId={market.id} />
                )}
                {activeTab === 'comments' && (
                  <div id="comments-section">
                    <CommentsSection marketId={market.id} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            {/* Market Info Card */}
            <div className="border-1 border-gray-300 p-6 rounded-md">
              <h3 className="text-lg font-semibold mb-4">Market Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{market.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Volume:</span>
                  <span className="font-medium">${market.total_volume?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Traders:</span>
                  <span className="font-medium">{market.unique_traders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Type:</span>
                  <span className="font-medium capitalize">{marketType}</span>
                </div>
                {market.end_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ends:</span>
                    <span className="font-medium">
                      {new Date(market.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {/* Real-time indicator */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Status:</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 text-xs font-medium">Live</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Liquidity Info - Now with real-time updates */}
            {market.liquidity_pools && (
              <div className="border-1 border-gray-300 p-6 rounded-md">
                <h3 className="text-lg font-semibold mb-4">Liquidity Pool</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Liquidity:</span>
                    <span className="font-medium">
                      ${market.liquidity_pools.total_liquidity?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">YES Reserve:</span>
                    <span className="font-medium">
                      {market.liquidity_pools.yes_reserve?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NO Reserve:</span>
                    <span className="font-medium">
                      {market.liquidity_pools.no_reserve?.toFixed(2)}
                    </span>
                  </div>
                  {isSportsMarket && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">DRAW Reserve:</span>
                      <span className="font-medium">
                        {market.liquidity_pools.draw_reserve?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Constant Product:</span>
                    <span className="font-medium text-xs">
                      {market.liquidity_pools.constant_product?.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Current Prices Summary */}
            <div className="border-1 border-gray-300 p-6 rounded-md">
              <h3 className="text-lg font-semibold mb-4">Current Prices</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">YES</span>
                  <div className="text-right">
                    <div className="font-bold text-blue-800">
                      ${market.yes_price?.toFixed(4) || '0.0000'}
                    </div>
                    <div className="text-sm text-blue-600">
                      {((market.yes_price || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700 font-medium">NO</span>
                  <div className="text-right">
                    <div className="font-bold text-red-800">
                      ${market.no_price?.toFixed(4) || '0.0000'}
                    </div>
                    <div className="text-sm text-red-600">
                      {((market.no_price || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                {isSportsMarket && (
                  <div className="flex justify-between items-center p-3  rounded-lg">
                    <span className="text-gray-700 font-medium">DRAW</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">
                        ${(Math.max(0, 1 - (market.yes_price || 0) - (market.no_price || 0))).toFixed(4)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {(Math.max(0, 1 - (market.yes_price || 0) - (market.no_price || 0)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {user && (
              <div className="border-1 border-gray-300 p-6 rounded-md">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setActiveTab('trade')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Place Trade
                  </button>
                  <button 
                    onClick={() => {
                      // Scroll to trade history
                      setActiveTab('history')
                      setTimeout(() => {
                        document.getElementById('trade-history')?.scrollIntoView({ behavior: 'smooth' })
                      }, 100)
                    }}
                    className="w-full 0 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    View Trade History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
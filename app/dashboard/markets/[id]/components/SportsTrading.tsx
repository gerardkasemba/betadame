// app/markets/[id]/components/SportsTrading.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { TradingForm } from './TradingForm'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'
import { UserPositions } from './UserPositions'
import { createClient } from '@/lib/supabase/client'
import LiveGamesTicker from '@/components/LiveGamesTicker'

interface SportsTradingProps {
  market: any
}

interface OrderBookDepth {
  yes_buy_orders: number
  yes_sell_orders: number
  no_buy_orders: number
  no_sell_orders: number
  draw_buy_orders: number
  draw_sell_orders: number
  best_yes_buy_price: number | null
  best_yes_sell_price: number | null
  best_no_buy_price: number | null
  best_no_sell_price: number | null
  best_draw_buy_price: number | null
  best_draw_sell_price: number | null
}

export function SportsTrading({ market: initialMarket }: SportsTradingProps) {
  const [market, setMarket] = useState(initialMarket)
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no' | 'draw' | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<'yes' | 'no' | null>(null)
  const [orderBookDepth, setOrderBookDepth] = useState<OrderBookDepth | null>(null)
  const [loadingOrderBook, setLoadingOrderBook] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false);

  // CRITICAL: Verify this is actually a sports market
  const isSportsMarket = market.liquidity_pools?.draw_reserve && 
                         market.liquidity_pools.draw_reserve >= 0.1

  // Real-time updates for market data
  useMarketRealtime(market.id, {
    onMarketUpdate: (update) => {
      setMarket((prev: typeof initialMarket) => ({
        ...prev,
        yes_price: update.yes_price,
        no_price: update.no_price,
        draw_price: update.draw_price,
        total_volume: update.total_volume,
        updated_at: update.updated_at,
        // CRITICAL: Preserve liquidity pool data
        liquidity_pools: update.liquidity_pools || prev.liquidity_pools
      }))
    }
  })

  // ✅ NEW: Real-time order book updates using WebSocket
  const fetchOrderBookDepth = useCallback(async () => {
    setLoadingOrderBook(true)
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase
        .from('market_orders')
        .select('outcome, order_type, price_per_share, shares, filled_shares')
        .eq('market_id', market.id)
        .in('status', ['open', 'partially_filled'])

      if (error) throw error

      if (data) {
        // Calculate depth for each outcome
        const yesBuyOrders = data.filter(o => o.outcome === 'yes' && o.order_type === 'buy')
        const yesSellOrders = data.filter(o => o.outcome === 'yes' && o.order_type === 'sell')
        const noBuyOrders = data.filter(o => o.outcome === 'no' && o.order_type === 'buy')
        const noSellOrders = data.filter(o => o.outcome === 'no' && o.order_type === 'sell')
        const drawBuyOrders = data.filter(o => o.outcome === 'draw' && o.order_type === 'buy')
        const drawSellOrders = data.filter(o => o.outcome === 'draw' && o.order_type === 'sell')

        setOrderBookDepth({
          yes_buy_orders: yesBuyOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          yes_sell_orders: yesSellOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          no_buy_orders: noBuyOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          no_sell_orders: noSellOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          draw_buy_orders: drawBuyOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          draw_sell_orders: drawSellOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          best_yes_buy_price: yesBuyOrders.length > 0 
            ? Math.max(...yesBuyOrders.map(o => o.price_per_share))
            : null,
          best_yes_sell_price: yesSellOrders.length > 0
            ? Math.min(...yesSellOrders.map(o => o.price_per_share))
            : null,
          best_no_buy_price: noBuyOrders.length > 0
            ? Math.max(...noBuyOrders.map(o => o.price_per_share))
            : null,
          best_no_sell_price: noSellOrders.length > 0
            ? Math.min(...noSellOrders.map(o => o.price_per_share))
            : null,
          best_draw_buy_price: drawBuyOrders.length > 0
            ? Math.max(...drawBuyOrders.map(o => o.price_per_share))
            : null,
          best_draw_sell_price: drawSellOrders.length > 0
            ? Math.min(...drawSellOrders.map(o => o.price_per_share))
            : null,
        })
      }
    } catch (err) {
      console.error('Error fetching order book:', err)
    } finally {
      setLoadingOrderBook(false)
    }
  }, [market.id])

  // ✅ NEW: WebSocket subscription for real-time order updates
  useEffect(() => {
    const supabase = createClient()
    
    // Initial fetch
    fetchOrderBookDepth()

    // Subscribe to order changes
    const subscription = supabase
      .channel(`market-orders-${market.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'market_orders',
          filter: `market_id=eq.${market.id}`
        },
        (payload) => {
          // Debounce rapid updates
          setTimeout(() => {
            fetchOrderBookDepth()
          }, 100)
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [market.id, fetchOrderBookDepth])

  // CRITICAL: Safety check - if this becomes a binary market, show error
  useEffect(() => {
    if (!isSportsMarket) {
      console.error('⚠️ SportsTrading component received a binary market!', {
        draw_reserve: market.liquidity_pools?.draw_reserve,
        market_type: market.market_type
      })
    }
  }, [isSportsMarket, market])

  // Calculate current prices
  const getCurrentPrices = () => {
    const yesPrice = market.yes_price || 0.33
    const noPrice = market.no_price || 0.33
    const drawPrice = market.draw_price || Math.max(0, 1 - yesPrice - noPrice)
    
    return { yesPrice, noPrice, drawPrice }
  }

  const { yesPrice, noPrice, drawPrice } = getCurrentPrices()

  // Use the direct columns from markets table
  const teamA = {
    name: market.team_a_name || 'Team A',
    image: market.team_a_image
  }

  const teamB = {
    name: market.team_b_name || 'Team B',
    image: market.team_b_image
  }

  const handleOutcomeSelect = (outcome: 'yes' | 'no' | 'draw') => {
    // CRITICAL: Validate this is still a sports market
    if (!isSportsMarket) {
      alert('This market is not a 3-outcome sports market. Cannot trade.')
      return
    }

    if (selectedOutcome === outcome && !selectedPosition) {
      // If clicking the same outcome and no position selected, deselect
      setSelectedOutcome(null)
    } else {
      setSelectedOutcome(outcome)
      setSelectedPosition(null) // Reset position when changing outcome
    }
  }

  const handlePositionSelect = (position: 'yes' | 'no') => {
    setSelectedPosition(position)
  }

  const resetSelection = () => {
    setSelectedOutcome(null)
    setSelectedPosition(null)
  }

  const getPositionLabel = () => {
    if (!selectedOutcome || !selectedPosition) return ''
    
    let outcomeLabel = ''
    
    if (selectedOutcome === 'yes') {
      outcomeLabel = `${teamA.name} will win`
    } else if (selectedOutcome === 'no') {
      outcomeLabel = `${teamB.name} will win`
    } else {
      outcomeLabel = `le match se terminera par un match nul`
    }

    return selectedPosition === 'yes'
      ? `Yes - ${outcomeLabel}`
      : selectedOutcome === 'draw'
        ? `No - le match ne se terminera pas par un match nul`
        : `No - ${outcomeLabel.replace('will win', 'will not win')}`
  }

  // If not a sports market, show error
  if (!isSportsMarket) {
    return (
      <div className="">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Market Type Mismatch
              </h3>
              <p className="text-sm text-red-700 mb-3">
                This appears to be a binary (2-outcome) market, but it's being displayed as a sports market. 
                This usually happens if the market data is corrupted.
              </p>
              <div className="bg-white rounded p-3 text-xs font-mono space-y-1 mb-3">
                <div>Draw Reserve: {market.liquidity_pools?.draw_reserve || 'N/A'}</div>
                <div>Market Type: {market.market_type || 'N/A'}</div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ✅ UPDATED: Real-time Order Book Status Banner */}
      {/* {orderBookDepth && !loadingOrderBook && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-blue-900">
                Live Order Matching
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span className="text-gray-700">
                  {orderBookDepth.yes_buy_orders + orderBookDepth.no_buy_orders + orderBookDepth.draw_buy_orders} buy orders
                </span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
                <span className="text-gray-700">
                  {orderBookDepth.yes_sell_orders + orderBookDepth.no_sell_orders + orderBookDepth.draw_sell_orders} sell orders
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            💡 Real-time updates: Your order may match with other traders instantly
          </p>
        </div>
      )} */}

      {/* Loading state for order book */}
      {loadingOrderBook && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">Loading order book...</span>
          </div>
        </div>
      )}

      {/* Rest of your JSX remains the same */}
      {/* Team Selection Cards */}

      <div className="space-y-3">
        {/* Match Card - Horizontal Layout */}
        <div className="border-1 border-gray-300 rounded-xl overflow-hidden bg-gray-50">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {teamA.image ? (
                  <img src={teamA.image} alt={teamA.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold">{teamA.name.charAt(0)}</span>
                  </div>
                )}
                <span className="text-sm font-semibold text-gray-900">{teamA.name}</span>
              </div>
              <div className="text-xs text-gray-400 font-medium px-3">VS</div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="text-sm font-semibold text-gray-900">{teamB.name}</span>
                {teamB.image ? (
                  <img src={teamB.image} alt={teamB.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold">{teamB.name.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Outcome Selection Buttons */}
          <div className="border-t border-gray-100 p-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Team A Win */}
              <button
                onClick={() => handleOutcomeSelect('yes')}
                className={`px-3 py-2.5 rounded-lg border transition-all ${
                  selectedOutcome === 'yes'
                    ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="text-center">
                  <div className={`text-xs font-medium mb-1 ${selectedOutcome === 'yes' ? 'text-white' : 'text-gray-600'}`}>
                    {teamA.name.split(' ')[0]}
                  </div>
                  <div className="text-sm font-bold">
                    {(yesPrice * 100).toFixed(0)}¢
                  </div>
                </div>
              </button>

              {/* Draw */}
              <button
                onClick={() => handleOutcomeSelect('draw')}
                className={`px-3 py-2.5 rounded-lg border transition-all ${
                  selectedOutcome === 'draw'
                    ? 'border-gray-500 bg-gray-500 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <div className={`text-xs font-medium mb-1 ${selectedOutcome === 'draw' ? 'text-white' : 'text-gray-600'}`}>
                    Match Nul
                  </div>
                  <div className="text-sm font-bold">
                    {(drawPrice * 100).toFixed(0)}¢
                  </div>
                </div>
              </button>

              {/* Team B Win */}
              <button
                onClick={() => handleOutcomeSelect('no')}
                className={`px-3 py-2.5 rounded-lg border transition-all ${
                  selectedOutcome === 'no'
                    ? 'border-red-500 bg-red-500 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50'
                }`}
              >
                <div className="text-center">
                  <div className={`text-xs font-medium mb-1 ${selectedOutcome === 'no' ? 'text-white' : 'text-gray-600'}`}>
                    {teamB.name.split(' ')[0]}
                  </div>
                  <div className="text-sm font-bold">
                    {(noPrice * 100).toFixed(0)}¢
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Order Book Indicators - Compact */}
          {orderBookDepth && (orderBookDepth.yes_sell_orders > 0 || orderBookDepth.no_sell_orders > 0 || orderBookDepth.draw_sell_orders > 0) && (
            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                {orderBookDepth.yes_sell_orders > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium">{orderBookDepth.yes_sell_orders.toFixed(0)}</span>
                  </div>
                )}
                {orderBookDepth.draw_sell_orders > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium">{orderBookDepth.draw_sell_orders.toFixed(0)}</span>
                  </div>
                )}
                {orderBookDepth.no_sell_orders > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium">{orderBookDepth.no_sell_orders.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* YES/NO Position Selection - Compact Version */}
        {selectedOutcome && (
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:static lg:z-auto lg:border lg:border-gray-300 lg:rounded-xl bg-white lg:bg-white lg:overflow-hidden shadow-lg lg:shadow-sm">
            {/* Mobile Header - Only visible on mobile */}
            <div 
              className="lg:hidden p-4 border-b border-gray-100 bg-gradient-to-r from-blue-800 to-blue-900 cursor-pointer sticky top-0 z-10"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-blue-200 mb-1 uppercase tracking-wide">
                    {selectedPosition ? 'Trade Confirmation' : 'Position Selection'}
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {selectedPosition ? (
                      <>{getPositionLabel()}</>
                    ) : selectedOutcome === 'draw' ? (
                      <>Do you think it will be a <span className="text-blue-200">draw</span>?</>
                    ) : (
                      <>Do you think <span className="text-blue-200">{selectedOutcome === 'yes' ? teamA.name : teamB.name}</span> will win?</>
                    )}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile expand/collapse indicator */}
                  <div className="flex items-center">
                    <svg 
                      className={`w-5 h-5 text-blue-200 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetSelection();
                    }}
                    className="flex-shrink-0 p-2 text-blue-200 hover:text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Content */}
            <div className={`
              lg:block
              ${window.innerWidth < 1024 ? 
                `transition-all duration-300 ease-in-out overflow-hidden bg-white ${
                  isExpanded ? 'max-h-[85vh]' : 'max-h-0'
                }` 
                : 'block'
              }
            `}>
              
              {/* Scrollable content container for mobile */}
              <div className={`
                lg:max-h-none
                ${window.innerWidth < 1024 ? 
                  `overflow-y-auto overscroll-contain ${isExpanded ? 'max-h-[calc(85vh-80px)]' : 'max-h-0'}`
                  : 'overflow-visible'
                }
              `}>
                
                {/* Position Selection (when no position selected yet) */}
                {!selectedPosition && (
                  <div className="p-4 lg:p-0">
                    {/* Order Book Info - Only if relevant */}
                    {orderBookDepth && (
                      (selectedOutcome === 'yes' && orderBookDepth.yes_sell_orders > 0) ||
                      (selectedOutcome === 'no' && orderBookDepth.no_sell_orders > 0) ||
                      (selectedOutcome === 'draw' && orderBookDepth.draw_sell_orders > 0)
                    ) && (
                      <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="text-xs text-emerald-700 font-medium">
                            {selectedOutcome === 'yes' && `${orderBookDepth.yes_sell_orders.toFixed(0)} shares available from traders`}
                            {selectedOutcome === 'no' && `${orderBookDepth.no_sell_orders.toFixed(0)} shares available from traders`}
                            {selectedOutcome === 'draw' && `${orderBookDepth.draw_sell_orders.toFixed(0)} shares available from traders`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* YES/NO Buttons */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {/* YES Button */}
                        <button
                          onClick={() => handlePositionSelect('yes')}
                          className="group relative p-4 lg:p-5 rounded-xl border-2 border-green-500 bg-white hover:bg-green-500 active:bg-green-400 transition-all duration-200 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          
                          <div className="relative text-center space-y-2">
                            <div className="flex items-center justify-center gap-1">
                              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <div className="text-sm font-semibold text-green-600 group-hover:text-white transition-colors uppercase tracking-wide">
                                Yes
                              </div>
                            </div>
                            
                            <div className="text-2xl lg:text-3xl font-bold text-green-600 group-hover:text-white transition-colors">
                              {selectedOutcome === 'yes' ? `${(yesPrice * 100).toFixed(0)}¢` :
                              selectedOutcome === 'no' ? `${(noPrice * 100).toFixed(0)}¢` :
                              `${(drawPrice * 100).toFixed(0)}¢`}
                            </div>
                            
                            <div className="text-xs font-medium text-green-600 group-hover:text-white/90 transition-colors">
                              {selectedOutcome === 'yes' ? `${(yesPrice * 100).toFixed(1)}% probability` :
                              selectedOutcome === 'no' ? `${(noPrice * 100).toFixed(1)}% probability` :
                              `${(drawPrice * 100).toFixed(1)}% probability`}
                            </div>

                            <div className="pt-2 border-t border-green-200 group-hover:border-white/20 transition-colors">
                              <p className="text-xs text-gray-600 group-hover:text-white/80 transition-colors">
                                I think it will happen
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* NO Button */}
                        <button
                          onClick={() => handlePositionSelect('no')}
                          className="group relative p-4 lg:p-5 rounded-xl border-2 border-red-500 bg-white hover:bg-red-500 active:bg-red-400 transition-all duration-200 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          
                          <div className="relative text-center space-y-2">
                            <div className="flex items-center justify-center gap-1">
                              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <div className="text-sm font-semibold text-red-600 group-hover:text-white transition-colors uppercase tracking-wide">
                                No
                              </div>
                            </div>
                            
                            <div className="text-2xl lg:text-3xl font-bold text-red-600 group-hover:text-white transition-colors">
                              {selectedOutcome === 'yes' ? `${((1 - yesPrice) * 100).toFixed(0)}¢` :
                              selectedOutcome === 'no' ? `${((1 - noPrice) * 100).toFixed(0)}¢` :
                              `${((1 - drawPrice) * 100).toFixed(0)}¢`}
                            </div>
                            
                            <div className="text-xs font-medium text-red-600 group-hover:text-white/90 transition-colors">
                              {selectedOutcome === 'yes' ? `${((1 - yesPrice) * 100).toFixed(1)}% probability` :
                              selectedOutcome === 'no' ? `${((1 - noPrice) * 100).toFixed(1)}% probability` :
                              `${((1 - drawPrice) * 100).toFixed(1)}% probability`}
                            </div>

                            <div className="pt-2 border-t border-red-200 group-hover:border-white/20 transition-colors">
                              <p className="text-xs text-gray-600 group-hover:text-white/80 transition-colors">
                                I don't think it will happen
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Helper Text */}
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            <strong>YES</strong> means you're betting on this event happening, 
                            <strong> NO</strong> means you're betting against it. 
                            Prices represent market probability.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trading Form (when position is selected) */}
                {selectedPosition && (
                  <div className="p-4 lg:p-0">
                    <div className="bg-blue-50 border-2 border-blue-300 lg:rounded-xl p-4 lg:p-6 shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-800">
                            {getPositionLabel()}
                          </h3>
                          <p className="text-sm text-blue-600 mt-1">
                            Trading on {selectedOutcome === 'yes' ? teamA.name :
                                      selectedOutcome === 'no' ? teamB.name : 'Draw'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedPosition(null)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Change Position
                        </button>
                      </div>
                      
                      {/* Trading Form Component */}
                      <div className="space-y-4 lg:space-y-6">
                        <TradingForm
                          market={market}
                          outcome={selectedOutcome}
                          marketType="sports"
                          position={selectedPosition}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection Instructions */}
      {!selectedOutcome && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-700 text-sm">
            👆 Cliquez sur un résultat ci-dessus pour commencer à trader
          </p>
        </div>
      )}
      {/* User Positions */}
      <UserPositions marketId={market.id} market={market} />
    </div>
  )
}
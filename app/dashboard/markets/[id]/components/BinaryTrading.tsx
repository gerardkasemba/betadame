// app/markets/[id]/components/EnhancedMarketTrading.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { TradingForm } from './TradingForm'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'
import { UserPositions } from './UserPositions'
import { createClient } from '@/lib/supabase/client'
import { MultiChoiceChart } from './MultiChoiceChart'

interface BinaryTradingProps {
  market: any
}

interface OrderBookDepth {
  yes_buy_orders: number
  yes_sell_orders: number
  no_buy_orders: number
  no_sell_orders: number
  best_yes_buy_price: number | null
  best_yes_sell_price: number | null
  best_no_buy_price: number | null
  best_no_sell_price: number | null
}

interface MarketOutcome {
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

export function BinaryTrading({ market: initialMarket }: BinaryTradingProps) {
  const [market, setMarket] = useState(initialMarket)
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes')
  const [selectedOption, setSelectedOption] = useState<string | null>(null) // For multi-choice
  const [showTrading, setShowTrading] = useState(false)
  const [orderBookDepth, setOrderBookDepth] = useState<OrderBookDepth | null>(null)
  const [loadingOrderBook, setLoadingOrderBook] = useState(false)
  const [showChart, setShowChart] = useState(false) // Chart visibility toggle

  // Determine market type
  const isMultiChoice = market.outcomes && market.outcomes.length > 1
  const isBinaryMarket = !isMultiChoice && (!market.liquidity_pools?.draw_reserve || 
                         market.liquidity_pools.draw_reserve === 0 ||
                         market.liquidity_pools.draw_reserve < 0.000001)
  const is3OutcomeMarket = !isMultiChoice && market.liquidity_pools?.draw_reserve > 0

  // Market type for display
  const marketType = isMultiChoice ? 'multi-choice' : isBinaryMarket ? 'binary' : '3outcome'

  // Real-time updates
  useMarketRealtime(market.id, {
    onMarketUpdate: (update) => {
      setMarket((prev: typeof initialMarket) => ({
        ...prev,
        yes_price: update.yes_price,
        no_price: update.no_price,
        total_volume: update.total_volume,
        updated_at: update.updated_at,
        liquidity_pools: update.liquidity_pools || prev.liquidity_pools,
        outcomes: update.outcomes || prev.outcomes
      }))
    }
  })

  // Fetch order book depth function
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
        const yesBuyOrders = data.filter(o => o.outcome === 'yes' && o.order_type === 'buy')
        const yesSellOrders = data.filter(o => o.outcome === 'yes' && o.order_type === 'sell')
        const noBuyOrders = data.filter(o => o.outcome === 'no' && o.order_type === 'buy')
        const noSellOrders = data.filter(o => o.outcome === 'no' && o.order_type === 'sell')

        setOrderBookDepth({
          yes_buy_orders: yesBuyOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          yes_sell_orders: yesSellOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          no_buy_orders: noBuyOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
          no_sell_orders: noSellOrders.reduce((sum, o) => sum + (o.shares - o.filled_shares), 0),
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
        })
      }
    } catch (err) {
      console.error('Error fetching order book:', err)
    } finally {
      setLoadingOrderBook(false)
    }
  }, [market.id])

  // WebSocket subscription for real-time order updates
  useEffect(() => {
    const supabase = createClient()
    
    fetchOrderBookDepth()

    const subscription = supabase
      .channel(`market-orders-${market.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_orders',
          filter: `market_id=eq.${market.id}`
        },
        () => {
          setTimeout(() => {
            fetchOrderBookDepth()
          }, 100)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [market.id, fetchOrderBookDepth])

  const yesPrice = market.yes_price || 0.5
  const noPrice = market.no_price || 0.5

  // Calculate prices from reserves for binary markets
  const calculateBinaryPrices = () => {
    if (!market.liquidity_pools) {
      return { yes: 0.5, no: 0.5 }
    }

    const { yes_reserve, no_reserve, draw_reserve } = market.liquidity_pools

    if (draw_reserve && draw_reserve > 0.000001) {
      return { yes: yesPrice, no: noPrice }
    }

    const totalReserve = yes_reserve + no_reserve
    if (totalReserve <= 0) {
      return { yes: 0.5, no: 0.5 }
    }

    return {
      yes: no_reserve / totalReserve,
      no: yes_reserve / totalReserve
    }
  }

  const prices = calculateBinaryPrices()
  const displayYesPrice = market.yes_price || prices.yes
  const displayNoPrice = market.no_price || prices.no

  // Handle outcome selection for binary markets
  const handleBinaryOutcomeSelect = (outcome: 'yes' | 'no') => {
    if (!isBinaryMarket) {
      alert('This is not a binary market.')
      return
    }

    setSelectedOutcome(outcome)
    setSelectedOption(null)
    setShowTrading(true)
  }

  // Handle option and outcome selection for multi-choice markets
  const handleMultiChoiceSelect = (optionId: string, outcome: 'yes' | 'no') => {
    setSelectedOption(optionId)
    setSelectedOutcome(outcome)
    setShowTrading(true)
  }

  // Market Header Component
const MarketHeader = () => (
  <div className="bg-white border-b border-gray-200 pb-6 mb-6">
    <div className="flex items-start gap-6">
      {/* Market Image */}
      {market.image_url ? (
        <img
          src={market.image_url}
          alt={market.title}
          className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      
      {/* Market Info */}
      <div className="flex-1 min-w-0">
        {/* Category & Type Badges */}
        <div className="flex items-center gap-2 mb-3">
          {market.category && (
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {market.category}
            </span>
          )}
          <span className="text-gray-300">•</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {isMultiChoice ? 'Multiple Choice' : isBinaryMarket ? 'Yes/No' : '3-Outcome'}
          </span>
        </div>

        {/* Market Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-4 leading-tight">
          {market.title}
        </h1>
        
        {/* Market Stats Row */}
        <div className="flex items-center gap-8">
          {/* Volume */}
          <div>
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Volume</div>
            <div className="text-lg font-semibold text-gray-900">
              ${(market.total_volume || 0).toLocaleString()}
            </div>
          </div>

          {/* YES Price */}
          <div>
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Yes</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-emerald-600">
                {((market.yes_price || 0.5) * 100).toFixed(1)}¢
              </span>
              <span className="text-sm text-gray-400">
                ({((market.yes_price || 0.5) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* NO Price */}
          <div>
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">No</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-rose-600">
                {((market.no_price || 0.5) * 100).toFixed(1)}¢
              </span>
              <span className="text-sm text-gray-400">
                ({((market.no_price || 0.5) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

  // Render Binary Market View
  const renderBinaryMarket = () => (
    <div className="space-y-4">
      {/* Market Type Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800">Binary Market</p>
            <p className="text-xs text-blue-600">Trade YES or NO on this outcome</p>
          </div>
        </div>
      </div>

      {/* Trading Cards Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* YES Card */}
        <button
          onClick={() => handleBinaryOutcomeSelect('yes')}
          className={`p-4 rounded-xl border transition-all group ${
            selectedOutcome === 'yes' && showTrading
              ? 'border-green-400 bg-green-50 ring-2 ring-green-200 shadow-sm'
              : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* YES Indicator */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedOutcome === 'yes' && showTrading
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-600 group-hover:bg-green-500 group-hover:text-white'
            }`}>
              <span className="font-bold text-sm">Y</span>
            </div>
            
            {/* Price and Info */}
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${
                  selectedOutcome === 'yes' && showTrading ? 'text-green-700' : 'text-gray-700'
                }`}>
                  YES
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  selectedOutcome === 'yes' && showTrading
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {(displayYesPrice * 100).toFixed(1)}%
                </span>
              </div>
              <div className={`text-xl font-bold mt-1 ${
                selectedOutcome === 'yes' && showTrading ? 'text-green-600' : 'text-gray-900'
              }`}>
                ${displayYesPrice.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">per share</div>
            </div>
          </div>

          {/* Order Book Info */}
          {orderBookDepth && orderBookDepth.yes_sell_orders > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600 font-medium">
                  {orderBookDepth.yes_sell_orders.toLocaleString()} shares
                </span>
                {orderBookDepth.best_yes_sell_price && (
                  <span className="text-gray-500">
                    Best: ${orderBookDepth.best_yes_sell_price.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          )}
        </button>

        {/* NO Card */}
        <button
          onClick={() => handleBinaryOutcomeSelect('no')}
          className={`p-4 rounded-xl border transition-all group ${
            selectedOutcome === 'no' && showTrading
              ? 'border-red-400 bg-red-50 ring-2 ring-red-200 shadow-sm'
              : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* NO Indicator */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedOutcome === 'no' && showTrading
                ? 'bg-red-500 text-white'
                : 'bg-red-100 text-red-600 group-hover:bg-red-500 group-hover:text-white'
            }`}>
              <span className="font-bold text-sm">N</span>
            </div>
            
            {/* Price and Info */}
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${
                  selectedOutcome === 'no' && showTrading ? 'text-red-700' : 'text-gray-700'
                }`}>
                  NO
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  selectedOutcome === 'no' && showTrading
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {(displayNoPrice * 100).toFixed(1)}%
                </span>
              </div>
              <div className={`text-xl font-bold mt-1 ${
                selectedOutcome === 'no' && showTrading ? 'text-red-600' : 'text-gray-900'
              }`}>
                ${displayNoPrice.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">per share</div>
            </div>
          </div>

          {/* Order Book Info */}
          {orderBookDepth && orderBookDepth.no_sell_orders > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600 font-medium">
                  {orderBookDepth.no_sell_orders.toLocaleString()} shares
                </span>
                {orderBookDepth.best_no_sell_price && (
                  <span className="text-gray-500">
                    Best: ${orderBookDepth.best_no_sell_price.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Call to Action */}
      {!showTrading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">
            Select YES or NO to start trading
          </p>
        </div>
      )}
    </div>
  )

  // Render Multi-Choice Market View
  const renderMultiChoiceMarket = () => {
    const outcomes: MarketOutcome[] = market.outcomes || []

    return (
      <div className="space-y-4">
        {/* Market Type Info Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-800">Multi-Choice Market</p>
              <p className="text-xs text-purple-600">Multiple independent binary questions about different candidates/options</p>
            </div>
          </div>
        </div>

        {/* Trading Options */}
        <div className="space-y-3">
          {outcomes.map((outcome) => {
            const isSelected = selectedOption === outcome.id
            const yesSelected = isSelected && selectedOutcome === 'yes'
            const noSelected = isSelected && selectedOutcome === 'no'

            return (
              <div
                key={outcome.id}
                className={`border rounded-xl transition-all overflow-hidden ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/30 shadow-md ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Left: Image */}
                  {outcome.image_url ? (
                    <img
                      src={outcome.image_url}
                      alt={outcome.title}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}

                  {/* Right: Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className="font-semibold text-gray-900 text-sm mb-2 truncate">
                      {outcome.title}
                    </h4>

                    {/* YES/NO Buttons */}
                    <div className="flex items-center gap-2 mb-2">
                      {/* YES Button */}
                      <button
                        onClick={() => handleMultiChoiceSelect(outcome.id, 'yes')}
                        className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                          yesSelected
                            ? 'border-green-500 bg-green-500 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${yesSelected ? 'text-white' : 'text-gray-600'}`}>
                            OUI
                          </span>
                          <span className="text-sm font-bold">
                            {(outcome.yes_price * 100).toFixed(0)}¢
                          </span>
                        </div>
                      </button>

                      {/* NO Button */}
                      <button
                        onClick={() => handleMultiChoiceSelect(outcome.id, 'no')}
                        className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                          noSelected
                            ? 'border-red-500 bg-red-500 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${noSelected ? 'text-white' : 'text-gray-600'}`}>
                            NON
                          </span>
                          <span className="text-sm font-bold">
                            {(outcome.no_price * 100).toFixed(0)}¢
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="font-medium">${outcome.total_volume?.toFixed(0) || '0'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>{outcome.total_yes_shares?.toFixed(0) || '0'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span>{outcome.total_no_shares?.toFixed(0) || '0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {!showTrading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600 text-sm">
              Select YES or NO on any option to start trading
            </p>
          </div>
        )}
        {/* Chart Toggle Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {showChart ? 'Hide Chart' : 'Show Price Chart'}
          </button>
        </div>
        {/* Price Chart */}
        {showChart && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <MultiChoiceChart 
              marketId={market.id} 
              outcomes={outcomes}
              className="border-0"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Market Header */}
      <MarketHeader />

      {/* Loading state */}
      {loadingOrderBook && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">Loading order book...</span>
          </div>
        </div>
      )}

      {/* Render appropriate market view */}
      {isMultiChoice ? renderMultiChoiceMarket() : renderBinaryMarket()}

      {/* Trading Form */}
      {showTrading && selectedOutcome && (
        <div className={`rounded-xl p-6 border-2 shadow-lg ${
          selectedOutcome === 'yes'
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-semibold ${
                selectedOutcome === 'yes' ? 'text-green-800' : 'text-red-800'
              }`}>
                Trading {selectedOutcome === 'yes' ? 'YES' : 'NO'}
                {isMultiChoice && selectedOption && (
                  <span className="ml-2 text-sm font-normal">
                    on {market.outcomes.find((o: MarketOutcome) => o.id === selectedOption)?.title}
                  </span>
                )}
              </h3>
              <p className={`text-sm mt-1 ${
                selectedOutcome === 'yes' ? 'text-green-600' : 'text-red-600'
              }`}>
                You're betting that the answer will be {selectedOutcome.toUpperCase()}
              </p>
              
              {orderBookDepth && (
                <div className={`mt-2 text-xs flex items-center gap-1 ${
                  selectedOutcome === 'yes' ? 'text-green-700' : 'text-red-700'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {selectedOutcome === 'yes' 
                      ? orderBookDepth.yes_sell_orders > 0 
                        ? `${orderBookDepth.yes_sell_orders.toFixed(0)} shares available from other traders`
                        : 'No limit orders available - will use AMM'
                      : orderBookDepth.no_sell_orders > 0
                        ? `${orderBookDepth.no_sell_orders.toFixed(0)} shares available from other traders`
                        : 'No limit orders available - will use AMM'
                    }
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setShowTrading(false)
                setSelectedOption(null)
              }}
              className={`text-sm font-medium flex items-center gap-1 ${
                selectedOutcome === 'yes'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
          
          <TradingForm
            market={market}
            outcome={selectedOutcome}
            marketType={isMultiChoice ? 'multi-choice' : isBinaryMarket ? 'binary' : 'sports'}
            position={selectedOutcome}
            selectedOption={selectedOption}
          />
        </div>
      )}

      {/* User Positions */}
      <UserPositions marketId={market.id} market={market} />
    </div>
  )
}
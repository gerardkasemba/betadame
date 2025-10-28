// components/OrderMatchingIndicator.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrderMatchingIndicatorProps {
  marketId: string
  outcome: 'yes' | 'no'
  tradeType: 'buy' | 'sell'
  amount: number
}

export function OrderMatchingIndicator({ 
  marketId, 
  outcome, 
  tradeType, 
  amount 
}: OrderMatchingIndicatorProps) {
  const [matchProbability, setMatchProbability] = useState<{
    likely: boolean
    availableShares: number
    bestPrice: number | null
    estimatedMatch: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkMatchProbability = async () => {
      if (!amount || amount <= 0) {
        setMatchProbability(null)
        return
      }

      setLoading(true)
      const supabase = createClient()

      try {
        // Get opposite side orders (if buying, check sell orders)
        const oppositeSide = tradeType === 'buy' ? 'sell' : 'buy'
        
        const { data: orders, error } = await supabase
          .from('market_orders')
          .select('price_per_share, shares, filled_shares')
          .eq('market_id', marketId)
          .eq('outcome', outcome)
          .eq('order_type', oppositeSide)
          .in('status', ['open', 'partially_filled'])
          .order('price_per_share', { ascending: tradeType === 'buy' })
          .limit(10)

        if (error) throw error

        if (orders && orders.length > 0) {
          const availableShares = orders.reduce(
            (sum, o) => sum + (o.shares - o.filled_shares), 
            0
          )
          
          // Estimate how much will match
          // For buys: match with sell orders at or below AMM price
          // For sells: match with buy orders at or above AMM price
          const { data: marketData } = await supabase
            .from('markets')
            .select('yes_price, no_price')
            .eq('id', marketId)
            .single()

          const ammPrice = outcome === 'yes' 
            ? marketData?.yes_price || 0.5 
            : marketData?.no_price || 0.5

          // Estimate shares based on amount and current price
          const estimatedShares = amount / ammPrice

          // Count how many shares can match at better prices
          let matchableShares = 0
          let bestPrice = null

          if (tradeType === 'buy') {
            // Buying - match with sell orders priced <= AMM price * 0.95
            const priceThreshold = ammPrice * 0.95
            for (const order of orders) {
              if (order.price_per_share <= priceThreshold) {
                matchableShares += order.shares - order.filled_shares
                if (!bestPrice || order.price_per_share < bestPrice) {
                  bestPrice = order.price_per_share
                }
              }
            }
          } else {
            // Selling - match with buy orders priced >= AMM price * 1.05
            const priceThreshold = ammPrice * 1.05
            for (const order of orders) {
              if (order.price_per_share >= priceThreshold) {
                matchableShares += order.shares - order.filled_shares
                if (!bestPrice || order.price_per_share > bestPrice) {
                  bestPrice = order.price_per_share
                }
              }
            }
          }

          const estimatedMatch = Math.min(matchableShares, estimatedShares)

          setMatchProbability({
            likely: estimatedMatch > 0,
            availableShares: matchableShares,
            bestPrice: bestPrice,
            estimatedMatch: estimatedMatch
          })
        } else {
          setMatchProbability({
            likely: false,
            availableShares: 0,
            bestPrice: null,
            estimatedMatch: 0
          })
        }
      } catch (err) {
        console.error('Error checking match probability:', err)
        setMatchProbability(null)
      } finally {
        setLoading(false)
      }
    }

    checkMatchProbability()
  }, [marketId, outcome, tradeType, amount])

  if (!matchProbability || loading) {
    return null
  }

  if (!matchProbability.likely) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2 text-blue-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No order matches available - will use AMM</span>
        </div>
      </div>
    )
  }

  const matchPercentage = Math.min(
    (matchProbability.estimatedMatch / (amount / (matchProbability.bestPrice || 1))) * 100,
    100
  )

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-green-900">
            Order Match Available!
          </span>
        </div>
        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
          ~{matchPercentage.toFixed(0)}% Match
        </span>
      </div>

      {/* Match Details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-gray-600">Estimated Match</div>
          <div className="font-bold text-green-700 text-base">
            {matchProbability.estimatedMatch.toFixed(2)} shares
          </div>
        </div>
        <div>
          <div className="text-gray-600">Best Price</div>
          <div className="font-bold text-green-700 text-base">
            ${matchProbability.bestPrice?.toFixed(4) || 'N/A'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Match probability</span>
          <span className="text-green-700 font-medium">{matchPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-green-100 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${matchPercentage}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 pt-2 border-t border-green-200">
        <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-green-700 leading-relaxed">
          {tradeType === 'buy' 
            ? `Your buy order will likely match with traders selling at better prices than the AMM.`
            : `Your sell order will likely match with traders buying at better prices than the AMM.`
          }
          {matchPercentage < 100 && ` Remaining shares will use the AMM.`}
        </p>
      </div>
    </div>
  )
}

// Usage in TradingForm:
// <OrderMatchingIndicator 
//   marketId={market.id} 
//   outcome={outcome} 
//   tradeType="buy" 
//   amount={parseFloat(amount) || 0}
// />
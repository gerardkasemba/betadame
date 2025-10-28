// app/markets/[id]/components/TradingForm.tsx
'use client'

import { useState, useEffect, useMemo } from 'react' // Add useMemo import
import { createClient } from '@/lib/supabase/client'
import { calculateTradeQuote } from '@/lib/amm-calculations'
import { executeTrade } from '@/lib/trade-execution'

interface TradingFormProps {
  market: any
  outcome: 'yes' | 'no' | 'draw'
  marketType: 'binary' | 'sports' | 'multi-choice'
  position?: 'yes' | 'no' | 'draw'
  selectedOption?: string | null
}

interface TradeResult {
  success: boolean
  trade?: {
    id: string
    shares: number
    pricePerShare: number
    totalAmount: number
    executionMethod?: 'order_book' | 'amm' | 'hybrid'
    executionBreakdown?: {
      order_book: {
        shares: number
        cost: number
        avg_price: number
      }
      amm: {
        shares: number
        cost: number
        avg_price: number
      }
    }
  }
  error?: string
}

interface OrderMatchingInfo {
  likely: boolean
  availableShares: number
  bestPrice: number | null
  estimatedMatch: number
}

export function TradingForm({ 
  market, 
  outcome, 
  marketType, 
  position = 'yes',
  selectedOption = null 
}: TradingFormProps) { // Destructure all props properly
  const [amount, setAmount] = useState('')
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [isCalculating, setIsCalculating] = useState(false)
  const [isTrading, setIsTrading] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [userShares, setUserShares] = useState<number>(0)
  const [lastTradeResult, setLastTradeResult] = useState<TradeResult | null>(null)
  const [matchingInfo, setMatchingInfo] = useState<OrderMatchingInfo | null>(null)
  const [loadingMatching, setLoadingMatching] = useState(false)
  const supabase = createClient()

  // CRITICAL: Determine actual market type from liquidity pool data
  const actualMarketType = useMemo(() => {
    // If explicitly passed as multi-choice, use that
    if (marketType === 'multi-choice') return 'multi-choice'
    
    // Otherwise determine from liquidity pools
    return market.liquidity_pools?.draw_reserve >= 0.1 ? 'sports' : 'binary'
  }, [market.liquidity_pools, marketType])

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Get user's shares for this outcome
  useEffect(() => {
    // In the getUserShares function - update for multi-choice without option_id
    const getUserShares = async () => {
      if (!user) {
        setUserShares(0)
        return
      }

      // For multi-choice markets, we need a different approach since
      // market_trades might not have option_id either
      let query = supabase
        .from('market_trades')
        .select('*')
        .eq('market_id', market.id)
        .eq('user_id', user.id)
        .eq('outcome', outcome)
        .order('created_at', { ascending: false })

      // If market_trades has option_id column, use it
      // Otherwise, we'll need to calculate shares differently
      try {
        const { data: trades, error } = await query

        if (error) {
          console.error('Error fetching user shares:', error)
          
          // If the error is about missing option_id, try without it
          if (error.message.includes('option_id')) {
            console.log('option_id column not found, proceeding without option filtering')
            // We'll proceed with the trades we have and handle multi-choice differently
          } else {
            throw error
          }
        }

        if (trades) {
          let totalShares = 0
          
          // For multi-choice markets without option_id in trades,
          // we might need to rely on a different approach
          // This is a simplified version - you might need to adjust based on your schema
          trades.forEach((trade) => {
            // Add basic filtering - you might need more sophisticated logic
            // based on how multi-choice trades are stored
            if (trade.trade_type === 'buy') {
              totalShares += Number(trade.shares)
            } else if (trade.trade_type === 'sell') {
              totalShares -= Number(trade.shares)
            }
          })
          setUserShares(Math.max(0, totalShares))
        } else {
          setUserShares(0)
        }
      } catch (error) {
        console.error('Error in getUserShares:', error)
        setUserShares(0)
      }
    }

    getUserShares()
  }, [user, market.id, outcome, supabase, actualMarketType, selectedOption])

  // ✅ NEW: Check order matching probability
  useEffect(() => {
    const checkMatchProbability = async () => {
      if (!amount || parseFloat(amount) <= 0 || tradeType === 'sell') {
        setMatchingInfo(null)
        return
      }

      setLoadingMatching(true)

      try {
        const oppositeSide = tradeType === 'buy' ? 'sell' : 'buy'
        
        let query = supabase
          .from('market_orders')
          .select('price_per_share, shares, filled_shares')
          .eq('market_id', market.id)
          .eq('outcome', outcome)
          .eq('order_type', oppositeSide)
          .in('status', ['open', 'partially_filled'])
          .order('price_per_share', { ascending: tradeType === 'buy' })
          .limit(10)

        // For multi-choice markets, we need to handle orders differently
        // Since market_orders doesn't have option_id, we'll filter client-side
        // or use a different approach

        const { data: orders, error } = await query

        if (error) throw error

        // For multi-choice markets, we need to check if there are any orders
        // that could potentially match. Since we don't have option_id in orders,
        // we'll assume all orders for this outcome in the market are relevant
        // but this might need refinement based on your business logic

        if (orders && orders.length > 0) {
          const availableShares = orders.reduce(
            (sum, order) => sum + (order.shares - order.filled_shares), 
            0
          )

          // Get AMM price - for multi-choice, use the outcome price
          let ammPrice = 0.5
          if (actualMarketType === 'multi-choice' && selectedOption && market.outcomes) {
            const selectedOutcome = market.outcomes.find((o: any) => o.id === selectedOption)
            if (selectedOutcome) {
              ammPrice = outcome === 'yes' ? selectedOutcome.yes_price : selectedOutcome.no_price
            }
          } else {
            ammPrice = outcome === 'yes' 
              ? market.yes_price || 0.5 
              : outcome === 'no'
              ? market.no_price || 0.5
              : market.draw_price || 0.33
          }

          const estimatedShares = parseFloat(amount) / ammPrice

          // Count matchable shares at better prices
          let matchableShares = 0
          let bestPrice = null

          if (tradeType === 'buy') {
            const priceThreshold = ammPrice * 0.95
            for (const order of orders) {
              if (order.price_per_share <= priceThreshold) {
                matchableShares += order.shares - order.filled_shares
                if (!bestPrice || order.price_per_share < bestPrice) {
                  bestPrice = order.price_per_share
                }
              }
            }
          }

          const estimatedMatch = Math.min(matchableShares, estimatedShares)

          setMatchingInfo({
            likely: estimatedMatch > 0,
            availableShares: matchableShares,
            bestPrice: bestPrice,
            estimatedMatch: estimatedMatch
          })
        } else {
          setMatchingInfo({
            likely: false,
            availableShares: 0,
            bestPrice: null,
            estimatedMatch: 0
          })
        }
      } catch (err) {
        console.error('Error checking match probability:', err)
        setMatchingInfo(null)
      } finally {
        setLoadingMatching(false)
      }
    }

    const timeoutId = setTimeout(checkMatchProbability, 500)
    return () => clearTimeout(timeoutId)
  }, [market.id, outcome, tradeType, amount, supabase, market.yes_price, market.no_price, market.draw_price, actualMarketType, selectedOption, market.outcomes])

  // Calculate quote when amount or trade type changes
  useEffect(() => {
    const calculateQuote = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setQuote(null)
        setError(null)
        return
      }

      setIsCalculating(true)
      setError(null)
      
      try {
        const amountNum = parseFloat(amount)
        
        // CRITICAL: Validate outcome for different market types
        if (actualMarketType === 'binary' && outcome === 'draw') {
          throw new Error('Draw outcome not supported for binary markets')
        }

        if (actualMarketType === 'multi-choice' && outcome === 'draw') {
          throw new Error('Draw outcome not supported for multi-choice markets')
        }

        // For multi-choice markets, validate selected option
        if (actualMarketType === 'multi-choice' && !selectedOption) {
          throw new Error('No option selected for multi-choice market')
        }

        // Validate pool data exists and has correct structure for non-multi-choice
        if (!market.liquidity_pools && actualMarketType !== 'multi-choice') {
          throw new Error('Market liquidity pool not found')
        }

        // CRITICAL: Handle different market types
        let poolData = market.liquidity_pools
        
        if (actualMarketType === 'binary') {
          poolData = {
            ...market.liquidity_pools,
            draw_reserve: 0 // Force to 0 for binary markets
          }
        } else if (actualMarketType === 'multi-choice') {
          // For multi-choice, we need to use the specific outcome's liquidity
          if (selectedOption && market.outcomes) {
            const selectedOutcome = market.outcomes.find((o: any) => o.id === selectedOption)
            if (selectedOutcome) {
              // 🔥 FIX: Use yes_reserve and no_reserve, NOT total_yes_shares!
              poolData = {
                yes_reserve: selectedOutcome.yes_reserve || 100,  // ✅ Changed from total_yes_shares
                no_reserve: selectedOutcome.no_reserve || 100,    // ✅ Changed from total_no_shares
                draw_reserve: 0,  // Multi-choice outcomes are binary
                constant_product: selectedOutcome.constant_product || 10000,
                total_liquidity: selectedOutcome.total_liquidity || 200
              }
              
              console.log('📊 Multi-choice pool data:', {
                outcomeTitle: selectedOutcome.title,
                yes_reserve: poolData.yes_reserve,
                no_reserve: poolData.no_reserve,
                yes_price: selectedOutcome.yes_price,
                no_price: selectedOutcome.no_price
              })
            } else {
              throw new Error('Selected option not found in market outcomes')
            }
          } else {
            throw new Error('No outcomes data available for multi-choice market')
          }
        }

        console.log('🔍 Market type check:', {
          marketType,
          actualMarketType,
          selectedOption: selectedOption,
          outcome
        })
        
        // Client-side calculation
        const calculatedQuote = calculateTradeQuote(
          poolData,
          outcome,
          amountNum,
          tradeType
        )
        
        console.log('📊 Client-side quote:', {
          quote: calculatedQuote,
          marketType: calculatedQuote.marketType,
          actualMarketType
        })

        // CRITICAL: Verify market type consistency
        if (actualMarketType === 'binary' && calculatedQuote.marketType !== 'binary') {
          throw new Error('Market type mismatch: Expected binary market')
        }

        if (actualMarketType === 'sports' && calculatedQuote.marketType !== '3outcome') {
          throw new Error('Market type mismatch: Expected 3-outcome market')
        }

        // For multi-choice, we expect binary calculations
        if (actualMarketType === 'multi-choice' && calculatedQuote.marketType !== 'binary') {
          console.warn('Multi-choice market calculated as non-binary, forcing binary behavior')
          // Force binary behavior for multi-choice
          calculatedQuote.marketType = 'binary'
        }
        
        setQuote(calculatedQuote)
        
      } catch (error) {
        console.error('❌ Quote calculation error:', error)
        setQuote(null)
        setError(error instanceof Error ? error.message : 'Calculation error')
      } finally {
        setIsCalculating(false)
      }
    }

    const timeoutId = setTimeout(calculateQuote, 300)
    return () => clearTimeout(timeoutId)
  }, [amount, outcome, tradeType, market.liquidity_pools, actualMarketType, marketType, selectedOption, market.outcomes])

  const handleTrade = async () => {
    if (!user) {
      alert('Please sign in to trade')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    // CRITICAL: Validate outcome for different market types
    if (actualMarketType === 'binary' && outcome === 'draw') {
      alert('Draw outcome not supported for binary markets')
      return
    }

    if (actualMarketType === 'multi-choice' && outcome === 'draw') {
      alert('Draw outcome not supported for multi-choice markets')
      return
    }

    // For multi-choice markets, validate selected option
    if (actualMarketType === 'multi-choice' && !selectedOption) {
      alert('No option selected for multi-choice market')
      return
    }

    // Check if user has enough shares to sell
    if (tradeType === 'sell') {
      const sharesToSell = quote?.shares ? parseFloat(quote.shares) : 0
      if (sharesToSell > userShares) {
        alert(`You only have ${userShares.toFixed(4)} shares to sell`)
        return
      }
    }

    setIsTrading(true)
    setError(null)
    
    try {
      const amountNum = parseFloat(amount)
      
      console.log('🚀 Executing trade:', {
        marketId: market.id,
        outcome,
        amount: amountNum,
        tradeType,
        marketType: actualMarketType,
        selectedOption: selectedOption,
        draw_reserve: market.liquidity_pools?.draw_reserve
      })

      // FIXED: Pass arguments correctly to executeTrade
      const result = await executeTrade(
        market.id,                    // marketId
        outcome,                      // outcome
        amountNum,                    // amount
        tradeType,                    // tradeType
        actualMarketType === 'multi-choice' ? selectedOption : null // outcomeId for multi-choice
      ) as TradeResult
      
      if (result.success) {
        setLastTradeResult(result)
        
        // Show success message based on execution method
        if (result.trade?.executionBreakdown) {
          const { order_book, amm } = result.trade.executionBreakdown
          
          if (order_book.shares > 0 && amm.shares > 0) {
            alert(`✅ Trade Executed (Hybrid)\n👥 ${order_book.shares.toFixed(2)} shares from traders @ $${order_book.avg_price.toFixed(4)}\n🏊 ${amm.shares.toFixed(2)} shares from AMM @ $${amm.avg_price.toFixed(4)}\nTotal: ${result.trade.shares.toFixed(2)} shares @ $${result.trade.pricePerShare.toFixed(4)} avg`)
          } else if (order_book.shares > 0) {
            alert(`✅ Matched with Traders!\n👥 Got ${order_book.shares.toFixed(2)} shares\nBetter price: $${order_book.avg_price.toFixed(4)}`)
          } else {
            alert(`✅ Trade Executed via AMM\n${amm.shares.toFixed(2)} shares @ $${amm.avg_price.toFixed(4)}`)
          }
        } else {
          alert(`✅ ${tradeType === 'buy' ? 'Purchase' : 'Sale'} executed successfully!`)
        }
        
        setAmount('')
        setQuote(null)
        
        // Refresh user shares
        if (tradeType === 'sell') {
          setUserShares(prev => Math.max(0, prev - parseFloat(quote.shares)))
        } else {
          setUserShares(prev => prev + parseFloat(quote.shares))
        }

        // Refresh page to update market data
        setTimeout(() => window.location.reload(), 1500)
      } else {
        let errorMessage = result.error || 'Trade failed'
        setError(errorMessage)
        alert(`❌ ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Trade error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Trade failed. Please try again.'
      setError(errorMessage)
      alert(`❌ ${errorMessage}`)
    } finally {
      setIsTrading(false)
    }
  }

  const getOutcomeLabel = (): string => {
    if (actualMarketType === 'multi-choice') {
      // For multi-choice, use the selected option title if available
      if (selectedOption && market.outcomes) {
        const selectedOutcome = market.outcomes.find((o: any) => o.id === selectedOption)
        if (selectedOutcome) {
          return `${outcome.toUpperCase()} on ${selectedOutcome.title}`
        }
      }
      return outcome.toUpperCase()
    }
    
    if (actualMarketType === 'sports') {
      if (outcome === 'yes') return market.team_a_name || 'Team A Win'
      if (outcome === 'no') return market.team_b_name || 'Team B Win'
      return 'Draw'
    }
    
    return outcome.toUpperCase()
  }

  const getTradeButtonText = (): string => {
    if (isTrading) return 'Processing...'
    if (!user) return 'Sign in to Trade'
    if (tradeType === 'sell' && userShares <= 0) return 'No Shares to Sell'
    return `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${getOutcomeLabel()}`
  }

  return (
<div className="space-y-4 lg:space-y-6">
  {/* Buy/Sell Toggle - Mobile App Style */}
  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl lg:rounded-lg lg:gap-2">
    <button
      onClick={() => setTradeType('buy')}
      className={`flex-1 py-3 lg:py-2 px-4 rounded-xl lg:rounded-md font-semibold transition-all ${
        tradeType === 'buy'
          ? 'bg-green-500 text-white shadow-lg lg:shadow-md'
          : 'bg-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      Buy
    </button>
    <button
      onClick={() => setTradeType('sell')}
      disabled={userShares <= 0}
      className={`flex-1 py-3 lg:py-2 px-4 rounded-xl lg:rounded-md font-semibold transition-all ${
        tradeType === 'sell'
          ? 'bg-red-500 text-white shadow-lg lg:shadow-md'
          : 'bg-transparent text-gray-600 hover:text-gray-900'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      Sell
    </button>
  </div>

  {/* User's current shares */}
  {user && userShares > 0 && (
    <div className="bg-blue-50 border border-blue-200 rounded-xl lg:rounded-lg p-4 lg:p-3 text-sm">
      <div className="flex justify-between items-center">
        <span className="text-blue-700 font-medium">Your shares for {getOutcomeLabel()}:</span>
        <span className="font-bold text-blue-900 text-base lg:text-sm">{userShares.toFixed(4)}</span>
      </div>
    </div>
  )}

  {/* Amount Input */}
  <div className="space-y-3 lg:space-y-2">
    <label className="block text-base lg:text-sm font-semibold lg:font-medium text-gray-900 lg:text-gray-700">
      {tradeType === 'buy' ? 'Investment Amount ($)' : 'Sale Amount ($)'}
    </label>
    
    <div className="relative">
      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-lg lg:text-base">$</span>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        min={market.min_bet_amount || 1}
        max={tradeType === 'sell' ? userShares * (market.yes_price || 0.5) : market.max_bet_amount || 10000}
        step="0.01"
        className="w-full pl-10 pr-4 py-4 lg:py-3 text-lg lg:text-base border border-gray-300 rounded-xl lg:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />
    </div>
    
    <div className="flex justify-between text-sm lg:text-xs text-gray-500">
      <span>Min: ${market.min_bet_amount || 1}</span>
      {tradeType === 'sell' && userShares > 0 ? (
        <span>Max: ~${(userShares * (market.yes_price || 0.5)).toFixed(2)}</span>
      ) : (
        <span>Max: ${market.max_bet_amount || 10000}</span>
      )}
    </div>
    
    {/* Quick Amount Buttons */}
    <div className="flex flex-wrap gap-2 lg:gap-1">
      {tradeType === 'buy' ? (
        [5, 10, 25, 50, 100].map((quickAmount) => (
          <button
            key={quickAmount}
            type="button"
            onClick={() => setAmount(quickAmount.toString())}
            className="flex-1 min-w-[60px] lg:min-w-0 px-3 py-3 lg:py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl lg:rounded-md transition-colors font-medium"
          >
            ${quickAmount}
          </button>
        ))
      ) : (
        userShares > 0 && (
          <>
            <button
              type="button"
              onClick={() => setAmount((userShares * (market.yes_price || 0.5) * 0.25).toFixed(2))}
              className="flex-1 px-3 py-3 lg:py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl lg:rounded-md transition-colors font-medium"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => setAmount((userShares * (market.yes_price || 0.5) * 0.5).toFixed(2))}
              className="flex-1 px-3 py-3 lg:py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl lg:rounded-md transition-colors font-medium"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setAmount((userShares * (market.yes_price || 0.5) * 0.75).toFixed(2))}
              className="flex-1 px-3 py-3 lg:py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl lg:rounded-md transition-colors font-medium"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setAmount((userShares * (market.yes_price || 0.5)).toFixed(2))}
              className="flex-1 px-3 py-3 lg:py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl lg:rounded-md transition-colors font-medium"
            >
              Max
            </button>
          </>
        )
      )}
    </div>
  </div>

  {/* Order Matching Indicator */}
  {matchingInfo && !loadingMatching && tradeType === 'buy' && amount && parseFloat(amount) > 0 && (
    <>
      {matchingInfo.likely ? (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl lg:rounded-lg p-4 lg:p-4 space-y-4 lg:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 lg:gap-2">
              <div className="w-3 h-3 lg:w-2 lg:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-base lg:text-sm font-bold lg:font-semibold text-green-900">
                Order Match Available!
              </span>
            </div>
            <span className="text-sm lg:text-xs font-bold lg:font-medium text-green-700 bg-green-100 px-3 lg:px-2 py-1 lg:py-1 rounded-full">
              ~{Math.min((matchingInfo.estimatedMatch / (parseFloat(amount) / (matchingInfo.bestPrice || 1))) * 100, 100).toFixed(0)}% Match
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:gap-3">
            <div>
              <div className="text-sm lg:text-xs text-gray-600">Estimated Match</div>
              <div className="font-bold text-green-700 text-lg lg:text-base">
                {matchingInfo.estimatedMatch.toFixed(2)} shares
              </div>
            </div>
            <div>
              <div className="text-sm lg:text-xs text-gray-600">Best Price</div>
              <div className="font-bold text-green-700 text-lg lg:text-base">
                ${matchingInfo.bestPrice?.toFixed(4) || 'N/A'}
              </div>
            </div>
          </div>

          <div className="space-y-2 lg:space-y-1">
            <div className="flex items-center justify-between text-sm lg:text-xs">
              <span className="text-gray-600">Match probability</span>
              <span className="text-green-700 font-bold lg:font-medium">
                {Math.min((matchingInfo.estimatedMatch / (parseFloat(amount) / (matchingInfo.bestPrice || 1))) * 100, 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-green-100 rounded-full h-3 lg:h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((matchingInfo.estimatedMatch / (parseFloat(amount) / (matchingInfo.bestPrice || 1))) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 lg:gap-2 pt-3 lg:pt-2 border-t border-green-200">
            <svg className="w-5 h-5 lg:w-4 lg:h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm lg:text-xs text-green-700 leading-relaxed">
              Your buy order will likely match with traders selling at better prices than the AMM.
              {Math.min((matchingInfo.estimatedMatch / (parseFloat(amount) / (matchingInfo.bestPrice || 1))) * 100, 100) < 100 && ` Remaining shares will use the AMM.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl lg:rounded-lg p-4 lg:p-3 text-base lg:text-sm">
          <div className="flex items-center gap-3 lg:gap-2 text-blue-700">
            <svg className="w-5 h-5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No order matches available - will use AMM</span>
          </div>
        </div>
      )}
    </>
  )}

  {/* Last Trade Execution Details */}
  {lastTradeResult && lastTradeResult.trade?.executionBreakdown && (
    <div className="bg-white border rounded-xl lg:rounded-lg p-4 lg:p-4 space-y-4 lg:space-y-3">
      <div className="text-base lg:text-sm font-bold lg:font-semibold text-gray-900">Last Trade Details</div>
      
      {lastTradeResult.trade.executionBreakdown.order_book.shares > 0 && (
        <div className="flex items-center justify-between text-sm lg:text-xs">
          <div className="flex items-center gap-3 lg:gap-2">
            <div className="w-3 h-3 lg:w-2 lg:h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 font-medium">Order Book</span>
          </div>
          <div className="text-right">
            <div className="font-bold lg:font-semibold text-gray-900">
              {lastTradeResult.trade.executionBreakdown.order_book.shares.toFixed(2)} shares
            </div>
            <div className="text-gray-500">
              ${lastTradeResult.trade.executionBreakdown.order_book.avg_price.toFixed(4)}/share
            </div>
          </div>
        </div>
      )}
      
      {lastTradeResult.trade.executionBreakdown.amm.shares > 0 && (
        <div className="flex items-center justify-between text-sm lg:text-xs">
          <div className="flex items-center gap-3 lg:gap-2">
            <div className="w-3 h-3 lg:w-2 lg:h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700 font-medium">AMM Pool</span>
          </div>
          <div className="text-right">
            <div className="font-bold lg:font-semibold text-gray-900">
              {lastTradeResult.trade.executionBreakdown.amm.shares.toFixed(2)} shares
            </div>
            <div className="text-gray-500">
              ${lastTradeResult.trade.executionBreakdown.amm.avg_price.toFixed(4)}/share
            </div>
          </div>
        </div>
      )}
      
      <div className="pt-3 lg:pt-2 border-t flex items-center justify-between text-base lg:text-sm">
        <span className="font-bold lg:font-semibold text-gray-700">Total</span>
        <div className="text-right">
          <div className="font-bold text-gray-900">
            {lastTradeResult.trade.shares.toFixed(2)} shares
          </div>
          <div className="text-gray-600">
            ${lastTradeResult.trade.pricePerShare.toFixed(4)} avg
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Authentication Notice */}
  {!user && (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl lg:rounded-lg p-4 lg:p-4">
      <p className="text-base lg:text-sm text-yellow-700 font-medium">
        Please sign in to place trades
      </p>
    </div>
  )}

  {/* Error Display */}
  {error && (
    <div className="bg-red-50 border border-red-200 rounded-xl lg:rounded-lg p-4 lg:p-4">
      <p className="text-base lg:text-sm text-red-700 whitespace-pre-line font-medium">
        {error}
      </p>
    </div>
  )}

  {/* Quote Display */}
  {isCalculating && (
    <div className="text-center py-6 lg:py-4">
      <div className="animate-spin rounded-full h-8 w-8 lg:h-6 lg:w-6 border-b-2 border-blue-500 mx-auto"></div>
      <p className="text-base lg:text-sm text-gray-500 mt-3 lg:mt-2 font-medium">Calculating quote...</p>
    </div>
  )}

  {quote && !isCalculating && (
    <div className={`border-2 rounded-xl lg:rounded-lg p-5 lg:p-4 space-y-4 lg:space-y-3 ${
      tradeType === 'buy' 
        ? 'bg-green-50 border-green-300 lg:border-green-200' 
        : 'bg-red-50 border-red-300 lg:border-red-200'
    }`}>
      <h4 className={`text-lg lg:text-base font-bold lg:font-semibold ${
        tradeType === 'buy' ? 'text-green-900' : 'text-red-900'
      }`}>
        {tradeType === 'buy' ? 'Purchase' : 'Sale'} Summary
      </h4>
      
      {/* Position indicator for sports */}
      {actualMarketType === 'sports' && (
        <div className="flex justify-between text-base lg:text-sm bg-white rounded-xl lg:rounded p-3 lg:p-2">
          <span className="text-gray-700 font-medium">Your position:</span>
          <span className={`font-bold lg:font-semibold ${position === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
            {position.toUpperCase()} on {getOutcomeLabel()}
          </span>
        </div>
      )}
      
      <div className="space-y-3 lg:space-y-2">
        <div className="flex justify-between text-base lg:text-sm">
          <span className={tradeType === 'buy' ? 'text-green-700' : 'text-red-700'}>
            Shares {tradeType === 'buy' ? 'to receive' : 'to sell'}:
          </span>
          <span className="font-bold lg:font-medium">{quote.shares}</span>
        </div>
        
        <div className="flex justify-between text-base lg:text-sm">
          <span className={tradeType === 'buy' ? 'text-green-700' : 'text-red-700'}>
            Price per share:
          </span>
          <span className="font-bold lg:font-medium">${quote.pricePerShare?.toFixed(4)}</span>
        </div>
        
        <div className="flex justify-between text-base lg:text-sm">
          <span className={tradeType === 'buy' ? 'text-green-700' : 'text-red-700'}>
            Platform fee (0%):
          </span>
          <span className="font-bold lg:font-medium">${quote.platformFee?.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-base lg:text-sm">
          <span className={tradeType === 'buy' ? 'text-green-700' : 'text-red-700'}>
            Slippage:
          </span>
          <span className="font-bold lg:font-medium">{quote.slippage?.toFixed(2)}%</span>
        </div>
        
        <div className={`flex justify-between text-base lg:text-sm font-bold lg:font-semibold border-t pt-3 lg:pt-2 ${
          tradeType === 'buy' ? 'border-green-200' : 'border-red-200'
        }`}>
          <span className={tradeType === 'buy' ? 'text-green-900' : 'text-red-900'}>
            {tradeType === 'buy' ? 'Total cost:' : 'You will receive:'}
          </span>
          <span className={tradeType === 'buy' ? 'text-green-900' : 'text-red-900'}>
            ${quote.totalCost?.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Trade Button */}
      <button
        onClick={handleTrade}
        disabled={isTrading || !user || (tradeType === 'sell' && userShares <= 0)}
        className={`w-full py-4 lg:py-3 px-4 rounded-xl lg:rounded-lg font-bold lg:font-medium text-lg lg:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg lg:shadow ${
          tradeType === 'buy'
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {getTradeButtonText()}
      </button>
    </div>
  )}

  {/* Show this when amount is entered but no quote */}
  {!quote && amount && !isCalculating && !error && (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl lg:rounded-lg p-4 lg:p-4">
      <p className="text-base lg:text-sm text-yellow-700 font-medium">
        Enter an amount to see trade details
      </p>
    </div>
  )}
</div>
  )
}
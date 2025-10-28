// app/markets/[id]/components/UserPositions.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserPositionsProps {
  marketId: string
  market?: any
}

interface Position {
  outcome: string
  outcomeName: string
  shares: number
  avgPrice: number
  currentValue: number
  profitLoss: number
  profitLossPercentage: number
}

export function UserPositions({ marketId, market }: UserPositionsProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [marketData, setMarketData] = useState<any>(market)
  const [marketOutcomes, setMarketOutcomes] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const loadPositions = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (!user) {
          setLoading(false)
          return
        }

        // Fetch market data if not provided
        if (!marketData) {
          const { data: fetchedMarket } = await supabase
            .from('markets')
            .select('yes_price, no_price, draw_price, team_a_name, team_b_name, market_type, title')
            .eq('id', marketId)
            .single()
          
          setMarketData(fetchedMarket)
        }

        // Fetch market outcomes for multiple choice markets
        const { data: outcomes } = await supabase
          .from('market_outcomes')
          .select('*')
          .eq('market_id', marketId)
          .order('created_at', { ascending: true })

        console.log('Market outcomes:', outcomes) // Debug log

        if (outcomes) {
          setMarketOutcomes(outcomes)
        }

        // Fetch user's trades for this market
        const { data: trades, error } = await supabase
          .from('market_trades')
          .select('*')
          .eq('market_id', marketId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        console.log('User trades:', trades) // Debug log

        if (error) {
          console.error('Error loading positions:', error)
          setLoading(false)
          return
        }

        if (!trades || trades.length === 0) {
          setPositions([])
          setLoading(false)
          return
        }

        // Get current market prices
        const { data: currentMarket } = await supabase
          .from('markets')
          .select('yes_price, no_price, draw_price, team_a_name, team_b_name, market_type')
          .eq('id', marketId)
          .single()

        if (currentMarket) {
          setMarketData(currentMarket)
        }

        // Calculate positions by outcome
        const positionMap = new Map<string, {
          totalShares: number
          totalCost: number
        }>()

        trades.forEach((trade) => {
          const outcome = trade.outcome
          const existing = positionMap.get(outcome) || { totalShares: 0, totalCost: 0 }
          
          if (trade.trade_type === 'buy') {
            existing.totalShares += Number(trade.shares)
            existing.totalCost += Number(trade.total_amount)
          } else if (trade.trade_type === 'sell') {
            existing.totalShares -= Number(trade.shares)
            existing.totalCost -= Number(trade.total_amount)
          }
          
          positionMap.set(outcome, existing)
        })

        console.log('Position map:', Array.from(positionMap.entries())) // Debug log

        // Helper function to get outcome name
        const getOutcomeName = (outcome: string) => {
          console.log('Getting outcome name for:', outcome) // Debug log
          
          const outcomeKey = outcome.toLowerCase()
          
          // Check if it's a multiple choice market (outcomes exist)
          if (outcomes && outcomes.length > 0) {
            console.log('Searching in outcomes:', outcomes.map(o => ({ id: o.id, title: o.title }))) // Debug log
            
            // Try to find by outcome ID (UUID)
            const outcomeObj = outcomes.find(opt => opt.id === outcome)
            if (outcomeObj) {
              console.log('Found outcome by ID:', outcomeObj.title) // Debug log
              return outcomeObj.title
            }
            
            // Try to find by title (case-insensitive)
            const outcomeByTitle = outcomes.find(opt => opt.title.toLowerCase() === outcomeKey)
            if (outcomeByTitle) {
              console.log('Found outcome by title:', outcomeByTitle.title) // Debug log
              return outcomeByTitle.title
            }
          }
          
          // Sports market logic
          if (currentMarket?.market_type === 'sports' || currentMarket?.team_a_name) {
            if (outcomeKey === 'yes') return currentMarket.team_a_name || 'Team A'
            if (outcomeKey === 'no') return currentMarket.team_b_name || 'Team B'
            if (outcomeKey === 'draw') return 'Draw'
          }
          
          // Binary market logic
          if (outcomeKey === 'yes') return 'YES'
          if (outcomeKey === 'no') return 'NO'
          if (outcomeKey === 'draw') return 'DRAW'
          
          return outcome.toUpperCase()
        }

        // Helper function to get current price for an outcome
        const getCurrentPrice = (outcome: string) => {
          const outcomeKey = outcome.toLowerCase()
          
          // Check if it's a multiple choice market outcome
          if (outcomes && outcomes.length > 0) {
            const outcomeObj = outcomes.find(opt => opt.id === outcome || opt.title.toLowerCase() === outcomeKey)
            if (outcomeObj) {
              console.log('Found price for outcome:', outcomeObj.yes_price) // Debug log
              return outcomeObj.yes_price || 0
            }
          }
          
          // Binary/3-outcome market logic
          if (outcomeKey === 'yes') return currentMarket?.yes_price || 0
          if (outcomeKey === 'no') return currentMarket?.no_price || 0
          if (outcomeKey === 'draw') return currentMarket?.draw_price || 0
          
          return 0
        }

        // Convert to position objects
        const calculatedPositions: Position[] = []
        positionMap.forEach((value, outcome) => {
          if (value.totalShares > 0) {
            const avgPrice = value.totalCost / value.totalShares
            const currentPrice = getCurrentPrice(outcome)
            const currentValue = value.totalShares * currentPrice
            const profitLoss = currentValue - value.totalCost
            const profitLossPercentage = (profitLoss / value.totalCost) * 100

            calculatedPositions.push({
              outcome: outcome,
              outcomeName: getOutcomeName(outcome),
              shares: value.totalShares,
              avgPrice: avgPrice,
              currentValue: currentValue,
              profitLoss: profitLoss,
              profitLossPercentage: profitLossPercentage
            })
          }
        })

        console.log('Calculated positions:', calculatedPositions) // Debug log

        setPositions(calculatedPositions)
      } catch (error) {
        console.error('Error loading positions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPositions()

    // Subscribe to real-time updates for new trades
    const channel = supabase
      .channel(`market_trades_${marketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_trades',
          filter: `market_id=eq.${marketId}`
        },
        () => {
          loadPositions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [marketId, supabase, marketData])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (positions.length === 0) {
    return null
  }

  const isSportsMarket = marketData?.market_type === 'sports' || marketData?.team_a_name
  const isMultiChoice = marketOutcomes && marketOutcomes.length > 0

  return (
<div className="0">
  {/* Header - Sticky on mobile */}
  <div className="sticky top-0 lg:bg-transparent lg:border-none">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 lg:bg-transparent p-2 rounded-lg lg:p-0">
          <svg className="w-5 h-5 text-white lg:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 lg:text-blue-900">Your Positions</h3>
          <p className="text-xs text-gray-500 lg:text-blue-700 mt-1">
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {/* Total P&L Badge */}
      <div className={`px-3 py-2 rounded-full font-bold ${
        positions.reduce((sum, p) => sum + p.profitLoss, 0) >= 0 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        <div className="text-sm">
          {positions.reduce((sum, p) => sum + p.profitLoss, 0) >= 0 ? '+' : ''}
          ${Math.abs(positions.reduce((sum, p) => sum + p.profitLoss, 0)).toFixed(2)}
        </div>
      </div>
    </div>
  </div>

  {/* Positions List */}
  <div className="py-2 space-y-3 lg:space-y-4">
    {positions.length === 0 ? (
      // Empty State
      <div className="text-center py-12 lg:py-16">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No active positions</h3>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Start trading to see your positions and portfolio performance here.
        </p>
      </div>
    ) : (
      positions.map((position) => (
        <div
          key={position.outcome}
          className="border-1 border-gray-300 rounded-md p-4"
        >
          {/* Main Position Info */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              {isMultiChoice ? (
                // Multiple choice market
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-xs font-bold">
                      POSITION
                    </div>
                  </div>
                  <div className="text-base font-bold text-gray-900 truncate">
                    {position.outcomeName}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {position.shares.toFixed(2)} shares
                  </div>
                </div>
              ) : (
                // Binary/3-outcome market
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      position.outcome.toLowerCase() === 'yes' 
                        ? 'bg-green-500 text-white' 
                        : position.outcome.toLowerCase() === 'no' 
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}>
                      {position.outcome}
                    </span>
                    {isSportsMarket && position.outcomeName !== position.outcome.toUpperCase() && position.outcomeName !== 'YES' && position.outcomeName !== 'NO' && (
                      <span className="text-sm font-semibold text-gray-700 truncate">
                        {position.outcomeName}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {position.shares.toFixed(2)} shares
                  </div>
                </div>
              )}
            </div>
            
            {/* P&L Section */}
            <div className="text-right ml-3">
              <div className={`text-xl font-bold ${
                position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {position.profitLoss >= 0 ? '+' : ''}${Math.abs(position.profitLoss).toFixed(2)}
              </div>
              <div className={`text-sm font-semibold ${
                position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {position.profitLoss >= 0 ? '+' : ''}{position.profitLossPercentage.toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* Stats Grid - Simplified for mobile */}
          <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-1">
              <div className="text-gray-500 text-xs font-medium">Avg Price</div>
              <div className="font-bold text-gray-900">${position.avgPrice.toFixed(3)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-500 text-xs font-medium">Current Value</div>
              <div className="font-bold text-gray-900">${position.currentValue.toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-500 text-xs font-medium">Total Cost</div>
              <div className="font-bold text-gray-900">${(position.shares * position.avgPrice).toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-500 text-xs font-medium">Shares</div>
              <div className="font-bold text-gray-900">{position.shares.toFixed(2)}</div>
            </div>
          </div>

          {/* Action Buttons */}
          {/* <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors active:bg-blue-800">
              Trade
            </button>
            <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors active:bg-gray-300">
              Details
            </button>
          </div> */}
        </div>
      ))
    )}
  </div>

  {/* Bottom Navigation for Mobile */}
  {positions.length > 0 && (
    <div className="lg:hidden z-20 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xs text-gray-500">Total Portfolio</div>
          <div className={`text-lg font-bold ${
            positions.reduce((sum, p) => sum + p.profitLoss, 0) >= 0 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {positions.reduce((sum, p) => sum + p.profitLoss, 0) >= 0 ? '+' : ''}
            ${Math.abs(positions.reduce((sum, p) => sum + p.profitLoss, 0)).toFixed(2)}
          </div>
        </div>
        {/* <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors active:bg-blue-800">
          Trade All
        </button> */}
      </div>
    </div>
  )}
</div>
  )
}
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Divide,
  Trophy,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp as TrendingUpIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartDataInput } from '@/types/chart'

interface Position {
  id: string
  market_id: string
  outcome: string
  shares: number
  average_price: number
  total_invested: number
  unrealized_profit: number
  markets: {
    id: string
    title: string
    yes_price: number
    no_price: number
    draw_price?: number
    status: string
    end_date: string
    market_type: 'binary' | '3outcome'
    sport_type?: string
    team_a_name?: string
    team_b_name?: string
    total_volume: number
    created_at: string
  }
}

interface Trade {
  id: string
  market_id: string
  trade_type: string
  outcome: string
  shares: number
  price_per_share: number
  total_amount: number
  platform_fee: number
  created_at: string
  markets: {
    title: string
    market_type: 'binary' | '3outcome'
  }
}

interface PortfolioStats {
  totalInvested: number
  totalValue: number
  totalPnL: number
  pnLPercentage: number
  activePositions: number
  totalTrades: number
  winRate: number
  todayPnL: number
  bestPerformer: { title: string; pnl: number; pnlPercentage: number } | null
  worstPerformer: { title: string; pnl: number; pnlPercentage: number } | null
  byOutcome: {
    yes: number
    no: number
    draw: number
  }
}

interface PriceUpdate {
  id: string
  yes_price: number
  no_price: number
  draw_price?: number
  updated_at: string
}

interface RealTimeUpdate {
  type: 'price' | 'trade' | 'position' | 'market'
  data: any
  timestamp: string
}

interface PerformanceData {
  date: string
  value: number
  timestamp: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7']
const OUTCOME_COLORS = {
  yes: '#10b981',
  no: '#ef4444',
  draw: '#f59e0b'
}

const DEFAULT_STATS: PortfolioStats = {
  totalInvested: 0,
  totalValue: 0,
  totalPnL: 0,
  pnLPercentage: 0,
  activePositions: 0,
  totalTrades: 0,
  winRate: 0,
  todayPnL: 0,
  bestPerformer: null,
  worstPerformer: null,
  byOutcome: {
    yes: 0,
    no: 0,
    draw: 0
  }
}

// Helper functions
const getCurrentPrice = (outcome: string, market: any): number => {
  if (!market) return 0.5
  
  switch (outcome) {
    case 'yes': return market.yes_price || 0.5
    case 'no': return market.no_price || 0.5
    case 'draw': return market.draw_price || 0.33
    default: return 0.5
  }
}

const getPositionValue = (position: Position): number => {
  const currentPrice = getCurrentPrice(position.outcome, position.markets)
  return position.shares * currentPrice
}

const getOutcomeDisplay = (position: Position): string => {
  const { outcome, markets } = position
  
  if (!markets) return outcome.toUpperCase()
  
  if (markets.market_type === '3outcome') {
    switch (outcome) {
      case 'yes':
        return `${markets.team_a_name || 'Équipe A'} Gagne`
      case 'no':
        return `${markets.team_b_name || 'Équipe B'} Gagne`
      case 'draw':
        return 'Match Nul'
      default:
        return outcome.toUpperCase()
    }
  }
  
  return outcome.toUpperCase()
}

const getOutcomeColor = (outcome: string): string => {
  return OUTCOME_COLORS[outcome as keyof typeof OUTCOME_COLORS] || '#6b7280'
}

export default function PortfolioPage() {
  const [user, setUser] = useState<any>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<PortfolioStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions')
  const [realTimeUpdates, setRealTimeUpdates] = useState<RealTimeUpdate[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  
  const supabase = createClient()

  // Memoized calculations
  const portfolioDistribution = useMemo((): ChartDataInput[] => 
    positions.map((pos, index) => ({
      name: pos.markets?.title?.substring(0, 20) + '...' || 'Marché',
      value: getPositionValue(pos),
      color: COLORS[index % COLORS.length],
      marketId: pos.market_id
    })).filter(item => item.value > 0),
    [positions]
  )

  const outcomeDistribution = useMemo((): ChartDataInput[] => 
    [
      { name: 'Oui', value: stats.byOutcome.yes, color: OUTCOME_COLORS.yes },
      { name: 'Non', value: stats.byOutcome.no, color: OUTCOME_COLORS.no },
      { name: 'Nul', value: stats.byOutcome.draw, color: OUTCOME_COLORS.draw }
    ].filter(item => item.value > 0),
    [stats.byOutcome]
  )

  const performanceData = useMemo((): PerformanceData[] => 
    trades
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .reduce((acc: PerformanceData[], trade, index) => {
        const prevValue = acc[index - 1]?.value || 0
        const change = trade.trade_type === 'buy' ? -trade.total_amount : trade.total_amount
        return [...acc, {
          date: new Date(trade.created_at).toLocaleDateString(),
          value: prevValue + change,
          timestamp: trade.created_at
        }]
      }, []),
    [trades]
  )

  // Real-time handlers
  const handlePriceUpdate = useCallback((update: PriceUpdate) => {
    console.log('Processing price update:', update)
    
    setPositions(prev => prev.map(position => {
      if (position.market_id === update.id) {
        const updatedMarket = { ...position.markets, ...update }
        const currentPrice = getCurrentPrice(position.outcome, updatedMarket)
        const currentValue = position.shares * currentPrice
        const unrealizedProfit = currentValue - position.total_invested

        setRealTimeUpdates(prevUpdates => [
          {
            type: 'price',
            data: { marketId: update.id, outcome: position.outcome, newPrice: currentPrice },
            timestamp: new Date().toISOString()
          },
          ...prevUpdates.slice(0, 9)
        ])

        return {
          ...position,
          markets: updatedMarket,
          unrealized_profit: unrealizedProfit
        }
      }
      return position
    }))
  }, [])

  const handleNewTrade = useCallback((trade: Trade) => {
    console.log('Processing new trade:', trade)
    
    setTrades(prev => [trade, ...prev])
    
    setRealTimeUpdates(prevUpdates => [
      {
        type: 'trade',
        data: { 
          marketId: trade.market_id, 
          outcome: trade.outcome, 
          amount: trade.total_amount,
          type: trade.trade_type 
        },
        timestamp: new Date().toISOString()
      },
      ...prevUpdates.slice(0, 9)
    ])

    // Update positions based on the new trade
    setPositions(prev => {
      const existingPosition = prev.find(p => 
        p.market_id === trade.market_id && p.outcome === trade.outcome
      )

      if (existingPosition) {
        return prev.map(p => {
          if (p.market_id === trade.market_id && p.outcome === trade.outcome) {
            if (trade.trade_type === 'buy') {
              const newShares = p.shares + trade.shares
              const newTotalInvested = p.total_invested + trade.total_amount
              const newAveragePrice = newTotalInvested / newShares
              const currentValue = newShares * getCurrentPrice(p.outcome, p.markets)
              
              return {
                ...p,
                shares: newShares,
                total_invested: newTotalInvested,
                average_price: newAveragePrice,
                unrealized_profit: currentValue - newTotalInvested
              }
            } else {
              // For sells, reduce shares but keep average price the same
              const newShares = p.shares - trade.shares
              const soldValue = trade.shares * p.average_price
              const newTotalInvested = p.total_invested - soldValue
              const currentValue = newShares * getCurrentPrice(p.outcome, p.markets)
              
              return {
                ...p,
                shares: newShares,
                total_invested: newTotalInvested,
                unrealized_profit: currentValue - newTotalInvested
              }
            }
          }
          return p
        })
      } else if (trade.trade_type === 'buy') {
        // Create new position for buy trades
        const currentValue = trade.shares * getCurrentPrice(trade.outcome, {})
        const newPosition: Position = {
          id: `temp-${trade.id}`,
          market_id: trade.market_id,
          outcome: trade.outcome,
          shares: trade.shares,
          average_price: trade.price_per_share,
          total_invested: trade.total_amount,
          unrealized_profit: currentValue - trade.total_amount,
          markets: {
            id: trade.market_id,
            title: trade.markets?.title || 'Nouveau marché',
            yes_price: 0.5,
            no_price: 0.5,
            status: 'active',
            end_date: new Date().toISOString(),
            market_type: trade.markets?.market_type || 'binary',
            total_volume: 0,
            created_at: new Date().toISOString()
          }
        }
        return [...prev, newPosition]
      }
      
      return prev
    })
  }, [])

  const handlePositionUpdate = useCallback((payload: any) => {
    console.log('Processing position update:', payload)
    
    if (payload.eventType === 'INSERT') {
      // Add new position with market data
      fetchSinglePosition(payload.new.id)
    } else if (payload.eventType === 'UPDATE') {
      // Update existing position
      setPositions(prev => prev.map(pos => {
        if (pos.id === payload.new.id) {
          const currentPrice = getCurrentPrice(payload.new.outcome, pos.markets)
          const currentValue = payload.new.shares * currentPrice
          const unrealizedProfit = currentValue - payload.new.total_invested
          
          return {
            ...pos,
            ...payload.new,
            unrealized_profit: unrealizedProfit
          }
        }
        return pos
      }))
    } else if (payload.eventType === 'DELETE') {
      setPositions(prev => prev.filter(p => p.id !== payload.old.id))
    }

    setRealTimeUpdates(prevUpdates => [
      {
        type: 'position',
        data: { event: payload.eventType, positionId: payload.old?.id || payload.new?.id },
        timestamp: new Date().toISOString()
      },
      ...prevUpdates.slice(0, 9)
    ])
  }, [])

  // Fetch single position with market data
  const fetchSinglePosition = async (positionId: string) => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('market_positions')
      .select(`
        *,
        markets:market_id (
          id,
          title,
          yes_price,
          no_price,
          draw_price,
          status,
          end_date,
          market_type,
          sport_type,
          team_a_name,
          team_b_name,
          total_volume,
          created_at
        )
      `)
      .eq('id', positionId)
      .single()

    if (!error && data) {
      const currentPrice = getCurrentPrice(data.outcome, data.markets)
      const currentValue = data.shares * currentPrice
      const unrealizedProfit = currentValue - data.total_invested

      setPositions(prev => {
        const exists = prev.find(p => p.id === positionId)
        if (exists) {
          return prev.map(p => p.id === positionId ? {
            ...data,
            unrealized_profit: unrealizedProfit
          } : p)
        } else {
          return [...prev, {
            ...data,
            unrealized_profit: unrealizedProfit
          }]
        }
      })
    }
  }

  // Real-time subscription management
  useEffect(() => {
    let subscription: any = null
    let priceSubscription: any = null
    let tradeSubscription: any = null

    const setupSubscriptions = async () => {
      try {
        setConnectionStatus('connecting')
        console.log('Setting up real-time subscriptions...')

        // Subscribe to ALL market price changes
        priceSubscription = supabase
          .channel('market-prices')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'markets',
            },
            (payload) => {
              console.log('Price update received:', payload)
              handlePriceUpdate(payload.new as PriceUpdate)
            }
          )
          .subscribe((status) => {
            console.log('Price subscription status:', status)
          })

        // Subscribe to trades for this user
        tradeSubscription = supabase
          .channel('user-trades')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'market_trades',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('New trade received:', payload)
              handleNewTrade(payload.new as Trade)
            }
          )
          .subscribe((status) => {
            console.log('Trade subscription status:', status)
          })

        // Subscribe to position changes for this user
        subscription = supabase
          .channel('user-positions')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'market_positions',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('Position update received:', payload)
              handlePositionUpdate(payload)
            }
          )
          .subscribe((status) => {
            console.log('Position subscription status:', status)
          })

        setConnectionStatus('connected')
        console.log('All real-time subscriptions established')

      } catch (error) {
        console.error('Subscription error:', error)
        setConnectionStatus('disconnected')
      }
    }

    if (user) {
      setupSubscriptions()
    }

    return () => {
      if (subscription) {
        console.log('Unsubscribing from positions')
        subscription.unsubscribe()
      }
      if (priceSubscription) {
        console.log('Unsubscribing from prices')
        priceSubscription.unsubscribe()
      }
      if (tradeSubscription) {
        console.log('Unsubscribing from trades')
        tradeSubscription.unsubscribe()
      }
    }
  }, [user, supabase, handlePriceUpdate, handleNewTrade, handlePositionUpdate])

  // Core functions
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/login'
      return
    }

    setUser(user)
    await fetchPortfolioData(user.id)
  }

  const fetchPortfolioData = async (userId: string) => {
    try {
      setIsLoading(true)
      await Promise.all([
        fetchPositions(userId),
        fetchTrades(userId)
      ])
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPositions = async (userId: string) => {
    const { data: positionsData, error } = await supabase
      .from('market_positions')
      .select(`
        *,
        markets:market_id (
          id,
          title,
          yes_price,
          no_price,
          draw_price,
          status,
          end_date,
          market_type,
          sport_type,
          team_a_name,
          team_b_name,
          total_volume,
          created_at
        )
      `)
      .eq('user_id', userId)
      .gt('shares', 0)

    if (error) {
      console.error('Error fetching positions:', error)
      return []
    }

    const enrichedPositions = positionsData?.map(pos => {
      const currentPrice = getCurrentPrice(pos.outcome, pos.markets)
      const currentValue = pos.shares * currentPrice
      const unrealizedProfit = currentValue - pos.total_invested

      return {
        ...pos,
        unrealized_profit: unrealizedProfit
      }
    }) || []

    setPositions(enrichedPositions)
    return enrichedPositions
  }

  const fetchTrades = async (userId: string) => {
    const { data: tradesData, error } = await supabase
      .from('market_trades')
      .select(`
        *,
        markets:market_id (
          title,
          market_type
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching trades:', error)
      return []
    }
    
    setTrades(tradesData || [])
    return tradesData || []
  }

  const refreshPortfolioData = async () => {
    if (!user) return
    
    try {
      await fetchPortfolioData(user.id)
    } catch (error) {
      console.error('Error refreshing portfolio:', error)
    }
  }

  const calculateStats = useCallback((positions: Position[], trades: Trade[]) => {
    const totalInvested = positions.reduce((sum, pos) => sum + pos.total_invested, 0)
    
    const totalValue = positions.reduce((sum, pos) => {
      const currentPrice = getCurrentPrice(pos.outcome, pos.markets)
      return sum + (pos.shares * currentPrice)
    }, 0)

    const totalPnL = totalValue - totalInvested
    const pnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

    const activePositions = positions.length
    const totalTrades = trades.length

    // Calculate today's PnL (simplified - last 24 hours)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTrades = trades.filter(t => new Date(t.created_at) >= today)
    const todayPnL = todayTrades.reduce((sum, trade) => {
      return trade.trade_type === 'buy' ? sum - trade.total_amount : sum + trade.total_amount
    }, 0)

    // Calculate best/worst performers
    const performers = positions.map(pos => ({
      title: pos.markets?.title || 'Unknown',
      pnl: pos.unrealized_profit,
      pnlPercentage: pos.total_invested > 0 ? (pos.unrealized_profit / pos.total_invested) * 100 : 0
    })).filter(p => p.pnl !== 0)

    const bestPerformer = performers.length > 0 ? 
      performers.reduce((best, current) => current.pnl > best.pnl ? current : best) : null
    const worstPerformer = performers.length > 0 ? 
      performers.reduce((worst, current) => current.pnl < worst.pnl ? current : worst) : null

    // Calculate win rate
    const resolvedPositions = positions.filter(p => p.markets?.status === 'resolved')
    const profitablePositions = resolvedPositions.filter(p => p.unrealized_profit > 0).length
    const winRate = resolvedPositions.length > 0 ? (profitablePositions / resolvedPositions.length) * 100 : 0

    // Calculate positions by outcome
    const byOutcome = {
      yes: positions.filter(p => p.outcome === 'yes').length,
      no: positions.filter(p => p.outcome === 'no').length,
      draw: positions.filter(p => p.outcome === 'draw').length
    }

    setStats({
      totalInvested,
      totalValue,
      totalPnL,
      pnLPercentage,
      activePositions,
      totalTrades,
      winRate,
      todayPnL,
      bestPerformer,
      worstPerformer,
      byOutcome
    })
  }, [])

  // Calculate stats when positions or trades change
  useEffect(() => {
    if (positions.length > 0 || trades.length > 0) {
      calculateStats(positions, trades)
    }
  }, [positions, trades, calculateStats])

  useEffect(() => {
    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header with Connection Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Mon Portfolio</h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`} />
              {connectionStatus === 'connected' ? 'Connecté en temps réel' : 
               connectionStatus === 'connecting' ? 'Connexion...' : 'Hors ligne'}
            </div>
          </div>
          
          <button
            onClick={refreshPortfolioData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {/* Real-time Updates Panel */}
        {realTimeUpdates.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Activité en Temps Réel
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {realTimeUpdates.map((update, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      update.type === 'price' ? 'bg-blue-500' :
                      update.type === 'trade' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`} />
                    <span className="text-gray-600 capitalize">
                      {update.type === 'price' ? 'Prix mis à jour' :
                       update.type === 'trade' ? 'Nouveau trade' :
                       'Position modifiée'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(update.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Valeur du Portfolio</span>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${stats.totalValue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <TrendingUpIcon className="h-4 w-4" />
              Investi: ${stats.totalInvested.toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Gain/Perte Total</span>
              {stats.totalPnL >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className={`text-2xl font-bold ${
              stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
            </div>
            <div className={`text-sm mt-1 ${
              stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.totalPnL >= 0 ? '+' : ''}{stats.pnLPercentage.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Aujourd'hui</span>
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div className={`text-2xl font-bold ${
              stats.todayPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.todayPnL >= 0 ? '+' : ''}${stats.todayPnL.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {stats.totalTrades} trades total
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Performance</span>
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.winRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {stats.activePositions} positions actives
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        {performanceData.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Évolution du Portfolio</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: unknown) => {
                      const numValue = typeof value === 'number' ? value : Number(value)
                      return [`$${numValue.toFixed(2)}`, 'Valeur']
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('positions')}
                    className={`flex-1 py-4 px-6 font-medium transition-colors ${
                      activeTab === 'positions'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Mes Positions ({positions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-4 px-6 font-medium transition-colors ${
                      activeTab === 'history'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Historique ({trades.length})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'positions' ? (
                  <PositionsList 
                    positions={positions} 
                    getOutcomeDisplay={getOutcomeDisplay}
                    getOutcomeColor={getOutcomeColor}
                  />
                ) : (
                  <TradeHistory trades={trades} />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Portfolio Distribution */}
            {portfolioDistribution.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Répartition du Portfolio
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={portfolioDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {portfolioDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: unknown) => {
                          const numValue = typeof value === 'number' ? value : Number(value)
                          return [`$${numValue.toFixed(2)}`, 'Valeur']
                        }} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Best/Worst Performers */}
            {(stats.bestPerformer || stats.worstPerformer) && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performers</h3>
                <div className="space-y-4">
                  {stats.bestPerformer && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-green-900 text-sm">
                          {stats.bestPerformer.title}
                        </div>
                        <div className="text-green-600 text-xs">
                          +{stats.bestPerformer.pnlPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-green-600 font-bold">
                        +${stats.bestPerformer.pnl.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {stats.worstPerformer && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-red-900 text-sm">
                          {stats.worstPerformer.title}
                        </div>
                        <div className="text-red-600 text-xs">
                          {stats.worstPerformer.pnlPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-red-600 font-bold">
                        ${stats.worstPerformer.pnl.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                <Link
                  href="/markets"
                  className="block w-full bg-primary text-white text-center py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Explorer les Marchés
                </Link>
                <Link
                  href="/markets?type=3outcome"
                  className="block w-full bg-orange-500 text-white text-center py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trophy className="h-4 w-4" />
                  Paris Sportifs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Extracted Components (keep the same as before)
interface PositionsListProps {
  positions: Position[]
  getOutcomeDisplay: (position: Position) => string
  getOutcomeColor: (outcome: string) => string
}

const PositionsList = ({ 
  positions, 
  getOutcomeDisplay, 
  getOutcomeColor 
}: PositionsListProps) => {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Aucune position active
        </h3>
        <p className="text-gray-600 mb-4">
          Commencez à trader pour voir vos positions ici
        </p>
        <Link
          href="/markets"
          className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Explorer les marchés
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {positions.map((position: Position) => {
        const currentValue = getPositionValue(position)
        const pnl = position.unrealized_profit
        const pnlPercentage = position.total_invested > 0 ? (pnl / position.total_invested) * 100 : 0
        const currentPrice = getCurrentPrice(position.outcome, position.markets)

        return (
          <Link
            key={position.id}
            href={`/markets/${position.market_id}`}
            className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {position.markets?.title || 'Marché'}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${getOutcomeColor(position.outcome)}20`,
                      color: getOutcomeColor(position.outcome)
                    }}
                  >
                    {getOutcomeDisplay(position)}
                  </span>
                  {position.markets?.market_type === '3outcome' && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                      <Divide className="h-3 w-3" />
                      3 Issues
                    </span>
                  )}
                  <span className="text-sm text-gray-600">
                    {position.shares.toFixed(2)} parts
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  pnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </div>
                <div className={`text-sm ${
                  pnl >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-200 text-sm">
              <div>
                <div className="text-xs text-gray-500">Investi</div>
                <div className="font-medium text-gray-900">
                  ${position.total_invested.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Valeur Actuelle</div>
                <div className="font-medium text-gray-900">
                  ${currentValue.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Prix Moyen</div>
                <div className="font-medium text-gray-900">
                  ${position.average_price.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Prix Actuel</div>
                <div className="font-medium text-gray-900">
                  {(currentPrice * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

interface TradeHistoryProps {
  trades: Trade[]
}

const TradeHistory = ({ trades }: TradeHistoryProps) => {
  if (trades.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Aucune transaction
        </h3>
        <p className="text-gray-600">
          Votre historique de trading apparaîtra ici
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              trade.trade_type === 'buy'
                ? 'bg-green-100'
                : 'bg-red-100'
            }`}>
              {trade.trade_type === 'buy' ? (
                <ArrowDownRight className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {trade.markets?.title || 'Marché supprimé'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  {trade.trade_type === 'buy' ? 'Achat' : 'Vente'} {trade.outcome.toUpperCase()}
                </span>
                {trade.markets?.market_type === '3outcome' && (
                  <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs">
                    3 Issues
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(trade.created_at).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-semibold ${
              trade.trade_type === 'buy' ? 'text-red-600' : 'text-green-600'
            }`}>
              {trade.trade_type === 'buy' ? '-' : '+'}${trade.total_amount.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              {trade.shares.toFixed(2)} parts @ ${trade.price_per_share.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
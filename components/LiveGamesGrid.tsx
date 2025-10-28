// components/LiveGamesGrid.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { 
  Clock, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PlayCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { 
  FaFutbol, 
  FaBasketballBall, 
  FaFootballBall 
} from "react-icons/fa";
import { GiTennisRacket, GiHockey } from "react-icons/gi";
import { isGameLive, getTimeUntilGame as getGameTimeUntil } from '@/lib/utils/gameStatus'

interface LiveMarket {
  id: string
  title: string
  description: string
  status: string
  total_volume: number
  unique_traders: number
  yes_price: number
  no_price: number
  draw_price?: number
  market_type: string
  sport_type?: string
  league?: string
  team_a_name?: string
  team_b_name?: string
  team_a_image?: string
  team_b_image?: string
  team_a_score?: number
  team_b_score?: number
  game_date?: string
  end_date?: string
  time_zone?: string
  created_at: string
  sport_types?: {
    name: string
    icon: string
  }
  leagues?: {
    name: string
  }
  market_outcomes?: Array<{
    id: string
    title: string
    yes_price: number
    no_price: number
    total_yes_shares: number
    total_no_shares: number
  }>
}

interface LiveGamesGridProps {
  maxItems?: number
  showHeader?: boolean
  showAllGames?: boolean
}

export const sportIcons: { [key: string]: any } = {
  // Football (soccer)
  football: FaFutbol,
  soccer: FaFutbol,
  "football européen": FaFutbol,

  // Football américain
  "football américain": FaFootballBall,
  americanfootball: FaFootballBall,

  // Basket
  basketball: FaBasketballBall,
  basket: FaBasketballBall,

  // Tennis
  tennis: GiTennisRacket,
  'hockey': GiHockey,
};

export default function LiveGamesGrid({ 
  maxItems = 6, 
  showHeader = true,
  showAllGames = false
}: LiveGamesGridProps) {
  const [markets, setMarkets] = useState<LiveMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Calculate pagination
  const itemsPerPage = showAllGames ? markets.length : maxItems
  const totalPages = Math.ceil(markets.length / itemsPerPage)
  const startIndex = currentPage * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMarkets = markets.slice(startIndex, endIndex)

  useEffect(() => {
    // Initial data fetch
    fetchMarkets()

    // Set up Supabase realtime subscription
    setupRealtimeSubscription()

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const fetchMarkets = async () => {
    try {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          sport_types:sport_type_id(name, icon),
          leagues:league_id(name),
          market_outcomes(*)
        `)
        .eq('status', 'active')
        .eq('market_type', 'sports')
        .not('game_date', 'is', null)
        .not('end_date', 'is', null)
        .gt('end_date', now)        // Only show games that haven't ended (end_date > now)
        .order('game_date', { ascending: true })

      if (error) throw error

      setMarkets(data || [])
    } catch (error) {
      console.error('Error fetching markets:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    // Create a channel for realtime updates
    const channel = supabase
      .channel('live-markets-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'markets',
          filter: 'status=eq.active'
        },
        (payload) => {
          handleRealtimeEvent(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to live market updates')
        }
      })

    channelRef.current = channel
  }

  const handleRealtimeEvent = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setMarkets((currentMarkets) => {
      switch (eventType) {
        case 'INSERT':
          // Add market if it's active, sports type, and hasn't ended yet
          if (newRecord.status === 'active' && newRecord.market_type === 'sports' && newRecord.end_date) {
            const now = new Date()
            const gameEnd = new Date(newRecord.end_date)
            if (now < gameEnd) {
              return [newRecord, ...currentMarkets]
            }
          }
          return currentMarkets

        case 'UPDATE':
          // Check if the game hasn't ended yet
          if (newRecord.end_date) {
            const now = new Date()
            const gameEnd = new Date(newRecord.end_date)
            if (now < gameEnd) {
              return currentMarkets.map((market) =>
                market.id === newRecord.id ? { ...market, ...newRecord } : market
              )
            } else {
              // Remove market if it has ended
              return currentMarkets.filter((market) => market.id !== newRecord.id)
            }
          }
          return currentMarkets

        case 'DELETE':
          // Remove deleted market
          return currentMarkets.filter((market) => market.id !== oldRecord.id)

        default:
          return currentMarkets
      }
    })
  }

  const formatPrice = (price: number) => {
    return `${(price * 100).toFixed(0)}¢`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`
    return `$${volume}`
  }

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }

  if (loading) {
    return <LiveGamesGridSkeleton count={maxItems} />
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No live games at the moment</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Live Games</h2>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          
          {totalPages > 1 && !showAllGames && (
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={nextPage}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentMarkets.map((market) => {
            const SportIcon = market.sport_type ? sportIcons[market.sport_type.toLowerCase()] : FaFutbol
            const isLive = isGameLive(market)
            const timeUntil = market.game_date ? getGameTimeUntil(market) : null
            const isThreeWay = market.draw_price !== undefined && market.draw_price !== null
            const hasScores = (market.team_a_score !== undefined && market.team_a_score !== null) ||
                            (market.team_b_score !== undefined && market.team_b_score !== null)
            const isUp = (market.yes_price || 0.5) > 0.5

            return (
              <Link 
                key={market.id} 
                href={`/market/${market.id}`}
                className="group"
              >
                <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 p-4 h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {SportIcon && <SportIcon className="h-5 w-5 text-blue-600" />}
                      {market.sport_types && (
                        <span className="text-xs font-medium text-gray-600">
                          {market.sport_types.name}
                        </span>
                      )}
                    </div>
                    {timeUntil && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        isLive ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {isLive && <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                        <Clock className="h-3 w-3" />
                        <span>{timeUntil}</span>
                      </div>
                    )}
                  </div>

                  {/* Teams with Scores */}
                  {(market.team_a_name || market.team_b_name) && (
                    <div className="text-center mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 text-right">
                          <div className="font-semibold text-gray-900 text-sm truncate">
                            {market.team_a_name}
                          </div>
                          {hasScores && (
                            <div className={`text-2xl font-bold ${
                              isLive ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {market.team_a_score}
                            </div>
                          )}
                          {market.team_a_image ? (
                            <img
                              src={market.team_a_image}
                              alt={market.team_a_name}
                              className="w-12 h-12 object-contain mx-auto mt-1 rounded-full bg-gray-100 p-1"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mt-1">
                              <span className="text-white text-xs font-bold">
                                {market.team_a_name?.[0] || 'A'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mx-3">
                          {hasScores ? (
                            <div className="text-xl font-bold text-gray-600">-</div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-600">VS</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 text-sm truncate">
                            {market.team_b_name}
                          </div>
                          {hasScores && (
                            <div className={`text-2xl font-bold ${
                              isLive ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {market.team_b_score}
                            </div>
                          )}
                          {market.team_b_image ? (
                            <img
                              src={market.team_b_image}
                              alt={market.team_b_name}
                              className="w-12 h-12 object-contain mx-auto mt-1 rounded-full bg-gray-100 p-1"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mt-1">
                              <span className="text-white text-xs font-bold">
                                {market.team_b_name?.[0] || 'B'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {market.leagues && (
                        <div className="text-xs text-gray-500 truncate">
                          {market.leagues.name}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prices */}
                  <div className={`grid gap-2 mb-3 ${isThreeWay ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-700">YES</span>
                        {isUp && (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <div className="text-lg font-bold text-green-700">
                        {formatPrice(market.yes_price || 0.5)}
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-red-700">NO</span>
                        {!isUp && (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                      <div className="text-lg font-bold text-red-700">
                        {formatPrice(market.no_price || 0.5)}
                      </div>
                    </div>

                    {isThreeWay && market.draw_price && (
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <div className="text-xs font-medium text-blue-700 mb-1">DRAW</div>
                        <div className="text-lg font-bold text-blue-700">
                          {formatPrice(market.draw_price)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-medium">{formatVolume(market.total_volume || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{market.unique_traders || 0}</span>
                    </div>
                    <div className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                      Trade →
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentPage ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Skeleton loader component
function LiveGamesGridSkeleton({ count = 6 }: { count: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 bg-gray-300 rounded animate-pulse" />
        <div className="h-7 w-32 bg-gray-300 rounded animate-pulse" />
        <div className="w-12 h-5 bg-gray-300 rounded-full animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            {/* Header */}
            <div className="flex justify-between mb-3">
              <div className="w-20 h-5 bg-gray-300 rounded" />
              <div className="w-12 h-4 bg-gray-300 rounded" />
            </div>

            {/* Teams with Scores */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-center flex-1">
                <div className="w-16 h-4 bg-gray-300 rounded mx-auto mb-2" />
                <div className="w-8 h-6 bg-gray-300 rounded mx-auto mb-2" />
                <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto" />
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full" />
              <div className="text-center flex-1">
                <div className="w-16 h-4 bg-gray-300 rounded mx-auto mb-2" />
                <div className="w-8 h-6 bg-gray-300 rounded mx-auto mb-2" />
                <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto" />
              </div>
            </div>

            {/* League */}
            <div className="w-24 h-3 bg-gray-300 rounded mx-auto mb-4" />

            {/* Prices */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-200 rounded-lg p-2">
                <div className="w-8 h-3 bg-gray-300 rounded mb-1" />
                <div className="w-12 h-5 bg-gray-300 rounded" />
              </div>
              <div className="bg-gray-200 rounded-lg p-2">
                <div className="w-8 h-3 bg-gray-300 rounded mb-1" />
                <div className="w-12 h-5 bg-gray-300 rounded" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <div className="w-12 h-3 bg-gray-300 rounded" />
              <div className="w-8 h-3 bg-gray-300 rounded" />
              <div className="w-10 h-3 bg-gray-300 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
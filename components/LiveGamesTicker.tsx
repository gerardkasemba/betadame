// components/LiveGamesTicker.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { 
  FaFutbol, 
  FaBasketballBall, 
  FaFootballBall 
} from "react-icons/fa"
import { GiTennisRacket, GiHockey } from "react-icons/gi"
import { isGameLive, getGameStatus } from '@/lib/utils/gameStatus'

interface LiveGame {
  id: string
  title: string
  status: string
  market_type: string
  sport_type?: string
  league?: string
  team_a_name?: string
  team_b_name?: string
  team_a_image?: string
  team_b_image?: string
  team_a_score?: number
  team_b_score?: number
  yes_price: number
  no_price: number
  total_volume: number
  game_date?: string
  end_date?: string
  time_zone?: string
  period?: string
  time_remaining?: string
  created_at: string
  sport_types?: {
    name: string
    icon: string
  }
  leagues?: {
    name: string
  }
}

interface LiveGamesTickerProps {
  showControls?: boolean
  autoScroll?: boolean
  scrollSpeed?: number
}

const sportIcons: { [key: string]: any } = {
  football: FaFutbol,
  soccer: FaFutbol,
  basketball: FaBasketballBall,
  "american-football": FaFootballBall,
  americanfootball: FaFootballBall,
  tennis: GiTennisRacket,
  hockey: GiHockey,
}

export default function LiveGamesTicker({ 
  showControls = true,
  autoScroll = false,
  scrollSpeed = 50
}: LiveGamesTickerProps) {
  const [games, setGames] = useState<LiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    fetchGames()
    setupRealtimeSubscription()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !scrollContainerRef.current) return

    const container = scrollContainerRef.current
    let animationFrameId: number

    const scroll = () => {
      if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
        container.scrollLeft = 0
      } else {
        container.scrollLeft += 1
      }
      animationFrameId = requestAnimationFrame(scroll)
    }

    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(scroll)
    }, scrollSpeed)

    return () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(animationFrameId)
    }
  }, [autoScroll, scrollSpeed, games])

  const fetchGames = async () => {
    try {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          sport_types:sport_type_id(name, icon),
          leagues:league_id(name)
        `)
        .eq('status', 'active')
        .eq('market_type', 'sports')
        .not('game_date', 'is', null)
        .not('end_date', 'is', null)
        .gt('end_date', now)        // Only show games that haven't ended (end_date > now)
        .order('game_date', { ascending: true })
        .limit(20)

      if (error) throw error
      setGames(data || [])
    } catch (error) {
      console.error('Error fetching live games:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('live-games-ticker')
      .on(
        'postgres_changes',
        {
          event: '*',
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
          console.log('✅ Ticker subscribed to live updates')
        }
      })

    channelRef.current = channel
  }

  const handleRealtimeEvent = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setGames((currentGames) => {
      switch (eventType) {
        case 'INSERT':
          // Add game if it's active, sports type, and hasn't ended yet
          if (newRecord.status === 'active' && newRecord.market_type === 'sports' && newRecord.end_date) {
            const now = new Date()
            const gameEnd = new Date(newRecord.end_date)
            if (now < gameEnd) {
              return [newRecord, ...currentGames]
            }
          }
          return currentGames

        case 'UPDATE':
          // Check if the game hasn't ended yet
          if (newRecord.end_date) {
            const now = new Date()
            const gameEnd = new Date(newRecord.end_date)
            if (now < gameEnd) {
              return currentGames.map((game) =>
                game.id === newRecord.id ? { ...game, ...newRecord } : game
              )
            } else {
              // Remove game if it has ended
              return currentGames.filter((game) => game.id !== newRecord.id)
            }
          }
          return currentGames

        case 'DELETE':
          return currentGames.filter((game) => game.id !== oldRecord.id)

        default:
          return currentGames
      }
    })
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const scrollAmount = 300
    const newScrollLeft = scrollContainerRef.current.scrollLeft + 
      (direction === 'right' ? scrollAmount : -scrollAmount)
    
    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  const formatPrice = (price: number) => {
    return `${(price * 100).toFixed(1)}¢`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(2)}K`
    return `$${volume}`
  }

  if (loading) {
    return <LiveGamesTickerSkeleton />
  }

  if (games.length === 0) {
    return null
  }

  return (
    <div className="relative w-full bg-blue-800 border-y border-blue-700">
      {/* Left scroll button */}
      {showControls && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 rounded-tl-md rounded-bl-md z-10 bg-gradient-to-r from-blue-800 to-transparent px-2 hover:from-blue-700 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-0 min-w-max">
          {games.map((game, index) => {
            const SportIcon = game.sport_type ? sportIcons[game.sport_type.toLowerCase()] : FaFutbol
            const isLive = isGameLive(game)

            return (
              <Link
                key={game.id}
                href={`/dashboard/markets/${game.id}`}
                className="group"
              >
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-blue-700 transition-colors border-r border-blue-700 min-w-[280px]">
                  {/* Live indicator and period */}
                  <div className="flex flex-col items-start min-w-[60px]">
                    {isLive && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-red-500 text-xs font-bold">LIVE</span>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      </div>
                    )}
                    <div className="text-white text-xs font-medium">
                      {game.period || 'LIVE'}
                    </div>
                    {(game.leagues?.name || game.league) && (
                      <div className="text-blue-400 text-[10px]">
                        {game.leagues?.name || game.league}
                      </div>
                    )}
                  </div>

                  {/* Teams and scores */}
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    {/* Team A */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {SportIcon && <SportIcon className="h-3 w-3 text-blue-400" />}
                        <span className="text-white text-sm font-medium">
                          {game.team_a_name}
                        </span>
                      </div>
                      <span className="text-white text-sm font-bold min-w-[24px] text-right">
                        {game.team_a_score ?? '-'}
                      </span>
                    </div>

                    {/* Team B */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {SportIcon && <SportIcon className="h-3 w-3 text-blue-400" />}
                        <span className="text-white text-sm font-medium">
                          {game.team_b_name}
                        </span>
                      </div>
                      <span className="text-white text-sm font-bold min-w-[24px] text-right">
                        {game.team_b_score ?? '-'}
                      </span>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="flex flex-col gap-1 min-w-[50px]">
                    <div className={`text-xs font-bold text-right ${
                      game.yes_price > 0.5 ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      {formatPrice(game.yes_price)}
                    </div>
                    <div className={`text-xs font-bold text-right ${
                      game.no_price > 0.5 ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {formatPrice(game.no_price)}
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="text-blue-400 text-xs min-w-[80px] text-right">
                    {formatVolume(game.total_volume)} Vol.
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Right scroll button */}
      {showControls && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 rounded-tr-md rounded-br-md bottom-0 z-10 bg-gradient-to-l from-blue-800 to-transparent px-2 hover:from-blue-700 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

// Skeleton loader
function LiveGamesTickerSkeleton() {
  return (
    <div className="w-full bg-blue-800 border-y border-blue-700 py-3">
      <div className="flex gap-0 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 border-r border-blue-700 min-w-[280px] animate-pulse">
            <div className="flex flex-col gap-1 min-w-[60px]">
              <div className="h-4 w-12 bg-blue-700 rounded" />
              <div className="h-3 w-8 bg-blue-700 rounded" />
            </div>
            <div className="flex flex-col gap-2 min-w-[120px]">
              <div className="h-4 w-24 bg-blue-700 rounded" />
              <div className="h-4 w-24 bg-blue-700 rounded" />
            </div>
            <div className="flex flex-col gap-2 min-w-[50px]">
              <div className="h-3 w-10 bg-blue-700 rounded ml-auto" />
              <div className="h-3 w-10 bg-blue-700 rounded ml-auto" />
            </div>
            <div className="h-3 w-16 bg-blue-700 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
// hooks/useSportsGamesRealtime.ts
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface SportType {
  id: string
  name: string
  icon: string
}

interface League {
  id: string
  name: string
  country_code: string | null
}

interface Team {
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
}

export interface SportsGame {
  id: string
  sport_type_id: string
  home_team_id: string
  away_team_id: string
  scheduled_at: string
  status: string
  home_score: number | null
  away_score: number | null
  venue: string | null
  league_id: string | null
  api_id: string | null
  created_at: string
  updated_at: string
  sport_type: SportType
  home_team: Team
  away_team: Team
  league: League | null
}

interface UseSportsGamesRealtimeProps {
  sportTypeId?: string
  date?: string
  leagueId?: string
  enabled?: boolean
}

export function useSportsGamesRealtime({
  sportTypeId,
  date,
  leagueId,
  enabled = true
}: UseSportsGamesRealtimeProps) {
  const [games, setGames] = useState<SportsGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const supabase = createClient()

  // Fetch games from database
  const fetchGames = useCallback(async () => {
    if (!sportTypeId) {
      setGames([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('sports_games')
        .select(`
          *,
          sport_type: sport_type_id (*),
          home_team: home_team_id (*),
          away_team: away_team_id (*),
          league: league_id (*)
        `)
        .eq('sport_type_id', sportTypeId)

      // Filter by date if provided
      if (date) {
        const startDate = new Date(date)
        const endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 1)
        
        query = query
          .gte('scheduled_at', startDate.toISOString())
          .lt('scheduled_at', endDate.toISOString())
      }

      // Filter by league if provided
      if (leagueId) {
        query = query.eq('league_id', leagueId)
      }

      query = query.order('scheduled_at', { ascending: true })

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setGames(data || [])
      setLastUpdate(new Date())
      console.log(`✅ Fetched ${data?.length || 0} games from database`)
    } catch (err: any) {
      console.error('Error fetching games:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, sportTypeId, date, leagueId])

  // Set up realtime subscription
  useEffect(() => {
    if (!enabled || !sportTypeId) {
      setIsConnected(false)
      return
    }

    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      console.log('🔌 Setting up realtime subscription for sport:', sportTypeId)
      
      // Fetch initial data
      await fetchGames()

      // Set up realtime channel for sports_games table
      channel = supabase
        .channel(`sports_games_${sportTypeId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'sports_games',
            filter: `sport_type_id=eq.${sportTypeId}`
          },
          async (payload) => {
            console.log('📡 Realtime update received:', payload.eventType, payload)
            setLastUpdate(new Date())

            if (payload.eventType === 'INSERT') {
              // Fetch the full game data with all relationships
              const { data: newGame } = await supabase
                .from('sports_games')
                .select(`
                  *,
                  sport_type: sport_type_id (*),
                  home_team: home_team_id (*),
                  away_team: away_team_id (*),
                  league: league_id (*)
                `)
                .eq('id', payload.new.id)
                .single()

              if (newGame) {
                setGames((prev) => {
                  // Check if game already exists
                  const exists = prev.some(g => g.id === newGame.id)
                  if (exists) return prev
                  
                  // Add new game and sort by scheduled_at
                  const updated = [...prev, newGame].sort((a, b) => 
                    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                  )
                  console.log('✅ Added new game:', newGame.id)
                  return updated
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              // Fetch updated game data with relationships
              const { data: updatedGame } = await supabase
                .from('sports_games')
                .select(`
                  *,
                  sport_type: sport_type_id (*),
                  home_team: home_team_id (*),
                  away_team: away_team_id (*),
                  league: league_id (*)
                `)
                .eq('id', payload.new.id)
                .single()

              if (updatedGame) {
                setGames((prev) => {
                  const updated = prev.map((game) => 
                    game.id === updatedGame.id ? updatedGame : game
                  )
                  console.log('✅ Updated game:', updatedGame.id)
                  return updated
                })
              }
            } else if (payload.eventType === 'DELETE') {
              setGames((prev) => {
                const updated = prev.filter((game) => game.id !== payload.old.id)
                console.log('✅ Deleted game:', payload.old.id)
                return updated
              })
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status)
          setIsConnected(status === 'SUBSCRIBED')
          
          if (status === 'CHANNEL_ERROR') {
            setError('Failed to connect to realtime updates')
          }
        })
    }

    setupRealtimeSubscription()

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from realtime channel')
        supabase.removeChannel(channel)
        setIsConnected(false)
      }
    }
  }, [enabled, sportTypeId, fetchGames])

  return {
    games,
    loading,
    error,
    isConnected,
    lastUpdate,
    refetch: fetchGames
  }
}
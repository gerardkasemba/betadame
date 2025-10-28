// app/admin/sports-games/page.tsx - WITH MARKET CREATION
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar, 
  Filter, 
  Download, 
  RefreshCw, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreHorizontal,
  Eye,
  Plus,
  Trophy,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { CreateMarketFromGame } from '@/components/CreateMarketFromGame'
import { BulkCreateMarkets } from '@/components/bulk-create-markets'

interface SportType {
  id: string
  name: string
  icon: string
}

interface League {
  id: string
  name: string
  country_code: string | null
  logo: string | null
}

interface Team {
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
}

interface SportsGame {
  id: string
  scheduled_at: string
  status: string
  home_score: number | null
  away_score: number | null
  venue: string | null
  sport_type: SportType
  home_team: Team
  away_team: Team
  league: League | null
}

export default function SportsGamesPage() {
  const [sportTypes, setSportTypes] = useState<SportType[]>([])
  const [selectedSport, setSelectedSport] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [games, setGames] = useState<SportsGame[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [filterView, setFilterView] = useState<'all' | 'today' | 'upcoming'>('upcoming')
  
  // Market creation states
  const [selectedGameForMarket, setSelectedGameForMarket] = useState<SportsGame | null>(null)
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [selectedGamesForBulk, setSelectedGamesForBulk] = useState<Set<string>>(new Set())
  const [creatingMarket, setCreatingMarket] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchSportTypes()
  }, [])

  useEffect(() => {
    if (selectedSport) {
      fetchLeagues()
      fetchGames()
    }
  }, [selectedSport, selectedDate, selectedLeague, filterView])

  const fetchSportTypes = async () => {
    const { data, error } = await supabase
      .from('sport_types')
      .select('*')
      .order('name')

    if (data) {
      setSportTypes(data)
      if (data.length > 0) {
        setSelectedSport(data[0].id)
      }
    }
  }

  const fetchLeagues = async () => {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('sport_type_id', selectedSport)
      .order('name')

    if (data) {
      setLeagues(data)
    }
  }

  const fetchGames = async () => {
    setLoading(true)
    setError('')
    
    let query = supabase
      .from('sports_games')
      .select(`
        *,
        sport_type: sport_type_id (*),
        home_team: home_team_id (*),
        away_team: away_team_id (*),
        league: league_id (*)
      `)
      .eq('sport_type_id', selectedSport)
    
    const now = new Date()
    
    if (filterView === 'upcoming') {
      query = query.gte('scheduled_at', now.toISOString())
    } else if (filterView === 'today') {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      
      query = query
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())
    }

    if (selectedDate && filterView === 'upcoming') {
      const [year, month] = selectedDate.split('-').map(Number)
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59)
      
      query = query
        .gte('scheduled_at', startOfMonth.toISOString())
        .lte('scheduled_at', endOfMonth.toISOString())
    }

    if (selectedLeague) {
      query = query.eq('league_id', selectedLeague)
    }

    query = query.order('scheduled_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching games:', error)
      setError(error.message)
    } else {
      setGames(data || [])
      console.log(`✅ Loaded ${data?.length || 0} games`)
    }
    
    setLoading(false)
  }

  const fetchFromAPI = async () => {
    setFetching(true)
    setError('')
    
    try {
      console.log('Fetching games for:', { selectedSport, selectedDate, selectedLeague })
      
      const response = await fetch('/api/sports/fetch-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sportType: selectedSport,
          date: selectedDate,
          leagueId: selectedLeague || undefined
        })
      })

      const result = await response.json()
      console.log('API response:', result)

      if (!response.ok) {
        throw new Error(result.error || result.details || `HTTP ${response.status}`)
      }

      if (result.success) {
        await fetchGames()
        alert(`✅ Successfully fetched ${result.count} games!`)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error: any) {
      console.error('Fetch error:', error)
      setError(error.message)
    } finally {
      setFetching(false)
    }
  }

  // Quick create market for a single game
  const quickCreateMarket = async (game: SportsGame) => {
    try {
      setCreatingMarket(game.id)

      const response = await fetch('/api/markets/create-from-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: game.id,
          marketType: 'binary',
          initialLiquidity: 100,
          category: 'sports'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create market')
      }

      alert(`✅ Market created successfully!\n\n"${data.market.title}"`)
      
    } catch (error: any) {
      console.error('Error creating market:', error)
      alert(`❌ Failed to create market: ${error.message}`)
    } finally {
      setCreatingMarket(null)
    }
  }

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dateOnly = date.toDateString()
    const todayOnly = today.toDateString()
    const tomorrowOnly = tomorrow.toDateString()

    if (dateOnly === todayOnly) {
      return 'Today, ' + date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      })
    } else if (dateOnly === tomorrowOnly) {
      return 'Tomorrow, ' + date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  const formatGameTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'postponed':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <Play className="h-3 w-3" />
      case 'scheduled':
        return <Clock className="h-3 w-3" />
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  // Group games by date
  const groupedGames = games.reduce((acc, game) => {
    const dateKey = new Date(game.scheduled_at).toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(game)
    return acc
  }, {} as Record<string, SportsGame[]>)

  const upcomingGames = games.filter(g => new Date(g.scheduled_at) > new Date())

  // Show modal for single game market creation
  if (selectedGameForMarket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setSelectedGameForMarket(null)}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Games
          </button>
          <CreateMarketFromGame
            game={selectedGameForMarket}
            onSuccess={(market) => {
              alert(`✅ Market created: ${market.title}`)
              setSelectedGameForMarket(null)
            }}
            onCancel={() => setSelectedGameForMarket(null)}
          />
        </div>
      </div>
    )
  }

  // Show bulk creation modal
  if (showBulkCreate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setShowBulkCreate(false)}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Games
          </button>
          <BulkCreateMarkets
            games={upcomingGames}
            onSuccess={(markets) => {
              alert(`✅ Successfully created ${markets.length} markets!`)
              setShowBulkCreate(false)
            }}
            onCancel={() => setShowBulkCreate(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sports Games Management</h1>
          <p className="text-gray-600">View and manage sports games, create prediction markets</p>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Sport Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport Type
              </label>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sportTypes.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>

            {/* League */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                League
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Leagues</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <input
                type="month"
                value={selectedDate.substring(0, 7)}
                onChange={(e) => setSelectedDate(e.target.value + '-01')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View
              </label>
              <select
                value={filterView}
                onChange={(e) => setFilterView(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="upcoming">Upcoming Games</option>
                <option value="today">Today Only</option>
                <option value="all">All Games</option>
              </select>
            </div>

            {/* Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions
              </label>
              <button
                onClick={fetchFromAPI}
                disabled={fetching}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
              >
                {fetching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Fetch New Games
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Market Creation Actions */}
          {upcomingGames.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>{upcomingGames.length} upcoming games available for markets</span>
                </div>
                <button
                  onClick={() => setShowBulkCreate(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Bulk Create Markets
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Games</p>
                <p className="text-2xl font-bold text-gray-900">{games.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {games.filter(g => g.status === 'scheduled').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Live</p>
                <p className="text-2xl font-bold text-red-600">
                  {games.filter(g => g.status === 'live').length}
                </p>
              </div>
              <Play className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {games.filter(g => g.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Games List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading games...</span>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
              <p className="text-gray-600 mb-4">
                No games scheduled for the selected filters.
              </p>
              <button
                onClick={fetchFromAPI}
                disabled={fetching}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                Fetch Games from API
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Object.entries(groupedGames).map(([dateStr, dateGames]) => (
                <div key={dateStr} className="p-6">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatGameDate(dateGames[0].scheduled_at)}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {dateGames.length} {dateGames.length === 1 ? 'game' : 'games'}
                    </span>
                  </div>

                  {/* Games for this date */}
                  <div className="space-y-3">
                    {dateGames.map((game) => {
                      const isUpcoming = new Date(game.scheduled_at) > new Date()
                      const isCreating = creatingMarket === game.id

                      return (
                        <div
                          key={game.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          {/* Time */}
                          <div className="flex items-center gap-4 min-w-[100px]">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">
                                {formatGameTime(game.scheduled_at)}
                              </div>
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${getStatusColor(game.status)}`}>
                                {getStatusIcon(game.status)}
                                <span className="capitalize">{game.status}</span>
                              </div>
                            </div>
                          </div>

                          {/* Match */}
                          <div className="flex-1 flex items-center justify-center gap-6">
                            {/* Home Team */}
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <div className="text-right">
                                <div className="font-semibold text-gray-900">{game.home_team.name}</div>
                                <div className="text-sm text-gray-500">{game.home_team.short_name}</div>
                              </div>
                              {game.home_team.logo_url ? (
                                <img
                                  src={game.home_team.logo_url}
                                  alt={game.home_team.name}
                                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                  <span className="text-sm font-bold text-gray-600">
                                    {game.home_team.short_name || game.home_team.name.substring(0, 3).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Score */}
                            <div className="flex items-center gap-4">
                              {game.home_score !== null && game.away_score !== null ? (
                                <div className="flex items-center gap-2 text-2xl font-bold">
                                  <span className="text-gray-900">{game.home_score}</span>
                                  <span className="text-gray-400">-</span>
                                  <span className="text-gray-900">{game.away_score}</span>
                                </div>
                              ) : (
                                <div className="text-lg font-medium text-gray-400">vs</div>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center gap-3 flex-1">
                              {game.away_team.logo_url ? (
                                <img
                                  src={game.away_team.logo_url}
                                  alt={game.away_team.name}
                                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                  <span className="text-sm font-bold text-gray-600">
                                    {game.away_team.short_name || game.away_team.name.substring(0, 3).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-gray-900">{game.away_team.name}</div>
                                <div className="text-sm text-gray-500">{game.away_team.short_name}</div>
                              </div>
                            </div>
                          </div>

                          {/* League & Actions */}
                          <div className="flex items-center gap-4 min-w-[300px] justify-end">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Trophy className="h-4 w-4" />
                                {game.league?.name || 'No League'}
                              </div>
                              {game.venue && (
                                <div className="text-xs text-gray-500 mt-1">{game.venue}</div>
                              )}
                            </div>
                            
                            {/* Market Creation Buttons */}
                            {isUpcoming && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => quickCreateMarket(game)}
                                  disabled={isCreating}
                                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-1.5"
                                  title="Quick create binary market"
                                >
                                  {isCreating ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    <>
                                      <TrendingUp className="h-3.5 w-3.5" />
                                      Quick Market
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => setSelectedGameForMarket(game)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                  title="Create market with custom settings"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Custom Market
                                </button>
                              </div>
                            )}
                            
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Eye className="h-5 w-5 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
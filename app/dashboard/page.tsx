// app/sports/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  ArrowRight,
  Calendar,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LiveGamesGrid from '@/components/LiveGamesGrid';
import LiveGamesTicker from '@/components/LiveGamesTicker';
import MobileSportsFilters from '@/components/MobileSportsFilters';
import { isGameLive } from '@/lib/utils/gameStatus'
import { sportIcons } from '@/components/MobileSportsFilters'

interface Country {
  id: string
  code: string
  name: string
  flag_emoji: string
}

interface SportType {
  id: string
  name: string
  icon: string
}

interface League {
  id: string
  sport_type_id: string
  name: string
  country_code: string | null
  level: string
}

interface Team {
  id: string
  name: string
  short_name: string | null
  country_code: string
  sport_type_id: string
  logo_url: string | null
  team_type: 'club' | 'national'
}

interface MarketOutcome {
  id: string
  title: string
  description: string
  image_url?: string
  yes_price: number
  no_price: number
  total_yes_shares: number
  total_no_shares: number
}

interface Market {
  id: string
  title: string
  description: string
  category: string
  market_type: 'binary' | 'multiple' | 'sports'
  image_url?: string
  status: string
  created_at: string
  start_date?: string
  end_date: string
  resolution_date?: string
  winning_outcome?: string
  initial_liquidity: number
  min_bet_amount: number
  max_bet_amount: number
  total_volume: number
  unique_traders: number
  yes_price: number
  no_price: number
  draw_price?: number
  
  // Sports specific fields
  sport_type?: string
  league?: string
  country_code?: string
  team_a_name?: string
  team_b_name?: string
  team_a_image?: string
  team_b_image?: string
  team_a_score?: number
  team_b_score?: number
  game_date?: string
  time_zone?: string
  
  // Foreign keys
  country_id?: string
  sport_type_id?: string
  league_id?: string
  team_a_id?: string
  team_b_id?: string
  
  // Joined data
  country?: Country
  sport_type_data?: SportType
  league_data?: League
  market_outcomes?: MarketOutcome[]
}

const sortOptions = [
  { value: 'volume', label: 'Volume' },
  { value: 'traders', label: 'Traders' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'game_date', label: 'Game Date' }
]

export default function SportsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([])
  const [sports, setSports] = useState<SportType[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSport, setSelectedSport] = useState('all')
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [sortBy, setSortBy] = useState('volume')
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    fetchSportsData()
    setupRealtimeSubscription()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    filterAndSortMarkets()
  }, [markets, searchTerm, selectedSport, selectedLeague, selectedCountry, sortBy])

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('sports-markets-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'markets',
          filter: 'market_type=eq.sports'
        },
        (payload) => {
          handleRealtimeEvent(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Sports page subscribed to live updates')
        }
      })

    channelRef.current = channel
  }

  const handleRealtimeEvent = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setMarkets((currentMarkets) => {
      switch (eventType) {
        case 'INSERT':
          // Add new sports market if not ended
          if (newRecord.market_type === 'sports' && newRecord.end_date) {
            const now = new Date()
            const gameEnd = new Date(newRecord.end_date)
            if (now < gameEnd) {
              return [newRecord, ...currentMarkets]
            }
          }
          return currentMarkets

        case 'UPDATE':
          // Update existing market or remove if ended
          if (newRecord.end_date) {
            const now = new Date()
            const gameEnd = new Date(newRecord.end_date)
            if (now < gameEnd) {
              return currentMarkets.map((market) =>
                market.id === newRecord.id ? { ...market, ...newRecord } : market
              )
            } else {
              // Remove if ended
              return currentMarkets.filter((market) => market.id !== newRecord.id)
            }
          }
          return currentMarkets

        case 'DELETE':
          return currentMarkets.filter((market) => market.id !== oldRecord.id)

        default:
          return currentMarkets
      }
    })
  }

  const fetchSportsData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data in parallel
      const [
        { data: sportsData },
        { data: leaguesData },
        { data: countriesData },
        { data: marketsData }
      ] = await Promise.all([
        supabase.from('sport_types').select('*').order('name'),
        supabase.from('leagues').select('*').order('name'),
        supabase.from('countries').select('*').order('name'),
        supabase
          .from('markets')
          .select(`
            *,
            sport_type_data:sport_types!sport_type_id(*),
            league_data:leagues!league_id(*),
            country:countries!country_id(*),
            market_outcomes(*)
          `)
          .eq('market_type', 'sports')
          .is('deleted_at', null)
          .gt('end_date', new Date().toISOString())  // Only non-ended games
          .order('game_date', { ascending: true })
      ])

      setSports(sportsData || [])
      setLeagues(leaguesData || [])
      setCountries(countriesData || [])
      setMarkets(marketsData || [])
    } catch (error) {
      console.error('Error fetching sports data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortMarkets = () => {
    let filtered = [...markets]

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(market => 
        market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.team_a_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.team_b_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by sport
    if (selectedSport !== 'all') {
      filtered = filtered.filter(market => market.sport_type_id === selectedSport)
    }

    // Filter by league
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(market => market.league_id === selectedLeague)
    }

    // Filter by country
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(market => market.country_id === selectedCountry)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return (b.total_volume || 0) - (a.total_volume || 0)
        case 'traders':
          return (b.unique_traders || 0) - (a.unique_traders || 0)
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'ending_soon':
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
        case 'game_date':
          if (!a.game_date) return 1
          if (!b.game_date) return -1
          return new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
        default:
          return 0
      }
    })

    setFilteredMarkets(filtered)
  }

  const getOutcomesForDisplay = (market: Market) => {
    if (market.market_outcomes && market.market_outcomes.length > 0) {
      return market.market_outcomes
    }
    return [{
      id: 'yes',
      title: 'Yes',
      description: '',
      yes_price: market.yes_price,
      no_price: market.no_price,
      total_yes_shares: 0,
      total_no_shares: 0
    }]
  }

  const getPriceChange = (market: Market) => {
    return (market.yes_price - 0.5) * 100
  }

  const getDaysUntilEnd = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Ended'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays}d left`
  }

  const getTimeUntilGame = (gameDate: string) => {
    const now = new Date()
    const game = new Date(gameDate)
    const diffTime = game.getTime() - now.getTime()
    
    if (diffTime < 0) return 'Started'
    
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24)
      return `in ${diffDays}d ${diffHours % 24}h`
    }
    if (diffHours > 0) return `in ${diffHours}h ${diffMinutes}m`
    return `in ${diffMinutes}m`
  }

  const getMarketTitle = (market: Market) => {
    if (market.team_a_name && market.team_b_name) {
      return `${market.team_a_name} vs ${market.team_b_name}`
    }
    return market.title
  }

  const getMarketDescription = (market: Market) => {
    if (market.league_data?.name) {
      return market.league_data.name
    }
    return market.description || ''
  }

  const getSportIcon = (sportName: string) => {
    const Icon = sportIcons[sportName.toLowerCase()] || sportIcons.default
    return <Icon className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sports markets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Live Games Ticker */}

      <div className="max-w-7xl mx-auto">
        {/* NEW: MobileSportsFilters Component */}
        <div className='mb-8'>
          <MobileSportsFilters
            sports={sports}
            leagues={leagues}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedSport={selectedSport}
            setSelectedSport={setSelectedSport}
            selectedLeague={selectedLeague}
            setSelectedLeague={setSelectedLeague}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOptions={sortOptions}
          />
        </div>

        {/* Markets Grid */}
        {filteredMarkets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-2">
              <Trophy className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No sports markets found</h3>
            <p className="text-gray-600">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => {
              const outcomes = getOutcomesForDisplay(market)
              const firstOutcome = outcomes[0]
              const priceChange = getPriceChange(market)
              const isUp = priceChange >= 0
              const daysUntilEnd = getDaysUntilEnd(market.end_date)
              const isThreeWay = market.draw_price !== null && market.draw_price !== undefined && market.draw_price > 0
              const isLive = isGameLive(market)
              const hasScores = (market.team_a_score !== undefined && market.team_a_score !== null) ||
                               (market.team_b_score !== undefined && market.team_b_score !== null)

              return (
                <Link
                  key={market.id}
                  href={`/dashboard/markets/${market.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-100 overflow-hidden group"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      {(market.team_a_image || market.team_b_image) && (
                        <div className="flex items-center gap-2">
                          {market.team_a_image && (
                            <img
                              src={market.team_a_image}
                              alt={market.team_a_name || 'Team A'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          {market.team_b_image && (
                            <img
                              src={market.team_b_image}
                              alt={market.team_b_name || 'Team B'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {market.sport_type_data && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {getSportIcon(market.sport_type_data.name)}
                              {market.sport_type_data.name}
                            </span>
                          )}
                          {isLive ? (
                            <div className="flex items-center gap-1">
                              <span className="text-red-500 text-xs font-bold">LIVE</span>
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {daysUntilEnd}
                            </span>
                          )}
                          {isThreeWay && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              3-way
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                          {getMarketTitle(market)}
                        </h3>
                        
                        {/* Show Scores if Live and Available */}
                        {isLive && (
                          <div className="flex items-center gap-3 my-2 p-2 bg-gray-50 rounded-lg">
                            <div className="text-center flex-1">
                              <div className="text-xs text-gray-600 truncate">{market.team_a_name}</div>
                              <div className="text-lg font-bold text-green-600">{market.team_a_score ?? 0}</div>
                            </div>
                            <div className="text-gray-400 font-bold">-</div>
                            <div className="text-center flex-1">
                              <div className="text-xs text-gray-600 truncate">{market.team_b_name}</div>
                              <div className="text-lg font-bold text-green-600">{market.team_b_score ?? 0}</div>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {getMarketDescription(market)}
                        </p>
                        {market.game_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(market.game_date).toLocaleDateString()} • {getTimeUntilGame(market.game_date)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Trade Value Buttons */}
                    <div className={`grid gap-2 mb-3 ${isThreeWay ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <button className="bg-green-50 hover:bg-green-100 rounded-lg p-3 border border-green-200 transition-colors text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-green-700">YES</span>
                          {isUp && (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                        <div className="text-xl font-bold text-green-700">
                          {(market.yes_price * 100).toFixed(0)}¢
                        </div>
                      </button>

                      <button className="bg-red-50 hover:bg-red-100 rounded-lg p-3 border border-red-200 transition-colors text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-red-700">NO</span>
                          {!isUp && (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                        <div className="text-xl font-bold text-red-700">
                          {(market.no_price * 100).toFixed(0)}¢
                        </div>
                      </button>

                      {isThreeWay && market.draw_price && (
                        <button className="bg-blue-50 hover:bg-blue-100 rounded-lg p-3 border border-blue-200 transition-colors text-left">
                          <div className="text-xs font-semibold text-blue-700 mb-1">DRAW</div>
                          <div className="text-xl font-bold text-blue-700">
                            {(market.draw_price * 100).toFixed(0)}¢
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{(market.total_volume || 0).toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{market.unique_traders || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all">
                        <span className="font-medium">Trade</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {filteredMarkets.length}
              </div>
              <div className="text-sm text-gray-600">Active Sports Markets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                ${filteredMarkets.reduce((sum, m) => sum + (m.total_volume || 0), 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Volume</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {filteredMarkets.reduce((sum, m) => sum + (m.unique_traders || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Active Traders</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {sports.length}
              </div>
              <div className="text-sm text-gray-600">Sports Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  Flame,
  Calendar,
  BarChart3,
  Target,
  Trophy,
  Shield,
  Wallet,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Country {
  id: string
  code: string
  name: string
  flag_emoji: string
}

interface Category {
  id: string
  name: string
  icon: string
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

interface MatchType {
  id: string
  name: string
  description: string | null
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
  category_id: string
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
  
  // Foreign keys
  country_id?: string
  sport_type_id?: string
  league_id?: string
  match_type_id?: string
  game_date?: string
  
  // Joined data
  country?: Country
  category?: Category
  sport_type?: SportType
  league?: League
  match_type?: MatchType
  market_teams?: {
    team: Team
    team_type: 'home' | 'away'
  }[]
  outcomes?: MarketOutcome[]
}

const sortOptions = [
  { value: 'volume', label: 'Volume' },
  { value: 'traders', label: 'Traders' },
  { value: 'newest', label: 'Plus récent' },
  { value: 'ending_soon', label: 'Se termine bientôt' }
]

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
   const [showAllCategories, setShowAllCategories] = useState(false)
  const [sortBy, setSortBy] = useState('volume')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    fetchMarkets()
  }, [])

  useEffect(() => {
    filterAndSortMarkets()
  }, [markets, searchTerm, selectedCategory, sortBy])

  const allCategories = [
    { id: 'all', name: 'Tous', icon: '📊' },
    ...categories
  ]
  const visibleCategories = showAllCategories 
    ? allCategories 
    : allCategories.slice(0, 6) // Show first 6 categories by default

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchMarkets = async () => {
    try {
      setIsLoading(true)
      
      // First, get markets with basic relationships
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select(`
          *,
          country:countries(*),
          category:categories(*),
          sport_type:sport_types(*),
          league:leagues(*),
          match_type:match_types(*)
        `)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (marketsError) throw marketsError

      // Then, for each market, get the teams and outcomes
      const marketsWithDetails = await Promise.all(
        (marketsData || []).map(async (market) => {
          // Get teams for this market
          const { data: marketTeamsData } = await supabase
            .from('market_teams')
            .select(`
              team_type,
              team:teams(*)
            `)
            .eq('market_id', market.id)

          // Get outcomes for this market
          const { data: outcomesData } = await supabase
            .from('market_outcomes')
            .select('*')
            .eq('market_id', market.id)
            .order('created_at')

          return {
            ...market,
            market_teams: marketTeamsData || [],
            outcomes: outcomesData || []
          }
        })
      )

      setMarkets(marketsWithDetails)
    } catch (error) {
      console.error('Error fetching markets:', error)
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
        market.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(market => market.category_id === selectedCategory)
    }

    // Sort
    switch (sortBy) {
      case 'volume':
        filtered.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
        break
      case 'traders':
        filtered.sort((a, b) => (b.unique_traders || 0) - (a.unique_traders || 0))
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'ending_soon':
        filtered.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
        break
    }

    setFilteredMarkets(filtered)
  }

  const getPriceChange = (market: Market) => {
    // For sports markets with multiple outcomes, use the first outcome's price
    if (market.outcomes && market.outcomes.length > 0) {
      const change = (market.outcomes[0].yes_price - 0.5) * 100
      return change
    }
    return 0
  }

  const getDaysUntilEnd = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) return 'Terminé'
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Demain'
    return `${days}j`
  }

  // Helper to get team name for display
  const getTeamDisplay = (market: Market, teamType: 'home' | 'away') => {
    const teamData = market.market_teams?.find(mt => mt.team_type === teamType)
    return teamData?.team?.name || 'Équipe inconnue'
  }

  // Get top 3 markets by volume
  const trendingMarkets = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 3)

  // Get category display name and icon
  const getCategoryDisplay = (market: Market) => {
    if (market.category) {
      return {
        name: market.category.name,
        icon: market.category.icon
      }
    }
    return { name: 'Autre', icon: '📌' }
  }

  // Get market title based on type
  const getMarketTitle = (market: Market) => {
    if (market.market_type === 'sports' && market.market_teams && market.market_teams.length >= 2) {
      const homeTeam = getTeamDisplay(market, 'home')
      const awayTeam = getTeamDisplay(market, 'away')
      return `${homeTeam} vs ${awayTeam}`
    }
    return market.title
  }

  // Get market description based on type
  const getMarketDescription = (market: Market) => {
    if (market.market_type === 'sports') {
      return `Qui va gagner ce match?`
    }
    return market.description || 'Faites vos prédictions!'
  }

  // Get outcomes for display
  const getOutcomesForDisplay = (market: Market) => {
    if (market.outcomes && market.outcomes.length > 0) {
      return market.outcomes
    }
    
    // Fallback for markets without outcomes
    return [
      { id: 'yes', title: 'OUI', yes_price: 0.5, no_price: 0.5 },
      { id: 'no', title: 'NON', yes_price: 0.5, no_price: 0.5 }
    ]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des marchés...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}

      {/* Trending Markets */}
      {trendingMarkets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Trending Markets</h2>
            </div>
            <Link 
              href="/markets/trending" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingMarkets.slice(0, 3).map((market) => {
              const outcomes = getOutcomesForDisplay(market)
              const firstOutcome = outcomes[0]
              const marketType = market.liquidity_pool?.draw_reserve && market.liquidity_pool.draw_reserve > 0 ? '3outcome' : 'binary'
              
              return (
                <Link
                  key={market.id}
                  href={`/market/${market.id}`}
                  className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200"
                >
                  {/* Market Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {getMarketTitle(market)}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>${market.total_volume?.toLocaleString('en-US') || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{market.unique_traders || 0}</span>
                        </div>
                        {marketType === '3outcome' && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            3-way
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {(firstOutcome.yes_price * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">YES probability</div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-600 transition-colors">
                      <span className="text-sm font-medium">Trade</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters and Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search markets, events, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          >
            <option value="all">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Category Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
            }`}
          >
            All Markets
          </button>
          {allCategories.slice(0, 6).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
          {allCategories.length > 6 && (
            <button 
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-transparent transition-colors flex items-center gap-1"
            >
              {showAllCategories ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  More +
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchTerm || selectedCategory !== 'all') && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {searchTerm && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Search: "{searchTerm}"
              <button 
                onClick={() => setSearchTerm('')}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {selectedCategory !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              Category: {allCategories.find(c => c.id === selectedCategory)?.name}
              <button 
                onClick={() => setSelectedCategory('all')}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {(searchTerm || selectedCategory !== 'all') && (
            <button 
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto py-8">

        {/* Markets Grid */}
        {filteredMarkets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-2">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucun marché trouvé</h3>
            <p className="text-gray-600">Essayez de modifier vos filtres de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => {
              const outcomes = getOutcomesForDisplay(market)
              const firstOutcome = outcomes[0]
              const priceChange = getPriceChange(market)
              const isUp = priceChange >= 0
              const daysUntilEnd = getDaysUntilEnd(market.end_date)
              const categoryDisplay = getCategoryDisplay(market)

              return (
                <Link
                  key={market.id}
                  href={`/dashboard/market/${market.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-100 overflow-hidden group"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      {market.image_url && (
                        <img
                          src={market.image_url}
                          alt={market.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {categoryDisplay.icon}
                            {categoryDisplay.name}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {daysUntilEnd}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-1">
                          {getMarketTitle(market)}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {getMarketDescription(market)}
                        </p>
                      </div>
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-700">OUI</span>
                          {isUp && (
                            <div className="flex items-center text-xs text-green-600">
                              <TrendingUp className="h-3 w-3" />
                              <span>{Math.abs(priceChange).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {(firstOutcome.yes_price * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-green-600">
                          ${firstOutcome.yes_price.toFixed(2)}/part
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-red-700">NON</span>
                          {!isUp && (
                            <div className="flex items-center text-xs text-red-600">
                              <TrendingDown className="h-3 w-3" />
                              <span>{Math.abs(priceChange).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                          {(firstOutcome.no_price * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-red-600">
                          ${firstOutcome.no_price.toFixed(2)}/part
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">${market.total_volume?.toFixed(0) || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{market.unique_traders || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                        <span className="font-medium">Trader</span>
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
              <div className="text-3xl font-bold text-primary mb-1">
                {markets.length}
              </div>
              <div className="text-sm text-gray-600">Marchés Actifs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">
                ${markets.reduce((sum, m) => sum + (m.total_volume || 0), 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Volume Total</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">
                {markets.reduce((sum, m) => sum + (m.unique_traders || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Traders Actifs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">
                {categories.length}
              </div>
              <div className="text-sm text-gray-600">Catégories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
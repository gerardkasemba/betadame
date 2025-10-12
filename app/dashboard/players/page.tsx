// app/dashboard/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Trophy, MapPin, Users, Star, Crown, Award, Gamepad2 } from 'lucide-react'
import { fr } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  username: string
  region: string
  balance: number
  created_at: string
  stats?: {
    total_games: number
    total_wins: number
    win_rate: number
    total_winnings: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [filters, setFilters] = useState({
    region: '',
    sortBy: 'games', // games, wins, win_rate, winnings, newest
    minGames: 0,
    minWinRate: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchUsers()
    }
  }, [currentUserId])

  useEffect(() => {
    applyFilters()
  }, [users, searchTerm, filters])

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all user profiles EXCEPT the current user
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, region, balance, created_at')
        .neq('id', currentUserId) // Exclude current user
        .order('username')

      if (error) throw error

      // Fetch user statistics for each profile
      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          // Get total games played
          const { count: totalGames } = await supabase
            .from('game_participants')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)

          // Get total wins
          const { count: totalWins } = await supabase
            .from('game_rooms')
            .select('*', { count: 'exact', head: true })
            .eq('winner_id', profile.id)

          // Calculate win rate
          const winRate = totalGames && totalGames > 0 ? Math.round((totalWins || 0) / totalGames * 100) : 0

          // Calculate total winnings (simplified - you might want to calculate actual winnings)
          const totalWinnings = (totalWins || 0) * 10 // Placeholder calculation

          return {
            ...profile,
            stats: {
              total_games: totalGames || 0,
              total_wins: totalWins || 0,
              win_rate: winRate,
              total_winnings: totalWinnings
            }
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply region filter
    if (filters.region) {
      filtered = filtered.filter(user => user.region === filters.region)
    }

    // Apply minimum games filter
    if (filters.minGames > 0) {
      filtered = filtered.filter(user => 
        user.stats && user.stats.total_games >= filters.minGames
      )
    }

    // Apply minimum win rate filter
    if (filters.minWinRate > 0) {
      filtered = filtered.filter(user => 
        user.stats && user.stats.win_rate >= filters.minWinRate
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'games':
          return (b.stats?.total_games || 0) - (a.stats?.total_games || 0)
        case 'wins':
          return (b.stats?.total_wins || 0) - (a.stats?.total_wins || 0)
        case 'win_rate':
          return (b.stats?.win_rate || 0) - (a.stats?.win_rate || 0)
        case 'winnings':
          return (b.stats?.total_winnings || 0) - (a.stats?.total_winnings || 0)
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    setFilteredUsers(filtered)
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Award className="h-5 w-5 text-orange-400" />
    return null
  }

  const getRegionColor = (region: string) => {
    const colors = {
      brazzaville: 'bg-blue-100 text-blue-800',
      pointe_noire: 'bg-green-100 text-green-800',
      dolisie: 'bg-purple-100 text-purple-800',
      nkayi: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[region as keyof typeof colors] || colors.other
  }

  const regions = [
    { value: '', label: 'Toutes les régions' },
    { value: 'brazzaville', label: 'Brazzaville' },
    { value: 'pointe_noire', label: 'Pointe-Noire' },
    { value: 'dolisie', label: 'Dolisie' },
    { value: 'nkayi', label: 'Nkayi' },
    { value: 'other', label: 'Autre' }
  ]

  const sortOptions = [
    { value: 'games', label: 'Parties jouées' },
    { value: 'wins', label: 'Victoires' },
    { value: 'win_rate', label: 'Taux de victoire' },
    { value: 'winnings', label: 'Gains totaux' },
    { value: 'newest', label: 'Nouveaux membres' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading flex items-center">
              <Users className="h-6 w-6 mr-3 text-primary" />
              Répertoire des Joueurs
            </h1>
            <p className="text-gray-600 mt-2">
              Découvrez et connectez-vous avec les autres joueurs de Betadame
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{users.length}</div>
            <div className="text-sm text-gray-600">Joueurs total</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un joueur
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                id="search"
                placeholder="Entrez un nom d'utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Region Filter */}
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
              Région
            </label>
            <select
              id="region"
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {regions.map(region => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Trier par
            </label>
            <select
              id="sort"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <label htmlFor="minGames" className="block text-sm font-medium text-gray-700 mb-2">
              Parties minimum
            </label>
            <input
              type="number"
              id="minGames"
              value={filters.minGames}
              onChange={(e) => setFilters(prev => ({ ...prev, minGames: parseInt(e.target.value) || 0 }))}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="minWinRate" className="block text-sm font-medium text-gray-700 mb-2">
              Taux de victoire minimum (%)
            </label>
            <input
              type="number"
              id="minWinRate"
              value={filters.minWinRate}
              onChange={(e) => setFilters(prev => ({ ...prev, minWinRate: parseInt(e.target.value) || 0 }))}
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setFilters({
                  region: '',
                  sortBy: 'games',
                  minGames: 0,
                  minWinRate: 0
                })
              }}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600 mt-4">Chargement des joueurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Aucun joueur trouvé avec ces critères</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilters({
                  region: '',
                  sortBy: 'games',
                  minGames: 0,
                  minWinRate: 0
                })
              }}
              className="mt-2 text-primary hover:text-blue-700 font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user, index) => (
              <div key={user.id} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      {getRankBadge(index)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{user.username}</h3>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRegionColor(user.region)}`}>
                        <MapPin className="h-3 w-3 mr-1" />
                        {fr.regions[user.region as keyof typeof fr.regions] || 'Autre'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <Gamepad2 className="h-3 w-3" />
                      <span>Parties</span>
                    </div>
                    <div className="font-bold text-foreground">{user.stats?.total_games || 0}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <Trophy className="h-3 w-3" />
                      <span>Victoires</span>
                    </div>
                    <div className="font-bold text-foreground">{user.stats?.total_wins || 0}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <Star className="h-3 w-3" />
                      <span>Taux</span>
                    </div>
                    <div className="font-bold text-foreground">{user.stats?.win_rate || 0}%</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <Award className="h-3 w-3" />
                      <span>Gains</span>
                    </div>
                    <div className="font-bold text-foreground">{user.stats?.total_winnings || 0}€</div>
                  </div>
                </div>

                {/* Member Since */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Affichage de {filteredUsers.length} joueur{filteredUsers.length > 1 ? 's' : ''} sur {users.length}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
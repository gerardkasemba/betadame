// app/sports/components/SportsFilter.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sport, League, Country } from '@/types/sports/types'
import { getFilteredMarkets } from './sports/actions'


interface SportsFilterProps {
  sports: Sport[]
  leagues: League[]
  countries: Country[]
  onMarketsChange?: (markets: any[]) => void
  loading?: boolean
}

export default function SportsFilter({ 
  sports, 
  leagues, 
  countries, 
  onMarketsChange,
  loading = false 
}: SportsFilterProps) {
  const [filters, setFilters] = useState({
    sport: '',
    league: '',
    country: '',
    marketType: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  // Apply filters when they change
  useEffect(() => {
    const applyFilters = async () => {
      if (onMarketsChange) {
        setIsLoading(true)
        try {
          const filteredMarkets = await getFilteredMarkets(filters)
          onMarketsChange(filteredMarkets)
        } catch (error) {
          console.error('Error filtering markets:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    applyFilters()
  }, [filters, onMarketsChange])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      
      // Reset dependent filters
      if (key === 'sport') {
        newFilters.league = ''
      }
      
      return newFilters
    })
  }

  const filteredLeagues = filters.sport 
    ? leagues.filter(league => league.sport_type_id === filters.sport)
    : leagues

  const clearFilters = () => {
    setFilters({
      sport: '',
      league: '',
      country: '',
      marketType: ''
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filters
        </h2>
        {(hasActiveFilters || isLoading) && (
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Sport Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sport
          </label>
          <select
            value={filters.sport}
            onChange={(e) => handleFilterChange('sport', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Sports</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </div>

        {/* League Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            League
          </label>
          <select
            value={filters.league}
            onChange={(e) => handleFilterChange('league', e.target.value)}
            disabled={loading || !filters.sport}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Leagues</option>
            {filteredLeagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
          {!filters.sport && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a sport to see leagues
            </p>
          )}
        </div>

        {/* Country Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country
          </label>
          <select
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                <span className="flex items-center space-x-2">
                  <span>{country.flag_emoji}</span>
                  <span>{country.name}</span>
                </span>
              </option>
            ))}
          </select>
        </div>

        {/* Market Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Market Type
          </label>
          <select
            value={filters.marketType}
            onChange={(e) => handleFilterChange('marketType', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Types</option>
            <option value="binary">Binary</option>
            <option value="sports">Sports</option>
          </select>
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Active filters: {Object.values(filters).filter(v => v !== '').length}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
// app/sports/components/MarketsGrid.tsx
'use client'

import Link from 'next/link'
import { Market } from '@/types/sports/types'
import MarketsGridSkeleton from './MarketsGridSkeleton'


interface MarketsGridProps {
  markets: Market[]
  loading?: boolean
}

export default function MarketsGrid({ markets, loading = false }: MarketsGridProps) {
  if (loading) {
    return <MarketsGridSkeleton />
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          No markets found matching your filters.
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Try adjusting your filters to see more results.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}

function MarketCard({ market }: { market: Market }) {
  const hasTeams = market.team_a_name && market.team_b_name
  const isBinary = market.market_type === 'binary'
  const primaryOutcome = market.market_outcomes?.[0]
  
  const formatPrice = (price: number) => {
    return (price * 100).toFixed(1) + '¢'
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`
    }
    return `$${volume?.toFixed(0) || '0'}`
  }

  // Use outcome prices if available, otherwise use market prices
  const yesPrice = primaryOutcome?.yes_price || market.yes_price || 0.5
  const noPrice = primaryOutcome?.no_price || market.no_price || 0.5

  return (
    <Link
      href={`/market/${market.id}`}
      className="block group"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group-hover:scale-105 h-full flex flex-col">
        {/* Market Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 line-clamp-2">
          {market.title}
        </h3>

        {/* Teams Display */}
        {hasTeams && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              {market.team_a_image ? (
                <img
                  src={market.team_a_image}
                  alt={market.team_a_name || ''}
                  className="w-8 h-8 object-contain rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {market.team_a_name?.[0] || 'A'}
                  </span>
                </div>
              )}
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {market.team_a_name}
              </span>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              VS
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {market.team_b_name}
              </span>
              {market.team_b_image ? (
                <img
                  src={market.team_b_image}
                  alt={market.team_b_name || ''}
                  className="w-8 h-8 object-contain rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {market.team_b_name?.[0] || 'B'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Market Outcomes */}
        {market.market_outcomes && market.market_outcomes.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Outcomes:
            </p>
            <div className="space-y-2">
              {market.market_outcomes.slice(0, 3).map((outcome) => (
                <div key={outcome.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{outcome.title}</span>
                  <div className="flex space-x-4">
                    <span className="text-green-600 dark:text-green-400">
                      Yes: {formatPrice(outcome.yes_price)}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      No: {formatPrice(outcome.no_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Info */}
        <div className="space-y-3 mb-4">
          {market.sport_types && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-2">{market.sport_types.icon}</span>
              <span>{market.sport_types.name}</span>
              {market.leagues && (
                <span className="mx-2">•</span>
              )}
              {market.leagues && (
                <span>{market.leagues.name}</span>
              )}
            </div>
          )}

          {market.game_date && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(market.game_date).toLocaleDateString()} • {new Date(market.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Prices */}
        <div className="mt-auto space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Yes</span>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatPrice(yesPrice)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {(yesPrice * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">No</span>
            <div className="text-right">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatPrice(noPrice)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {(noPrice * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {market.draw_price && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Draw</span>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatPrice(market.draw_price)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {((market.draw_price || 0) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Market Stats */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Volume: {formatVolume(market.total_volume || 0)}</span>
            <span>Traders: {market.unique_traders || 0}</span>
          </div>
          <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded capitalize">
            {market.market_type}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Trade Now
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            View market →
          </div>
        </div>
      </div>
    </Link>
  )
}
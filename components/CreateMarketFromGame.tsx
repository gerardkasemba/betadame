// components/create-market-from-game.tsx - NO SHADCN DEPENDENCIES
'use client'

import { useState } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'

interface Game {
  id: string
  home_team: {
    name: string
    logo_url?: string
  }
  away_team: {
    name: string
    logo_url?: string
  }
  sport_type: {
    name: string
  }
  league?: {
    name: string
  }
  scheduled_at: string
  status: string
}

interface CreateMarketFromGameProps {
  game: Game
  onSuccess?: (market: any) => void
  onCancel?: () => void
}

export function CreateMarketFromGame({ game, onSuccess, onCancel }: CreateMarketFromGameProps) {
  const [loading, setLoading] = useState(false)
  const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary')
  const [title, setTitle] = useState(
    `${game.home_team.name} vs ${game.away_team.name}`
  )
  const [description, setDescription] = useState(
    `Who will win the ${game.sport_type.name} match between ${game.home_team.name} and ${game.away_team.name}?`
  )
  const [initialLiquidity, setInitialLiquidity] = useState(100)

  const gameDate = new Date(game.scheduled_at)
  const formattedDate = gameDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const handleCreateMarket = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/markets/create-from-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: game.id,
          marketType,
          title,
          description,
          initialLiquidity,
          category: 'sports'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create market')
      }

      alert(`✅ Market created successfully!\n\n${title}`)

      if (onSuccess) {
        onSuccess(data.market)
      }

    } catch (error: any) {
      console.error('Error creating market:', error)
      alert(`❌ Failed to create market: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Prediction Market</h2>
        <p className="text-gray-600 mt-1">Create a prediction market from this sports game</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Game Information */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {game.home_team.logo_url && (
                <img 
                  src={game.home_team.logo_url} 
                  alt={game.home_team.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <div className="font-semibold">{game.home_team.name}</div>
                <div className="text-sm text-gray-600">Home</div>
              </div>
            </div>

            <div className="text-xl font-bold text-gray-400">VS</div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold">{game.away_team.name}</div>
                <div className="text-sm text-gray-600">Away</div>
              </div>
              {game.away_team.logo_url && (
                <img 
                  src={game.away_team.logo_url} 
                  alt={game.away_team.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium">
                {game.sport_type.name}
              </span>
              {game.league && (
                <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium">
                  {game.league.name}
                </span>
              )}
            </div>
            <div className="text-gray-600">{formattedDate}</div>
          </div>
        </div>

        {/* Market Type */}
        <div className="space-y-2">
          <label htmlFor="marketType" className="block text-sm font-medium text-gray-700">
            Market Type
          </label>
          <select 
            id="marketType"
            value={marketType} 
            onChange={(e) => setMarketType(e.target.value as 'binary' | 'multiple')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sports">Sports</option>
            <option value="binary">Binary (Yes/No - Home Team Wins)</option>
            <option value="multiple">Multiple Outcomes (Team A / Draw / Team B)</option>
          </select>
          <p className="text-sm text-gray-600">
            {marketType === 'binary' 
              ? 'Users bet on whether the home team wins (Yes) or not (No)'
              : 'Users choose between Team A wins, Draw, or Team B wins'
            }
          </p>
        </div>

        {/* Market Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Market Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter market title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Market Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Market Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter market description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Initial Liquidity */}
        <div className="space-y-2">
          <label htmlFor="liquidity" className="block text-sm font-medium text-gray-700">
            Initial Liquidity (USD)
          </label>
          <input
            id="liquidity"
            type="number"
            value={initialLiquidity}
            onChange={(e) => setInitialLiquidity(Number(e.target.value))}
            min={10}
            max={10000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-600">
            Initial liquidity helps stabilize prices. Minimum $10, Maximum $10,000
          </p>
        </div>

        {/* Market Timeline Info */}
        <div className="p-4 bg-blue-50 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900">Market Timeline</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Market opens immediately</li>
                <li>• Betting closes when the game starts</li>
                <li>• Market resolves 3 hours after game start</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-6 flex justify-between">
        {onCancel && (
          <button 
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button 
          onClick={handleCreateMarket}
          disabled={loading || !title || !description}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Market...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Create Market
            </>
          )}
        </button>
      </div>
    </div>
  )
}
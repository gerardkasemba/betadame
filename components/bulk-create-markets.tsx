// components/bulk-create-markets.tsx - NO SHADCN DEPENDENCIES
'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

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

interface BulkCreateMarketsProps {
  games: Game[]
  onSuccess?: (markets: any[]) => void
  onCancel?: () => void
}

export function BulkCreateMarkets({ games, onSuccess, onCancel }: BulkCreateMarketsProps) {
  const [loading, setLoading] = useState(false)
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set())
  const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary')
  const [initialLiquidity, setInitialLiquidity] = useState(100)

  const toggleGame = (gameId: string) => {
    const newSelected = new Set(selectedGames)
    if (newSelected.has(gameId)) {
      newSelected.delete(gameId)
    } else {
      newSelected.add(gameId)
    }
    setSelectedGames(newSelected)
  }

  const toggleAll = () => {
    if (selectedGames.size === games.length) {
      setSelectedGames(new Set())
    } else {
      setSelectedGames(new Set(games.map(g => g.id)))
    }
  }

  const handleBulkCreate = async () => {
    if (selectedGames.size === 0) {
      alert('Please select at least one game')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/markets/create-bulk-from-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameIds: Array.from(selectedGames),
          marketType,
          initialLiquidity,
          category: 'sports'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create markets')
      }

      const message = data.errors?.length 
        ? `✅ Created ${data.created} markets!\n⚠️ ${data.errors.length} markets failed`
        : `✅ Successfully created ${data.created} markets!`
      
      alert(message)

      if (onSuccess) {
        onSuccess(data.markets)
      }

    } catch (error: any) {
      console.error('Error creating markets:', error)
      alert(`❌ Failed to create markets: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Create Markets</h2>
            <p className="text-gray-600 mt-1">Select games and create multiple markets at once</p>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            {selectedGames.size} / {games.length} selected
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Market Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="bulkMarketType" className="block text-sm font-medium text-gray-700">
              Market Type
            </label>
            <select 
              id="bulkMarketType"
              value={marketType} 
              onChange={(e) => setMarketType(e.target.value as 'binary' | 'multiple')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="binary">Binary (Yes/No)</option>
              <option value="multiple">Multiple Outcomes</option>
              <option value="sports">Sports</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="bulkLiquidity" className="block text-sm font-medium text-gray-700">
              Initial Liquidity
            </label>
            <select 
              id="bulkLiquidity"
              value={initialLiquidity.toString()} 
              onChange={(e) => setInitialLiquidity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="50">$50</option>
              <option value="100">$100</option>
              <option value="250">$250</option>
              <option value="500">$500</option>
              <option value="1000">$1,000</option>
            </select>
          </div>
        </div>

        {/* Games List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Select Games</label>
            <button 
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedGames.size === games.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="h-[400px] overflow-y-auto border border-gray-300 rounded-md">
            <div className="p-4 space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => toggleGame(game.id)}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGames.has(game.id)
                      ? 'bg-blue-50 border-blue-500'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGames.has(game.id)}
                    onChange={() => toggleGame(game.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {game.home_team.logo_url && (
                        <img 
                          src={game.home_team.logo_url} 
                          alt={game.home_team.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium truncate">
                        {game.home_team.name}
                      </span>
                      <span className="text-gray-500">vs</span>
                      {game.away_team.logo_url && (
                        <img 
                          src={game.away_team.logo_url} 
                          alt={game.away_team.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium truncate">
                        {game.away_team.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs">
                        {game.sport_type.name}
                      </span>
                      {game.league && (
                        <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs">
                          {game.league.name}
                        </span>
                      )}
                      <span className="ml-auto">{formatGameTime(game.scheduled_at)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {games.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No games available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-1">
          <p className="font-medium text-gray-900">Bulk Creation Settings:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• All markets will use the same settings</li>
            <li>• Market titles are auto-generated from game names</li>
            <li>• Markets open immediately and close when games start</li>
            <li>• Maximum 50 markets can be created at once</li>
          </ul>
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
          onClick={handleBulkCreate}
          disabled={loading || selectedGames.size === 0}
          className="ml-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating {selectedGames.size} Markets...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create {selectedGames.size} Market{selectedGames.size !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
// app/markets/[id]/components/MarketHeader.tsx
'use client'

import { useState } from "react"
import { MarketStatusBadge } from './MarketStatusBadge'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'

interface MarketHeaderProps {
  market: any
  marketType: 'binary' | 'sports'
}

export function MarketHeader({ market: initialMarket, marketType }: MarketHeaderProps) {
  const [market, setMarket] = useState(initialMarket)

  // Real-time market updates
  useMarketRealtime(market.id, {
    onMarketUpdate: (update) => {
      setMarket((prev: typeof initialMarket) => ({
        ...prev,
        yes_price: update.yes_price,
        no_price: update.no_price,
        total_volume: update.total_volume,
        updated_at: update.updated_at
      }))
    }
  })

  // Calculate current prices including draw for sports markets
  const getCurrentPrices = () => {
    const yesPrice = market.yes_price || 0
    const noPrice = market.no_price || 0
    
    if (marketType === 'sports') {
      const drawPrice = Math.max(0, 1 - yesPrice - noPrice)
      return { yesPrice, noPrice, drawPrice }
    } else {
      // For binary markets, ensure prices sum to 1
      const total = yesPrice + noPrice
      const normalizedYesPrice = total > 0 ? yesPrice / total : 0.5
      const normalizedNoPrice = total > 0 ? noPrice / total : 0.5
      return { 
        yesPrice: normalizedYesPrice, 
        noPrice: normalizedNoPrice, 
        drawPrice: 0 
      }
    }
  }

  const { yesPrice, noPrice, drawPrice } = getCurrentPrices()

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* ... existing header code ... */}

      {/* Current Prices - ALWAYS updated */}
      <div className={`grid ${marketType === 'sports' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium mb-1">YES</div>
          <div className="text-2xl font-bold text-blue-700">
            {(yesPrice * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-blue-500 mt-1">
            ${yesPrice.toFixed(4)}
          </div>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm text-red-600 font-medium mb-1">NO</div>
          <div className="text-2xl font-bold text-red-700">
            {(noPrice * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-red-500 mt-1">
            ${noPrice.toFixed(4)}
          </div>
        </div>

        {marketType === 'sports' && (
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 font-medium mb-1">DRAW</div>
            <div className="text-2xl font-bold text-gray-700">
              {(drawPrice * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${drawPrice.toFixed(4)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
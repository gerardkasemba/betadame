// app/markets/[id]/components/MarketStats.tsx
'use client'

import { useState, useEffect } from 'react'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'

interface MarketStatsProps {
  market: any
}

export function MarketStats({ market }: MarketStatsProps) {
  const [stats, setStats] = useState(market)
  
  useMarketRealtime(market.id, {
    onMarketUpdate: (update) => {
      setStats(prev => ({
        ...prev,
        total_volume: update.total_volume,
        unique_traders: update.unique_traders || prev.unique_traders
      }))
    }
  })
  

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Market Statistics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            ${stats.total_volume?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-gray-600">Total Volume</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {stats.unique_traders || 0}
          </div>
          <div className="text-sm text-gray-600">Unique Traders</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {stats.total_yes_shares?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-gray-600">Total YES Shares</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {stats.total_no_shares?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-gray-600">Total NO Shares</div>
        </div>
      </div>
    </div>
  )
}
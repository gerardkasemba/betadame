// app/markets/[id]/components/TradeHistory.tsx
'use client'

import { useState, useEffect } from 'react'
import { useMarketRealtime } from '@/hooks/useMarketRealtime'
import { createClient } from '@/lib/supabase/client'

interface TradeHistoryProps {
  marketId: string
}

export function TradeHistory({ marketId }: TradeHistoryProps) {
  const [trades, setTrades] = useState<any[]>([])
  const supabase = createClient()

  // Load initial trades
  useEffect(() => {
    const loadTrades = async () => {
      const { data } = await supabase
        .from('market_trades')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) setTrades(data)
    }

    loadTrades()
  }, [marketId, supabase])

  // Real-time trade updates
  useMarketRealtime(marketId, {
    onTradeUpdate: (trade) => {
      setTrades(prev => [trade, ...prev.slice(0, 19)])
    }
  })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Trades</h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {trades.map((trade) => (
          <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                trade.outcome === 'yes' ? 'bg-blue-100 text-blue-800' :
                trade.outcome === 'no' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {trade.outcome.toUpperCase()}
              </span>
              <span className="text-sm font-medium">
                {trade.shares.toFixed(4)} shares
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                ${trade.price_per_share.toFixed(4)}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(trade.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {trades.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No trades yet
          </div>
        )}
      </div>
    </div>
  )
}
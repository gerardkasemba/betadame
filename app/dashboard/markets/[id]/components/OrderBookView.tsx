// components/OrderBookView.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Order {
  price: number
  shares: number
  total: number
}

interface OrderBookViewProps {
  marketId: string
  outcome: 'yes' | 'no'
  currentAMMPrice: number
}

export function OrderBookView({ marketId, outcome, currentAMMPrice }: OrderBookViewProps) {
  const [buyOrders, setBuyOrders] = useState<Order[]>([])
  const [sellOrders, setSellOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrderBook = async () => {
      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from('market_orders')
          .select('order_type, price_per_share, shares, filled_shares')
          .eq('market_id', marketId)
          .eq('outcome', outcome)
          .in('status', ['open', 'partially_filled'])

        if (error) throw error

        if (data) {
          // Group and aggregate orders by price level
          const buyMap = new Map<number, number>()
          const sellMap = new Map<number, number>()

          data.forEach(order => {
            const remainingShares = order.shares - order.filled_shares
            const price = order.price_per_share

            if (order.order_type === 'buy') {
              buyMap.set(price, (buyMap.get(price) || 0) + remainingShares)
            } else {
              sellMap.set(price, (sellMap.get(price) || 0) + remainingShares)
            }
          })

          // Convert to arrays and sort
          const buys: Order[] = Array.from(buyMap.entries())
            .map(([price, shares]) => ({
              price,
              shares,
              total: price * shares
            }))
            .sort((a, b) => b.price - a.price) // Highest buy first
            .slice(0, 5)

          const sells: Order[] = Array.from(sellMap.entries())
            .map(([price, shares]) => ({
              price,
              shares,
              total: price * shares
            }))
            .sort((a, b) => a.price - b.price) // Lowest sell first
            .slice(0, 5)

          setBuyOrders(buys)
          setSellOrders(sells)
        }
      } catch (err) {
        console.error('Error fetching order book:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 5000) // Refresh every 5s

    return () => clearInterval(interval)
  }, [marketId, outcome])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (buyOrders.length === 0 && sellOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Order Book ({outcome.toUpperCase()})
        </h4>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No limit orders yet</p>
          <p className="text-xs text-gray-400 mt-1">
            All trades use AMM pricing
          </p>
        </div>
      </div>
    )
  }

  const maxShares = Math.max(
    ...buyOrders.map(o => o.shares),
    ...sellOrders.map(o => o.shares)
  )

  const spread = sellOrders[0] && buyOrders[0] 
    ? ((sellOrders[0].price - buyOrders[0].price) / buyOrders[0].price * 100)
    : 0

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Order Book
          <span className="text-xs font-normal text-gray-500">
            ({outcome.toUpperCase()})
          </span>
        </h4>
        <div className="text-xs text-gray-500">
          Spread: <span className="font-semibold text-gray-700">{spread.toFixed(2)}%</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sell Orders (Asks) */}
        <div>
          <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            SELL ORDERS
          </div>
          <div className="space-y-1">
            {sellOrders.length > 0 ? (
              sellOrders.map((order, idx) => (
                <div 
                  key={`sell-${idx}`}
                  className="relative"
                >
                  <div 
                    className="absolute inset-0 bg-red-50 rounded"
                    style={{ width: `${(order.shares / maxShares) * 100}%` }}
                  />
                  <div className="relative grid grid-cols-3 gap-2 px-3 py-2 text-xs">
                    <div className="font-semibold text-red-600">
                      ${order.price.toFixed(4)}
                    </div>
                    <div className="text-right text-gray-700">
                      {order.shares.toFixed(2)}
                    </div>
                    <div className="text-right text-gray-500">
                      ${order.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic text-center py-2">
                No sell orders
              </div>
            )}
          </div>
        </div>

        {/* AMM Price Reference */}
        <div className="border-y py-2">
          <div className="text-xs text-gray-500 text-center">
            <span className="font-semibold text-blue-600">AMM Price</span>
            <span className="ml-2 font-mono">${currentAMMPrice.toFixed(4)}</span>
          </div>
        </div>

        {/* Buy Orders (Bids) */}
        <div>
          <div className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            BUY ORDERS
          </div>
          <div className="space-y-1">
            {buyOrders.length > 0 ? (
              buyOrders.map((order, idx) => (
                <div 
                  key={`buy-${idx}`}
                  className="relative"
                >
                  <div 
                    className="absolute inset-0 bg-green-50 rounded"
                    style={{ width: `${(order.shares / maxShares) * 100}%` }}
                  />
                  <div className="relative grid grid-cols-3 gap-2 px-3 py-2 text-xs">
                    <div className="font-semibold text-green-600">
                      ${order.price.toFixed(4)}
                    </div>
                    <div className="text-right text-gray-700">
                      {order.shares.toFixed(2)}
                    </div>
                    <div className="text-right text-gray-500">
                      ${order.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic text-center py-2">
                No buy orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-gray-500">
        <div className="font-semibold">Price</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Total</div>
      </div>
    </div>
  )
}

// Usage example:
// <OrderBookView 
//   marketId={market.id} 
//   outcome="yes" 
//   currentAMMPrice={market.yes_price || 0.5}
// />
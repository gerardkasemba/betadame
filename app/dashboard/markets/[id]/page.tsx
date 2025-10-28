// app/markets/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MarketPageClient } from './MarketPageClient'
import LiveGamesTicker from '@/components/LiveGamesTicker'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getMarketData(marketId: string) {
  const supabase = await createClient()
  
  const { data: market, error } = await supabase
    .from('markets')
    .select(`
      *,
      liquidity_pools (
        yes_reserve,
        no_reserve,
        draw_reserve,
        constant_product,
        total_liquidity
      )
    `)
    .eq('id', marketId)
    .single()

  if (error) {
    console.error('Supabase error:', JSON.stringify(error, null, 2))
    return null
  }

  if (!market) {
    return null
  }

  // ✅ OPTIMIZED: Only fetch market outcomes if market_type is 'multiple'
  if (market.market_type === 'multiple') {
    const { data: outcomes, error: outcomesError } = await supabase
      .from('market_outcomes')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: true })

    if (outcomesError) {
      console.error('Error fetching market outcomes:', outcomesError)
      market.outcomes = []
    } else {
      market.outcomes = outcomes || []
    }
  } else {
    // For binary and 3-outcome markets, set empty array
    market.outcomes = []
  }

  // Fetch team data separately if team IDs exist
  if (market.team_a_id || market.team_b_id) {
    const teamIds = [market.team_a_id, market.team_b_id].filter(Boolean)
    
    if (teamIds.length > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, short_name, logo_url')
        .in('id', teamIds)

      if (teams) {
        market.team_a = teams.find(t => t.id === market.team_a_id) || null
        market.team_b = teams.find(t => t.id === market.team_b_id) || null
      }
    }
  }

  // Debug logging (optional - remove in production)
  console.log('Market loaded:', {
    id: market.id,
    title: market.title,
    market_type: market.market_type,
    hasOutcomes: !!market.outcomes && market.outcomes.length > 0,
    outcomesCount: market.outcomes?.length || 0,
    isMultiChoice: market.market_type === 'multiple',
    isBinary: market.market_type === 'binary' || (!market.liquidity_pools?.draw_reserve || market.liquidity_pools.draw_reserve === 0),
    is3Outcome: market.market_type === '3outcome' || (market.liquidity_pools?.draw_reserve && market.liquidity_pools.draw_reserve > 0)
  })

  return market
}

export default async function MarketPage({ params }: PageProps) {
  const { id } = await params
  const market = await getMarketData(id)

  if (!market) {
    notFound()
  }

  return (
    <>
        <MarketPageClient market={market} />
    </>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const market = await getMarketData(id)
  
  return {
    title: market?.title || 'Market Not Found',
    description: market?.description || 'Sports betting market'
  }
}
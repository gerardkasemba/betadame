// lib/market-creation.ts
import { createClient } from '@/lib/supabase/client'

interface CreateMarketParams {
  title: string
  description: string
  marketType: 'binary' | 'sports'
  category?: string
  endDate?: string
  
  // Sports-specific fields
  sportType?: string
  league?: string
  teamAId?: string
  teamBId?: string
  teamAName?: string
  teamBName?: string
  teamAImage?: string
  teamBImage?: string
  gameDate?: string
  
  // Optional overrides
  initialLiquidity?: number
  expectedPopularity?: 'high' | 'medium' | 'low'
}

export async function createMarket(params: CreateMarketParams) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated to create markets')
  }

  // Calculate initial liquidity based on market type
  const initialLiquidity = params.initialLiquidity || calculateInitialLiquidity(
    params.marketType,
    params.expectedPopularity || 'medium'
  )

  // Prepare market data
  const marketData: any = {
    title: params.title,
    description: params.description,
    market_type: params.marketType,
    category: params.category || 'general',
    end_date: params.endDate,
    created_by: user.id,
    status: 'active',
    initial_liquidity: initialLiquidity,
    // Min and max bet will be calculated by trigger
  }

  // Add sports-specific fields if it's a sports market
  if (params.marketType === 'sports') {
    marketData.sport_type = params.sportType
    marketData.league = params.league
    marketData.team_a_id = params.teamAId
    marketData.team_b_id = params.teamBId
    marketData.team_a_name = params.teamAName
    marketData.team_b_name = params.teamBName
    marketData.team_a_image = params.teamAImage
    marketData.team_b_image = params.teamBImage
    marketData.game_date = params.gameDate
    
    // Sports markets start with equal probabilities for 3 outcomes
    marketData.yes_price = 0.33
    marketData.no_price = 0.33
    marketData.draw_price = 0.34
  } else {
    // Binary markets start with 50/50 odds
    marketData.yes_price = 0.50
    marketData.no_price = 0.50
    marketData.draw_price = null
  }

  // Insert market
  const { data: market, error: marketError } = await supabase
    .from('markets')
    .insert(marketData)
    .select()
    .single()

  if (marketError) {
    console.error('Market creation error:', marketError)
    throw new Error(`Failed to create market: ${marketError.message}`)
  }

  console.log('✅ Market created:', market.id)
  console.log(`   Type: ${market.market_type}`)
  console.log(`   Initial Liquidity: $${market.initial_liquidity}`)
  console.log(`   Min Bet: $${market.min_bet_amount}`)
  console.log(`   Max Bet: $${market.max_bet_amount}`)

  return market
}

// Client-side calculation helper (matches server-side logic)
function calculateInitialLiquidity(
  marketType: 'binary' | 'sports',
  popularity: 'high' | 'medium' | 'low'
): number {
  if (marketType === 'binary') {
    switch (popularity) {
      case 'high': return 500
      case 'medium': return 300
      case 'low': return 100
      default: return 200
    }
  } else {
    switch (popularity) {
      case 'high': return 1500
      case 'medium': return 750
      case 'low': return 300
      default: return 500
    }
  }
}
// app/api/markets/create-from-game/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Create market request:', body)
    
    const { 
      gameId,
      marketType = 'binary', // 'binary' or 'multiple'
      title,
      description,
      category = 'sports',
      startDate,
      endDate,
      resolutionDate,
      initialLiquidity = 100,
      customOutcomes // For multiple outcome markets
    } = body
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch the game details
    const { data: game, error: gameError } = await supabase
      .from('sports_games')
      .select(`
        *,
        sport_type:sport_types(*),
        home_team:teams!sports_games_home_team_id_fkey(*),
        away_team:teams!sports_games_away_team_id_fkey(*),
        league:leagues(*)
      `)
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('Game not found:', gameError)
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    console.log('Game found:', game)

    // Validate game is in the future
    const gameTime = new Date(game.scheduled_at)
    const now = new Date()
    
    if (gameTime <= now) {
      return NextResponse.json(
        { error: 'Cannot create market for past games' },
        { status: 400 }
      )
    }

    // Generate market title if not provided
    const marketTitle = title || 
      `${game.home_team?.name || 'Team A'} vs ${game.away_team?.name || 'Team B'}`
    
    const marketDescription = description || 
      `Who will win the ${game.sport_type?.name || 'match'} between ${game.home_team?.name} and ${game.away_team?.name}?`

    // Set dates
    const marketStartDate = startDate ? new Date(startDate) : now
    const marketEndDate = endDate ? new Date(endDate) : new Date(game.scheduled_at)
    const marketResolutionDate = resolutionDate ? new Date(resolutionDate) : 
      new Date(new Date(game.scheduled_at).getTime() + (3 * 60 * 60 * 1000)) // 3 hours after game

    // Prepare market data
    const marketData: any = {
      title: marketTitle,
      description: marketDescription,
      category,
      market_type: marketType,
      status: 'active',
      created_by: user.id,
      start_date: marketStartDate.toISOString(),
      end_date: marketEndDate.toISOString(),
      resolution_date: marketResolutionDate.toISOString(),
      initial_liquidity: initialLiquidity,
      total_liquidity: initialLiquidity,
      
      // Sports-specific fields
      sport_type_id: game.sport_type_id,
      sport_type: game.sport_type?.name,
      league_id: game.league_id,
      league: game.league?.name,
      country_code: game.home_team?.country_code || game.league?.country_code,
      
      // Team information
      team_a_id: game.home_team_id,
      team_a_name: game.home_team?.name,
      team_a_image: game.home_team?.logo_url,
      team_b_id: game.away_team_id,
      team_b_name: game.away_team?.name,
      team_b_image: game.away_team?.logo_url,
      
      // Game details
      game_date: game.scheduled_at,
      time_zone: 'UTC',
      
      // Image
      image_url: game.home_team?.logo_url || game.league?.logo
    }

    // Create outcomes based on market type
    if (marketType === 'multiple') {
      // Multiple outcome market (Team A wins, Draw, Team B wins)
      marketData.outcomes = customOutcomes || [
        {
          title: `${game.home_team?.name || 'Team A'} Wins`,
          description: `${game.home_team?.name} wins the match`,
          image_url: game.home_team?.logo_url
        },
        {
          title: 'Draw',
          description: 'Match ends in a draw',
          image_url: null
        },
        {
          title: `${game.away_team?.name || 'Team B'} Wins`,
          description: `${game.away_team?.name} wins the match`,
          image_url: game.away_team?.logo_url
        }
      ]
      
      // Set initial prices for 3-way market
      marketData.yes_price = 0.3333 // Team A
      marketData.no_price = 0.3333  // Team B
      marketData.draw_price = 0.3334 // Draw
    } else {
      // Binary market (Team A wins Yes/No)
      marketData.yes_price = 0.5000
      marketData.no_price = 0.5000
    }

    console.log('Creating market with data:', marketData)

    // Insert market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert([marketData])
      .select()
      .single()

    if (marketError) {
      console.error('Error creating market:', marketError)
      return NextResponse.json(
        { error: 'Failed to create market', details: marketError.message },
        { status: 500 }
      )
    }

    console.log('Market created successfully:', market.id)

    // For multiple outcome markets, create outcome records
    if (marketType === 'multiple' && marketData.outcomes) {
      const outcomeRecords = marketData.outcomes.map((outcome: any, index: number) => ({
        market_id: market.id,
        title: outcome.title,
        description: outcome.description,
        image_url: outcome.image_url,
        yes_price: 0.3333,
        no_price: 0.6667,
        total_shares: 0,
        total_volume: 0,
        total_yes_shares: 0,
        total_no_shares: 0,
        yes_reserve: initialLiquidity / 3,
        no_reserve: initialLiquidity / 3,
        constant_product: (initialLiquidity / 3) * (initialLiquidity / 3),
        total_liquidity: (initialLiquidity * 2) / 3
      }))

      const { error: outcomesError } = await supabase
        .from('market_outcomes')
        .insert(outcomeRecords)

      if (outcomesError) {
        console.error('Error creating outcomes:', outcomesError)
        // Market was created but outcomes failed - should we rollback?
        // For now, we'll return the market but log the error
      }
    }

    // Fetch the complete market with all relations
    const { data: completeMarket, error: fetchError } = await supabase
      .from('markets')
      .select(`
        *,
        sport_type:sport_types(*),
        league:leagues(*),
        team_a:teams!markets_team_a_id_fkey(*),
        team_b:teams!markets_team_b_id_fkey(*),
        market_outcomes(*)
      `)
      .eq('id', market.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete market:', fetchError)
      // Market was created, just return basic data
      return NextResponse.json({
        success: true,
        market
      })
    }

    return NextResponse.json({
      success: true,
      market: completeMarket,
      message: 'Market created successfully'
    })

  } catch (error: any) {
    console.error('Create market error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create market',
        details: error.message
      },
      { status: 500 }
    )
  }
}
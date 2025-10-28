// app/api/markets/create-bulk-from-games/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Bulk create markets request:', body)
    
    const { 
      gameIds,
      marketType = 'sports',
      category = 'sports',
      initialLiquidity = 100
    } = body
    
    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      return NextResponse.json(
        { error: 'Game IDs array is required' },
        { status: 400 }
      )
    }

    if (gameIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 markets can be created at once' },
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

    // Fetch all games
    const { data: games, error: gamesError } = await supabase
      .from('sports_games')
      .select(`
        *,
        sport_type:sport_types(*),
        home_team:teams!sports_games_home_team_id_fkey(*),
        away_team:teams!sports_games_away_team_id_fkey(*),
        league:leagues(*)
      `)
      .in('id', gameIds)

    if (gamesError) {
      console.error('Error fetching games:', gamesError)
      return NextResponse.json(
        { error: 'Failed to fetch games' },
        { status: 500 }
      )
    }

    if (!games || games.length === 0) {
      return NextResponse.json(
        { error: 'No valid games found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const createdMarkets = []
    const errors = []

    // Process each game
    for (const game of games) {
      try {
        // Validate game is in the future
        const gameTime = new Date(game.scheduled_at)
        
        if (gameTime <= now) {
          errors.push({
            gameId: game.id,
            error: 'Game is in the past'
          })
          continue
        }

        // Generate market data
        const marketTitle = `${game.home_team?.name || 'Team A'} vs ${game.away_team?.name || 'Team B'}`
        const marketDescription = `Who will win the ${game.sport_type?.name || 'match'} between ${game.home_team?.name} and ${game.away_team?.name}?`
        
        const marketEndDate = new Date(game.scheduled_at)
        const marketResolutionDate = new Date(new Date(game.scheduled_at).getTime() + (3 * 60 * 60 * 1000))

        const marketData: any = {
          title: marketTitle,
          description: marketDescription,
          category,
          market_type: marketType,
          status: 'active',
          created_by: user.id,
          start_date: now.toISOString(),
          end_date: marketEndDate.toISOString(),
          resolution_date: marketResolutionDate.toISOString(),
          initial_liquidity: initialLiquidity,
          total_liquidity: initialLiquidity,
          
          sport_type_id: game.sport_type_id,
          sport_type: game.sport_type?.name,
          league_id: game.league_id,
          league: game.league?.name,
          country_code: game.home_team?.country_code || game.league?.country_code,
          
          team_a_id: game.home_team_id,
          team_a_name: game.home_team?.name,
          team_a_image: game.home_team?.logo_url,
          team_b_id: game.away_team_id,
          team_b_name: game.away_team?.name,
          team_b_image: game.away_team?.logo_url,
          
          game_date: game.scheduled_at,
          time_zone: 'UTC',
          image_url: game.home_team?.logo_url || game.league?.logo
        }

        // Set prices based on market type
        if (marketType === 'multiple') {
          marketData.outcomes = [
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
          marketData.yes_price = 0.3333
          marketData.no_price = 0.3333
          marketData.draw_price = 0.3334
        } else {
          marketData.yes_price = 0.5000
          marketData.no_price = 0.5000
        }

        // Insert market
        const { data: market, error: marketError } = await supabase
          .from('markets')
          .insert([marketData])
          .select()
          .single()

        if (marketError) {
          errors.push({
            gameId: game.id,
            error: marketError.message
          })
          continue
        }

        // Create outcomes for multiple outcome markets
        if (marketType === 'multiple' && marketData.outcomes) {
          const outcomeRecords = marketData.outcomes.map((outcome: any) => ({
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

          await supabase
            .from('market_outcomes')
            .insert(outcomeRecords)
        }

        createdMarkets.push(market)

      } catch (error: any) {
        errors.push({
          gameId: game.id,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      created: createdMarkets.length,
      total: gameIds.length,
      markets: createdMarkets,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${createdMarkets.length} out of ${gameIds.length} markets`
    })

  } catch (error: any) {
    console.error('Bulk create markets error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create markets',
        details: error.message
      },
      { status: 500 }
    )
  }
}
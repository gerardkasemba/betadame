// app/api/sports/debug-fetch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('=== DEBUG FETCH STARTED ===')
    console.log('Request body:', body)
    
    const { sportType, date } = body
    
    const supabase = await createClient()
    console.log('Supabase client created')

    // Get sport type from database
    const { data: sportTypeData, error: sportError } = await supabase
      .from('sport_types')
      .select('*')
      .eq('id', sportType)
      .single()

    console.log('Sport type query:', { data: sportTypeData, error: sportError })

    if (sportError || !sportTypeData) {
      return NextResponse.json({ error: 'Sport type not found' }, { status: 404 })
    }

    console.log('Sport type found:', sportTypeData.name)

    // Generate mock data
    const today = date ? new Date(date) : new Date()
    const day = today.getDate()
    const month = today.getMonth() + 1
    const year = today.getFullYear()

    console.log('Generating mock data for date:', `${day}/${month}/${year}`)

    // Get existing teams
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('sport_type_id', sportTypeData.id)
      .limit(10)

    console.log('Existing teams:', existingTeams?.length || 0)

    let teams = existingTeams || []

    // Create mock teams if none exist
    if (teams.length === 0) {
      console.log('No teams found, creating mock teams...')
      const mockTeams = [
        { name: 'Manchester United', shortName: 'MUN', country: 'GB' },
        { name: 'Liverpool', shortName: 'LIV', country: 'GB' },
        { name: 'Arsenal', shortName: 'ARS', country: 'GB' },
        { name: 'Chelsea', shortName: 'CHE', country: 'GB' }
      ]
      
      for (const teamData of mockTeams) {
        const { data: newTeam, error } = await supabase
          .from('teams')
          .insert([{
            name: teamData.name,
            short_name: teamData.shortName,
            sport_type_id: sportTypeData.id,
            country_code: teamData.country,
            team_type: 'club'
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating team:', error)
        } else {
          teams.push(newTeam)
          console.log('Created team:', newTeam.name)
        }
      }
    }

    console.log('Final teams count:', teams.length)

    // Generate mock games
    const mockGames = []
    const baseDate = new Date(year, month - 1, day)

    for (let i = 0; i < 4; i++) {
      const gameDate = new Date(baseDate)
      gameDate.setHours(14 + (i * 2), 0, 0, 0) // 2pm, 4pm, 6pm, 8pm

      const homeTeam = teams[i % teams.length]
      const awayTeam = teams[(i + 1) % teams.length]

      if (homeTeam && awayTeam && homeTeam.id !== awayTeam.id) {
        const gameData = {
          id: `mock_${sportTypeData.id}_${i}_${Date.now()}`,
          homeTeam: {
            id: homeTeam.id,
            name: homeTeam.name,
            shortName: homeTeam.short_name
          },
          awayTeam: {
            id: awayTeam.id,
            name: awayTeam.name,
            shortName: awayTeam.short_name
          },
          startTimestamp: Math.floor(gameDate.getTime() / 1000),
          time: gameDate.toISOString(),
          status: {
            code: 1, // not started
            type: 'notstarted',
            description: 'Not Started'
          },
          tournament: {
            name: 'Premier League',
            category: {
              name: 'England'
            }
          },
          venue: {
            name: `Stadium ${i + 1}`
          }
        }

        mockGames.push(gameData)
        console.log(`Created game ${i + 1}: ${homeTeam.name} vs ${awayTeam.name}`)
      }
    }

    console.log('Generated mock games:', mockGames.length)

    // Now store these games in the database
    const processedGames = []
    
    for (const game of mockGames) {
      try {
        const gameData = {
          sport_type_id: sportTypeData.id,
          home_team_id: game.homeTeam.id,
          away_team_id: game.awayTeam.id,
          scheduled_at: game.time,
          status: 'scheduled',
          home_score: null,
          away_score: null,
          league_id: null, // We'll handle leagues later
          venue: game.venue.name,
          api_id: game.id,
          raw_data: game
        }

        console.log('Inserting game:', gameData.home_team_id, 'vs', gameData.away_team_id)

        const { data: newGame, error } = await supabase
          .from('sports_games')
          .insert([gameData])
          .select(`
            *,
            sport_type: sport_type_id (*),
            home_team: home_team_id (*),
            away_team: away_team_id (*)
          `)
          .single()

        if (error) {
          console.error('Error inserting game:', error)
        } else {
          processedGames.push(newGame)
          console.log('Successfully inserted game:', newGame.id)
        }
      } catch (error) {
        console.error('Error processing game:', error)
      }
    }

    console.log('=== DEBUG FETCH COMPLETED ===')
    console.log('Processed games:', processedGames.length)

    return NextResponse.json({
      success: true,
      games: processedGames,
      count: processedGames.length,
      source: 'debug-mock',
      debug: {
        teamsCreated: teams.length,
        gamesGenerated: mockGames.length,
        gamesInserted: processedGames.length
      }
    })

  } catch (error: any) {
    console.error('=== DEBUG FETCH ERROR ===')
    console.error('Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Debug fetch failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
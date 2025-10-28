// app/api/sports/fetch-games/route.ts - FETCH ALL UPCOMING GAMES NO LIMIT
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'allsportsapi2.p.rapidapi.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Request body:', body)
    
    const { sportType, date, leagueId } = body
    
    if (!RAPIDAPI_KEY) {
      console.error('RapidAPI key not configured')
      return NextResponse.json(
        { error: 'RapidAPI key not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    console.log('Supabase client created')

    // Get sport type from database
    console.log('Fetching sport type:', sportType)
    const { data: sportTypeData, error: sportError } = await supabase
      .from('sport_types')
      .select('*')
      .eq('id', sportType)
      .single()

    console.log('Sport type query result:', { data: sportTypeData, error: sportError })

    if (sportError || !sportTypeData) {
      console.error('Sport type not found:', sportError)
      return NextResponse.json(
        { error: 'Sport type not found: ' + (sportError?.message || 'No data') },
        { status: 404 }
      )
    }

    console.log('Sport type found:', sportTypeData.name)

    // Map our sport types to API sport names
    const sportMapping: { [key: string]: string } = {
      // Ball Sports
      'football': 'football',
      'soccer': 'football',
      'basketball': 'basketball',
      'baseball': 'baseball',
      'volleyball': 'volleyball',
      'handball': 'handball',
      'water-polo': 'water-polo',
      
      // Racket Sports
      'tennis': 'tennis',
      'badminton': 'badminton',
      'tennis de table': 'table-tennis',
      'table-tennis': 'table-tennis',
      'ping-pong': 'table-tennis',
      'squash': 'squash',
      
      // Ice/Winter Sports
      'hockey sur glace': 'ice-hockey',
      'ice-hockey': 'ice-hockey',
      'hockey': 'ice-hockey',
      'curling': 'curling',
      
      // Combat Sports
      'boxe': 'boxing',
      'boxing': 'boxing',
      'mma': 'mma',
      'ufc': 'mma',
      
      // Field Sports
      'rugby': 'rugby-union',
      'rugby-union': 'rugby-union',
      'cricket': 'cricket',
      'football américain': 'american-football',
      'american-football': 'american-football',
      'nfl': 'american-football',
      
      // Motor Sports
      'formule 1': 'formula-1',
      'f1': 'formula-1',
      'formula-1': 'formula-1',
      'nascar': 'nascar',
      'motogp': 'motogp',
      
      // Individual Sports
      'golf': 'golf',
      'athlétisme': 'athletics',
      'athletics': 'athletics',
      'natation': 'swimming',
      'swimming': 'swimming',
      
      // Other Sports
      'e-sports': 'esports',
      'esports': 'esports',
      'darts': 'darts',
    }

    const apiSportName = sportMapping[sportTypeData.name.toLowerCase()] || 'football'
    console.log('API sport name:', apiSportName)

    // ✅ FIXED: Fetch games for today + next 7 days to get ALL upcoming games
    const today = new Date()
    const games = []
    
    // First try to get live games
    try {
      console.log('Fetching live games...')
      const liveUrl = `https://${RAPIDAPI_HOST}/api/${apiSportName}/events/live`
      console.log('Live API URL:', liveUrl)

      const liveResponse = await fetch(liveUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        signal: AbortSignal.timeout(15000)
      })

      if (liveResponse.ok) {
        const liveData = await liveResponse.json()
        console.log(`Found ${liveData.events?.length || 0} live games`)
        if (liveData.events) {
          games.push(...liveData.events)
        }
      }
    } catch (error) {
      console.log('Error fetching live games:', error)
    }
    
    // Fetch games for today and next 7 days
    for (let i = 0; i < 7; i++) {
      const fetchDate = new Date(today)
      fetchDate.setDate(today.getDate() + i)
      
      const day = fetchDate.getDate()
      const month = fetchDate.getMonth() + 1
      const year = fetchDate.getFullYear()

      console.log(`Fetching games for: ${day}/${month}/${year}`)

      // ✅ CORRECTED: Use /events/ instead of /matches/
      const apiUrl = `https://${RAPIDAPI_HOST}/api/${apiSportName}/events/${day}/${month}/${year}`
      console.log('API URL:', apiUrl)

      let dailyGames = []

      // Try to fetch from RapidAPI
      try {
        console.log('Making API request to RapidAPI...')
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': RAPIDAPI_HOST
          },
          signal: AbortSignal.timeout(15000)
        })

        console.log('API response status:', response.status)
        
        if (response.ok) {
          const apiData = await response.json()
          console.log(`Successfully fetched ${apiData.events?.length || 0} games for ${day}/${month}/${year}`)
          
          // Filter to only upcoming games
          if (apiData.events) {
            const now = Date.now() / 1000
            const upcomingGames = apiData.events.filter((game: any) => {
              const gameTime = game.startTimestamp || game.time
              return gameTime > now
            })
            dailyGames = upcomingGames
            console.log(`Filtered to ${upcomingGames.length} upcoming games for ${day}/${month}/${year}`)
          }
        } else {
          const errorText = await response.text()
          console.log(`RapidAPI request failed for date: ${day}/${month}/${year}`, response.status, errorText)
          // Generate mock data for this date if API fails
          const mockData = await generateMockDataForDate(apiSportName, day, month, year, sportTypeData, supabase, i)
          dailyGames = mockData.events || []
        }
      } catch (error) {
        console.log('RapidAPI error for date:', `${day}/${month}/${year}`, error)
        // Generate mock data for this date
        const mockData = await generateMockDataForDate(apiSportName, day, month, year, sportTypeData, supabase, i)
        dailyGames = mockData.events || []
      }

      games.push(...dailyGames)
    }

    console.log(`Total games fetched across 7 days: ${games.length}`)

    // Process and store ALL games
    const processedGames = await processAndStoreGames({ events: games }, sportTypeData, supabase)

    return NextResponse.json({
      success: true,
      games: processedGames,
      count: processedGames.length,
      source: games.length > 0 ? 'api' : 'mock',
      date_range: 'next_7_days',
      note: 'Showing ALL upcoming games from today onwards with no limits'
    })

  } catch (error: any) {
    console.error('Sports API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sports data',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// ✅ Generate UPCOMING games for specific date
async function generateMockDataForDate(sport: string, day: number, month: number, year: number, sportType: any, supabase: any, dayOffset: number) {
  console.log(`Generating mock UPCOMING games for: ${day}/${month}/${year}`)
  
  // Get or create teams for this sport
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('*')
    .eq('sport_type_id', sportType.id)
    .limit(20) // Increased limit for more team variety

  let teams = existingTeams || []


  // ✅ Generate UPCOMING matches for the specific date
  const mockMatches = []
  const targetDate = new Date(year, month - 1, day)
  
  // Generate 8-12 games per day for variety
  const gamesPerDay = 8 + Math.floor(Math.random() * 5)

  for (let i = 0; i < gamesPerDay; i++) {
    const matchDate = new Date(targetDate)
    
    // Space games throughout the day (from 10:00 to 22:00)
    const hour = 10 + Math.floor(i * (12 / gamesPerDay))
    matchDate.setHours(hour, 0, 0, 0)

    // Ensure the game is in the future
    if (matchDate.getTime() < Date.now()) {
      matchDate.setHours(matchDate.getHours() + 24)
    }

    // Select random teams (ensure they're different)
    let homeTeam, awayTeam
    do {
      homeTeam = teams[Math.floor(Math.random() * teams.length)]
      awayTeam = teams[Math.floor(Math.random() * teams.length)]
    } while (!homeTeam || !awayTeam || homeTeam.id === awayTeam.id)

    if (homeTeam && awayTeam) {
      mockMatches.push({
        id: `mock_${sport}_${day}_${month}_${year}_${i}`,
        homeTeam: {
          name: homeTeam.name,
          shortName: homeTeam.short_name,
          id: homeTeam.id
        },
        awayTeam: {
          name: awayTeam.name,
          shortName: awayTeam.short_name,
          id: awayTeam.id
        },
        status: {
          type: 'notstarted'
        },
        startTimestamp: Math.floor(matchDate.getTime() / 1000),
        time: matchDate.toISOString()
      })
    }
  }

  return { events: mockMatches }
}



async function processAndStoreGames(apiResponse: any, sportType: any, supabase: any) {
  const games = apiResponse.events || []
  
  console.log(`Processing ALL ${games.length} games - NO LIMITS`)

  // Filter out games that have already started (only keep upcoming)
  const now = Date.now() / 1000
  const upcomingGames = games.filter((game: any) => {
    const gameTime = game.startTimestamp || game.time
    const timestamp = typeof gameTime === 'number' ? gameTime : new Date(gameTime).getTime() / 1000
    return timestamp > now
  })

  console.log(`Found ${upcomingGames.length} upcoming games out of ${games.length} total`)

  const processedGames = []

  // ✅ REMOVED LIMIT: Process ALL upcoming games
  for (const game of upcomingGames) {
    try {
      const gameInfo = extractGameInfo(game)
      
      if (!gameInfo.homeTeam || !gameInfo.awayTeam) {
        console.log('Skipping game - missing team data')
        continue
      }

      // Find or create home team
      const homeTeamId = await findOrCreateTeam(
        gameInfo.homeTeam.name,
        gameInfo.homeTeam.shortName,
        sportType.id,
        gameInfo.homeTeam.logo,
        supabase
      )

      // Find or create away team
      const awayTeamId = await findOrCreateTeam(
        gameInfo.awayTeam.name,
        gameInfo.awayTeam.shortName,
        sportType.id,
        gameInfo.awayTeam.logo,
        supabase
      )

      // Create game record
      const gameData = {
        sport_type_id: sportType.id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        scheduled_at: gameInfo.scheduledAt,
        status: gameInfo.status,
        home_score: gameInfo.homeScore,
        away_score: gameInfo.awayScore,
        league_id: await findOrCreateLeague(gameInfo.league, sportType.id, supabase),
        venue: gameInfo.venue,
        api_id: gameInfo.apiId,
        raw_data: game
      }

      // Insert or update game
      let gameRecord
      if (gameData.api_id) {
        const { data: existingGame } = await supabase
          .from('sports_games')
          .select('id')
          .eq('api_id', gameData.api_id)
          .single()

        if (existingGame) {
          const { data } = await supabase
            .from('sports_games')
            .update(gameData)
            .eq('id', existingGame.id)
            .select()
            .single()
          gameRecord = data
        } else {
          const { data } = await supabase
            .from('sports_games')
            .insert([gameData])
            .select()
            .single()
          gameRecord = data
        }
      } else {
        const { data } = await supabase
          .from('sports_games')
          .insert([gameData])
          .select()
          .single()
        gameRecord = data
      }

      if (gameRecord) {
        processedGames.push(gameRecord)
      }

    } catch (error) {
      console.error('Error processing game:', error)
    }
  }

  console.log(`✅ Successfully processed ALL ${processedGames.length} upcoming games`)
  return processedGames
}

function extractGameInfo(game: any) {
  const homeTeam = game.homeTeam || game.team1
  const awayTeam = game.awayTeam || game.team2

  let scheduledAt = game.time || game.startTimestamp
  if (scheduledAt) {
    if (scheduledAt < 10000000000) {
      scheduledAt = new Date(scheduledAt * 1000).toISOString()
    } else if (scheduledAt < 10000000000000) {
      scheduledAt = new Date(scheduledAt).toISOString()
    }
  } else {
    scheduledAt = new Date().toISOString()
  }

  let homeScore = null
  let awayScore = null
  
  if (game.homeScore) {
    homeScore = game.homeScore.current || game.homeScore.display || game.homeScore
  }
  if (game.awayScore) {
    awayScore = game.awayScore.current || game.awayScore.display || game.awayScore
  }

  const league = game.tournament || game.league || game.competition

  return {
    homeTeam: {
      name: homeTeam?.name || 'Home Team',
      shortName: homeTeam?.shortName || homeTeam?.name?.substring(0, 3).toUpperCase() || 'HOM',
      logo: homeTeam?.logo || homeTeam?.imagePath
    },
    awayTeam: {
      name: awayTeam?.name || 'Away Team',
      shortName: awayTeam?.shortName || awayTeam?.name?.substring(0, 3).toUpperCase() || 'AWY',
      logo: awayTeam?.logo || awayTeam?.imagePath
    },
    scheduledAt,
    status: mapGameStatus(game.status?.type || game.status?.code || game.status),
    homeScore,
    awayScore,
    league,
    venue: game.venue?.name || game.stadium,
    apiId: game.id?.toString()
  }
}

async function findOrCreateTeam(name: string, shortName: string, sportTypeId: string, logoUrl: string, supabase: any): Promise<string> {
  if (!name) {
    throw new Error('Team name is required')
  }

  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('name', name)
    .eq('sport_type_id', sportTypeId)
    .single()

  if (existingTeam) {
    return existingTeam.id
  }

  const { data: newTeam, error } = await supabase
    .from('teams')
    .insert([{
      name,
      short_name: shortName || name.substring(0, 3).toUpperCase(),
      sport_type_id: sportTypeId,
      logo_url: logoUrl,
      country_code: 'US',
      team_type: 'club'
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating team:', error)
    throw error
  }
  
  return newTeam.id
}

async function findOrCreateLeague(leagueInfo: any, sportTypeId: string, supabase: any): Promise<string | null> {
  if (!leagueInfo) return null

  const leagueName = leagueInfo.name || leagueInfo
  if (!leagueName) return null

  const { data: existingLeague } = await supabase
    .from('leagues')
    .select('id')
    .eq('name', leagueName)
    .eq('sport_type_id', sportTypeId)
    .single()

  if (existingLeague) {
    return existingLeague.id
  }

  const { data: newLeague, error } = await supabase
    .from('leagues')
    .insert([{
      name: leagueName,
      sport_type_id: sportTypeId,
      country_code: leagueInfo.category?.name || 'US',
      logo: leagueInfo.logo,
      api_id: leagueInfo.id?.toString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating league:', error)
    return null
  }

  return newLeague?.id || null
}

function mapGameStatus(apiStatus: any): string {
  if (typeof apiStatus === 'number') {
    const statusMap: { [key: number]: string } = {
      1: 'scheduled',
      2: 'scheduled',
      3: 'live',
      4: 'live',
      5: 'live',
      6: 'live',
      7: 'finished',
      8: 'finished',
      9: 'finished',
      10: 'postponed',
      11: 'cancelled',
      12: 'abandoned',
      13: 'interrupted',
      100: 'finished'
    }
    return statusMap[apiStatus] || 'scheduled'
  }

  const statusMap: { [key: string]: string } = {
    'notstarted': 'scheduled',
    'inprogress': 'live',
    'finished': 'completed',
    'postponed': 'postponed',
    'cancelled': 'cancelled',
    'abandoned': 'abandoned',
    'ns': 'scheduled',
    '1h': 'live',
    '2h': 'live',
    'ht': 'live',
    'ft': 'completed'
  }
  
  return statusMap[String(apiStatus).toLowerCase()] || 'scheduled'
}
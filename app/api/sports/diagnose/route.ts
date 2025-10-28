// app/api/sports/diagnose/route.ts - DIAGNOSTIC ENDPOINT
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'allsportsapi2.p.rapidapi.com'

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    database: {},
    api: {},
    issues: []
  }

  try {
    // 1. Check Environment Variables
    diagnostics.environment.rapidApiKeyExists = !!RAPIDAPI_KEY
    diagnostics.environment.rapidApiKeyLength = RAPIDAPI_KEY?.length || 0
    diagnostics.environment.rapidApiHost = RAPIDAPI_HOST
    diagnostics.environment.nodeEnv = process.env.NODE_ENV

    if (!RAPIDAPI_KEY) {
      diagnostics.issues.push('❌ RAPIDAPI_KEY is not set')
    } else {
      diagnostics.issues.push('✅ RAPIDAPI_KEY is configured')
    }

    // 2. Check Database Connection
    const supabase = await createClient()
    
    // Check sport types
    const { data: sportTypes, error: sportError } = await supabase
      .from('sport_types')
      .select('*')
    
    diagnostics.database.sportTypesCount = sportTypes?.length || 0
    diagnostics.database.sportTypes = sportTypes?.map(st => ({ id: st.id, name: st.name }))
    
    if (sportError) {
      diagnostics.issues.push(`❌ Database error (sport_types): ${sportError.message}`)
    } else {
      diagnostics.issues.push(`✅ Found ${sportTypes?.length || 0} sport types`)
    }

    // Check teams
    const { data: teams, error: teamsError, count: teamsCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
    
    diagnostics.database.teamsCount = teamsCount || 0
    
    if (teamsError) {
      diagnostics.issues.push(`❌ Database error (teams): ${teamsError.message}`)
    } else {
      diagnostics.issues.push(`✅ Found ${teamsCount || 0} teams`)
    }

    // Check leagues
    const { data: leagues, error: leaguesError, count: leaguesCount } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
    
    diagnostics.database.leaguesCount = leaguesCount || 0
    
    if (leaguesError) {
      diagnostics.issues.push(`❌ Database error (leagues): ${leaguesError.message}`)
    } else {
      diagnostics.issues.push(`✅ Found ${leaguesCount || 0} leagues`)
    }

    // Check games
    const { data: games, error: gamesError, count: gamesCount } = await supabase
      .from('sports_games')
      .select('*', { count: 'exact', head: true })
    
    diagnostics.database.gamesCount = gamesCount || 0
    
    if (gamesError) {
      diagnostics.issues.push(`❌ Database error (games): ${gamesError.message}`)
    } else {
      diagnostics.issues.push(`✅ Found ${gamesCount || 0} total games`)
    }

    // Check today's games
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: todayGames, count: todayCount } = await supabase
      .from('sports_games')
      .select('*, home_team:home_team_id(name), away_team:away_team_id(name)', { count: 'exact' })
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())

    diagnostics.database.todayGamesCount = todayCount || 0
    diagnostics.database.todayGames = todayGames?.map(g => ({
      home: g.home_team?.name,
      away: g.away_team?.name,
      time: g.scheduled_at,
      status: g.status
    }))

    if (todayCount === 0) {
      diagnostics.issues.push('⚠️ No games scheduled for today')
    } else {
      diagnostics.issues.push(`✅ Found ${todayCount} games for today`)
    }

    // Check date range of all games
    if (gamesCount && gamesCount > 0) {
      const { data: dateRange } = await supabase
        .from('sports_games')
        .select('scheduled_at')
        .order('scheduled_at', { ascending: true })
        .limit(1)

      const { data: latestGame } = await supabase
        .from('sports_games')
        .select('scheduled_at')
        .order('scheduled_at', { ascending: false })
        .limit(1)

      diagnostics.database.earliestGame = dateRange?.[0]?.scheduled_at
      diagnostics.database.latestGame = latestGame?.[0]?.scheduled_at
    }

    // 3. Test RapidAPI Connection
    if (RAPIDAPI_KEY && sportTypes && sportTypes.length > 0) {
      const testSport = 'football'
      const today = new Date()
      const apiUrl = `https://${RAPIDAPI_HOST}/api/${testSport}/matches/${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
      
      diagnostics.api.testUrl = apiUrl
      
      try {
        const startTime = Date.now()
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': RAPIDAPI_HOST
          },
          signal: AbortSignal.timeout(10000)
        })
        
        const responseTime = Date.now() - startTime
        diagnostics.api.responseTime = `${responseTime}ms`
        diagnostics.api.status = response.status
        diagnostics.api.statusText = response.statusText
        
        if (response.ok) {
          const data = await response.json()
          diagnostics.api.eventsCount = data.events?.length || 0
          diagnostics.api.responseKeys = Object.keys(data)
          diagnostics.issues.push(`✅ RapidAPI connection successful (${data.events?.length || 0} events)`)
          
          // Show sample event structure if available
          if (data.events && data.events.length > 0) {
            diagnostics.api.sampleEvent = {
              id: data.events[0].id,
              homeTeam: data.events[0].homeTeam?.name,
              awayTeam: data.events[0].awayTeam?.name,
              startTimestamp: data.events[0].startTimestamp,
              status: data.events[0].status
            }
          }
        } else {
          const errorText = await response.text()
          diagnostics.api.error = errorText
          diagnostics.issues.push(`❌ RapidAPI returned ${response.status}: ${errorText.substring(0, 100)}`)
        }
      } catch (error: any) {
        diagnostics.api.error = error.message
        diagnostics.issues.push(`❌ RapidAPI connection failed: ${error.message}`)
      }
    }

    // 4. Check Timezones
    diagnostics.environment.serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    diagnostics.environment.serverTime = new Date().toISOString()

    // 5. Summary
    diagnostics.summary = {
      readyToFetch: (
        !!RAPIDAPI_KEY && 
        sportTypes && sportTypes.length > 0
      ),
      issueCount: diagnostics.issues.filter((i: string) => i.startsWith('❌')).length,
      warningCount: diagnostics.issues.filter((i: string) => i.startsWith('⚠️')).length,
      successCount: diagnostics.issues.filter((i: string) => i.startsWith('✅')).length
    }

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
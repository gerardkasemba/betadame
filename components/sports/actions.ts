// app/sports/actions.ts
import { createClient } from '@/lib/supabase/client'
import { Sport, League, Country, Market } from '@/types/sports/types'


export async function getSportsData() {
  const supabase = createClient()

  // Fetch all data in parallel
  const [
    { data: sports, error: sportsError },
    { data: leagues, error: leaguesError },
    { data: markets, error: marketsError },
    { data: countries, error: countriesError }
  ] = await Promise.all([
    supabase
      .from('sport_types')
      .select('*')
      .order('name'),
    supabase
      .from('leagues')
      .select('*')
      .order('name'),
    supabase
      .from('markets')
      .select(`
        *,
        sport_types (name, icon),
        leagues (name),
        market_outcomes (
          id,
          title,
          description,
          total_shares,
          total_volume,
          yes_price,
          no_price,
          total_yes_shares,
          total_no_shares
        )
      `)
      .eq('category', 'sports')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('countries')
      .select('*')
      .order('name')
  ])

  if (sportsError || leaguesError || marketsError || countriesError) {
    console.error('Error fetching data:', { sportsError, leaguesError, marketsError, countriesError })
    throw new Error('Failed to fetch sports data')
  }

  return {
    sports: sports as Sport[],
    leagues: leagues as League[],
    countries: countries as Country[],
    markets: markets as Market[],
  }
}

export async function getFilteredMarkets(filters: {
  sport?: string
  league?: string
  country?: string
  marketType?: string
}) {
  const supabase = createClient()
  
  let query = supabase
    .from('markets')
    .select(`
      *,
      sport_types (name, icon),
      leagues (name),
      market_outcomes (
        id,
        title,
        description,
        total_shares,
        total_volume,
        yes_price,
        no_price,
        total_yes_shares,
        total_no_shares
      )
    `)
    .eq('category', 'sports')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.sport) {
    query = query.eq('sport_type_id', filters.sport)
  }
  if (filters.league) {
    query = query.eq('league_id', filters.league)
  }
  if (filters.country) {
    query = query.eq('country_code', filters.country)
  }
  if (filters.marketType) {
    query = query.eq('market_type', filters.marketType)
  }

  const { data: markets, error } = await query

  if (error) {
    console.error('Error fetching filtered markets:', error)
    throw new Error('Failed to fetch filtered markets')
  }

  return markets as Market[]
}
// app/sports/types.ts
export interface Sport {
  id: string
  name: string
  icon: string
  created_at: string
}

export interface League {
  id: string
  sport_type_id: string
  name: string
  country_code: string | null
  level: string | null
  created_at: string
}

export interface Country {
  id: string
  code: string
  name: string
  flag_emoji: string
  created_at: string
}

export interface MarketOutcome {
  id: string
  title: string
  description: string | null
  total_shares: number
  total_volume: number
  yes_price: number
  no_price: number
  total_yes_shares: number
  total_no_shares: number
}

export interface Market {
  id: string
  title: string
  description: string | null
  category: string
  status: string
  yes_price: number
  no_price: number
  draw_price: number | null
  total_volume: number
  unique_traders: number
  market_type: string
  sport_type: string | null
  league: string | null
  country_code: string | null
  team_a_name: string | null
  team_b_name: string | null
  team_a_image: string | null
  team_b_image: string | null
  game_date: string | null
  created_at: string
  sport_type_id: string | null
  league_id: string | null
  team_a_id: string | null
  team_b_id: string | null
  sport_types: {
    name: string
    icon: string
  } | null
  leagues: {
    name: string
  } | null
  market_outcomes: MarketOutcome[]
}
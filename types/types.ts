// types/types.ts

export type MarketStatus = 'pending' | 'active' | 'closed' | 'resolved' | 'cancelled'
export type MarketType = 'binary' | '3outcome' | 'multiple_choice'
// export type MarketType = 'binary' | 'multiple' | 'sports'
export type OutcomeType = 'yes' | 'no' | string
export type TradeType = 'buy' | 'sell'
export type TradeStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface MarketOutcome {
  id: string
  market_id: string
  title: string
  description: string | null
  image_url?: string | null
  yes_price: number
  no_price: number
  total_yes_shares: number
  total_no_shares: number
  total_shares: number
  total_volume: number
  created_at: string
  updated_at: string
  // Computed fields for UI
  current_price?: number
  price_change?: number
}

export interface Market {
  id: string
  title: string
  description: string | null
  category_id?: string | null
  market_type: MarketType
  image_url?: string | null
  status: MarketStatus
  created_at: string
  start_date?: string | null
  end_date?: string | null
  resolution_date?: string | null
  resolved_at?: string | null
  winning_outcome?: OutcomeType | null
  resolution_source?: string | null
  resolved_by?: string | null
  created_by?: string | null
  initial_liquidity: number
  min_bet_amount: number
  max_bet_amount: number
  total_volume: number
  total_yes_shares: number
  total_no_shares: number
  total_liquidity: number
  unique_traders: number
  category?: Category;
  yes_price: number
  no_price: number
  deleted_at?: string | null
  
  // Generated columns
  current_volume?: number
  is_active?: boolean
  
  // Sports specific fields
  country_code?: string | null
  sport_type?: string | null
  game_type?: string | null
  league?: string | null
  team_type?: string | null
  match_type?: string | null
  tournament_name?: string | null
  team_a_name?: string | null
  team_b_name?: string | null
  team_a_image?: string | null
  team_b_image?: string | null
  country_id?: string | null
  sport_type_id?: string | null
  league_id?: string | null
  match_type_id?: string | null
  team_a_id?: string | null
  team_b_id?: string | null
  game_date?: string | null
  
  // JSON fields
  outcomes?: any
  
  // Related data (from joins)
  country?: Country
  sport_type_data?: SportType
  league_data?: League
  match_type_data?: MatchType
  category_data?: Category
  market_teams?: MarketTeam[]
  liquidity_pool?: LiquidityPool
  outcomes_data?: MarketOutcome[]
}

export interface Outcome {
  id: string;
  title: string;
  description?: string;
  total_shares?: number;
  total_volume?: number;
  yes_price?: number;
  no_price?: number;
  total_yes_shares?: number;
  total_no_shares?: number;
  image_url?: string;
}


export interface Position {
  id: string
  market_id: string
  user_id: string
  shares: number
  average_price: number
  total_invested: number
  realized_profit: number
  unrealized_profit: number
  outcome: 'yes' | 'no' | 'draw'
  created_at: string
  updated_at: string
  // Computed fields
  current_value?: number
  outcome_id?: string
  profit_loss?: number
  profit_loss_percentage?: number
}

export interface Trade {
  id: string
  market_id: string
  user_id: string
  trade_type: TradeType
  outcome: OutcomeType
  shares: number
  price_per_share: number
  total_amount: number
  platform_fee: number
  status: TradeStatus
  created_at: string
  position_id?: string | null
  // Joined fields
  profiles?: {
    username: string
    avatar_url?: string
  }
  market?: {
    title: string
    image_url?: string
  }
}

export interface TradeForm {
  type: 'buy' | 'sell'
  outcome: 'yes' | 'no' | 'draw'
  amount: string
  shares: string
}

export interface TradeQuote {
  shares: number
  totalCost: number
  pricePerShare: number
  platformFee: number
  slippage: number
  minReceived?: number
  maxPaid?: number
  timestamp: number
}

export interface TradeExecution {
  id: string
  market_id: string
  user_id: string
  trade_type: 'buy' | 'sell'
  outcome: 'yes' | 'no'
  shares: number
  price_per_share: number
  total_amount: number
  platform_fee: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  position_id?: string
}

export interface TradeRequest {
  outcome: 'yes' | 'no'
  amount: number
  tradeType: 'buy' | 'sell'
  expectedShares?: number
  maxSlippage?: number
}

export interface TradeResponse {
  success: boolean
  trade?: TradeExecution
  quote?: TradeQuote
  error?: string
  message?: string
}

export interface PositionUpdate {
  id: string
  shares: number
  average_price: number
  total_invested: number
  realized_profit: number
  unrealized_profit: number
  updated_at: string
}

export interface Comment {
  id: string
  market_id: string
  user_id: string
  content: string
  parent_comment_id?: string | null
  likes_count: number
  level: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
  // Joined fields
  profiles?: {
    username: string
    avatar_url?: string
  }
  // Realtime fields
  user_has_liked?: boolean
  replies?: Comment[]
}

export interface CommentLike {
  id: string
  comment_id: string
  user_id: string
  created_at: string
}

export interface LiquidityPool {
  id: string
  market_id: string
  yes_reserve: number
  no_reserve: number
  constant_product: number
  draw_reserve?: number
  total_liquidity: number
  outcome_reserves: any // JSONB
  outcome_prices: any // JSONB
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  created_at: string
}

export interface Country {
  id: string
  code: string
  name: string
  flag_emoji: string
  created_at: string
}

export interface SportType {
  id: string
  name: string
  icon: string
  created_at: string
}

export interface League {
  id: string
  name: string
  sport_type_id: string
  country_code?: string | null
  level?: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  short_name?: string | null
  logo_url?: string | null
  created_at: string
}

export interface MatchType {
  id: string
  name: string
  description?: string | null
  created_at: string
}

export interface MarketTeam {
  id: string
  market_id: string
  team_id: string
  team_type: 'home' | 'away' | string
  created_at: string
  team: Team
}

export interface PriceHistory {
  date: string
  timestamp: number
  yes: number
  no: number
  volume: number
}

export interface MarketOverview {
  id: string
  title: string
  category: string
  status: MarketStatus
  yes_price: number
  no_price: number
  total_volume: number
  unique_traders: number
  yes_reserve: number
  no_reserve: number
  total_liquidity: number
  active_traders: number
}

export interface UserProfile {
  id: string
  username: string
  avatar_url?: string
  balance: number
  created_at: string
  updated_at: string
}

export interface TradingMetrics {
  total_volume_24h: number
  active_markets: number
  total_traders: number
  price_change_24h: number
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  error?: string
  count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Form Types
export interface TradeFormData {
  outcome: OutcomeType
  trade_type: TradeType
  shares: number
  price_per_share?: number
  total_amount?: number
}

export interface CommentFormData {
  content: string
  parent_comment_id?: string
}

export interface MarketFormData {
  title: string
  description: string
  category_id: string
  market_type: MarketType
  initial_liquidity: number
  min_bet_amount: number
  max_bet_amount: number
  end_date?: string
  resolution_date?: string
  // Sports specific
  sport_type_id?: string
  league_id?: string
  country_id?: string
  game_date?: string
  team_a_id?: string
  team_b_id?: string
  match_type_id?: string
}

// Real-time Event Types
export interface RealtimeTradeEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Trade
  old?: Trade
}

export interface RealtimeMarketEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Market
  old?: Market
}

export interface RealtimeCommentEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Comment
  old?: Comment
}

export interface RealtimePositionEvent {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Position
  old?: Position
}

// Filter Types
export interface MarketFilters {
  category?: string
  status?: MarketStatus
  sport_type?: string
  country?: string
  league?: string
  search?: string
  sort_by?: 'created_at' | 'volume' | 'end_date' | 'liquidity'
  sort_order?: 'asc' | 'desc'
}

// Chart Data Types
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    fill?: boolean
  }[]
}

export interface PriceChartData {
  timestamp: number
  yes_price: number
  no_price: number
  volume: number
}
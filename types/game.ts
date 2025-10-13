import type { GameState, Move } from '@/lib/games';

export interface GameRoom {
  id: string;
  name: string;
  board_state: any;
  current_player: number;
  status: string;
  winner_id: string | null;
  created_by: string;
  current_players: number;
  max_players: number;
  created_at: string;
  bet_amount: number;
  region: string;
  tournament_id?: string;
  game_type: 'standard' | 'tournament';
}

// types/dashboard.ts
export interface Profile {
  id: string
  balance: number
  username: string
  region: string
  state: string
  phone_number: string
  created_at: string
}

export interface DashboardData {
  profile: Profile | null
  stats: {
    totalGames: number
    totalWins: number
    winRate: number
    totalWagered: number
    totalWinnings: number
    averageGameTime: number
    activePlayersCount: number
    playerLevel: number
  }
  recentGames: any[]
  transactions: any[]
  userId: string
}

export interface GameParticipant {
  id: string;
  user_id: string;
  player_number: number;
  is_ready: boolean;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  avatar_url: string;
}

export interface ExtendedGameState extends GameState {
  selectedPiece: { row: number; col: number } | null;
  validMoves: Move[];
  lastOpponentMove: Move | null;
}

export interface TournamentInfo {
  id: string;
  name: string;
  round_type: string;
  round_number: number;
}
// Corrected interface
export interface PaymentMethod {
  name: string
  code: string
}

export interface PaymentAccountWithMethod {
  id: string
  account_number: string
  current_balance: number
  is_primary: boolean
  payment_methods: PaymentMethod // Single object, not array
}
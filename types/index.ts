export interface Piece {
  player: 'red' | 'black';
  isKing: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  row: number;
  col: number;
  isJump: boolean;
  captured: Position[] | undefined;
}

export interface Game {
  id: number;
  player1_id: string;
  player2_id: string | null;
  stake: number;
  status: 'open' | 'active' | 'finished' | 'closed';
  board: (string | null)[];
  current_player: 'black' | 'white';
  winner_id: string | null;
  created_at: string;
  closes_at: string;
  last_move_at?: string;
  finished_at?: string; //add this
}

export interface ProfileData {
  id: string;
  age: number | null;
  preferred_payment_method: string;
  balance: number;
}

export interface Transaction {
  id: number;
  user_id: string;
  balance_before: number;
  request_type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'completed' | 'canceled';
  reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface RawTransaction {
  id: number;
  user_id: string;
  balance_before: number;
  request_type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "completed" | "canceled";
  reason: string | null;
  created_at: string;
  processed_at: string | null;
  users: { email: string }[];  //
}

export type Board = (Piece | null)[][];

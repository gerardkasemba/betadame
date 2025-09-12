// Database types for Supabase tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          age: number;
          preferred_payment_method: 'orange_money' | 'm_pesa' | 'airtel_money';
          balance: number;
          created_at: string;
        };
        Insert: {
          id: string;
          age: number;
          preferred_payment_method: 'orange_money' | 'm_pesa' | 'airtel_money';
          balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          age?: number;
          preferred_payment_method?: 'orange_money' | 'm_pesa' | 'airtel_money';
          balance?: number;
          created_at?: string;
        };
      };
      games: {
        Row: {
          id: number;
          player1_id: string;
          player2_id: string | null;
          stake: number;
          status: 'open' | 'active' | 'finished' | 'closed';
          board: any; // JSONB type, can be refined further if needed
          winner_id: string | null;
          created_at: string;
          closes_at: string | null;
        };
        Insert: {
          id?: number;
          player1_id: string;
          player2_id?: string | null;
          stake: number;
          status?: 'open' | 'active' | 'finished' | 'closed';
          board?: any;
          winner_id?: string | null;
          created_at?: string;
          closes_at?: string | null;
        };
        Update: {
          id?: number;
          player1_id?: string;
          player2_id?: string | null;
          stake?: number;
          status?: 'open' | 'active' | 'finished' | 'closed';
          board?: any;
          winner_id?: string | null;
          created_at?: string;
          closes_at?: string | null;
        };
      };
    };
  };
}
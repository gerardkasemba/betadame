// In your types file
export interface Agent {
  id: string
  user_id: string
  code: string
  name: string
  region: string
  balance: number
  is_active: boolean
  online_status: 'online' | 'offline'
  has_bank_account: boolean
  bank_account_verified: boolean
  verification_status: 'pending' | 'approved' | 'rejected'
  currency_code: string
  available_balance: number
  platform_balance: number
  country?: string
  state?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  agent_id: string
  type: 'deposit' | 'withdrawal' | 'game_bet' | 'game_win'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  reference: string
  qr_code_data?: string
  created_at: string
  username?: string
  phone_number?: string
  description: string;
}

export interface DashboardStats {
  total_sales: number
  total_commissions: number
  total_deposits: number
  total_withdrawals: number
  today_transactions: number
  pending_transactions: number
  available_balance: number        // From agents.available_balance
  platform_balance: number         // From agents.platform_balance
  pending_balance: number          // From agents.balance
  payment_accounts_balance: number // Sum of agent_payment_accounts.current_balance
  pending_requests: number
  pending_withdrawal_requests: number
  deposit_commissions: number
  withdrawal_commissions: number
}

export interface PaymentAccount {
  id: string
  account_number: string
  current_balance: number
  is_primary: boolean
  payment_methods: {
    name: string
    code: string
  }
}

export interface PaymentsTabProps {
  agentId: string;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  onUpdateBalance: (accountId: string, newBalance: number) => Promise<boolean>; // Add this line
}

export interface PendingRequest {
  id: string
  amount: number
  reference: string
  created_at: string
  time_remaining: number
  proof_url?: string
  user: {
    username: string
    phone_number: string
  }
}

export interface AgentWithdrawalRequest {
  id: string
  agent_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  platform_fee: number
  maintenance_fee: number
  time_remaining: number
  net_amount: number
  rejection_reason?: string
  receipt_url?: string
  created_at: string
  processed_at?: string
}

export type TabType = 
  | 'overview' 
  | 'requests' 
  | 'deposit' 
  | 'withdrawal' 
  | 'buy_balance' 
  | 'withdraw_platform' 
  | 'payments' 
  | 'transactions'

export type TabTypeString = TabType | string
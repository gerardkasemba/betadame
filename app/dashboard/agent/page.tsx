'use client'

import { useState, useEffect, useRef, useCallback  } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AgentHeader } from './components/AgentHeader'
import { StatsGrid } from './components/StatsGrid'
import { AgentTabs } from './components/AgentTabs'
import { OverviewTab } from './components/OverviewTab'
import { RequestsTab } from './components/tabs/RequestsTab'
import { DepositTab } from './components/tabs/DepositTab'
import { WithdrawalTab } from './components/tabs/WithdrawalTab'
import { BuyBalanceTab } from './components/tabs/BuyBalanceTab'
import { PaymentsTab } from './components/tabs/PaymentsTab'
import { TransactionsTab } from './components/tabs/TransactionsTab'
import { WithdrawPlatformTab } from './components/tabs/WithdrawPlatformTab'
import { MessageAlert } from './components/MessageAlert'
import { DeclineModal } from './components/DeclineModal'
import { WithdrawalRequestModal } from './components/WithdrawalRequestModal'
import { Shield } from 'lucide-react'
import { 
  Agent, 
  Transaction, 
  DashboardStats, 
  PaymentAccount, 
  PendingRequest, 
  AgentWithdrawalRequest,
  TabType
} from './types'

// Define types for real-time payloads
interface RealtimePayload<T = any> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: string[] | null
}

interface TransactionPayload {
  id: string
  type: 'deposit' | 'withdrawal' | 'game_bet' | 'game_win'
  status: 'pending' | 'completed' | 'failed'
  agent_id: string
  user_id: string
  amount: number
  reference: string
  qr_code_data?: string
  created_at: string
  updated_at?: string
}

interface AgentPayload {
  id: string
  user_id: string
  available_balance: number
  platform_balance: number
  balance: number
  is_active: boolean
  online_status: 'online' | 'offline'
  updated_at: string
}

interface PaymentAccountPayload {
  id: string
  agent_id: string
  current_balance: number
  account_number: string
  is_primary: boolean
  updated_at: string
}

interface WithdrawalRequestPayload {
  id: string
  agent_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  platform_fee: number
  maintenance_fee: number
  net_amount: number
  created_at: string
  processed_at?: string
}

interface AdminProfitPayload {
  id: string
  agent_id: string
  transaction_id: string
  platform_fee: number
  maintenance_fee: number
  total_amount: number
  created_at: string
}

export default function AgentDashboard() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [withdrawalRequests, setWithdrawalRequests] = useState<AgentWithdrawalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [withdrawalCode, setWithdrawalCode] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositUsername, setDepositUsername] = useState('')
  const [buyBalanceAmount, setBuyBalanceAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)

  const supabase = createClient()
  
  // Use refs to track subscriptions and prevent duplicates
  const subscriptionsInitialized = useRef(false)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  // Initialize real-time subscriptions - FIXED: Only setup once
  useEffect(() => {
    if (!agent?.id || subscriptionsInitialized.current) return

    console.log('Setting up real-time subscriptions for agent:', agent.id)
    subscriptionsInitialized.current = true

    // Channel for all real-time updates
    const channel = supabase.channel('agent-dashboard-updates')
    
    // FIXED: Agent balance changes - Add debouncing and better logging
    channel.on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'agents',
        filter: `id=eq.${agent.id}`
      } as any,
      (payload: RealtimePayload<AgentPayload>) => {
        console.log('🔔 Agent balance updated - DETAILS:', {
          oldBalance: payload.old.available_balance,
          newBalance: payload.new.available_balance,
          oldPlatform: payload.old.platform_balance,
          newPlatform: payload.new.platform_balance,
          onlineStatus: payload.new.online_status,
          timestamp: new Date().toISOString()
        })
        
        // Update agent state with all fields including online_status
        setAgent(prev => prev ? { 
          ...prev, 
          available_balance: payload.new.available_balance,
          platform_balance: payload.new.platform_balance,
          balance: payload.new.balance,
          online_status: payload.new.online_status,
          updated_at: payload.new.updated_at
        } : null)
        
        // Only refresh stats if balances actually changed significantly
        const availableBalanceChanged = payload.old.available_balance !== payload.new.available_balance
        const platformBalanceChanged = payload.old.platform_balance !== payload.new.platform_balance
        
        if (availableBalanceChanged || platformBalanceChanged) {
          console.log('🔄 Refreshing stats due to balance change')
          fetchDashboardStats(agent.id)
        }
      }
    )

    // FIXED: Transaction changes - Better filtering and logging
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `agent_id=eq.${agent.id}`
      } as any,
      (payload: RealtimePayload<TransactionPayload>) => {
        console.log('💳 Transaction updated - DETAILS:', {
          type: payload.new.type,
          status: payload.new.status,
          amount: payload.new.amount,
          eventType: payload.eventType,
          timestamp: new Date().toISOString()
        })
        
        // Handle pending requests updates
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending' && payload.new.type === 'deposit') {
          console.log('🆕 New deposit request received')
          fetchPendingRequests(agent.id)
        } else if (payload.eventType === 'UPDATE' && 
                  payload.old?.status === 'pending' && 
                  (payload.new.status === 'completed' || payload.new.status === 'failed') &&
                  payload.new.type === 'deposit') {
          console.log('✅ Deposit request processed, removing from pending')
          setPendingRequests(prev => prev.filter(request => request.id !== payload.new.id))
        }
        
        // FIXED: Only refresh if it's a withdrawal that was completed
        const shouldRefresh = 
          payload.eventType === 'INSERT' || 
          (payload.eventType === 'UPDATE' && 
           payload.old.status !== payload.new.status &&
           // Only refresh for withdrawals when they're completed, not when created
           !(payload.new.type === 'withdrawal' && payload.new.status === 'pending'))
        
        if (shouldRefresh) {
          console.log('🔄 Refreshing transactions and stats')
          fetchRecentTransactions(agent.id)
          fetchDashboardStats(agent.id)
        }
      }
    )

    // Payment account changes
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'agent_payment_accounts',
        filter: `agent_id=eq.${agent.id}`
      } as any,
      (payload: RealtimePayload<PaymentAccountPayload>) => {
        console.log('💰 Payment accounts updated:', payload.eventType)
        fetchPaymentAccounts(agent.id)
        // Only refresh stats if balance actually changed
        if (payload.eventType === 'UPDATE' && payload.old.current_balance !== payload.new.current_balance) {
          fetchDashboardStats(agent.id)
        }
      }
    )

    // Withdrawal request changes
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'agent_withdrawal_requests',
        filter: `agent_id=eq.${agent.id}`
      } as any,
      (payload: RealtimePayload<WithdrawalRequestPayload>) => {
        console.log('📋 Withdrawal requests updated:', payload.eventType)
        fetchWithdrawalRequests(agent.id)
        // Only refresh stats if status changed
        if (payload.eventType === 'UPDATE' && payload.old.status !== payload.new.status) {
          fetchDashboardStats(agent.id)
        }
      }
    )

    // Admin profit changes (for commission tracking)
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'admin_profit',
        filter: `agent_id=eq.${agent.id}`
      } as any,
      (payload: RealtimePayload<AdminProfitPayload>) => {
        console.log('💸 Admin profit updated:', payload.eventType)
        fetchDashboardStats(agent.id)
      }
    )

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('📡 Real-time subscription status:', status)
    })

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions')
      subscriptionsInitialized.current = false
      supabase.removeChannel(channel)
    }
  }, [agent?.id])

  // FIXED: Only fetch agent data once on mount
  useEffect(() => {
    fetchAgentData()
  }, [])
  
  // FIXED: Proper interval cleanup
  useEffect(() => {
    // Clear any existing interval
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
      countdownInterval.current = null
    }

    // Only set up new interval if needed
    if (activeTab === 'requests' || pendingRequests.length > 0) {
      countdownInterval.current = setInterval(() => {
        updateRequestCountdowns()
      }, 1000)
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
        countdownInterval.current = null
      }
    }
  }, [activeTab, pendingRequests])

  const fetchAgentData = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (agentError) {
        console.error('Error fetching agent:', agentError)
        return
      }

      if (!agent) {
        window.location.href = '/dashboard/become-agent'
        return
      }

      setAgent(agent)

      // FIXED: Use Promise.allSettled to prevent failures from blocking other requests
      const results = await Promise.allSettled([
        fetchDashboardStats(agent.id),
        fetchRecentTransactions(agent.id),
        fetchPaymentAccounts(agent.id),
        fetchPendingRequests(agent.id),
        fetchWithdrawalRequests(agent.id)
      ])

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to fetch data at index ${index}:`, result.reason)
        }
      })

    } catch (error) {
      console.error('Error fetching agent data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Replace your handleAutoDecline function with handleAutoComplete
  const handleAutoComplete = useCallback(async (request: PendingRequest) => {
    const requestId = request.id;
    
    try {
      console.log('🤖 AUTO-COMPLETE: Starting automatic deposit completion for request:', requestId)

      // Step 1: Verify the transaction exists and is still pending
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', requestId)
        .single()

      if (txError) {
        console.error('❌ AUTO-COMPLETE: Error fetching transaction:', txError)
        throw new Error(`Transaction not found: ${txError.message}`)
      }

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      console.log('📋 AUTO-COMPLETE: Transaction details:', {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        type: transaction.type,
        user_id: transaction.user_id
      })

      if (transaction.status !== 'pending') {
        console.log(`⚠️ Transaction already processed: ${transaction.status}`)
        return // Exit silently if already processed
      }

      if (transaction.type !== 'deposit') {
        throw new Error(`Invalid transaction type: ${transaction.type}. Expected: deposit`)
      }

      // Step 2: Check agent platform balance
      console.log('💰 AUTO-COMPLETE: Checking agent platform balance...')
      if ((agent?.platform_balance || 0) < transaction.amount) {
        const errorMsg = `Solde plateforme insuffisant pour auto-complétion. Vous avez ${agent?.platform_balance}$, le dépôt est de ${transaction.amount}$`
        console.error('❌ AUTO-COMPLETE: Insufficient platform balance:', errorMsg)
        
        // Mark as failed due to insufficient balance
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            metadata: {
              ...transaction.metadata,
              failure_reason: 'Auto-complétion échouée - solde plateforme insuffisant',
              auto_failed: true,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', requestId)
          .eq('status', 'pending') // Only update if still pending
        
        setMessage({ type: 'error', text: errorMsg })
        return
      }

      // Step 3: Get current user balance
      console.log('👤 AUTO-COMPLETE: Fetching user profile...')
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('balance, username')
        .eq('id', transaction.user_id)
        .single()

      if (userError) {
        console.error('❌ AUTO-COMPLETE: Error fetching user profile:', userError)
        throw new Error(`User not found: ${userError.message}`)
      }

      console.log('📊 AUTO-COMPLETE: User balance before:', userProfile?.balance)

      const expectedBalance = userProfile?.balance || 0;
      
      // Check if already completed
      const { data: similarCompletedTx } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('reference', transaction.reference)
        .eq('status', 'completed')
        .single()

      if (similarCompletedTx) {
        console.log('⚠️ Transaction already completed elsewhere')
        return // Exit silently
      }

      // Step 4: Update transaction status
      console.log('🔄 AUTO-COMPLETE: Updating transaction status to completed...')
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          metadata: {
            ...transaction.metadata,
            auto_completed: true,
            completed_at: new Date().toISOString(),
            completion_reason: 'Auto-complété après expiration du délai de 3 minutes'
          }
        })
        .eq('id', requestId)
        .eq('status', 'pending')

      if (updateError) {
        console.error('❌ AUTO-COMPLETE: Error updating transaction status:', updateError)
        throw new Error(`Failed to update transaction: ${updateError.message}`)
      }

      console.log('✅ AUTO-COMPLETE: Transaction status updated successfully')

      // Step 5: Update user balance
      console.log('💳 AUTO-COMPLETE: Updating user balance...')
      const newUserBalance = expectedBalance + transaction.amount
      
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: newUserBalance
        })
        .eq('id', transaction.user_id)
        .eq('balance', expectedBalance)

      if (balanceError) {
        console.error('❌ AUTO-COMPLETE: Error updating user balance:', balanceError)
        
        const { data: currentUserBalance } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', transaction.user_id)
          .single()

        console.log('🔍 AUTO-COMPLETE: Current user balance after error:', currentUserBalance?.balance)
        
        if (currentUserBalance?.balance !== expectedBalance) {
          console.warn('⚠️ AUTO-COMPLETE: User balance was already updated by another process!')
        } else {
          // Rollback transaction status
          await supabase
            .from('transactions')
            .update({ status: 'pending' })
            .eq('id', requestId)
          
          throw new Error(`Failed to update user balance: ${balanceError.message}`)
        }
      } else {
        console.log('✅ AUTO-COMPLETE: User balance updated successfully')
      }

      // Step 6: Update agent platform balance
      console.log('🏦 AUTO-COMPLETE: Updating agent platform balance...')
      const newPlatformBalance = (agent?.platform_balance || 0) - transaction.amount
      const { error: agentBalanceError } = await supabase
        .from('agents')
        .update({ 
          platform_balance: newPlatformBalance
        })
        .eq('id', agent?.id)

      if (agentBalanceError) {
        console.error('❌ AUTO-COMPLETE: Error updating agent balance:', agentBalanceError)
        
        // Rollback user balance
        await supabase
          .from('profiles')
          .update({ balance: expectedBalance })
          .eq('id', transaction.user_id)
        
        // Rollback transaction status
        await supabase
          .from('transactions')
          .update({ status: 'pending' })
          .eq('id', requestId)
        
        throw new Error(`Failed to update agent balance: ${agentBalanceError.message}`)
      }

      console.log('✅ AUTO-COMPLETE: Agent balance updated successfully')

      // Update UI
      setPendingRequests(prev => prev.filter(req => req.id !== requestId))

      setMessage({ 
        type: 'success', 
        text: `✅ Dépôt de ${transaction.amount}$ AUTO-COMPLÉTÉ !
              Utilisateur: ${userProfile?.username} (+${transaction.amount}$)
              Votre solde plateforme: -${transaction.amount}$
              ⏰ Traitement automatique` 
      })

      console.log('🎉 AUTO-COMPLETE: Deposit auto-completion completed successfully')

      // Refresh stats
      await fetchDashboardStats(agent?.id!)

    } catch (error) {
      console.error('💥 AUTO-COMPLETE: Error:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur inconnue lors de l\'auto-complétion'
      
      setMessage({ 
        type: 'error', 
        text: `❌ Échec auto-complétion: ${errorMessage}` 
      })
    }
  }, [agent?.id, agent?.platform_balance]) // Add minimal dependencies

  const handleOnlineStatusChange = async (newStatus: 'online' | 'offline') => {
    if (!agent?.id) return
    
    try {
      setIsProcessing(true)
      setMessage(null)

      // Check if agent can go online
      if (newStatus === 'online' && (!agent.is_active || agent.verification_status !== 'approved')) {
        setMessage({ 
          type: 'error', 
          text: 'Votre compte doit être actif et vérifié pour passer en ligne' 
        })
        return
      }

      // Update directly in the database
      const { error } = await supabase
        .from('agents')
        .update({ 
          online_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id)

      if (error) {
        console.error('Error updating online status:', error)
        throw new Error('Erreur lors de la mise à jour du statut')
      }

      // Update local state immediately for better UX
      setAgent(prev => prev ? { ...prev, online_status: newStatus } : null)
      
      setMessage({ 
        type: 'success', 
        text: `Statut ${newStatus === 'online' ? 'en ligne' : 'hors ligne'} mis à jour avec succès` 
      })

    } catch (error) {
      console.error('Error updating online status:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut' 
      })
      throw error // Re-throw to let the toggle component handle it
    } finally {
      setIsProcessing(false)
    }
  }

  const onRefresh = () => {
    refreshData()
  }

  const onWithdraw = () => {
    setShowWithdrawalModal(true)
  }

  useEffect(() => {
  console.log('📊 Pending Requests State:', pendingRequests.map(r => ({
    id: r.id,
    ref: r.reference,
    time_remaining: r.time_remaining,
    created_at: r.created_at
  })))
}, [pendingRequests])

  // Function to check if agent has reached max pending limit
  const checkAgentPendingLimit = async (agentId: string): Promise<boolean> => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
      
      const { data: pendingTransactions, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('agent_id', agentId)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .gte('created_at', thirtyMinutesAgo)

      if (error) {
        console.error('Error checking pending limit:', error)
        return false
      }

      const hasReachedLimit = (pendingTransactions?.length || 0) >= 3
      
      if (hasReachedLimit) {
        console.log(`Agent ${agentId} has reached max pending limit: ${pendingTransactions?.length}/3`)
      }
      
      return hasReachedLimit
    } catch (error) {
      console.error('Error checking agent pending limit:', error)
      return false
    }
  }

  const updatePaymentAccountAndAgentBalance = async (accountId: string, newBalance: number) => {
    try {
      if (!agent?.id) {
        throw new Error('Agent not found')
      }

      // Start by getting current balances
      const { data: currentAccount, error: accountError } = await supabase
        .from('agent_payment_accounts')
        .select('current_balance')
        .eq('id', accountId)
        .single()

      if (accountError) throw accountError

      const { data: currentAgent, error: agentError } = await supabase
        .from('agents')
        .select('available_balance')
        .eq('id', agent.id)
        .single()

      if (agentError) throw agentError

      const balanceDifference = newBalance - (currentAccount?.current_balance || 0)

      console.log('Balance update details:', {
        accountId,
        currentAccountBalance: currentAccount?.current_balance,
        newBalance,
        currentAgentBalance: currentAgent?.available_balance,
        balanceDifference
      })

      // Update payment account
      const { error: updateAccountError } = await supabase
        .from('agent_payment_accounts')
        .update({ 
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)

      if (updateAccountError) throw updateAccountError

      // Update agent's available_balance if there's a difference
      if (balanceDifference !== 0) {
        const { error: updateAgentError } = await supabase
          .from('agents')
          .update({ 
            available_balance: (currentAgent?.available_balance || 0) + balanceDifference,
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id)

        if (updateAgentError) throw updateAgentError

        console.log('Agent available_balance updated:', {
          from: currentAgent?.available_balance,
          to: (currentAgent?.available_balance || 0) + balanceDifference
        })
      }

      return true
    } catch (error) {
      console.error('Error updating payment account and agent balance:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du solde' })
      return false
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchAgentData()
    setRefreshing(false)
  }

  const fetchPaymentAccounts = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_payment_accounts')
        .select(`
          id,
          account_number,
          current_balance,
          is_primary,
          payment_methods (
            name,
            code
          )
        `)
        .eq('agent_id', agentId)
        .order('is_primary', { ascending: false })

      if (error) {
        console.error('Error fetching payment accounts:', error)
        return
      }

      if (data) {
        const transformedData: PaymentAccount[] = data.map(item => ({
          id: item.id,
          account_number: item.account_number,
          current_balance: item.current_balance,
          is_primary: item.is_primary,
          payment_methods: Array.isArray(item.payment_methods) 
            ? item.payment_methods[0]
            : item.payment_methods
        }))
        setPaymentAccounts(transformedData)
      }
    } catch (error) {
      console.error('Error fetching payment accounts:', error)
    }
  }

  const fetchDashboardStats = async (agentId: string) => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('agent_dashboard_stats')
        .select('*')
        .eq('agent_id', agentId)
        .single()

      if (statsError) {
        console.error('Error fetching stats from view:', statsError)
        await calculateStatsManually(agentId)
        return
      }

      if (statsData) {
        setStats({
          total_sales: statsData.total_sales,
          total_commissions: statsData.total_commissions, // ✅ Now real data
          total_deposits: statsData.total_deposits,
          total_withdrawals: statsData.total_withdrawals,
          today_transactions: statsData.today_transactions,
          pending_transactions: statsData.pending_transactions,
          available_balance: statsData.available_balance,
          platform_balance: statsData.platform_balance,
          pending_balance: statsData.total_balance,
          payment_accounts_balance: statsData.payment_accounts_balance,
          pending_requests: statsData.pending_requests,
          pending_withdrawal_requests: statsData.pending_withdrawal_requests,
          deposit_commissions: statsData.deposit_commissions,     // ✅ NEW
          withdrawal_commissions: statsData.withdrawal_commissions // ✅ NEW (real data)
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      await calculateStatsManually(agentId)
    }
  }

  const handleStatusUpdate = () => {
    if (agent?.id) {
      fetchDashboardStats(agent.id)
      fetchRecentTransactions(agent.id)
    }
  }

  const calculateStatsManually = async (agentId: string) => {
    try {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('available_balance, platform_balance, balance')
        .eq('id', agentId)
        .single()

      if (agentError) throw agentError

      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, status, created_at')
        .eq('agent_id', agentId)

      const { data: paymentAccounts } = await supabase
        .from('agent_payment_accounts')
        .select('current_balance')
        .eq('agent_id', agentId)

      const total_sales = transactions?.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount : 0), 0) || 0
      const total_deposits = transactions?.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0) || 0
      const total_withdrawals = transactions?.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0) || 0
      
      const withdrawal_commissions = total_withdrawals * 0.025
      const total_commissions = withdrawal_commissions

      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0))
      const today_transactions = transactions?.filter(t => 
        new Date(t.created_at) >= startOfDay
      ).length || 0

      const pending_transactions = transactions?.filter(t => t.status === 'pending').length || 0

      const thirtyMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
      const { data: pendingRequests } = await supabase
        .from('transactions')
        .select('id')
        .eq('agent_id', agentId)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .gte('created_at', thirtyMinutesAgo)

      const { data: pendingWithdrawalRequests } = await supabase
        .from('agent_withdrawal_requests')
        .select('id')
        .eq('agent_id', agentId)
        .eq('status', 'pending')

      const payment_accounts_balance = paymentAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0

      setStats({
        total_sales,
        total_commissions,
        total_deposits,
        total_withdrawals,
        today_transactions,
        pending_transactions,
        available_balance: agentData?.available_balance || 0,
        platform_balance: agentData?.platform_balance || 0,
        pending_balance: agentData?.balance || 0,
        payment_accounts_balance,
        pending_requests: pendingRequests?.length || 0,
        pending_withdrawal_requests: pendingWithdrawalRequests?.length || 0,
        deposit_commissions: 0,
        withdrawal_commissions
      })
    } catch (error) {
      console.error('Error calculating stats manually:', error)
    }
  }

  const fetchRecentTransactions = async (agentId: string) => {
    try {
      const { data: transactions, error } = await supabase
        .from('agent_transactions_view')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching transactions from view:', error)
        return
      }

      setRecentTransactions(transactions || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  // Replace your fetchPendingRequests function with this:
  const fetchPendingRequests = async (agentId: string) => {
    try {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
      
      console.log('🔍 Fetching pending requests for agent:', agentId)
      
      // ✅ Query transactions table directly
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          amount,
          reference,
          created_at,
          proof_image_url,
          profiles!inner (
            username,
            phone_number
          )
        `)
        .eq('agent_id', agentId)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .gte('created_at', threeMinutesAgo)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching pending requests:', error)
        return
      }

      console.log('📥 Raw transactions data:', transactions)
      
      // Debug each transaction's proof_image_url
      if (transactions && transactions.length > 0) {
        transactions.forEach((tx, index) => {
          console.log(`📸 Transaction ${index + 1}:`, {
            id: tx.id,
            reference: tx.reference,
            proof_image_url: tx.proof_image_url,
            has_proof: !!tx.proof_image_url,
            proof_type: typeof tx.proof_image_url
          })
        })
      }

      if (!transactions || transactions.length === 0) {
        console.log('📭 No pending requests')
        setPendingRequests([])
        return
      }

      const requests: PendingRequest[] = transactions.map(tx => {
        const created = new Date(tx.created_at)
        const expires = new Date(created.getTime() + 3 * 60 * 1000)
        const timeRemaining = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000))
        
        const profile = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles
        
        console.log(`🔍 Mapping ${tx.reference}:`, {
          proof_image_url: tx.proof_image_url,
          proof_url: tx.proof_image_url // This is what will be used
        })
        
        return {
          id: tx.id,
          amount: tx.amount,
          reference: tx.reference,
          created_at: tx.created_at,
          time_remaining: timeRemaining,
          proof_url: tx.proof_image_url, // ✅ Use proof_image_url directly
          user: {
            username: profile?.username || 'Utilisateur',
            phone_number: profile?.phone_number || ''
          }
        }
      })

      console.log('✅ Final mapped requests:', requests.map(r => ({
        id: r.id,
        ref: r.reference,
        hasProof: !!r.proof_url,
        proofUrl: r.proof_url
      })))

      setPendingRequests(requests)
    } catch (error) {
      console.error('💥 Error fetching pending requests:', error)
    }
  }

  const fetchWithdrawalRequests = async (agentId: string) => {
    try {
      const { data: requests, error } = await supabase
        .from('agent_withdrawal_requests')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching withdrawal requests:', error)
        return
      }

      setWithdrawalRequests(requests || [])
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error)
    }
  }

  // Replace your updateRequestCountdowns function with this:
  const updateRequestCountdowns = () => {
    setPendingRequests(prev => {
      const updated = prev.map(request => {
        const created = new Date(request.created_at)
        const expires = new Date(created.getTime() + 3 * 60 * 1000)
        const timeRemaining = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000))
        
        return { ...request, time_remaining: timeRemaining }
      })
      
      const expiredCount = updated.filter(r => r.time_remaining === 0).length
      if (expiredCount > 0) {
        console.log(`⏰ ${expiredCount} requests have expired (0 seconds remaining)`)
      }
      
      return updated
    })
  }

  const approveDeposit = async (requestId: string) => {
    setIsProcessing(true)
    setMessage(null)

    try {
      console.log('🚀 Starting deposit approval for request:', requestId)

      // Step 1: Verify the transaction exists and is still pending
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', requestId)
        .single()

      if (txError) {
        console.error('❌ Error fetching transaction:', txError)
        throw new Error(`Transaction not found: ${txError.message}`)
      }

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      console.log('📋 Transaction details:', {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        type: transaction.type,
        user_id: transaction.user_id
      })

      if (transaction.status !== 'pending') {
        throw new Error(`Transaction already processed. Current status: ${transaction.status}`)
      }

      if (transaction.type !== 'deposit') {
        throw new Error(`Invalid transaction type: ${transaction.type}. Expected: deposit`)
      }

      // Step 2: Check agent platform balance
      console.log('💰 Checking agent platform balance...')
      if ((agent?.platform_balance || 0) < transaction.amount) {
        const errorMsg = `Solde plateforme insuffisant. Vous avez ${agent?.platform_balance}$, le dépôt est de ${transaction.amount}$`
        console.error('❌ Insufficient platform balance:', errorMsg)
        setMessage({ type: 'error', text: errorMsg })
        return
      }

      // Step 3: Get current user balance and VERIFY it hasn't already been updated
      console.log('👤 Fetching user profile...')
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('balance, username')
        .eq('id', transaction.user_id)
        .single()

      if (userError) {
        console.error('❌ Error fetching user profile:', userError)
        throw new Error(`User not found: ${userError.message}`)
      }

      console.log('📊 User balance before:', userProfile?.balance)

      // ⚠️ CRITICAL CHECK: Verify the user hasn't already received the funds
      // If the user's balance is already higher than expected, don't add again
      const expectedBalance = userProfile?.balance || 0;
      
      // Check if this transaction might have already been processed elsewhere
      const { data: similarCompletedTx } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('reference', transaction.reference)
        .eq('status', 'completed')
        .single()

      if (similarCompletedTx) {
        throw new Error('This transaction appears to have already been completed elsewhere')
      }

      // Step 4: Update transaction status
      console.log('🔄 Updating transaction status to completed...')
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: 'completed'
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Important: only update if still pending

      if (updateError) {
        console.error('❌ Error updating transaction status:', updateError)
        throw new Error(`Failed to update transaction: ${updateError.message}`)
      }

      console.log('✅ Transaction status updated successfully')

      // Step 5: Update user balance (ONLY if not already updated)
      console.log('💳 Updating user balance...')
      const newUserBalance = expectedBalance + transaction.amount
      
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: newUserBalance
        })
        .eq('id', transaction.user_id)
        .eq('balance', expectedBalance) // ⚠️ CRITICAL: Only update if balance hasn't changed

      if (balanceError) {
        console.error('❌ Error updating user balance:', balanceError)
        
        // Check if balance was already updated by another process
        const { data: currentUserBalance } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', transaction.user_id)
          .single()

        console.log('🔍 Current user balance after error:', currentUserBalance?.balance)
        
        if (currentUserBalance?.balance !== expectedBalance) {
          console.warn('⚠️ User balance was already updated by another process!')
          // Don't rollback - the funds might have been added correctly elsewhere
        } else {
          // Rollback transaction status if user balance update fails and balance hasn't changed
          await supabase
            .from('transactions')
            .update({ 
              status: 'pending'
            })
            .eq('id', requestId)
          
          throw new Error(`Failed to update user balance: ${balanceError.message}`)
        }
      } else {
        console.log('✅ User balance updated successfully')
      }

      // Step 6: Update agent platform balance
      console.log('🏦 Updating agent platform balance...')
      const newPlatformBalance = (agent?.platform_balance || 0) - transaction.amount
      const { error: agentBalanceError } = await supabase
        .from('agents')
        .update({ 
          platform_balance: newPlatformBalance
        })
        .eq('id', agent?.id)

      if (agentBalanceError) {
        console.error('❌ Error updating agent balance:', agentBalanceError)
        
        // Rollback user balance if agent balance update fails
        await supabase
          .from('profiles')
          .update({ 
            balance: expectedBalance
          })
          .eq('id', transaction.user_id)
        
        // Rollback transaction status
        await supabase
          .from('transactions')
          .update({ 
            status: 'pending'
          })
          .eq('id', requestId)
        
        throw new Error(`Failed to update agent balance: ${agentBalanceError.message}`)
      }

      console.log('✅ Agent balance updated successfully')

      // Step 7: Final verification
      console.log('🔍 Final verification...')
      const { data: finalTransaction } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', requestId)
        .single()

      const { data: finalUser } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', transaction.user_id)
        .single()

      const { data: finalAgent } = await supabase
        .from('agents')
        .select('platform_balance')
        .eq('id', agent?.id)
        .single()

      console.log('📋 Final verification results:', {
        transactionStatus: finalTransaction?.status,
        userBalance: finalUser?.balance,
        expectedUserBalance: expectedBalance + transaction.amount,
        agentBalance: finalAgent?.platform_balance,
        expectedAgentBalance: (agent?.platform_balance || 0) - transaction.amount
      })

      // Step 8: Update UI - FIXED: Use functional update to ensure we're working with latest state
      setPendingRequests(prev => prev.filter(request => request.id !== requestId))

      setMessage({ 
        type: 'success', 
        text: `✅ Dépôt de ${transaction.amount}$ approuvé avec succès !
              Utilisateur: ${userProfile?.username} (+${transaction.amount}$)
              Votre solde plateforme: -${transaction.amount}$` 
      })

      console.log('🎉 Deposit approval completed successfully')

      // Refresh data - FIXED: Only refresh what's necessary
      await fetchDashboardStats(agent?.id!)

    } catch (error) {
      console.error('💥 Error in approveDeposit:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur inconnue lors de l\'approbation du dépôt'
      
      setMessage({ 
        type: 'error', 
        text: `❌ ${errorMessage}` 
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const declineDeposit = async (requestId: string, reason: string) => {
    setIsProcessing(true)
    setMessage(null)

    try {
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', requestId)
        .single()

      if (txError) throw txError

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          qr_code_data: reason
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // IMMEDIATELY remove the declined request from the UI
      setPendingRequests(prev => prev.filter(request => request.id !== requestId))

      setMessage({ 
        type: 'success', 
        text: `Dépôt de ${transaction.amount}$ refusé.` 
      })

      setShowDeclineModal(false)
      setDeclineReason('')
      setSelectedRequest(null)

      // Refresh stats
      await fetchDashboardStats(agent?.id!)

    } catch (error) {
      console.error('Error declining deposit:', error)
      setMessage({ type: 'error', text: 'Erreur lors du refus du dépôt' })
    } finally {
      setIsProcessing(false)
    }
  }

  const processWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setMessage(null)

    try {
      if (!withdrawalCode.trim()) {
        setMessage({ type: 'error', text: 'Veuillez entrer un code de retrait' })
        return
      }

      const { data: withdrawal, error: findError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', withdrawalCode.trim())
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .single()

      if (findError || !withdrawal) {
        setMessage({ type: 'error', text: 'Code de retrait invalide ou déjà traité' })
        return
      }

      const agentCommission = withdrawal.amount * 0.025
      const agentTransactionFee = withdrawal.amount * 0.015
      const platformFee = withdrawal.amount * 0.02
      const maintenanceFee = withdrawal.amount * 0.02
      const totalFees = agentCommission + agentTransactionFee + platformFee + maintenanceFee
      const netAmountToUser = withdrawal.amount - totalFees

      if ((agent?.available_balance || 0) < withdrawal.amount) {
        setMessage({ 
          type: 'error', 
          text: `Solde disponible insuffisant. Vous avez ${agent?.available_balance}$, le retrait est de ${withdrawal.amount}$` 
        })
        return
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          agent_id: agent?.id
        })
        .eq('id', withdrawal.id)

      if (updateError) throw updateError

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', withdrawal.user_id)
        .single()

      const { error: userBalanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: (userProfile?.balance || 0) + netAmountToUser
        })
        .eq('id', withdrawal.user_id)

      if (userBalanceError) throw userBalanceError

      const { error: agentBalanceError } = await supabase
        .from('agents')
        .update({ 
          available_balance: (agent?.available_balance || 0) - withdrawal.amount,
          platform_balance: (agent?.platform_balance || 0) + agentCommission
        })
        .eq('id', agent?.id)

      if (agentBalanceError) throw agentBalanceError

      // ✅ ADD THIS MISSING COMMISSION RECORDING
      const now = new Date().toISOString()
      
      // Record the 2.5% commission
      const { error: commissionError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id: agent?.id!,
          transaction_id: withdrawal.id,
          amount: agentCommission,
          type: 'withdrawal',
          status: 'paid',
          paid_at: now,
          created_at: now
        })

      if (commissionError) {
        console.error('Error recording agent commission:', commissionError)
        // Don't throw here - we don't want to fail the whole transaction over commission recording
      }

      // Record the 1.5% transaction fee
      const { error: transactionFeeError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id: agent?.id!,
          transaction_id: withdrawal.id,
          amount: agentTransactionFee,
          type: 'withdrawal',
          status: 'paid',
          paid_at: now,
          created_at: now
        })

      if (transactionFeeError) {
        console.error('Error recording transaction fee:', transactionFeeError)
      }

      console.log('Agent commissions recorded:', {
        commission: agentCommission,
        transactionFee: agentTransactionFee,
        total: agentCommission + agentTransactionFee
      })

      const { error: profitError } = await supabase
        .from('admin_profit')
        .insert({
          transaction_id: withdrawal.id,
          agent_id: agent?.id!,
          platform_fee: platformFee + agentTransactionFee,
          maintenance_fee: maintenanceFee,
          total_amount: platformFee + maintenanceFee + agentTransactionFee
        })

      if (profitError) throw profitError

      setMessage({ 
        type: 'success', 
        text: `Retrait de ${withdrawal.amount}$ traité. 
              Frais totaux: ${totalFees.toFixed(2)}$ (8%)
              Commission agent: ${agentCommission.toFixed(2)}$ ajoutée au solde plateforme
              Montant utilisateur: ${netAmountToUser.toFixed(2)}$` 
      })

      setWithdrawalCode('')
      // Real-time updates will handle the refresh automatically

    } catch (error) {
      console.error('Error processing withdrawal:', error)
      setMessage({ type: 'error', text: 'Erreur lors du traitement du retrait' })
    } finally {
      setIsProcessing(false)
    }
  }

  const processDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setMessage(null)

    try {
      const amount = parseFloat(depositAmount)
      if (isNaN(amount) || amount <= 0) {
        setMessage({ type: 'error', text: 'Montant de dépôt invalide' })
        return
      }

      if (!depositUsername.trim()) {
        setMessage({ type: 'error', text: 'Veuillez entrer un nom d\'utilisateur' })
        return
      }

      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, balance, username')
        .eq('username', depositUsername.trim())
        .single()

      if (userError || !user) {
        setMessage({ type: 'error', text: 'Utilisateur non trouvé' })
        return
      }

      if ((agent?.platform_balance || 0) < amount) {
        setMessage({ 
          type: 'error', 
          text: `Solde plateforme insuffisant. Vous avez ${agent?.platform_balance}$, le dépôt est de ${amount}$. Achetez plus de solde plateforme.` 
        })
        return
      }

      const reference = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          agent_id: agent?.id,
          type: 'deposit',
          amount: amount,
          status: 'completed',
          reference: reference
        })
        .select()
        .single()

      if (txError) throw txError

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: (user.balance || 0) + amount 
        })
        .eq('id', user.id)

      if (balanceError) throw balanceError

      const { error: agentBalanceError } = await supabase
        .from('agents')
        .update({ 
          platform_balance: (agent?.platform_balance || 0) - amount 
        })
        .eq('id', agent?.id)

      if (agentBalanceError) throw agentBalanceError

      setMessage({ 
        type: 'success', 
        text: `Dépôt de ${amount}$ effectué pour ${user.username}. Montant déduit du solde plateforme.` 
      })

      setDepositAmount('')
      setDepositUsername('')
      // Real-time updates will handle the refresh automatically

    } catch (error) {
      console.error('Error processing deposit:', error)
      setMessage({ type: 'error', text: 'Erreur lors du traitement du dépôt' })
    } finally {
      setIsProcessing(false)
    }
  }

  const buyPlatformBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setMessage(null)

    try {
      const amount = parseFloat(buyBalanceAmount)
      if (isNaN(amount) || amount <= 0) {
        setMessage({ type: 'error', text: 'Montant invalide' })
        return
      }

      const { error } = await supabase
        .from('agents')
        .update({ 
          platform_balance: (agent?.platform_balance || 0) + amount
        })
        .eq('id', agent?.id)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: `Achat de ${amount}$ de solde plateforme réussi !` 
      })

      setBuyBalanceAmount('')
      // Real-time updates will handle the refresh automatically

    } catch (error) {
      console.error('Error buying platform balance:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'achat de solde' })
    } finally {
      setIsProcessing(false)
    }
  }

  const requestAgentWithdrawal = async (amount: number) => {
    setIsProcessing(true)
    setMessage(null)

    try {
      if (amount <= 0) {
        setMessage({ type: 'error', text: 'Montant invalide' })
        return
      }

      if ((agent?.platform_balance || 0) < amount) {
        setMessage({ 
          type: 'error', 
          text: `Solde plateforme insuffisant. Vous avez ${agent?.platform_balance}$, demande de ${amount}$` 
        })
        return
      }

      const platformFee = amount * 0.02
      const maintenanceFee = amount * 0.02
      const totalFees = platformFee + maintenanceFee
      const netAmount = amount - totalFees

      const { error } = await supabase
        .from('agent_withdrawal_requests')
        .insert({
          agent_id: agent?.id,
          amount: amount,
          platform_fee: platformFee,
          maintenance_fee: maintenanceFee,
          net_amount: netAmount,
          status: 'pending'
        })

      if (error) throw error

      const { error: balanceError } = await supabase
        .from('agents')
        .update({ 
          platform_balance: (agent?.platform_balance || 0) - amount
        })
        .eq('id', agent?.id)

      if (balanceError) throw balanceError

      setMessage({ 
        type: 'success', 
        text: `Demande de retrait de ${amount}$ envoyée. 
               Frais: ${totalFees.toFixed(2)}$ (4%)
               Montant net: ${netAmount.toFixed(2)}$
               Délai: 24 heures maximum` 
      })

      setShowWithdrawalModal(false)
      // Real-time updates will handle the refresh automatically

    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la demande de retrait' })
    } finally {
      setIsProcessing(false)
    }
  }

  const startQRScan = () => {
    const input = document.getElementById('withdrawalCode')
    if (input) input.focus()
    setMessage({ type: 'success', text: 'Mode scan activé - Entrez le code manuellement ou utilisez un scanner QR' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement du tableau de bord agent...</p>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Accès agent non autorisé</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AgentHeader
        agent={agent}
        stats={stats}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onWithdraw={onWithdraw}
        onOnlineStatusChange={handleOnlineStatusChange}
      />

      {stats && <StatsGrid stats={stats} />}

      <div className="bg-white rounded-2xl shadow-lg">
        <AgentTabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingRequests={stats?.pending_requests || 0}
          pendingWithdrawalRequests={stats?.pending_withdrawal_requests || 0}
        />

        <div className="p-6">
          <MessageAlert message={message} />

          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              paymentAccounts={paymentAccounts}
              recentTransactions={recentTransactions}
              withdrawalRequests={withdrawalRequests}
              onTabChange={setActiveTab}
              onWithdraw={() => setShowWithdrawalModal(true)}
            />
          )}

          {activeTab === 'requests' && (
            <RequestsTab
              pendingRequests={pendingRequests}
              isProcessing={isProcessing}
              onApprove={approveDeposit}
              onDecline={(request) => {
                setSelectedRequest(request)
                setShowDeclineModal(true)
              }}
              onAutoComplete={handleAutoComplete} // ✅ ADD THIS PROP
              onRefresh={refreshData}
              refreshing={refreshing}
            />
          )}

          {activeTab === 'deposit' && (
            <DepositTab
              depositAmount={depositAmount}
              depositUsername={depositUsername}
              isProcessing={isProcessing}
              onAmountChange={setDepositAmount}
              onUsernameChange={setDepositUsername}
              onSubmit={processDeposit}
            />
          )}

          {activeTab === 'withdrawal' && (
            <WithdrawalTab
              withdrawalCode={withdrawalCode}
              isProcessing={isProcessing}
              stats={stats}
              onCodeChange={setWithdrawalCode}
              onSubmit={processWithdrawal}
              onQRScan={startQRScan}
              onStatusUpdate={handleStatusUpdate}
            />
          )}

          {activeTab === 'buy_balance' && (
            <BuyBalanceTab
              buyBalanceAmount={buyBalanceAmount}
              agentBalance={agent?.platform_balance || 0}
              isProcessing={isProcessing}
              onAmountChange={setBuyBalanceAmount}
              onSubmit={buyPlatformBalance}
            />
          )}

          {activeTab === 'withdraw_platform' && (
            <WithdrawPlatformTab
              platformBalance={agent?.platform_balance || 0}
              withdrawalRequests={withdrawalRequests}
              onWithdraw={() => setShowWithdrawalModal(true)}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsTab
              agentId={agent.id}
              onRefresh={refreshData}
              refreshing={refreshing}
              onUpdateBalance={updatePaymentAccountAndAgentBalance}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsTab
              recentTransactions={recentTransactions}
            />
          )}
        </div>
      </div>

      <DeclineModal
        isOpen={showDeclineModal}
        selectedRequest={selectedRequest}
        declineReason={declineReason}
        isProcessing={isProcessing}
        onReasonChange={setDeclineReason}
        onClose={() => {
          setShowDeclineModal(false)
          setSelectedRequest(null)
          setDeclineReason('')
        }}
        onSubmit={declineDeposit}
      />

      <WithdrawalRequestModal
        isOpen={showWithdrawalModal}
        platformBalance={agent?.platform_balance || 0}
        isProcessing={isProcessing}
        onClose={() => setShowWithdrawalModal(false)}
        onSubmit={requestAgentWithdrawal}
      />
    </div>
  )
}
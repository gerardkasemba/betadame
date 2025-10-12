'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Shield, 
  CreditCard, 
  TrendingUp, 
  BarChart3,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Download,
  UserPlus,
  Building,
  DollarSign,
  Activity,
  FileText,
  Upload,
  Eye,
  Edit,
  Filter,
  MoreVertical
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  username: string
  email: string
  phone_number: string
  region: string
  balance: number
  is_verified: boolean
  created_at: string
  is_agent: boolean
  agent_id?: string
  agent_code?: string
  agent_status?: string
  agent_active?: boolean
}

interface Agent {
  id: string
  code: string
  name: string
  region: string
  balance: number
  available_balance: number
  platform_balance: number
  is_active: boolean
  verification_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  username: string
  email: string
  phone_number: string
  total_transactions: number
  total_volume: number
}

interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'game_bet' | 'game_win'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  reference: string
  created_at: string
  user_username: string
  agent_code?: string
}

interface AgentWithdrawalRequest {
  id: string
  agent_id: string
  agent_code: string
  agent_name: string
  agent_email: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  platform_fee: number
  maintenance_fee: number
  net_amount: number
  rejection_reason?: string
  receipt_url?: string
  created_at: string
  processed_at?: string
}

interface DashboardStats {
  total_users: number
  total_agents: number
  active_agents: number
  total_transactions: number
  total_volume: number
  pending_verifications: number
  pending_withdrawal_requests: number
  total_profits: number
  monthly_profits: number
}

type WithdrawalTab = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'agents' | 'transactions' | 'withdrawals'>('overview')
  const [withdrawalTab, setWithdrawalTab] = useState<WithdrawalTab>('all')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawalRequests, setWithdrawalRequests] = useState<AgentWithdrawalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AgentWithdrawalRequest | null>(null)
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [agentForm, setAgentForm] = useState({
    name: '',
    region: 'brazzaville'
  })

  const supabase = createClient()

  useEffect(() => {
    checkAuthorization()
  }, [])

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email === 'gerardkasemba@gmail.com') {
        setIsAuthorized(true)
        fetchAdminData()
      } else {
        setIsAuthorized(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Authorization error:', error)
      setIsAuthorized(false)
      setIsLoading(false)
    }
  }

  const fetchAdminData = async () => {
    try {
      setIsLoading(true)
      
      await Promise.all([
        fetchDashboardStats(),
        fetchUsers(),
        fetchAgents(),
        fetchTransactions(),
        fetchWithdrawalRequests()
      ])
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get total agents
      const { count: totalAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })

      // Get active agents
      const { count: activeAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get total transactions
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      // Get total volume
      const { data: volumeData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')

      const totalVolume = volumeData?.reduce((sum, t) => sum + t.amount, 0) || 0

      // Get pending verifications
      const { count: pendingVerifications } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending')

      // Get pending withdrawal requests
      const { count: pendingWithdrawalRequests } = await supabase
        .from('agent_withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get total profits
      const { data: profitsData } = await supabase
        .from('admin_profit')
        .select('total_amount')

      const totalProfits = profitsData?.reduce((sum, p) => sum + p.total_amount, 0) || 0

      // Get monthly profits
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const { data: monthlyProfitsData } = await supabase
        .from('admin_profit')
        .select('total_amount, created_at')
        .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())

      const monthlyProfits = monthlyProfitsData?.reduce((sum, p) => sum + p.total_amount, 0) || 0

      setStats({
        total_users: totalUsers || 0,
        total_agents: totalAgents || 0,
        active_agents: activeAgents || 0,
        total_transactions: totalTransactions || 0,
        total_volume: totalVolume,
        pending_verifications: pendingVerifications || 0,
        pending_withdrawal_requests: pendingWithdrawalRequests || 0,
        total_profits: totalProfits,
        monthly_profits: monthlyProfits
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchWithdrawalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_withdrawal_requests')
        .select(`
          *,
          agents (
            code,
            name,
            user_id
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const requestsWithAgentInfo = await Promise.all(
        (data || []).map(async (request) => {
          // Get agent profile details
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', request.agents.user_id)
            .single()

          return {
            id: request.id,
            agent_id: request.agent_id,
            agent_code: request.agents.code,
            agent_name: request.agents.name,
            agent_email: profile?.email || 'Unknown',
            amount: request.amount,
            status: request.status,
            platform_fee: request.platform_fee,
            maintenance_fee: request.maintenance_fee,
            net_amount: request.net_amount,
            rejection_reason: request.rejection_reason,
            receipt_url: request.receipt_url,
            created_at: request.created_at,
            processed_at: request.processed_at
          }
        })
      )

      setWithdrawalRequests(requestsWithAgentInfo)
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error)
    }
  }

  // Filter withdrawal requests based on active tab and search
  const filteredWithdrawalRequests = withdrawalRequests.filter(request => {
    // Filter by tab
    if (withdrawalTab !== 'all' && request.status !== withdrawalTab) {
      return false
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        request.agent_name.toLowerCase().includes(term) ||
        request.agent_code.toLowerCase().includes(term) ||
        request.agent_email.toLowerCase().includes(term)
      )
    }
    
    return true
  })

  const handleApproveWithdrawal = async (requestId: string) => {
    try {
      const request = withdrawalRequests.find(r => r.id === requestId)
      if (!request) return

      // Use the database function to approve withdrawal
      const { error } = await supabase.rpc('approve_agent_withdrawal', {
        p_request_id: requestId
      })

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: `Retrait de ${request.amount}$ approuvé. Montant net versé: ${request.net_amount}$. Frais enregistrés: ${(request.platform_fee + request.maintenance_fee).toFixed(2)}$` 
      })
      
      fetchWithdrawalRequests()
      fetchDashboardStats()
      fetchAgents() // Refresh agent balances
    } catch (error: any) {
      console.error('Error approving withdrawal:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de l\'approbation du retrait' 
      })
    }
  }

  const handleRejectWithdrawal = async (requestId: string, reason: string) => {
    try {
      const request = withdrawalRequests.find(r => r.id === requestId)
      if (!request) return

      // Use the database function to reject withdrawal
      const { error } = await supabase.rpc('reject_agent_withdrawal', {
        p_request_id: requestId,
        p_rejection_reason: reason
      })

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: `Retrait de ${request.amount}$ rejeté. Montant retourné au solde plateforme.` 
      })
      
      setShowWithdrawalModal(false)
      setSelectedWithdrawal(null)
      setRejectionReason('')
      
      fetchWithdrawalRequests()
      fetchDashboardStats()
      fetchAgents() // Refresh agent balances
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors du rejet du retrait' 
      })
    }
  }

  const uploadReceipt = async (requestId: string, file: File) => {
    try {
      setUploadingReceipt(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${requestId}-receipt.${fileExt}`
      const filePath = `receipts/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('transaction-proofs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('transaction-proofs')
        .getPublicUrl(filePath)

      // Update withdrawal request with receipt URL
      const { error: updateError } = await supabase
        .from('agent_withdrawal_requests')
        .update({ receipt_url: publicUrl })
        .eq('id', requestId)

      if (updateError) throw updateError

      setMessage({ type: 'success', text: 'Reçu téléchargé avec succès' })
      fetchWithdrawalRequests()
    } catch (error) {
      console.error('Error uploading receipt:', error)
      setMessage({ type: 'error', text: 'Erreur lors du téléchargement du reçu' })
    } finally {
      setUploadingReceipt(false)
    }
  }

  const downloadWithdrawalReport = () => {
    const headers = ['ID', 'Agent', 'Code Agent', 'Email', 'Montant', 'Frais Plateforme', 'Frais Maintenance', 'Net', 'Statut', 'Date Demande', 'Date Traitement', 'Raison Rejet']
    
    const csvData = withdrawalRequests.map(request => [
      request.id,
      request.agent_name,
      request.agent_code,
      request.agent_email,
      request.amount.toFixed(2),
      request.platform_fee.toFixed(2),
      request.maintenance_fee.toFixed(2),
      request.net_amount.toFixed(2),
      request.status === 'approved' ? 'Approuvé' : request.status === 'rejected' ? 'Rejeté' : 'En attente',
      new Date(request.created_at).toLocaleDateString('fr-FR'),
      request.processed_at ? new Date(request.processed_at).toLocaleDateString('fr-FR') : '',
      request.rejection_reason || ''
    ])

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `retraits-agents-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate withdrawal statistics
  const withdrawalStats = {
    pending: withdrawalRequests.filter(r => r.status === 'pending').length,
    approved: withdrawalRequests.filter(r => r.status === 'approved').length,
    rejected: withdrawalRequests.filter(r => r.status === 'rejected').length,
    totalAmount: withdrawalRequests.reduce((sum, r) => sum + r.amount, 0),
    totalFees: withdrawalRequests.reduce((sum, r) => sum + r.platform_fee + r.maintenance_fee, 0),
    pendingAmount: withdrawalRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0)
  }

  // ... (keep all the existing functions like fetchUsers, fetchAgents, fetchTransactions, promoteToAgent, etc.)

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...')
      
      // Try the view first
      const { data, error } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('View not found, using fallback query:', error)
        // Fallback to manual query
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
          return
        }

        if (profilesData) {
          console.log('Profiles data found:', profilesData.length)
          const usersWithAgentInfo = await Promise.all(
            profilesData.map(async (profile) => {
              const { data: agentData } = await supabase
                .from('agents')
                .select('id, code, verification_status, is_active')
                .eq('user_id', profile.id)
                .single()

              return {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                phone_number: profile.phone_number,
                region: profile.region,
                balance: profile.balance,
                is_verified: profile.is_verified,
                created_at: profile.created_at,
                is_agent: !!agentData,
                agent_id: agentData?.id,
                agent_code: agentData?.code,
                agent_status: agentData?.verification_status,
                agent_active: agentData?.is_active
              }
            })
          )
          console.log('Users with agent info:', usersWithAgentInfo.length)
          setUsers(usersWithAgentInfo)
        }
        return
      }

      console.log('Users from view:', data?.length)
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      console.log('Fetching agents...')
      
      // Try the view first
      const { data, error } = await supabase
        .from('admin_agents_view')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Agents view not found, using fallback:', error)
        // Fallback to manual query
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*')
          .order('created_at', { ascending: false })

        if (agentsError) {
          console.error('Error fetching agents:', agentsError)
          return
        }

        if (agentsData) {
          console.log('Agents data found:', agentsData.length)
          const agentsWithDetails = await Promise.all(
            agentsData.map(async (agent) => {
              // Get profile details
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username, email, phone_number')
                .eq('id', agent.user_id)
                .single()

              // Get transaction stats
              const { data: transactionsData } = await supabase
                .from('transactions')
                .select('amount')
                .eq('agent_id', agent.id)
                .eq('status', 'completed')

              const total_transactions = transactionsData?.length || 0
              const total_volume = transactionsData?.reduce((sum, t) => sum + t.amount, 0) || 0

              return {
                id: agent.id,
                code: agent.code,
                name: agent.name,
                region: agent.region,
                balance: agent.balance,
                available_balance: agent.available_balance || 0,
                platform_balance: agent.platform_balance || 0,
                is_active: agent.is_active,
                verification_status: agent.verification_status,
                created_at: agent.created_at,
                username: profileData?.username || 'Unknown',
                email: profileData?.email || 'Unknown',
                phone_number: profileData?.phone_number || 'Unknown',
                total_transactions,
                total_volume
              }
            })
          )
          console.log('Agents with details:', agentsWithDetails.length)
          setAgents(agentsWithDetails)
        }
        return
      }

      console.log('Agents from view:', data?.length)
      setAgents(data || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions...')
      
      // Try the view first
      const { data, error } = await supabase
        .from('admin_transactions_view')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.log('Transactions view not found, using fallback:', error)
        // Fallback to manual query
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError)
          return
        }

        if (transactionsData) {
          console.log('Transactions data found:', transactionsData.length)
          const transactionsWithDetails = await Promise.all(
            transactionsData.map(async (transaction) => {
              // Get user details
              const { data: userData } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', transaction.user_id)
                .single()

              // Get agent details if exists
              let agent_code = undefined
              if (transaction.agent_id) {
                const { data: agentData } = await supabase
                  .from('agents')
                  .select('code')
                  .eq('id', transaction.agent_id)
                  .single()
                agent_code = agentData?.code
              }

              return {
                id: transaction.id,
                type: transaction.type,
                amount: transaction.amount,
                status: transaction.status,
                reference: transaction.reference,
                created_at: transaction.created_at,
                user_username: userData?.username || 'Unknown',
                agent_code
              }
            })
          )
          console.log('Transactions with details:', transactionsWithDetails.length)
          setTransactions(transactionsWithDetails)
        }
        return
      }

      console.log('Transactions from view:', data?.length)
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const promoteToAgent = async () => {
    if (!selectedUser || !agentForm.name.trim()) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' })
      return
    }

    try {
      // Generate unique agent code
      const agentCode = `AGT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

      // Create agent record directly
      const { data, error } = await supabase
        .from('agents')
        .insert({
          user_id: selectedUser.id,
          code: agentCode,
          name: agentForm.name,
          region: agentForm.region,
          is_active: true,
          has_bank_account: false,
          bank_account_verified: false,
          verification_status: 'approved',
          balance: 0.00,
          available_balance: 0.00,
          platform_balance: 0.00
        })
        .select()
        .single()

      if (error) throw error

      setMessage({ type: 'success', text: 'Utilisateur promu agent avec succès' })
      setShowPromoteModal(false)
      setSelectedUser(null)
      setAgentForm({ name: '', region: 'brazzaville' })
      
      // Refresh data
      fetchAdminData()
    } catch (error: any) {
      console.error('Error promoting to agent:', error)
      setMessage({ 
        type: 'error', 
        text: error.message.includes('duplicate key') 
          ? 'Cet utilisateur est déjà un agent' 
          : 'Erreur lors de la promotion' 
      })
    }
  }

  const updateAgentStatus = async (agentId: string, status: 'active' | 'inactive' | 'verified' | 'rejected') => {
    try {
      let updateData = {}
      
      switch (status) {
        case 'active':
          updateData = { is_active: true }
          break
        case 'inactive':
          updateData = { is_active: false }
          break
        case 'verified':
          updateData = { verification_status: 'approved', bank_account_verified: true }
          break
        case 'rejected':
          updateData = { verification_status: 'rejected' }
          break
      }

      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Statut agent mis à jour' })
      fetchAgents()
      fetchDashboardStats() // Refresh stats
    } catch (error) {
      console.error('Error updating agent status:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
    }
  }

  const updateUserVerification = async (userId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verified })
        .eq('id', userId)

      if (error) throw error

      setMessage({ type: 'success', text: `Utilisateur ${verified ? 'vérifié' : 'désactivé'}` })
      fetchUsers()
    } catch (error) {
      console.error('Error updating user verification:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
    }
  }

  const regions = [
    { value: 'brazzaville', label: 'Brazzaville' },
    { value: 'pointe_noire', label: 'Pointe-Noire' },
    { value: 'dolisie', label: 'Dolisie' },
    { value: 'nkayi', label: 'Nkayi' },
    { value: 'other', label: 'Autre' }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement du tableau de bord admin...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Accès Refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading flex items-center">
              <Shield className="h-6 w-6 mr-3 text-primary" />
              Tableau de Bord Administrateur
            </h1>
            <p className="text-gray-600 mt-2">
              Gestion des utilisateurs, agents et transactions
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Connecté en tant que</div>
            <div className="font-medium">gerardkasemba@gmail.com</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
          <StatCard
            title="Utilisateurs"
            value={stats.total_users.toString()}
            icon={<Users className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            title="Agents"
            value={stats.total_agents.toString()}
            icon={<Shield className="h-4 w-4" />}
            color="green"
          />
          <StatCard
            title="Agents Actifs"
            value={stats.active_agents.toString()}
            icon={<Activity className="h-4 w-4" />}
            color="emerald"
          />
          <StatCard
            title="Transactions"
            value={stats.total_transactions.toString()}
            icon={<CreditCard className="h-4 w-4" />}
            color="purple"
          />
          <StatCard
            title="Volume Total"
            value={`${stats.total_volume.toFixed(2)}$`}
            icon={<DollarSign className="h-4 w-4" />}
            color="orange"
          />
          <StatCard
            title="Profits Totaux"
            value={`${stats.total_profits.toFixed(2)}$`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="green"
          />
          <StatCard
            title="Profits Ce Mois"
            value={`${stats.monthly_profits.toFixed(2)}$`}
            icon={<BarChart3 className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            title="Retraits En Attente"
            value={stats.pending_withdrawal_requests.toString()}
            icon={<FileText className="h-4 w-4" />}
            color="yellow"
          />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Aperçu', icon: BarChart3 },
              { id: 'users', label: 'Utilisateurs', icon: Users },
              { id: 'agents', label: 'Agents', icon: Shield },
              { id: 'transactions', label: 'Transactions', icon: CreditCard },
              { id: 'withdrawals', label: 'Retraits Agents', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon
              const count = tab.id === 'withdrawals' ? stats?.pending_withdrawal_requests : 0
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                {message.text}
              </div>
            </div>
          )}

          {/* Withdrawals Tab - UPDATED */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-6">
              {/* Header with Stats */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Gestion des Retraits Agents</h3>
                  <p className="text-gray-600 mt-1">
                    {withdrawalRequests.length} demande(s) de retrait au total
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadWithdrawalReport}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                  >
                    <Download className="h-4 w-4" />
                    Exporter CSV
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-600 text-sm font-medium">En Attente</p>
                  <p className="text-2xl font-bold text-yellow-700">${withdrawalStats.pendingAmount.toFixed(2)}</p>
                  <p className="text-yellow-600 text-sm">
                    {withdrawalStats.pending} demande(s)
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-600 text-sm font-medium">Approuvés</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${withdrawalRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                  </p>
                  <p className="text-green-600 text-sm">
                    {withdrawalStats.approved} demande(s)
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm font-medium">Rejetés</p>
                  <p className="text-2xl font-bold text-red-700">
                    ${withdrawalRequests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                  </p>
                  <p className="text-red-600 text-sm">
                    {withdrawalStats.rejected} demande(s)
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-600 text-sm font-medium">Frais Collectés</p>
                  <p className="text-2xl font-bold text-blue-700">${withdrawalStats.totalFees.toFixed(2)}</p>
                  <p className="text-blue-600 text-sm">Revenus plateforme</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'pending', label: 'En Attente' },
                    { id: 'approved', label: 'Approuvés' },
                    { id: 'rejected', label: 'Rejetés' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setWithdrawalTab(tab.id as WithdrawalTab)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        withdrawalTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                      {tab.id === 'pending' && withdrawalStats.pending > 0 && (
                        <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          {withdrawalStats.pending}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un agent..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-64"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredWithdrawalRequests.length} demande(s) trouvée(s)
                </div>
              </div>

              {/* Withdrawal Requests Table */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-semibold">Agent</th>
                        <th className="text-left p-4 font-semibold">Montant</th>
                        <th className="text-left p-4 font-semibold">Frais (4%)</th>
                        <th className="text-left p-4 font-semibold">Net à Payer</th>
                        <th className="text-left p-4 font-semibold">Date</th>
                        <th className="text-left p-4 font-semibold">Statut</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWithdrawalRequests.map((request) => (
                        <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{request.agent_name}</p>
                              <p className="text-sm text-gray-600">{request.agent_code}</p>
                              <p className="text-xs text-gray-500">{request.agent_email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-gray-900">${request.amount.toFixed(2)}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-red-600">
                              -${(request.platform_fee + request.maintenance_fee).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              (Plateforme: ${request.platform_fee.toFixed(2)} + Maintenance: ${request.maintenance_fee.toFixed(2)})
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-green-600">${request.net_amount.toFixed(2)}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm">
                              {new Date(request.created_at).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(request.created_at).toLocaleTimeString('fr-FR')}
                            </p>
                            {request.processed_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                Traité: {new Date(request.processed_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              request.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {request.status === 'approved' ? 'Approuvé' : 
                               request.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            </span>
                            {request.status === 'rejected' && request.rejection_reason && (
                              <p className="text-xs text-red-600 mt-1 max-w-xs">
                                {request.rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveWithdrawal(request.id)}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Approuver</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedWithdrawal(request)
                                      setShowWithdrawalModal(true)
                                    }}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    <span>Rejeter</span>
                                  </button>
                                </>
                              )}
                              
                              {request.status === 'approved' && request.receipt_url && (
                                <a
                                  href={request.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Reçu</span>
                                </a>
                              )}

                              {request.status === 'approved' && !request.receipt_url && (
                                <label className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                                  <Upload className="h-3 w-3" />
                                  <span>Upload Reçu</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        uploadReceipt(request.id, file)
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredWithdrawalRequests.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>
                        {withdrawalTab === 'pending' 
                          ? 'Aucune demande en attente' 
                          : withdrawalTab === 'approved'
                          ? 'Aucune demande approuvée'
                          : withdrawalTab === 'rejected'
                          ? 'Aucune demande rejetée'
                          : 'Aucune demande de retrait'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Instructions Admin</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• <strong>Approuvez</strong> les retraits après avoir effectué le virement du montant net à l'agent</li>
                  <li>• <strong>Téléchargez le reçu</strong> de virement après approbation</li>
                  <li>• <strong>Rejetez</strong> avec une raison explicite si nécessaire</li>
                  <li>• Les <strong>frais de 4%</strong> sont automatiquement enregistrés dans les profits admin lors de l'approbation</li>
                  <li>• En cas de rejet, le montant est automatiquement retourné au solde plateforme de l'agent</li>
                </ul>
              </div>
            </div>
          )}
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-foreground">Activité Récente</h3>
                  </div>
                  <div className="p-4">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium">{transaction.user_username}</p>
                          <p className="text-sm text-gray-600">{transaction.reference}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount}$
                          </p>
                          <p className={`text-xs ${
                            transaction.status === 'completed' ? 'text-green-600' : 
                            transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {transaction.status === 'completed' ? 'Traité' : 
                             transaction.status === 'pending' ? 'En attente' : 'Échoué'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Actions */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-foreground">Actions en Attente</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Pending Verifications */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Vérifications Agents</h4>
                      {agents.filter(a => a.verification_status === 'pending').slice(0, 3).map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-gray-600">{agent.email}</p>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => updateAgentStatus(agent.id, 'verified')}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Approuver"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateAgentStatus(agent.id, 'rejected')}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Rejeter"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {agents.filter(a => a.verification_status === 'pending').length === 0 && (
                        <p className="text-gray-500 text-sm py-2">Aucune vérification en attente</p>
                      )}
                    </div>

                    {/* Pending Withdrawals */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Retraits Agents</h4>
                      {withdrawalRequests.filter(r => r.status === 'pending').slice(0, 3).map((request) => (
                        <div key={request.id} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium">{request.agent_name}</p>
                            <p className="text-xs text-gray-600">{request.amount}$</p>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleApproveWithdrawal(request.id)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Approuver"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(request)
                                setShowWithdrawalModal(true)
                              }}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Rejeter"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {withdrawalRequests.filter(r => r.status === 'pending').length === 0 && (
                        <p className="text-gray-500 text-sm py-2">Aucun retrait en attente</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Actions Rapides</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors text-left"
                  >
                    <UserPlus className="h-6 w-6 text-primary mb-2" />
                    <h4 className="font-semibold">Promouvoir un Agent</h4>
                    <p className="text-sm text-gray-600 mt-1">Promouvoir un utilisateur en agent</p>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('withdrawals')}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors text-left"
                  >
                    <FileText className="h-6 w-6 text-primary mb-2" />
                    <h4 className="font-semibold">Gérer les Retraits</h4>
                    <p className="text-sm text-gray-600 mt-1">Approuver/rejeter les retraits agents</p>
                  </button>
                  
                  <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors text-left">
                    <Download className="h-6 w-6 text-primary mb-2" />
                    <h4 className="font-semibold">Exporter les Données</h4>
                    <p className="text-sm text-gray-600 mt-1">Télécharger les rapports</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Demandes de Retrait Agents</h3>
                  <p className="text-gray-600 mt-1">
                    {withdrawalRequests.length} demande(s) de retrait
                  </p>
                </div>
                <div className="flex space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un agent..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <select 
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    onChange={(e) => {
                      // Filter by status
                      const status = e.target.value
                      // You can implement filtering logic here
                    }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvés</option>
                    <option value="rejected">Rejetés</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-semibold">Agent</th>
                        <th className="text-left p-4 font-semibold">Montant</th>
                        <th className="text-left p-4 font-semibold">Frais</th>
                        <th className="text-left p-4 font-semibold">Net</th>
                        <th className="text-left p-4 font-semibold">Date</th>
                        <th className="text-left p-4 font-semibold">Statut</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalRequests.map((request) => (
                        <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{request.agent_name}</p>
                              <p className="text-sm text-gray-600">{request.agent_code}</p>
                              <p className="text-xs text-gray-500">{request.agent_email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{request.amount}$</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-red-600">
                              -{(request.platform_fee + request.maintenance_fee).toFixed(2)}$
                            </p>
                            <p className="text-xs text-gray-500">
                              (Plateforme: {request.platform_fee.toFixed(2)}$ + Maintenance: {request.maintenance_fee.toFixed(2)}$)
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-green-600">{request.net_amount}$</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm">
                              {new Date(request.created_at).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(request.created_at).toLocaleTimeString('fr-FR')}
                            </p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              request.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {request.status === 'approved' ? 'Approuvé' : 
                               request.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            </span>
                            {request.status === 'rejected' && request.rejection_reason && (
                              <p className="text-xs text-red-600 mt-1">
                                {request.rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveWithdrawal(request.id)}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Approuver</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedWithdrawal(request)
                                      setShowWithdrawalModal(true)
                                    }}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    <span>Rejeter</span>
                                  </button>
                                </>
                              )}
                              
                              {request.status === 'approved' && request.receipt_url && (
                                <a
                                  href={request.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Reçu</span>
                                </a>
                              )}

                              {request.status === 'approved' && !request.receipt_url && (
                                <label className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                                  <Upload className="h-3 w-3" />
                                  <span>Upload Reçu</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        uploadReceipt(request.id, file)
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {withdrawalRequests.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-600">En attente</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {withdrawalRequests.filter(r => r.status === 'approved').length}
                  </p>
                  <p className="text-sm text-gray-600">Approuvés</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {withdrawalRequests.filter(r => r.status === 'rejected').length}
                  </p>
                  <p className="text-sm text-gray-600">Rejetés</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {withdrawalRequests.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}$
                  </p>
                  <p className="text-sm text-gray-600">Volume total</p>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab (keep existing implementation) */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Gestion des Utilisateurs</h3>
                  <p className="text-gray-600 mt-1">
                    {users.length} utilisateur(s) trouvé(s)
                  </p>
                </div>
                <div className="flex space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="all">Tous les statuts</option>
                    <option value="verified">Vérifiés</option>
                    <option value="unverified">Non vérifiés</option>
                    <option value="agents">Avec compte agent</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-semibold">Utilisateur</th>
                        <th className="text-left p-4 font-semibold">Contact</th>
                        <th className="text-left p-4 font-semibold">Région</th>
                        <th className="text-left p-4 font-semibold">Solde</th>
                        <th className="text-left p-4 font-semibold">Statut</th>
                        <th className="text-left p-4 font-semibold">Agent</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm">{user.phone_number}</p>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {user.region}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="font-medium">{user.balance}$</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              user.is_verified 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.is_verified ? 'Vérifié' : 'En attente'}
                            </span>
                          </td>
                          <td className="p-4">
                            {user.is_agent ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                {user.agent_code}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                Non agent
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {!user.is_agent ? (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setAgentForm({ name: user.username, region: user.region })
                                    setShowPromoteModal(true)
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <UserPlus className="h-3 w-3" />
                                  <span>Promouvoir</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateAgentStatus(user.agent_id!, 'inactive')}
                                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Désactiver</span>
                                </button>
                              )}
                              
                              <button
                                onClick={() => updateUserVerification(user.id, !user.is_verified)}
                                className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                                  user.is_verified
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {user.is_verified ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                <span>{user.is_verified ? 'Désactiver' : 'Vérifier'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agents Tab (keep existing implementation) */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Gestion des Agents</h3>
                  <p className="text-gray-600 mt-1">
                    {agents.length} agent(s) trouvé(s)
                  </p>
                </div>
                <div className="flex space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher un agent..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvés</option>
                    <option value="rejected">Rejetés</option>
                  </select>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="all">Toutes régions</option>
                    <option value="brazzaville">Brazzaville</option>
                    <option value="pointe_noire">Pointe-Noire</option>
                    <option value="dolisie">Dolisie</option>
                    <option value="nkayi">Nkayi</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              {/* Agents Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{agents.length}</p>
                  <p className="text-sm text-gray-600">Total Agents</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {agents.filter(a => a.is_active).length}
                  </p>
                  <p className="text-sm text-gray-600">Actifs</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {agents.filter(a => a.verification_status === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-600">En Attente</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {agents.reduce((sum, agent) => sum + agent.total_volume, 0).toFixed(2)}$
                  </p>
                  <p className="text-sm text-gray-600">Volume Total</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-semibold">Agent</th>
                        <th className="text-left p-4 font-semibold">Contact</th>
                        <th className="text-left p-4 font-semibold">Région</th>
                        <th className="text-left p-4 font-semibold">Soldes</th>
                        <th className="text-left p-4 font-semibold">Statistiques</th>
                        <th className="text-left p-4 font-semibold">Statut</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((agent) => (
                        <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-sm text-gray-600">{agent.code}</p>
                              <p className="text-xs text-gray-500">{agent.username}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm">{agent.email}</p>
                              <p className="text-sm text-gray-600">{agent.phone_number}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {agent.region}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Disponible:</span>
                                <span className="font-medium">{agent.available_balance}$</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Plateforme:</span>
                                <span className="font-medium text-green-600">{agent.platform_balance}$</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-bold">{agent.balance}$</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Transactions:</span>
                                <span className="font-medium">{agent.total_transactions}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Volume:</span>
                                <span className="font-medium">{agent.total_volume}$</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Moyenne:</span>
                                <span className="font-medium">
                                    {agent.total_transactions > 0 
                                      ? `${(agent.total_volume / agent.total_transactions).toFixed(2)}$`
                                      : '0$'
                                    }
                                  </span>

                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                agent.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {agent.is_active ? 'Actif' : 'Inactif'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                agent.verification_status === 'approved' 
                                  ? 'bg-green-100 text-green-800'
                                  : agent.verification_status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {agent.verification_status === 'approved' ? 'Approuvé' : 
                                agent.verification_status === 'rejected' ? 'Rejeté' : 'En attente'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col space-y-2">
                              {/* Verification Actions */}
                              {agent.verification_status === 'pending' && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => updateAgentStatus(agent.id, 'verified')}
                                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    title="Approuver"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Approuver</span>
                                  </button>
                                  <button
                                    onClick={() => updateAgentStatus(agent.id, 'rejected')}
                                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    title="Rejeter"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    <span>Rejeter</span>
                                  </button>
                                </div>
                              )}

                              {/* Activation Actions */}
                              <div className="flex space-x-1">
                                {agent.is_active ? (
                                  <button
                                    onClick={() => updateAgentStatus(agent.id, 'inactive')}
                                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                                    title="Désactiver"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    <span>Désactiver</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateAgentStatus(agent.id, 'active')}
                                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    title="Activer"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Activer</span>
                                  </button>
                                )}
                              </div>

                              {/* View Details Button */}
                              <button
                                onClick={() => {
                                  // You can implement a detailed view modal here
                                  console.log('View agent details:', agent.id)
                                }}
                                className="flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Détails</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {agents.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun agent trouvé</p>
                    <p className="text-sm mt-2">Les agents apparaîtront ici une fois créés</p>
                  </div>
                )}
              </div>

              {/* Bulk Actions */}
              <div className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  Sélectionnez des agents pour effectuer des actions en masse
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Activer la sélection
                  </button>
                  <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
                    Désactiver la sélection
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    Supprimer la sélection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab (keep existing implementation) */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Historique des Transactions</h3>
                  <p className="text-gray-600 mt-1">
                    {transactions.length} transaction(s) trouvée(s)
                  </p>
                </div>
                <div className="flex space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher une transaction..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="all">Tous les types</option>
                    <option value="deposit">Dépôts</option>
                    <option value="withdrawal">Retraits</option>
                    <option value="game_bet">Paris jeu</option>
                    <option value="game_win">Gains jeu</option>
                  </select>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="all">Tous les statuts</option>
                    <option value="completed">Complétées</option>
                    <option value="pending">En attente</option>
                    <option value="failed">Échouées</option>
                  </select>
                  <input
                    type="date"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Transactions Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {transactions.filter(t => t.type === 'deposit').length}
                  </p>
                  <p className="text-sm text-gray-600">Dépôts</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {transactions.filter(t => t.type === 'withdrawal').length}
                  </p>
                  <p className="text-sm text-gray-600">Retraits</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}$
                  </p>
                  <p className="text-sm text-gray-600">Volume Complété</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {transactions.filter(t => t.status === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-600">En Attente</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-semibold">Transaction</th>
                        <th className="text-left p-4 font-semibold">Utilisateur</th>
                        <th className="text-left p-4 font-semibold">Agent</th>
                        <th className="text-left p-4 font-semibold">Type</th>
                        <th className="text-left p-4 font-semibold">Montant</th>
                        <th className="text-left p-4 font-semibold">Statut</th>
                        <th className="text-left p-4 font-semibold">Date</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-sm">{transaction.reference}</p>
                              <p className="text-xs text-gray-500">ID: {transaction.id.slice(0, 8)}...</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-medium">{transaction.user_username}</p>
                          </td>
                          <td className="p-4">
                            {transaction.agent_code ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                {transaction.agent_code}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                Aucun agent
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              transaction.type === 'deposit' 
                                ? 'bg-green-100 text-green-800'
                                : transaction.type === 'withdrawal'
                                ? 'bg-orange-100 text-orange-800'
                                : transaction.type === 'game_win'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.type === 'deposit' ? 'Dépôt' :
                              transaction.type === 'withdrawal' ? 'Retrait' :
                              transaction.type === 'game_bet' ? 'Paris Jeu' : 'Gain Jeu'}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className={`font-bold ${
                              transaction.type === 'deposit' || transaction.type === 'game_win'
                                ? 'text-green-600'
                                : 'text-orange-600'
                            }`}>
                              {transaction.type === 'deposit' || transaction.type === 'game_win' ? '+' : '-'}
                              {transaction.amount}$
                            </p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              transaction.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.status === 'completed' ? 'Complétée' :
                              transaction.status === 'pending' ? 'En attente' : 'Échouée'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm">
                                {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.created_at).toLocaleTimeString('fr-FR')}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  // View transaction details
                                  console.log('View transaction:', transaction.id)
                                }}
                                className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Détails</span>
                              </button>
                              
                              {transaction.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('transactions')
                                        .update({ status: 'completed' })
                                        .eq('id', transaction.id)

                                      if (error) throw error

                                      setMessage({ type: 'success', text: 'Transaction marquée comme complétée' })
                                      fetchTransactions()
                                    } catch (error) {
                                      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
                                    }
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Compléter</span>
                                </button>
                              )}

                              {transaction.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('transactions')
                                        .update({ status: 'failed' })
                                        .eq('id', transaction.id)

                                      if (error) throw error

                                      setMessage({ type: 'success', text: 'Transaction marquée comme échouée' })
                                      fetchTransactions()
                                    } catch (error) {
                                      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
                                    }
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Échouer</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {transactions.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucune transaction trouvée</p>
                    <p className="text-sm mt-2">Les transactions apparaîtront ici une fois créées</p>
                  </div>
                )}
              </div>

              {/* Export and Bulk Actions */}
              <div className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  Affichage des 50 dernières transactions
                </div>
                <div className="flex space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    <Download className="h-4 w-4" />
                    <span>Exporter CSV</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    <Download className="h-4 w-4" />
                    <span>Exporter PDF</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                    <BarChart3 className="h-4 w-4" />
                    <span>Rapport Analytique</span>
                  </button>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Dépôts Totaux</p>
                      <p className="text-2xl font-bold text-green-600">
                        {transactions
                          .filter(t => t.type === 'deposit' && t.status === 'completed')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toFixed(2)}$
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Retraits Totaux</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {transactions
                          .filter(t => t.type === 'withdrawal' && t.status === 'completed')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toFixed(2)}$
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Volume Jeux</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {transactions
                          .filter(t => (t.type === 'game_bet' || t.type === 'game_win') && t.status === 'completed')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toFixed(2)}$
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Taux de Réussite</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {transactions.length > 0 
                          ? ((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100).toFixed(1)
                          : '0'
                        }%
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Promote to Agent Modal */}
      {showPromoteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Promouvoir en Agent
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-2">
                  Promouvoir <strong>{selectedUser.username}</strong> en agent
                </p>
                <p className="text-sm text-gray-500">
                  Email: {selectedUser.email} | Téléphone: {selectedUser.phone_number}
                </p>
              </div>

              <div>
                <label htmlFor="agentName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'agent *
                </label>
                <input
                  type="text"
                  id="agentName"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom complet de l'agent"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="agentRegion" className="block text-sm font-medium text-gray-700 mb-2">
                  Région de service *
                </label>
                <select
                  id="agentRegion"
                  value={agentForm.region}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {regions.map(region => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPromoteModal(false)
                  setSelectedUser(null)
                  setAgentForm({ name: '', region: 'brazzaville' })
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={promoteToAgent}
                disabled={!agentForm.name.trim()}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                Confirmer la Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Action Modal */}
      {showWithdrawalModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Rejeter la Demande de Retrait
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium">{selectedWithdrawal.agent_name}</p>
                <p className="text-sm text-gray-600">Code: {selectedWithdrawal.agent_code}</p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  Montant: {selectedWithdrawal.amount}$
                </p>
                <p className="text-sm text-gray-600">
                  Net: {selectedWithdrawal.net_amount}$ (Frais: {(selectedWithdrawal.platform_fee + selectedWithdrawal.maintenance_fee).toFixed(2)}$)
                </p>
              </div>

              <div>
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du rejet *
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez la raison du rejet..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowWithdrawalModal(false)
                  setSelectedWithdrawal(null)
                  setRejectionReason('')
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleRejectWithdrawal(selectedWithdrawal.id, rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                Confirmer le Rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
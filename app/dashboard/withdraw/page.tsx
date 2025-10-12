'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  QrCode, Download, CheckCircle, XCircle, Wallet, CreditCard, User, 
  Clock, FileText, MessageCircle, Receipt, History, ArrowLeft, Info,
  MapPin, UserCheck, Calendar, Clock as ClockIcon, AlertCircle, RefreshCw, Phone,
  ArrowUpRight, ArrowDownLeft, Shield, TrendingUp, TrendingDown, Percent,
  Users, List, AlertTriangle, Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PaymentMethod {
  id: string
  name: string
  code: string
}

interface PaymentAccount {
  current_balance: number
  payment_method_id: string
  payment_methods: {
    name: string
    code: string
  }[]
}

interface AgentWithBalance {
  id: string
  name: string
  code: string
  region: string
  available_balance: number
  platform_balance: number
  payment_accounts: PaymentAccount[]
}

interface WithdrawalForm {
  amount: string
  selectedPaymentMethod: string
  phoneNumber: string
  accountName: string
}

interface WithdrawalTransaction {
  id: string
  reference: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  qr_code_data: string
  created_at: string
  updated_at?: string
  agent_id?: string
  agent?: {
    name: string
    region: string
    code: string
  }
  withdrawal_data?: any
}

interface TransactionDetails {
  id: string
  reference: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  type: 'deposit' | 'withdrawal' | 'game_bet' | 'game_win'
  qr_code_data: string
  created_at: string
  updated_at?: string
  agent_id?: string
  agent?: {
    name: string
    region: string
    code: string
  }
  processing_time?: string
}

interface FeeBreakdown {
  withdrawalAmount: number
  agentCommission: number
  transactionFee: number
  platformFee: number
  maintenanceFee: number
  totalFees: number
  payoutAmount: number
}

type TabType = 'new' | 'history' | 'transactions' | 'pending'

export default function WithdrawPage() {
  const [form, setForm] = useState<WithdrawalForm>({
    amount: '',
    selectedPaymentMethod: '',
    phoneNumber: '',
    accountName: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [withdrawalCode, setWithdrawalCode] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [step, setStep] = useState<'form' | 'confirmation' | 'success'>('form')
  const [activeTab, setActiveTab] = useState<TabType>('new')
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalTransaction[]>([])
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [pendingTransactions, setPendingTransactions] = useState<WithdrawalTransaction[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetails | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null)
  const [availableAgents, setAvailableAgents] = useState<AgentWithBalance[]>([])
  const [isSearchingAgents, setIsSearchingAgents] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentWithBalance | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Calculate fees based on withdrawal amount
  const calculateFees = (amount: number): FeeBreakdown => {
    const agentCommission = amount * 0.025 // 2.5%
    const transactionFee = amount * 0.015 // 1.5%
    const platformFee = amount * 0.02 // 2%
    const maintenanceFee = amount * 0.02 // 2%
    const totalFees = agentCommission + transactionFee + platformFee + maintenanceFee
    const payoutAmount = amount - totalFees

    return {
      withdrawalAmount: amount,
      agentCommission,
      transactionFee,
      platformFee,
      maintenanceFee,
      totalFees,
      payoutAmount
    }
  }

  // Fetch user data and payment methods
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch user profile and balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserProfile(profile)
          setUserBalance(profile.balance || 0)
          // Pre-fill account name with username
          setForm(prev => ({ ...prev, accountName: profile.username }))
        }

        // Fetch payment methods
        const { data: methods } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('name')

        setPaymentMethods(methods || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoadingBalance(false)
      }
    }

    fetchData()
  }, [supabase])

  // Find available agents when payment method and amount are selected
  useEffect(() => {
    const findAvailableAgents = async () => {
      const amount = parseFloat(form.amount)
      const paymentMethodId = form.selectedPaymentMethod

      if (!amount || amount <= 0 || !paymentMethodId) {
        setAvailableAgents([])
        setSelectedAgent(null)
        return
      }

      setIsSearchingAgents(true)
      try {
        const { data: agents, error } = await supabase
          .from('agents')
          .select(`
            id,
            name,
            code,
            region,
            available_balance,
            platform_balance,
            is_active,
            verification_status,
            agent_payment_accounts!inner(
              current_balance,
              payment_method_id,
              payment_methods(
                name,
                code
              )
            )
          `)
          .eq('is_active', true)
          .eq('verification_status', 'approved')
          .eq('agent_payment_accounts.payment_method_id', paymentMethodId)
          .gte('agent_payment_accounts.current_balance', amount)

        if (error) throw error

        // Transform the data properly
        const qualifiedAgents: AgentWithBalance[] = (agents || []).map(agent => ({
          id: agent.id,
          name: agent.name,
          code: agent.code,
          region: agent.region,
          available_balance: agent.available_balance,
          platform_balance: agent.platform_balance,
          payment_accounts: agent.agent_payment_accounts.map((account: any) => ({
            current_balance: account.current_balance,
            payment_method_id: account.payment_method_id,
            payment_methods: account.payment_methods ? [account.payment_methods] : []
          }))
        }))

        setAvailableAgents(qualifiedAgents)

        if (qualifiedAgents.length > 0 && !selectedAgent) {
          setSelectedAgent(qualifiedAgents[0])
        }

        if (qualifiedAgents.length === 0) {
          setMessage({ 
            type: 'error', 
            text: `Aucun agent disponible pour un retrait de ${amount}$ avec ${getSelectedPaymentMethodName()}. Essayez un montant plus petit ou une autre méthode.` 
          })
        } else {
          setMessage(null)
        }

      } catch (error) {
        console.error('Error finding available agents:', error)
        setMessage({ type: 'error', text: 'Erreur lors de la recherche d\'agents disponibles' })
      } finally {
        setIsSearchingAgents(false)
      }
    }

    // Debounce the agent search
    const timeoutId = setTimeout(findAvailableAgents, 500)
    return () => clearTimeout(timeoutId)
  }, [form.amount, form.selectedPaymentMethod])

  // Fetch withdrawal history and transactions when tab changes
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'transactions' || activeTab === 'pending') {
      fetchWithdrawalHistory()
      fetchAllTransactions()
      fetchPendingTransactions()
    }
  }, [activeTab])

  // Calculate fees when amount changes
  useEffect(() => {
    const amount = parseFloat(form.amount)
    if (!isNaN(amount) && amount > 0) {
      setFeeBreakdown(calculateFees(amount))
    } else {
      setFeeBreakdown(null)
    }
  }, [form.amount])

  const fetchWithdrawalHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false })

      if (error) throw error

      const transactionsWithAgents = await Promise.all(
        (transactions || []).map(async (tx) => {
          let agentInfo = null
          if (tx.agent_id) {
            const { data: agent } = await supabase
              .from('agents')
              .select('name, region, code')
              .eq('id', tx.agent_id)
              .single()
            agentInfo = agent
          }
          return { ...tx, agent: agentInfo }
        })
      )

      setWithdrawalHistory(transactionsWithAgents)
    } catch (error) {
      console.error('Error fetching withdrawal history:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement de l\'historique' })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const logError = (context: string, error: any) => {
  console.error(`Error in ${context}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  })
}

  const fetchAllTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transactionsWithAgents = await Promise.all(
        (transactions || []).map(async (tx) => {
          let agentInfo = null
          if (tx.agent_id) {
            const { data: agent } = await supabase
              .from('agents')
              .select('name, region, code')
              .eq('id', tx.agent_id)
              .single()
            agentInfo = agent
          }
          return { ...tx, agent: agentInfo }
        })
      )

      setAllTransactions(transactionsWithAgents)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchPendingTransactions = async () => {
    setIsLoadingPending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch only withdrawal transactions with pending status
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch agent information for each transaction
      const transactionsWithAgents = await Promise.all(
        (transactions || []).map(async (tx) => {
          let agentInfo = null
          if (tx.agent_id) {
            const { data: agent } = await supabase
              .from('agents')
              .select('name, region, code')
              .eq('id', tx.agent_id)
              .single()
            agentInfo = agent
          }
          
          // Parse QR code data to get withdrawal details
          let withdrawalData = {}
          try {
            withdrawalData = JSON.parse(tx.qr_code_data || '{}')
          } catch (e) {
            console.error('Error parsing QR data:', e)
          }

          return { 
            ...tx, 
            agent: agentInfo,
            withdrawal_data: withdrawalData 
          }
        })
      )

      setPendingTransactions(transactionsWithAgents)
    } catch (error) {
      console.error('Error fetching pending withdrawal transactions:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des retraits en attente' })
    } finally {
      setIsLoadingPending(false)
    }
  }

  const handleInputChange = (field: keyof WithdrawalForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear messages when user starts typing
    if (message) setMessage(null)
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setForm(prev => ({ ...prev, selectedPaymentMethod: methodId }))
    setSelectedAgent(null) // Reset selected agent when payment method changes
  }

  const handleAgentSelect = (agent: AgentWithBalance) => {
    setSelectedAgent(agent)
  }

  const validateForm = () => {
    const amount = parseFloat(form.amount)
    
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Veuillez entrer un montant valide' })
      return false
    }

    if (userBalance < amount) {
      setMessage({ type: 'error', text: `Solde insuffisant. Votre solde actuel est de ${userBalance.toFixed(2)}$` })
      return false
    }

    if (amount < 1) {
      setMessage({ type: 'error', text: 'Le montant minimum de retrait est de 1$' })
      return false
    }

    if (!form.selectedPaymentMethod) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un moyen de paiement' })
      return false
    }

    if (!selectedAgent) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un agent disponible' })
      return false
    }

    // Verify the selected agent still has sufficient balance
    const agentPaymentAccount = selectedAgent.payment_accounts.find(
      account => account.payment_method_id === form.selectedPaymentMethod
    )
    
    if (!agentPaymentAccount || agentPaymentAccount.current_balance < amount) {
      setMessage({ type: 'error', text: 'L\'agent sélectionné n\'a plus suffisamment de fonds. Veuillez en sélectionner un autre.' })
      return false
    }

    if (!form.phoneNumber.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre numéro de téléphone' })
      return false
    }

    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]{8,}$/
    if (!phoneRegex.test(form.phoneNumber.replace(/\s/g, ''))) {
      setMessage({ type: 'error', text: 'Veuillez entrer un numéro de téléphone valide' })
      return false
    }

    if (!form.accountName.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer le nom associé au compte' })
      return false
    }

    return true
  }

  const proceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      setStep('confirmation')
    }
  }

  const generateWithdrawal = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const withdrawalAmount = parseFloat(form.amount)
      
      if (!selectedAgent) {
        throw new Error('Aucun agent sélectionné')
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié')
      }

      console.log('Current user:', user.id)

      // Verify agent still has sufficient balance (but DON'T deduct yet)
      const agentPaymentAccount = selectedAgent.payment_accounts.find(
        account => account.payment_method_id === form.selectedPaymentMethod
      )
      
      if (!agentPaymentAccount || agentPaymentAccount.current_balance < withdrawalAmount) {
        setMessage({ 
          type: 'error', 
          text: 'L\'agent sélectionné n\'a plus suffisamment de fonds. Veuillez rafraîchir la liste des agents.' 
        })
        setIsLoading(false)
        return
      }

      // Generate unique withdrawal code
      const code = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

      // Get selected payment method name
      const selectedMethod = paymentMethods.find(m => m.id === form.selectedPaymentMethod)

      // Create withdrawal data object
      const withdrawalData = {
        code,
        amount: withdrawalAmount,
        payment_method: selectedMethod?.name,
        payment_method_id: form.selectedPaymentMethod,
        phone_number: form.phoneNumber,
        account_name: form.accountName,
        agent_id: selectedAgent.id,
        agent_name: selectedAgent.name,
        agent_code: selectedAgent.code,
        timestamp: new Date().toISOString(),
        user_id: user.id
      }

      console.log('Creating withdrawal with data:', {
        user_id: user.id,
        agent_id: selectedAgent.id,
        amount: withdrawalAmount,
        payment_method_id: form.selectedPaymentMethod
      })

      // FIXED: Create withdrawal transaction WITHOUT deducting any money yet
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'withdrawal',
          amount: withdrawalAmount,
          status: 'pending', // This is just a request, not completed
          reference: code,
          agent_id: selectedAgent.id,
          user_id: user.id,
          payment_method_id: form.selectedPaymentMethod,
          qr_code_data: JSON.stringify(withdrawalData),
          description: `Demande de retrait de ${withdrawalAmount}$ via ${selectedMethod?.name} - Agent: ${selectedAgent.name}`,
          currency_code: 'USD',
          created_by: user.id,
          metadata: {}
        })
        .select()
        .single()

      if (transactionError) {
        console.error('Transaction insert error:', transactionError)
        throw new Error(`Erreur lors de la création de la transaction: ${transactionError.message}`)
      }

      console.log('Transaction created successfully:', transaction)

      // FIXED: DON'T update user balance immediately - wait for agent approval
      // The user's balance should only be deducted when the agent approves the withdrawal
      // const { error: balanceError } = await supabase
      //   .from('profiles')
      //   .update({ 
      //     balance: userBalance - withdrawalAmount 
      //   })
      //   .eq('id', user.id)

      // FIXED: DON'T update agent's payment account balance immediately
      // The agent's balance should only be deducted when they approve the withdrawal
      // const { error: agentBalanceError } = await supabase
      //   .from('agent_payment_accounts')
      //   .update({
      //     current_balance: agentPaymentAccount.current_balance - withdrawalAmount,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('payment_method_id', form.selectedPaymentMethod)
      //   .eq('agent_id', selectedAgent.id)

      // FIXED: DON'T update the local user balance either
      // setUserBalance(prev => prev - withdrawalAmount)

      setWithdrawalCode(code)
      
      // Generate QR code data URL
      const qrData = `BETADAME-WITHDRAWAL:${code}:${withdrawalAmount}:${form.phoneNumber}:${selectedAgent.code}`
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`)

      setStep('success')
      setMessage({ 
        type: 'success', 
        text: `Demande de retrait créée avec succès! Assignée à l'agent ${selectedAgent.name}. Montrez le QR code à l'agent pour recevoir vos fonds.` 
      })

      // Refresh history
      fetchWithdrawalHistory()
      fetchAllTransactions()
      fetchPendingTransactions()

    } catch (error) {
      console.error('Withdrawal error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de la création du retrait' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a')
      link.href = qrCodeUrl
      link.download = `retrait-${withdrawalCode}.png`
      link.click()
    }
  }

  const setMaxAmount = () => {
    setForm(prev => ({ ...prev, amount: userBalance.toFixed(2) }))
  }

  const getSelectedPaymentMethodName = () => {
    return paymentMethods.find(method => method.id === form.selectedPaymentMethod)?.name || ''
  }

  // Helper function to get payment method name from agent's payment accounts
  const getAgentPaymentMethodName = (agent: AgentWithBalance, paymentMethodId: string) => {
    const account = agent.payment_accounts.find(acc => acc.payment_method_id === paymentMethodId)
    if (account && account.payment_methods && account.payment_methods.length > 0) {
      return account.payment_methods[0].name
    }
    return getSelectedPaymentMethodName()
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Format based on length
    if (digits.length <= 2) {
      return digits
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)} ${digits.slice(2)}`
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
    } else {
      return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`
    }
  }

  const handlePhoneNumberChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    handleInputChange('phoneNumber', formatted)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complété'
      case 'failed':
        return 'Échoué'
      default:
        return 'En attente'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  const parseWithdrawalData = (qrCodeData: string) => {
    try {
      return JSON.parse(qrCodeData)
    } catch (error) {
      return {}
    }
  }

  const getReceiptUrl = (transaction: WithdrawalTransaction) => {
    if (transaction.status === 'completed' && transaction.qr_code_data) {
      // Check if qr_code_data is a URL (receipt) or JSON data
      if (transaction.qr_code_data.startsWith('http')) {
        return transaction.qr_code_data
      }
      
      const data = parseWithdrawalData(transaction.qr_code_data)
      return data.receipt_url || null
    }
    return null
  }

  const getDeclineReason = (transaction: WithdrawalTransaction) => {
    if (transaction.status === 'failed' && transaction.qr_code_data) {
      // If it's not a URL, it might be the decline reason
      if (!transaction.qr_code_data.startsWith('http')) {
        return transaction.qr_code_data
      }
    }
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateProcessingTime = (createdAt: string, updatedAt?: string) => {
    const start = new Date(createdAt)
    const end = updatedAt ? new Date(updatedAt) : new Date()
    
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  const getTimeElapsed = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`
    } else {
      const diffHours = Math.floor(diffMinutes / 60)
      return `Il y a ${diffHours} h`
    }
  }

  const calculateProgress = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const maxProcessingTime = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
    const progress = Math.min((diffMs / maxProcessingTime) * 100, 100)
    return Math.round(progress)
  }

  const handleTransactionClick = async (transaction: any) => {
    try {
      // Fetch complete transaction details
      const { data: fullTransaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transaction.id)
        .single()

      if (error) throw error

      let agentInfo = null
      if (fullTransaction.agent_id) {
        const { data: agent } = await supabase
          .from('agents')
          .select('name, region, code')
          .eq('id', fullTransaction.agent_id)
          .single()
        agentInfo = agent
      }

      const processingTime = fullTransaction.updated_at 
        ? calculateProcessingTime(fullTransaction.created_at, fullTransaction.updated_at)
        : calculateProcessingTime(fullTransaction.created_at)

      const transactionDetails: TransactionDetails = {
        ...fullTransaction,
        agent: agentInfo,
        processing_time: processingTime
      }

      setSelectedTransaction(transactionDetails)
      setShowTransactionModal(true)
    } catch (error) {
      console.error('Error fetching transaction details:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des détails' })
    }
  }

  const handleViewDetails = (transaction: any) => {
    handleTransactionClick(transaction)
  }

  const handleCancelWithdrawal = async (transactionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce retrait ? Cette action est irréversible.')) return
    
    try {
      setIsLoadingPending(true)
      
      // Update transaction status to failed
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          qr_code_data: 'Annulé par l\'utilisateur'
        })
        .eq('id', transactionId)
      
      if (error) throw error
      
      // FIXED: No need to refund user balance since it was never deducted
      // The money is still in the user's account because we never deducted it
      
      setMessage({ type: 'success', text: 'Retrait annulé avec succès' })
      fetchPendingTransactions() // Refresh the list
      
    } catch (error) {
      console.error('Error cancelling withdrawal:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'annulation du retrait' })
    } finally {
      setIsLoadingPending(false)
    }
  }

  const handleDownloadReceipt = (receiptUrl: string, transactionReference: string) => {
    const link = document.createElement('a')
    link.href = receiptUrl
    link.download = `reçu-${transactionReference}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetToNewWithdrawal = () => {
    setStep('form')
    setForm({
      amount: '',
      selectedPaymentMethod: '',
      phoneNumber: '',
      accountName: userProfile?.username || ''
    })
    setWithdrawalCode('')
    setQrCodeUrl('')
    setMessage(null)
    setFeeBreakdown(null)
    setSelectedAgent(null)
    setAvailableAgents([])
  }

  // Agent Selection Component
  const AgentSelection = () => {
    if (!form.selectedPaymentMethod || !form.amount || parseFloat(form.amount) <= 0) {
      return null
    }

    if (isSearchingAgents) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Recherche d'agents disponibles...</span>
          </div>
        </div>
      )
    }

    if (availableAgents.length === 0) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">Aucun agent disponible</p>
              <p className="text-sm mt-1">
                Aucun agent n'a suffisamment de fonds pour un retrait de {form.amount}$ 
                avec {getSelectedPaymentMethodName()}. Essayez un montant plus petit ou une autre méthode.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Sélectionnez un agent disponible
          </label>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {availableAgents.length} agent(s) disponible(s)
          </span>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {availableAgents.map((agent) => {
            const agentPaymentAccount = agent.payment_accounts.find(
              account => account.payment_method_id === form.selectedPaymentMethod
            )
            const availableBalance = agentPaymentAccount?.current_balance || 0

            return (
              <div
                key={agent.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedAgent?.id === agent.id
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleAgentSelect(agent)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedAgent?.id === agent.id
                        ? 'bg-primary border-primary'
                        : 'border-gray-300'
                    }`}>
                      {selectedAgent?.id === agent.id && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-500">Code: {agent.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{availableBalance.toFixed(2)}$</p>
                    <p className="text-xs text-gray-500">Solde disponible</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 ml-7">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{agent.region}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{getAgentPaymentMethodName(agent, form.selectedPaymentMethod)}</span>
                  </div>
                </div>

                {selectedAgent?.id === agent.id && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 ml-7">
                    ✓ Cet agent traitera votre retrait de {form.amount}$
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Information importante:</p>
              <p className="mt-1">
                L'agent sélectionné doit avoir suffisamment de fonds sur son compte {getSelectedPaymentMethodName()} 
                pour traiter votre retrait de {form.amount}$.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fee Breakdown Component
  const FeeBreakdownDisplay = () => {
    if (!feeBreakdown) return null

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
          <Percent className="h-5 w-5 mr-2" />
          Détail des Frais
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Montant du retrait:</span>
            <span className="font-medium text-blue-900">{feeBreakdown.withdrawalAmount.toFixed(2)}$</span>
          </div>
          
          <div className="border-t border-blue-200 pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-600">Commission agent (2.5%):</span>
              <span className="text-red-600">-{feeBreakdown.agentCommission.toFixed(2)}$</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Frais de transaction (1.5%):</span>
              <span className="text-red-600">-{feeBreakdown.transactionFee.toFixed(2)}$</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Frais plateforme (2%):</span>
              <span className="text-red-600">-{feeBreakdown.platformFee.toFixed(2)}$</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Frais maintenance (2%):</span>
              <span className="text-red-600">-{feeBreakdown.maintenanceFee.toFixed(2)}$</span>
            </div>
          </div>

          <div className="border-t border-blue-200 pt-2">
            <div className="flex justify-between font-semibold">
              <span className="text-blue-800">Total des frais:</span>
              <span className="text-red-700">-{feeBreakdown.totalFees.toFixed(2)}$</span>
            </div>
          </div>

          <div className="border-t border-blue-200 pt-2">
            <div className="flex justify-between font-bold text-lg">
              <span className="text-green-700">Montant net à recevoir:</span>
              <span className="text-green-700">{feeBreakdown.payoutAmount.toFixed(2)}$</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Vous recevrez {feeBreakdown.payoutAmount.toFixed(2)}$ sur votre compte {getSelectedPaymentMethodName()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Tab navigation component
// Tab navigation component - Modern Card Style
const TabNavigation = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-6">
    <button
      onClick={() => setActiveTab('new')}
      className={`group p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
        activeTab === 'new'
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          activeTab === 'new' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
        }`}>
          <Plus className="w-4 h-4" />
        </div>
        <span className={`text-sm font-semibold ${
          activeTab === 'new' ? 'text-primary' : 'text-gray-700'
        }`}>
          Nouveau Retrait
        </span>
      </div>
    </button>

    <button
      onClick={() => setActiveTab('pending')}
      className={`group p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md relative ${
        activeTab === 'pending'
          ? 'border-orange-500 bg-orange-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          activeTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
        }`}>
          <Clock className="w-4 h-4" />
        </div>
        <span className={`text-sm font-semibold ${
          activeTab === 'pending' ? 'text-orange-600' : 'text-gray-700'
        }`}>
          En Attente
        </span>
        {pendingTransactions.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] h-6 flex items-center justify-center shadow-sm">
            {pendingTransactions.length}
          </span>
        )}
      </div>
    </button>

    {/* <button
      onClick={() => setActiveTab('history')}
      className={`group p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
        activeTab === 'history'
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          activeTab === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
        }`}>
          <History className="w-4 h-4" />
        </div>
        <span className={`text-sm font-semibold ${
          activeTab === 'history' ? 'text-blue-600' : 'text-gray-700'
        }`}>
          Historique
        </span>
      </div>
    </button> */}

    <button
      onClick={() => setActiveTab('transactions')}
      className={`group p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
        activeTab === 'transactions'
          ? 'border-green-500 bg-green-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          activeTab === 'transactions' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
        }`}>
          <List className="w-4 h-4" />
        </div>
        <span className={`text-sm font-semibold ${
          activeTab === 'transactions' ? 'text-green-600' : 'text-gray-700'
        }`}>
          Toutes Transactions
        </span>
      </div>
    </button>
  </div>
);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <QrCode className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl text-gray-900 font-bold text-foreground font-heading">
            Retrait de Fonds
          </h1>
          <p className="text-gray-600 mt-2">
            Retirez vos fonds vers votre compte mobile money
          </p>
        </div>

        {/* Balance Display */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Solde disponible</p>
              <p className="text-3xl font-bold font-heading">
                {isLoadingBalance ? (
                  <span className="animate-pulse">Chargement...</span>
                ) : (
                  `${userBalance.toFixed(2)}$`
                )}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation />

        {/* New Withdrawal Tab */}
        {activeTab === 'new' && (
          <>
            {/* Progress Steps */}
            <div className="flex justify-between items-center mb-8">
              {['Détails', 'Confirmation', 'Terminé'].map((stepName, index) => {
                const stepNumber = index + 1
                const currentStep = ['form', 'confirmation', 'success'].indexOf(step) + 1
                const isCompleted = stepNumber < currentStep
                const isActive = stepNumber === currentStep

                return (
                  <div key={stepName} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isActive ? 'bg-primary text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                    </div>
                    <span className={`text-xs mt-2 text-center ${
                      isActive ? 'text-primary font-medium' : 'text-gray-500'
                    }`}>
                      {stepName}
                    </span>
                    {index < 2 && (
                      <div className={`flex-1 h-1 mt-4 -mb-4 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Step 1: Withdrawal Form */}
            {step === 'form' && (
              <form onSubmit={proceedToConfirmation} className="space-y-6">
                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                      Montant à retirer ($)
                    </label>
                    <button
                      type="button"
                      onClick={setMaxAmount}
                      className="text-xs text-primary hover:text-blue-700 font-medium"
                    >
                      Retirer le maximum
                    </button>
                  </div>
                  <input
                    type="number"
                    id="amount"
                    value={form.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="50.00"
                    step="0.01"
                    min="1"
                    max={userBalance}
                    className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solde après retrait: <span className="font-medium">
                      {isLoadingBalance ? '...' : `${(userBalance - (parseFloat(form.amount) || 0)).toFixed(2)}$`}
                    </span>
                  </p>
                </div>

                {/* Fee Breakdown */}
                {feeBreakdown && <FeeBreakdownDisplay />}

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Méthode de retrait
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          form.selectedPaymentMethod === method.id
                            ? 'border-primary bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePaymentMethodSelect(method.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              form.selectedPaymentMethod === method.id
                                ? 'bg-primary border-primary'
                                : 'border-gray-300'
                            }`}>
                              {form.selectedPaymentMethod === method.id && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              )}
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{method.name}</span>
                          </div>
                          <CreditCard className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Selection */}
                <AgentSelection />

                {/* Phone Number Input */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le numéro où vous recevrez les fonds
                  </p>
                </div>

                {/* Account Name Input */}
                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom sur le compte
                  </label>
                  <input
                    type="text"
                    id="accountName"
                    value={form.accountName}
                    onChange={(e) => handleInputChange('accountName', e.target.value)}
                    placeholder="Votre nom complet"
                    className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                {message && (
                  <div className={`p-4 rounded-lg ${
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

                <button
                  type="submit"
                  disabled={isLoading || isLoadingBalance || userBalance <= 0 || !form.amount || parseFloat(form.amount) < 1 || !selectedAgent || availableAgents.length === 0}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!selectedAgent ? 'Sélectionnez un agent' : 'Continuer'}
                </button>

                {userBalance <= 0 && (
                  <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      Votre solde est insuffisant pour effectuer un retrait.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/deposit')}
                      className="mt-2 text-primary hover:text-blue-700 font-medium text-sm"
                    >
                      Déposer des fonds
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Step 2: Confirmation */}
            {step === 'confirmation' && feeBreakdown && selectedAgent && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirmer votre retrait
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Montant du retrait:</span>
                      <span className="font-bold text-blue-900">{feeBreakdown.withdrawalAmount.toFixed(2)}$</span>
                    </div>
                    
                    {/* Agent Information */}
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Agent assigné:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-green-700">Nom:</span>
                          <p className="font-medium  text-gray-600">{selectedAgent.name}</p>
                        </div>
                        <div>
                          <span className="text-green-700">Code:</span>
                          <p className="font-medium  text-gray-600">{selectedAgent.code}</p>
                        </div>
                        <div>
                          <span className="text-green-700">Région:</span>
                          <p className="font-medium  text-gray-600">{selectedAgent.region}</p>
                        </div>
                        <div>
                          <span className="text-green-700">Méthode:</span>
                          <p className="font-medium  text-gray-600">{getSelectedPaymentMethodName()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-blue-700">Méthode:</span>
                      <span className="font-medium text-blue-900">{getSelectedPaymentMethodName()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Numéro:</span>
                      <span className="font-medium text-blue-900">{form.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Nom:</span>
                      <span className="font-medium text-blue-900">{form.accountName}</span>
                    </div>
                    
                    {/* Fee Summary */}
                    <div className="border-t border-blue-200 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Total des frais (8%):</span>
                        <span className="text-red-600">-{feeBreakdown.totalFees.toFixed(2)}$</span>
                      </div>
                      <div className="flex justify-between font-bold mt-1">
                        <span className="text-green-700">Montant net à recevoir:</span>
                        <span className="text-green-700">{feeBreakdown.payoutAmount.toFixed(2)}$</span>
                      </div>
                    </div>

                    <div className="border-t border-blue-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Nouveau solde:</span>
                        <span className="font-bold text-blue-900">
                          {(userBalance - feeBreakdown.withdrawalAmount).toFixed(2)}$
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Informations importantes:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Vérifiez que votre numéro de téléphone est correct</li>
                    <li>• Les retraits sont traités sous 2 heures maximum</li>
                    <li>• Des frais totaux de 8% seront appliqués</li>
                    <li>• Vous recevrez {feeBreakdown.payoutAmount.toFixed(2)}$ sur votre compte</li>
                    <li>• Vous recevrez un code QR à montrer à l'agent</li>
                    <li>• Votre retrait sera traité par l'agent {selectedAgent.name}</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={generateWithdrawal}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Traitement...
                      </div>
                    ) : (
                      'Confirmer le retrait'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success with QR Code */}
            {step === 'success' && feeBreakdown && selectedAgent && (
              <div className="text-center space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Retrait Créé avec Succès!
                  </h3>
                  <p className="text-green-700">
                    Montrez le QR code à l'agent <strong>{selectedAgent.name}</strong> pour recevoir {feeBreakdown.payoutAmount.toFixed(2)}$.
                  </p>
                  
                  {/* Agent Card in Success */}
                  <div className="mt-4 bg-white border border-green-300 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="h-8 w-8 text-green-600" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">{selectedAgent.name}</p>
                        <p className="text-sm text-gray-600">Code: {selectedAgent.code} • {selectedAgent.region}</p>
                        <p className="text-sm text-gray-600">Méthode: {getSelectedPaymentMethodName()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Updated Balance */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-blue-800 text-sm">Nouveau solde</p>
                  <p className="text-2xl font-bold text-primary">
                    {userBalance.toFixed(2)}$
                  </p>
                </div>

                {/* QR Code */}
                <div ref={qrRef} className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300">
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code de retrait" 
                      className="mx-auto w-56 h-56"
                    />
                  )}
                </div>

                {/* Withdrawal Details */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-gray-600">Code de retrait :</p>
                  <p className="text-xl font-mono font-bold text-primary">{withdrawalCode}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div className="text-left">
                      <p className="text-gray-600">Montant retrait:</p>
                      <p className="font-semibold  text-gray-600">{feeBreakdown.withdrawalAmount.toFixed(2)}$</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-600">Montant net:</p>
                      <p className="font-semibold text-green-600">{feeBreakdown.payoutAmount.toFixed(2)}$</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-600">Méthode:</p>
                      <p className="font-semibold  text-gray-600">{getSelectedPaymentMethodName()}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-600">Frais totaux:</p>
                      <p className="font-semibold text-red-600">-{feeBreakdown.totalFees.toFixed(2)}$</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={downloadQRCode}
                    className="flex-1 flex items-center justify-center space-x-2 bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Télécharger QR</span>
                  </button>
                  
                  <button
                    onClick={resetToNewWithdrawal}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Nouveau Retrait
                  </button>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                  <h4 className="font-medium text-yellow-800 mb-2">Instructions :</h4>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Montrez le QR code à notre agent <strong>{selectedAgent.name}</strong></li>
                    <li>L'agent scannera le code pour vérifier</li>
                    <li>Vous recevrez {feeBreakdown.payoutAmount.toFixed(2)}$ sur {form.phoneNumber}</li>
                    <li>Le retrait sera traité sous 2 heures maximum</li>
                    <li>Conservez le code de retrait en cas de problème</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pending Transactions Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Retraits en Attente</h3>
              <button
                onClick={fetchPendingTransactions}
                disabled={isLoadingPending}
                className="flex items-center space-x-2 text-primary hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingPending ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {isLoadingPending ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement des retraits...</p>
              </div>
            ) : pendingTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun retrait en attente</p>
                <p className="text-sm text-gray-400 mt-1">
                  Tous vos retraits ont été traités
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTransactions.map((transaction) => {
                  // Parse withdrawal data from QR code
                  const withdrawalData = transaction.withdrawal_data || {}
                  const paymentMethod = withdrawalData.payment_method || 'Mobile Money'
                  const phoneNumber = withdrawalData.phone_number || 'Non spécifié'
                  const accountName = withdrawalData.account_name || 'Non spécifié'
                  const transactionFees = calculateFees(transaction.amount)

                  return (
                    <div 
                      key={transaction.id} 
                      className="bg-white border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="bg-yellow-100 p-2 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-gray-900">
                              {transaction.amount.toFixed(2)}$
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                              {transaction.reference}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Créé le {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            En attente
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {getTimeElapsed(transaction.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Withdrawal Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Méthode:</span>
                            <span className="font-medium">{paymentMethod}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Téléphone:</span>
                            <span className="font-medium">{phoneNumber}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Nom compte:</span>
                            <span className="font-medium">{accountName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Durée:</span>
                            <span className="font-medium">{calculateProcessingTime(transaction.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payout Information */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-green-700 font-medium">À recevoir:</span>
                          <span className="font-bold text-green-800">{transactionFees.payoutAmount.toFixed(2)}$</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Frais: {transactionFees.totalFees.toFixed(2)}$ (8%)
                        </p>
                      </div>

                      {/* Agent Information */}
                      {transaction.agent && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-2 rounded mb-3">
                          <UserCheck className="h-4 w-4" />
                          <span>
                            Agent assigné: <strong>{transaction.agent.name}</strong> 
                            {transaction.agent.region && ` (${transaction.agent.region})`}
                            {transaction.agent.code && ` - ${transaction.agent.code}`}
                          </span>
                        </div>
                      )}

                      {/* Status Information */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>En attente de traitement par un agent</span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(transaction)}
                            className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Détails
                          </button>
                          <button
                            onClick={() => handleCancelWithdrawal(transaction.id)}
                            className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar for Waiting Time */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${calculateProgress(transaction.created_at)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          Traitement en cours...
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Information Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Informations sur les retraits en attente
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Les retraits sont traités sous 2 heures maximum</li>
                <li>• Vous recevrez une notification lorsque votre retrait sera traité</li>
                <li>• En cas de délai prolongé, contactez le support</li>
                <li>• Vous pouvez annuler un retrait tant qu'il n'a pas été pris en charge par un agent</li>
                <li>• Les frais totaux sont de 8% (2.5% agent + 1.5% transaction + 2% plateforme + 2% maintenance)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Withdrawal History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Historique des Retraits</h3>
              <button
                onClick={fetchWithdrawalHistory}
                disabled={isLoadingHistory}
                className="text-primary hover:text-blue-700 text-sm font-medium"
              >
                Actualiser
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement de l'historique...</p>
              </div>
            ) : withdrawalHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun retrait effectué</p>
                <p className="text-sm text-gray-400 mt-1">
                  Vos demandes de retrait apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawalHistory.map((transaction) => {
                  const transactionFees = calculateFees(transaction.amount)
                  
                  return (
                    <div 
                      key={transaction.id} 
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(transaction.status)}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {transaction.amount.toFixed(2)}$
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.reference}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-600">Date:</p>
                          <p className="font-medium">{formatDate(transaction.created_at)}</p>
                        </div>
                        {transaction.agent && (
                          <div>
                            <p className="text-gray-600">Agent:</p>
                            <p className="font-medium">{transaction.agent.name}</p>
                          </div>
                        )}
                      </div>

                      {/* Payout Information */}
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-600">Montant net reçu:</span>
                        <span className="font-semibold text-green-600">
                          {transactionFees.payoutAmount.toFixed(2)}$
                        </span>
                      </div>

                      {/* Quick status info */}
                      {getReceiptUrl(transaction) && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Receipt className="h-4 w-4" />
                          <span>Reçu disponible</span>
                        </div>
                      )}

                      {getDeclineReason(transaction) && (
                        <div className="flex items-center space-x-2 text-sm text-red-600">
                          <MessageCircle className="h-4 w-4" />
                          <span>Raison: {getDeclineReason(transaction)?.substring(0, 50)}...</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* All Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Toutes les Transactions</h3>
              <button
                onClick={fetchAllTransactions}
                className="text-primary hover:text-blue-700 text-sm font-medium"
              >
                Actualiser
              </button>
            </div>

            {allTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune transaction</p>
                <p className="text-sm text-gray-400 mt-1">
                  Vos transactions apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allTransactions.map((transaction) => {
                  const isWithdrawal = transaction.type === 'withdrawal'
                  const isDeposit = transaction.type === 'deposit'
                  const isGame = transaction.type.includes('game')
                  
                  return (
                    <div 
                      key={transaction.id} 
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {isWithdrawal ? (
                            <ArrowUpRight className="h-5 w-5 text-red-500" />
                          ) : isDeposit ? (
                            <ArrowDownLeft className="h-5 w-5 text-green-500" />
                          ) : isGame ? (
                            transaction.type === 'game_win' ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-orange-500" />
                            )
                          ) : (
                            <FileText className="h-5 w-5 text-blue-500" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {transaction.amount.toFixed(2)}$
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {transaction.type === 'withdrawal' ? 'Retrait' : 
                               transaction.type === 'deposit' ? 'Dépôt' :
                               transaction.type === 'game_bet' ? 'Mise Jeu' :
                               transaction.type === 'game_win' ? 'Gain Jeu' : 'Transaction'} • {transaction.reference}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatDate(transaction.created_at)}</span>
                        {transaction.agent && (
                          <span className="flex items-center">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {transaction.agent.name}
                          </span>
                        )}
                      </div>

                      {/* Show net amount for withdrawals */}
                      {isWithdrawal && (
                        <div className="mt-2 text-xs text-gray-500">
                          Net: {calculateFees(transaction.amount).payoutAmount.toFixed(2)}$ (frais: 8%)
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Transaction Details Modal */}
        {showTransactionModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Détails de la Transaction</h3>
                  <button
                    onClick={() => {
                      setShowTransactionModal(false)
                      setSelectedTransaction(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Transaction Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(selectedTransaction.status)}
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedTransaction.amount.toFixed(2)}$
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedTransaction.reference}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTransaction.status)}`}>
                      {getStatusText(selectedTransaction.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Type:</p>
                      <p className="font-medium capitalize">
                        {selectedTransaction.type === 'withdrawal' ? 'Retrait' : 'Dépôt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date de création:</p>
                      <p className="font-medium">{formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    {selectedTransaction.updated_at && (
                      <div>
                        <p className="text-gray-600">Date de traitement:</p>
                        <p className="font-medium">{formatDate(selectedTransaction.updated_at)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">Temps de traitement:</p>
                      <p className="font-medium">{selectedTransaction.processing_time}</p>
                    </div>
                  </div>

                  {/* Fee Breakdown for Withdrawals */}
                  {selectedTransaction.type === 'withdrawal' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Montant net:</span>
                        <span className="font-semibold text-green-600">
                          {calculateFees(selectedTransaction.amount).payoutAmount.toFixed(2)}$
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Frais totaux: {calculateFees(selectedTransaction.amount).totalFees.toFixed(2)}$ (8%)
                      </p>
                    </div>
                  )}
                </div>

                {/* Pending Status with Progress */}
                {selectedTransaction.status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      En Attente de Traitement
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-yellow-700">Temps écoulé:</span>
                        <span className="font-medium">{selectedTransaction.processing_time}</span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress(selectedTransaction.created_at)}%` }}
                        />
                      </div>
                      <p className="text-xs text-yellow-600 text-center">
                        Progression: {calculateProgress(selectedTransaction.created_at)}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Agent Information */}
                {selectedTransaction.agent && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <UserCheck className="h-5 w-5 mr-2" />
                      Informations de l'Agent
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700">Nom:</p>
                        <p className="font-medium text-blue-900">{selectedTransaction.agent.name}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Code:</p>
                        <p className="font-medium text-blue-900">{selectedTransaction.agent.code}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-blue-700">Région:</p>
                        <p className="font-medium text-blue-900 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {selectedTransaction.agent.region}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Receipt Section */}
                {selectedTransaction.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      <Receipt className="h-5 w-5 mr-2" />
                      Reçu de Transaction
                    </h4>
                    {getReceiptUrl(selectedTransaction) ? (
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-green-600" />
                        <div className="flex-1">
                          <p className="text-green-700 font-medium">Reçu disponible</p>
                          <button
                            onClick={() => handleDownloadReceipt(getReceiptUrl(selectedTransaction)!, selectedTransaction.reference)}
                            className="text-green-600 hover:text-green-800 text-sm underline"
                          >
                            Télécharger le reçu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-green-700">Aucun reçu disponible pour cette transaction</p>
                    )}
                  </div>
                )}

                {/* Decline Reason */}
                {selectedTransaction.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Raison du Refus
                    </h4>
                    <p className="text-red-700">
                      {getDeclineReason(selectedTransaction) || 'Aucune raison spécifiée'}
                    </p>
                  </div>
                )}

                {/* Additional Transaction Data */}
                {/* {selectedTransaction.qr_code_data && !selectedTransaction.qr_code_data.startsWith('http') && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Données Additionnelles</h4>
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(parseWithdrawalData(selectedTransaction.qr_code_data), null, 2)}
                    </pre>
                  </div>
                )} */}
              </div>

              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTransactionModal(false)
                    setSelectedTransaction(null)
                  }}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-lg ${
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
      </div>
    </div>
  )
}
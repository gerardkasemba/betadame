'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, CheckCircle, XCircle, Clock, Upload, Wallet, Copy, Loader } from 'lucide-react'
import { AlertCircle, FileText } from 'lucide-react'
import { fr } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

interface PaymentMethod {
  id: string
  name: string
  code: string
}

interface Agent {
  id: string
  name: string
  code: string
  is_active: boolean
  available_balance: number
  region: string
}

interface AgentPaymentAccount {
  agent_id: string
  account_number: string
  current_balance: number
  is_verified: boolean
  agents: Agent
  payment_methods: PaymentMethod
}

interface AgentPaymentInfo {
  agent_id: string
  agent_name: string
  agent_code: string
  account_number: string
  account_name: string
  payment_method_name: string
  current_balance: number
  is_verified: string
  payment_method_code: string
  is_primary: string
  region: string
}

interface DepositState {
  step: 'amount' | 'payment_method' | 'payment' | 'processing' | 'completed' | 'failed'
  amount: string
  selectedPaymentMethod: string
  agentInfo: AgentPaymentInfo | null
  transactionId: string | null
  proofImage: File | null
  countdown: number
  currentStatus: 'pending' | 'completed' | 'failed'
  showClaimOption?: boolean
}

export default function DepositPage() {
  const [state, setState] = useState<DepositState>({
    step: 'amount',
    amount: '',
    selectedPaymentMethod: '',
    agentInfo: null,
    transactionId: null,
    proofImage: null,
    countdown: 180, // 3 minutes in seconds
    currentStatus: 'pending'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [transactionSubscription, setTransactionSubscription] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUserProfile()
    fetchPaymentMethods()
    
    // Cleanup subscriptions on unmount
    return () => {
      if (transactionSubscription) {
        transactionSubscription.unsubscribe()
      }
    }
  }, [])

  // Set up real-time subscription when transaction is created
  useEffect(() => {
    if (state.transactionId && state.step === 'processing') {
      setupTransactionSubscription(state.transactionId)
    }
    
    return () => {
      if (transactionSubscription) {
        transactionSubscription.unsubscribe()
      }
    }
  }, [state.transactionId, state.step])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (state.step === 'processing' && state.countdown > 0 && state.currentStatus === 'pending') {
      interval = setInterval(() => {
        setState(prev => ({ ...prev, countdown: prev.countdown - 1 }))
        
        // Auto-fail when time runs out
        if (state.countdown <= 1) {
          handleTransactionTimeout()
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [state.step, state.countdown, state.currentStatus])

  // Helper function to get the mobile money button based on payment method
  const getMobileMoneyButton = (paymentMethodName: string) => {
    const reference = state.transactionId || `DEP-${Date.now()}`
    const amount = parseFloat(state.amount).toFixed(2)
    const accountNumber = state.agentInfo?.account_number || ''
    const accountName = state.agentInfo?.account_name || ''
    
    const smsBody = `Transfert de ${amount}$ vers ${accountName}. Code référence: ${reference}`
    
    const buttons = {
      'MTN Money': {
        code: '*555#',
        color: 'bg-yellow-600 hover:bg-yellow-700',
        href: `sms:*555#?body=${encodeURIComponent(smsBody)}`
      },
      'Airtel Money': {
        code: '*501#', 
        color: 'bg-red-600 hover:bg-red-700',
        href: `sms:*501#?body=${encodeURIComponent(smsBody)}`
      },
      'Orange Money': {
        code: '*144#',
        color: 'bg-orange-600 hover:bg-orange-700',
        href: `sms:*144#?body=${encodeURIComponent(smsBody)}`
      },
      'M-Pesa': {
        code: '*122#',
        color: 'bg-green-600 hover:bg-green-700', 
        href: `sms:*122#?body=${encodeURIComponent(smsBody)}`
      },
      'Africell Money': {
        code: '*111#',
        color: 'bg-purple-600 hover:bg-purple-700',
        href: `sms:*111#?body=${encodeURIComponent(smsBody)}`
      },
      'Illicocash': {
        code: '*404#',
        color: 'bg-blue-600 hover:bg-blue-700',
        href: `sms:*404#?body=${encodeURIComponent(smsBody)}`
        // href: `sms:${accountNumber}?body=${encodeURIComponent(smsBody)}`
      }
    }

    const buttonConfig = buttons[paymentMethodName as keyof typeof buttons]
    
    if (!buttonConfig) return null

    return (
      <a
        href={buttonConfig.href}
        className={`${buttonConfig.color} text-white py-3 px-6 rounded-lg transition-colors text-center font-medium flex items-center justify-center min-w-[200px]`}
      >
        <Wallet className="h-5 w-5 mr-2" />
        Ouvrir {paymentMethodName} ({buttonConfig.code})
      </a>
    )
  }

  const setupTransactionSubscription = (transactionId: string) => {
    console.log('🔔 Setting up real-time subscription for transaction:', transactionId)
    
    const subscription = supabase
      .channel(`transaction-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${transactionId}`
        },
        (payload) => {
          console.log('🔄 Real-time transaction update:', payload)
          
          // Only process if status is beyond "waiting_for_payment"
          if (payload.new.status !== 'waiting_for_payment') {
            handleTransactionUpdate(payload.new)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })

    setTransactionSubscription(subscription)
  }

  const handleTransactionUpdate = (transaction: any) => {
    console.log('🔄 Processing transaction update:', transaction)
    
    // Use metadata to track our workflow since status is limited
    const workflowStage = transaction.metadata?.workflow_stage
    const currentStatus = transaction.status
    
    console.log('Workflow stage:', workflowStage, 'Status:', currentStatus)
    
    // Transaction completed by agent
    if (currentStatus === 'completed') {
      setState(prev => ({
        ...prev,
        step: 'completed',
        currentStatus: 'completed'
      }))
      setMessage({ 
        type: 'success', 
        text: '✅ Dépôt confirmé ! Votre solde a été mis à jour.' 
      })
      
      fetchUserProfile()
      setTimeout(() => router.push('/dashboard'), 3000)
      
    } 
    // Transaction failed by agent or system
    else if (currentStatus === 'failed') {
      const reason = transaction.metadata?.failure_reason || transaction.qr_code_data || 'Raison non spécifiée'
      setState(prev => ({
        ...prev,
        step: 'failed',
        currentStatus: 'failed'
      }))
      setMessage({ 
        type: 'error', 
        text: `❌ Transaction refusée: ${reason}` 
      })
    }
    // Still pending but check if agent has reviewed
    else if (currentStatus === 'pending') {
      // If agent has reviewed but not decided yet
      if (workflowStage === 'under_agent_review') {
        setMessage({ 
          type: 'success', 
          text: '🔍 L\'agent examine votre preuve de paiement...' 
        })
      }
    }
  }

  const handleTransactionTimeout = async () => {
    if (!state.transactionId) return
    
    console.log('⏰ Transaction timeout reached')
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          metadata: {
            workflow_stage: 'timed_out',
            failure_reason: 'Temps écoulé - Transaction expirée',
            timed_out_at: new Date().toISOString()
          }
        })
        .eq('id', state.transactionId)

      if (error) throw error

      setState(prev => ({
        ...prev,
        step: 'failed',
        currentStatus: 'failed'
      }))
      setMessage({ 
        type: 'error', 
        text: '⏰ Temps écoulé. La transaction a expirée.' 
      })
    } catch (error) {
      console.error('Error updating transaction timeout:', error)
    }
  }

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setUserProfile(profile)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }

  const findAvailableAgent = async (paymentMethodId: string): Promise<AgentPaymentInfo | null> => {
    try {
      console.log('🔍 Searching for agents with payment method:', paymentMethodId)

      const { data: paymentMethod, error: pmError } = await supabase
        .from('payment_methods')
        .select('id, name, code')
        .eq('id', paymentMethodId)
        .single()

      if (pmError || !paymentMethod) {
        console.error('❌ Payment method not found:', pmError)
        return null
      }

      console.log('✅ Payment method found:', paymentMethod)

      const { data: agentAccounts, error: accountsError } = await supabase
        .from('agent_payment_accounts')
        .select(`
          agent_id,
          account_number,
          account_name,
          current_balance,
          is_verified,
          is_primary
        `)
        .eq('payment_method_id', paymentMethodId)

      if (accountsError) {
        console.error('❌ Error fetching agent accounts:', accountsError)
        return null
      }

      console.log('📊 ALL Agent accounts for this payment method:', agentAccounts)

      if (!agentAccounts || agentAccounts.length === 0) {
        console.log('❌ No agent accounts found for this payment method at all')
        return null
      }

      const agentIds = agentAccounts.map(account => account.agent_id)
      
      // Filter agents: active, online, and verified
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, code, is_active, available_balance, platform_balance, region, verification_status, online_status')
        .in('id', agentIds)
        .eq('is_active', true)
        .eq('online_status', 'online') // ✅ NEW: Only online agents

      if (agentsError) {
        console.error('❌ Error fetching agents:', agentsError)
        return null
      }

      console.log('👥 Active AND online agents with this payment method:', agents)

      if (!agents || agents.length === 0) {
        console.log('❌ No active online agents with this payment method')
        return null
      }

      // ✅ NEW: Count pending transactions for each agent
      const { data: pendingCounts, error: pendingError } = await supabase
        .from('transactions')
        .select('agent_id')
        .in('agent_id', agents.map(a => a.id))
        .eq('status', 'pending')
        .eq('type', 'deposit')

      if (pendingError) {
        console.error('❌ Error fetching pending transactions:', pendingError)
        return null
      }

      // Count pending transactions per agent
      const pendingCountMap = new Map<string, number>()
      agents.forEach(agent => pendingCountMap.set(agent.id, 0))
      
      pendingCounts?.forEach(tx => {
        const currentCount = pendingCountMap.get(tx.agent_id) || 0
        pendingCountMap.set(tx.agent_id, currentCount + 1)
      })

      console.log('📊 Pending transaction counts:', Object.fromEntries(pendingCountMap))

      // ✅ NEW: Filter agents with less than 3 pending transactions
      const availableAgents = agents.filter(agent => {
        const pendingCount = pendingCountMap.get(agent.id) || 0
        const isAvailable = pendingCount < 3
        
        if (!isAvailable) {
          console.log(`⏸️ Agent ${agent.name} has ${pendingCount} pending transactions (max: 2)`)
        }
        
        return isAvailable
      })

      console.log(`✅ ${availableAgents.length} agents available (online + less than 3 pending)`)

      if (availableAgents.length === 0) {
        console.log('❌ No agents available - all are either offline or have 3+ pending transactions')
        return null
      }

      // Filter by user region
      const userRegion = userProfile?.region
      console.log('🌍 User region:', userRegion)
      
      let eligibleAgents = availableAgents
      
      if (userRegion) {
        eligibleAgents = availableAgents.filter(agent => agent.region === userRegion)
        console.log(`🌍 Filtered by region ${userRegion}:`, eligibleAgents.length, 'agents')
      }

      if (eligibleAgents.length === 0) {
        eligibleAgents = availableAgents
        console.log('🌍 Using all regions, no agents in user region')
      }

      // Create agent-account pairs with priority scoring
      const agentAccountPairs = eligibleAgents
        .map(agent => {
          const account = agentAccounts.find(acc => acc.agent_id === agent.id)
          if (!account) {
            console.log(`⚠️ No account found for agent ${agent.name}, skipping`)
            return null
          }
          
          const pendingCount = pendingCountMap.get(agent.id) || 0
          
          return {
            agent,
            account,
            pendingCount,
            // Priority: verified > primary > fewer pending > higher balance
            priorityScore: (account.is_verified ? 4 : 0) + 
                          (account.is_primary ? 2 : 0) + 
                          (3 - pendingCount) // Fewer pending = higher score
          }
        })
        .filter((pair): pair is NonNullable<typeof pair> => pair !== null)

      if (agentAccountPairs.length === 0) {
        console.log('❌ No valid agent-account pairs found')
        return null
      }

      // Sort by priority score, then by available balance
      agentAccountPairs.sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore
        }
        return b.agent.available_balance - a.agent.available_balance
      })

      const selectedPair = agentAccountPairs[0]
      const selectedAgent = selectedPair.agent
      const selectedAccount = selectedPair.account

      console.log('✅ Selected agent:', selectedAgent.name)
      console.log('🌐 Online status:', selectedAgent.online_status)
      console.log('⏳ Pending transactions:', selectedPair.pendingCount, '/ 3')
      console.log('💰 Agent available balance:', selectedAgent.available_balance)
      console.log('💰 Agent platform balance:', selectedAgent.platform_balance)
      console.log('✅ Selected account:', selectedAccount.account_number)
      console.log('⚠️ Account verification status:', selectedAccount.is_verified)
      console.log('⭐ Primary account:', selectedAccount.is_primary)
      console.log('🎯 Priority score:', selectedPair.priorityScore)

      return {
        agent_id: selectedAgent.id,
        agent_name: selectedAgent.name,
        agent_code: selectedAgent.code,
        account_number: selectedAccount.account_number,
        account_name: selectedAccount.account_name,
        payment_method_name: paymentMethod.name,
        payment_method_code: paymentMethod.code,
        region: selectedAgent.region,
        current_balance: selectedAccount.current_balance,
        is_verified: selectedAccount.is_verified,
        is_primary: selectedAccount.is_primary
      }

    } catch (error) {
      console.error('❌ Error in findAvailableAgent:', error)
      return null
    }
  }

  const findAgentAndCreateTransaction = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const amount = parseFloat(state.amount)
      if (isNaN(amount) || amount <= 0) {
        setMessage({ type: 'error', text: 'Montant invalide' })
        return
      }

      if (!state.selectedPaymentMethod) {
        setMessage({ type: 'error', text: 'Veuillez sélectionner un moyen de paiement' })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const agentInfo = await findAvailableAgent(state.selectedPaymentMethod)

      if (!agentInfo) {
        setMessage({ 
          type: 'error', 
          text: 'Aucun agent disponible pour le moment. Veuillez réessayer plus tard ou choisir un autre moyen de paiement.' 
        })
        return
      }

      // Store everything in local state - NO DATABASE SAVE YET
      setState(prev => ({
        ...prev,
        agentInfo,
        step: 'payment'
      }))

      setMessage({ 
        type: 'success', 
        text: 'Agent trouvé! Vous pouvez maintenant effectuer le paiement.' 
      })

    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la recherche d\'un agent' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProofUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      if (!state.proofImage) {
        setMessage({ type: 'error', text: 'Veuillez télécharger une preuve de paiement' })
        return
      }

      if (!state.agentInfo) {
        setMessage({ type: 'error', text: 'Information agent non trouvée' })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      const amount = parseFloat(state.amount)
      if (isNaN(amount) || amount <= 0) {
        setMessage({ type: 'error', text: 'Montant invalide' })
        return
      }

      const reference = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

      // 1. First upload the proof image
      const fileExt = state.proofImage.name.split('.').pop()
      const fileName = `${reference}-proof.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('transaction-proofs')
        .upload(fileName, state.proofImage, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('transaction-proofs')
        .getPublicUrl(fileName)

      // 2. NOW create the transaction in database (first time saving to DB)
      const transactionData = {
        user_id: user.id,
        agent_id: state.agentInfo.agent_id,
        type: 'deposit',
        amount: amount,
        status: 'pending',
        reference: reference,
        payment_method_id: state.selectedPaymentMethod,
        proof_image_url: publicUrl,
        submitted_at: new Date().toISOString(),
        countdown_start: new Date().toISOString(),
        metadata: {
          workflow_stage: 'awaiting_agent_confirmation',
          payment_method_name: state.agentInfo.payment_method_name,
          user_region: userProfile?.region,
          agent_code: state.agentInfo.agent_code,
          proof_uploaded: true,
          agent_notified: true,
          created_at: new Date().toISOString()
        }
      }

      console.log('Creating transaction in database:', transactionData)

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()

      if (txError) {
        console.error('Transaction creation error:', txError)
        throw txError
      }

      // 3. Create agent selection history
      const { error: historyError } = await supabase
        .from('agent_selection_history')
        .insert({
          user_id: user.id,
          agent_id: state.agentInfo.agent_id,
          transaction_id: transaction.id
        })

      if (historyError) {
        console.error('History creation error:', historyError)
      }

      // 4. Update state with the transaction ID and move to processing
      setState(prev => ({
        ...prev,
        transactionId: transaction.id,
        step: 'processing',
        currentStatus: 'pending'
      }))

      setMessage({ 
        type: 'success', 
        text: '✅ Paiement complété! Votre transaction est en attente de confirmation par l\'agent.' 
      })

    } catch (error: any) {
      console.error('Error completing payment:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la finalisation du paiement' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Veuillez sélectionner une image' })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'L\'image ne doit pas dépasser 5MB' })
        return
      }
      setState(prev => ({ ...prev, proofImage: file }))
      setMessage({ type: 'success', text: 'Image sélectionnée avec succès' })
    }
  }

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(state.amount)
    if (amount && amount > 0) {
      if (amount < 1) {
        setMessage({ type: 'error', text: 'Le montant minimum est de 1$' })
        return
      }
      setState(prev => ({ ...prev, step: 'payment_method' }))
    }
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setState(prev => ({ ...prev, selectedPaymentMethod: methodId }))
    setMessage(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Numéro copié dans le presse-papier !' })
  }

  const getSelectedPaymentMethodName = () => {
    return paymentMethods.find(method => method.id === state.selectedPaymentMethod)?.name || ''
  }

  const handleBack = () => {
    if (state.step === 'payment_method') {
      setState(prev => ({ ...prev, step: 'amount' }))
    } else if (state.step === 'payment') {
      setState(prev => ({ 
        ...prev, 
        step: 'payment_method',
        agentInfo: null // Clear agent info since we haven't saved to DB
      }))
    }
  }

  const getStatusIcon = () => {
    switch (state.currentStatus) {
      case 'completed':
        return <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      default:
        return <Loader className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
    }
  }

  const getStatusMessage = () => {
    switch (state.currentStatus) {
      case 'completed':
        return {
          title: 'Dépôt Confirmé !',
          message: 'Votre dépôt a été confirmé par l\'agent. Votre solde a été mis à jour.',
          color: 'green'
        }
      case 'failed':
        return {
          title: 'Dépôt Refusé',
          message: 'Votre dépôt a été refusé. Veuillez contacter le support pour plus d\'informations.',
          color: 'red'
        }
      default:
        return {
          title: 'En Attente de Confirmation',
          message: 'Votre paiement est en cours de vérification par l\'agent.',
          color: 'blue'
        }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl text-gray-900 font-bold text-foreground font-heading">
            Effectuer un Dépôt
          </h1>
          <p className="text-gray-600 mt-2">
            Dépôt rapide et sécurisé via nos agents agréés
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8">
          {['Montant', 'Paiement', 'Confirmation', 'Terminé'].map((step, index) => {
            const stepNumber = index + 1
            const currentStep = ['amount', 'payment_method', 'payment', 'processing', 'completed', 'failed'].indexOf(state.step) + 1
            const isCompleted = stepNumber < currentStep
            const isActive = stepNumber === currentStep

            return (
              <div key={step} className="flex flex-col items-center flex-1">
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
                  {step}
                </span>
                {index < 3 && (
                  <div className={`flex-1 h-1 mt-4 -mb-4 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 1: Amount Input */}
        {state.step === 'amount' && (
          <form onSubmit={handleAmountSubmit} className="space-y-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Montant du dépôt ($)
              </label>
              <input
                type="number"
                id="amount"
                value={state.amount}
                onChange={(e) => setState(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="50.00"
                step="0.01"
                min="1"
                className="w-full px-4  text-gray-600 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Montant minimum: 1$
              </p>
            </div>

            <button
              type="submit"
              disabled={!state.amount || parseFloat(state.amount) < 1}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuer
            </button>
          </form>
        )}

        {/* Step 2: Payment Method Selection */}
        {state.step === 'payment_method' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <Wallet className="h-4 w-4 mr-2" />
                Choisissez comment payer
              </h4>
              <p className="text-sm text-blue-700">
                Sélectionnez votre moyen de paiement préféré
              </p>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    state.selectedPaymentMethod === method.id
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePaymentMethodSelect(method.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        state.selectedPaymentMethod === method.id
                          ? 'bg-primary border-primary'
                          : 'border-gray-300'
                      }`}>
                        {state.selectedPaymentMethod === method.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{method.name}</span>
                    </div>
                    {state.selectedPaymentMethod === method.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {paymentMethods.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune méthode de paiement disponible pour le moment</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Retour
              </button>
              <button
                onClick={findAgentAndCreateTransaction}
                disabled={isLoading || !state.selectedPaymentMethod}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recherche d'agent...
                  </div>
                ) : (
                  'Continuer vers le Paiement'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Information */}
        {state.step === 'payment' && state.agentInfo && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-800 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Paiement en Attente
              </h3>
              
              {/* Mobile Money Quick Action - Only show for relevant payment methods */}
              {['MTN Money', 'Airtel Money', 'Orange Money', 'M-Pesa', 'Africell Money', 'Illicocash'].includes(state.agentInfo.payment_method_name) && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-yellow-700 mb-3">
                    Payer Rapidement via Mobile Money
                  </label>
                  
                  <div className="flex justify-center">
                    {getMobileMoneyButton(state.agentInfo.payment_method_name)}
                  </div>

                  <p className="text-xs text-yellow-600 mt-3 text-center">
                    Cliquez pour ouvrir l'application mobile money
                  </p>
                </div>
              )}

              {/* Payment details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Méthode de Paiement
                  </label>
                  <p className="font-bold text-lg text-yellow-900">{state.agentInfo.payment_method_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Numéro de Compte Agent
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono font-bold text-xl bg-yellow-100 p-3 rounded-lg flex-1 text-yellow-900">
                      {state.agentInfo.account_number}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(state.agentInfo!.account_number)}
                      className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      title="Copier le numéro"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-yellow-900 bg-yellow-100 border border-yellow-300 rounded-lg p-2 mt-2 shadow-sm">
                    Nom du Compte: {state.agentInfo.account_name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Montant Exact à Envoyer
                  </label>
                  <p className="font-bold text-2xl text-yellow-600">{parseFloat(state.amount).toFixed(2)}$</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Agent Assigné
                  </label>
                  <p className="font-medium text-yellow-900">{state.agentInfo.agent_name} ({state.agentInfo.agent_code})</p>
                </div>

                {/* Reference Code */}
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Code de Référence (Important)
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono font-bold text-lg text-yellow-900 flex-1">
                      {state.transactionId || `DEP-${Date.now()}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(state.transactionId || `DEP-${Date.now()}`)}
                      className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      title="Copier la référence"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Incluez ce code dans la description de votre transfert pour une identification rapide
                  </p>
                </div>
              </div>
            </div>

            {/* Proof upload form */}
            <form onSubmit={handleProofUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preuve de Paiement (Capture d'écran)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="proofUpload"
                  />
                  <label htmlFor="proofUpload" className="cursor-pointer block">
                    <span className="text-primary hover:text-blue-700 font-medium">
                      Cliquez pour télécharger
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Formats acceptés: JPG, PNG, GIF (max 5MB)
                    </p>
                  </label>
                  {state.proofImage && (
                    <div className="mt-3 p-2 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">
                        ✓ {state.proofImage.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !state.proofImage}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Finalisation du paiement...
                  </div>
                ) : (
                  'J\'ai Effectué le Paiement'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 4: Processing/Completed/Failed */}
        {(state.step === 'processing' || state.step === 'completed' || state.step === 'failed') && (
          <div className="text-center space-y-6">
            <div className={`border rounded-lg p-6 ${
              state.currentStatus === 'completed' 
                ? 'bg-green-50 border-green-200' 
                : state.currentStatus === 'failed'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              {getStatusIcon()}
              
              <h3 className={`text-lg font-semibold mb-2 ${
                state.currentStatus === 'completed' 
                  ? 'text-green-800' 
                  : state.currentStatus === 'failed'
                  ? 'text-red-800'
                  : 'text-blue-800'
              }`}>
                {getStatusMessage().title}
              </h3>
              
              <p className={`mb-4 ${
                state.currentStatus === 'completed' 
                  ? 'text-green-700' 
                  : state.currentStatus === 'failed'
                  ? 'text-red-700'
                  : 'text-blue-700'
              }`}>
                {getStatusMessage().message}
              </p>

              {state.currentStatus === 'pending' && (
                <>
                  <p className="text-blue-700 mb-4">
                    Temps restant: <span className="font-bold text-blue-900">{formatTime(state.countdown)}</span>
                  </p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${((180 - state.countdown) / 180) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600">
                    {Math.round(((180 - state.countdown) / 180) * 100)}% du temps écoulé
                  </p>

                  <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Reference:</strong> {state.transactionId}
                    </p>
                  </div>
                </>
              )}

              {state.currentStatus === 'completed' && (
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">
                    Redirection automatique dans 3 secondes...
                  </p>
                </div>
              )}
            </div>

            {/* ✅ NEW: Claim Filing Option for Failed Transactions */}
            {state.currentStatus === 'failed' && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Contester cette décision ?
                </h4>
                <p className="text-orange-700 mb-4 text-center">
                  Si vous pensez que ce refus est une erreur, vous pouvez déposer une réclamation.
                </p>
                <div className="space-y-3 max-w-md mx-auto">
                  <button
                    onClick={() => router.push(`/dashboard/digital-wallet/deposit/claim?transaction_id=${state.transactionId}`)}
                    className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Déposer une Réclamation
                  </button>
                  <button
                    onClick={() => {
                      // Just hide the claim option without showing a message
                      setState(prev => ({ ...prev, showClaimOption: false }))
                    }}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Non merci, retour au tableau de bord
                  </button>
                </div>
                <div className="mt-3 text-xs text-orange-600 text-center">
                  <p><strong>Prérequis:</strong> Preuves de paiement, description détaillée, coordonnées</p>
                </div>
              </div>
            )}

            {state.currentStatus === 'pending' && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-800 mb-2">Que se passe-t-il ensuite ?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• L'agent vérifie votre paiement sous 3 minutes maximum</li>
                  <li>• Votre solde sera crédité automatiquement une fois confirmé</li>
                  <li>• Vous recevrez une notification de confirmation</li>
                  <li>• En cas de problème, contactez le support</li>
                </ul>
              </div>
            )}

            {/* ✅ NEW: Alternative Actions for Completed Transactions */}
            {state.currentStatus === 'completed' && (
              <div className="bg-green-50 rounded-lg p-4 text-left border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Transaction Réussie !</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Votre solde a été mis à jour</li>
                  <li>• Vous pouvez maintenant utiliser vos fonds</li>
                  <li>• Consultez votre historique pour les détails</li>
                  <li>• En cas de question, contactez le support</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg mt-4 ${
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
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Help Information */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Instructions Importantes</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Copiez exactement le numéro de compte fourni</li>
            <li>• Effectuez le transfert du montant exact indiqué</li>
            <li>• Téléchargez immédiatement la preuve de paiement après transfert</li>
            <li>• L'agent a 3 minutes pour confirmer votre dépôt</li>
            <li>• En cas de problème, contactez le support avec votre référence</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
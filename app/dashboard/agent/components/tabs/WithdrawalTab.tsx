"use client"
import { useState, useEffect } from 'react'
import { QrCode, CheckCircle, XCircle, Upload, FileText, User, Phone, CreditCard, DollarSign, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  reference: string
  status: 'pending' | 'completed' | 'failed'
  qr_code_data: string
  created_at: string
  user?: {
    username: string
    phone_number: string
    email: string
  }
  payment_method?: string
  account_name?: string
  phone_number?: string
}

interface WithdrawalTabProps {
  withdrawalCode: string
  isProcessing: boolean
  stats: any
  onCodeChange: (code: string) => void
  onSubmit: (e: React.FormEvent) => void
  onQRScan: () => void
  onStatusUpdate: () => void
}

interface PaymentMethod {
  name: string
  code: string
}

interface PaymentAccount {
  id: string
  current_balance: number
  account_number: string
  payment_methods: PaymentMethod[]
}

export function WithdrawalTab({
  withdrawalCode,
  isProcessing,
  stats,
  onCodeChange,
  onSubmit,
  onQRScan,
  onStatusUpdate
}: WithdrawalTabProps) {
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchPendingWithdrawals()
    setupRealtimeSubscription()
  }, [])

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel('withdrawal-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'type=eq.withdrawal'
        },
        (payload) => {
          console.log('Withdrawal transaction changed:', payload)
          fetchPendingWithdrawals()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

const fetchPendingWithdrawals = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get agent with proper selection
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) {
      console.error('Agent not found:', agentError)
      return
    }

    console.log('Agent ID:', agent.id)

    // METHOD 1: Try without explicit join first (let Supabase infer the relationship)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles (*)
      `)
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error with inferred join:', error)
      
      // METHOD 2: Try manual join if automatic join fails
      return await fetchWithManualJoin(agent.id)
    }

    console.log('Fetched transactions with inferred join:', transactions)

    if (!transactions || transactions.length === 0) {
      setPendingWithdrawals([])
      return
    }

    // Process the transactions
    const withdrawals: WithdrawalRequest[] = transactions.map(tx => {
      const withdrawalData = parseWithdrawalData(tx.qr_code_data)
      
      const userProfile = tx.profiles ? {
        username: tx.profiles.username,
        phone_number: tx.profiles.phone_number,
        email: tx.profiles.email
      } : undefined

      return {
        id: tx.id,
        user_id: tx.user_id,
        amount: tx.amount,
        reference: tx.reference,
        status: tx.status,
        qr_code_data: tx.qr_code_data,
        created_at: tx.created_at,
        user: userProfile,
        payment_method: withdrawalData.payment_method,
        account_name: withdrawalData.account_name,
        phone_number: withdrawalData.phone_number
      }
    })

    setPendingWithdrawals(withdrawals)

  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    setMessage({ type: 'error', text: 'Erreur lors du chargement des retraits' })
  }
}

// Manual join method as fallback
const fetchWithManualJoin = async (agentId: string) => {
  try {
    // First get transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })

    if (txError) throw txError

    if (!transactions || transactions.length === 0) {
      setPendingWithdrawals([])
      return
    }

    // Get user IDs from transactions
    const userIds = transactions.map(tx => tx.user_id).filter(Boolean) as string[]

    let profiles: any[] = []
    if (userIds.length > 0) {
      // Fetch user profiles separately
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, phone_number, email')
        .in('id', userIds)

      if (!profileError && profilesData) {
        profiles = profilesData
      }
    }

    // Combine transactions with user data
    const withdrawals: WithdrawalRequest[] = transactions.map(tx => {
      const userProfile = profiles.find(profile => profile.id === tx.user_id)
      const withdrawalData = parseWithdrawalData(tx.qr_code_data)
      
      return {
        id: tx.id,
        user_id: tx.user_id,
        amount: tx.amount,
        reference: tx.reference,
        status: tx.status,
        qr_code_data: tx.qr_code_data,
        created_at: tx.created_at,
        user: userProfile ? {
          username: userProfile.username,
          phone_number: userProfile.phone_number,
          email: userProfile.email
        } : undefined,
        payment_method: withdrawalData.payment_method,
        account_name: withdrawalData.account_name,
        phone_number: withdrawalData.phone_number
      }
    })

    setPendingWithdrawals(withdrawals)

  } catch (error) {
    console.error('Error in manual join:', error)
    throw error
  }
}

  const fetchPendingWithdrawalsFallback  = async (agentId: string) => {
    try {
      // Fallback method - get transactions assigned to this agent
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .eq('agent_id', agentId) // Only this agent's assigned withdrawals
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching transactions in fallback:', error)
        throw error
      }

      console.log('Fallback transactions:', transactions)

      if (!transactions || transactions.length === 0) {
        setPendingWithdrawals([])
        return
      }

      // Get user IDs from transactions
      const userIds = transactions.map(tx => tx.user_id).filter(Boolean)

      let profiles: any[] = []
      if (userIds.length > 0) {
        // Fetch user profiles separately
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, phone_number, email')
          .in('id', userIds)

        if (!profileError) {
          profiles = profilesData || []
        }
        console.log('Fetched profiles separately:', profiles)
      }

      // Combine transactions with user data
      const withdrawals: WithdrawalRequest[] = transactions.map(tx => {
        const userProfile = profiles.find(profile => profile.id === tx.user_id)
        const withdrawalData = parseWithdrawalData(tx.qr_code_data)
        
        return {
          id: tx.id,
          user_id: tx.user_id,
          amount: tx.amount,
          reference: tx.reference,
          status: tx.status,
          qr_code_data: tx.qr_code_data,
          created_at: tx.created_at,
          user: userProfile ? {
            username: userProfile.username,
            phone_number: userProfile.phone_number,
            email: userProfile.email
          } : undefined,
          payment_method: withdrawalData.payment_method,
          account_name: withdrawalData.account_name,
          phone_number: withdrawalData.phone_number
        }
      })

      setPendingWithdrawals(withdrawals)

    } catch (error) {
      console.error('Error in fallback withdrawal fetch:', error)
    }
  }

  const parseWithdrawalData = (qrCodeData: string) => {
    try {
      if (!qrCodeData) return {}
      
      if (qrCodeData.startsWith('{')) {
        return JSON.parse(qrCodeData)
      }
      
      // Try to parse as URL encoded JSON
      try {
        const decoded = decodeURIComponent(qrCodeData)
        if (decoded.startsWith('{')) {
          return JSON.parse(decoded)
        }
      } catch (e) {
        // Not URL encoded, continue
      }
      
      return {}
    } catch (error) {
      console.error('Error parsing withdrawal data:', error)
      return {}
    }
  }

  // Function to calculate all fees - UPDATED
  const calculateFees = (amount: number) => {
    const agentCommission = amount * 0.025  // 2.5% agent commission
    const agentTransactionFee = amount * 0.015 // 1.5% agent transaction fee
    const platformFee = amount * 0.02       // 2% platform fee
    const maintenanceFee = amount * 0.02    // 2% maintenance fee
    const totalFees = agentCommission + agentTransactionFee + platformFee + maintenanceFee // 8% total
    const netAmountToUser = amount - totalFees

    // NEW: Total amount to add to agent's platform balance
    const totalToPlatform = agentCommission + agentTransactionFee // 4% total

    return {
      agentCommission,
      agentTransactionFee,
      platformFee,
      maintenanceFee,
      totalFees,
      netAmountToUser,
      totalToPlatform // NEW FIELD
    }
  }

const handleApproveWithdrawal = async (requestId: string) => {
  if (!receiptFile) {
    setMessage({ type: 'error', text: 'Veuillez télécharger un reçu' })
    return
  }

  setIsLoading(true)
  setMessage(null)

  try {
    // Find the request details
    const request = pendingWithdrawals.find(w => w.id === requestId)
    if (!request) throw new Error('Demande de retrait non trouvée')

    // Validate user_id exists
    if (!request.user_id) {
      throw new Error('ID utilisateur manquant dans la transaction')
    }

    console.log('Processing withdrawal for user:', request.user_id)

    // Upload receipt
    const fileExt = receiptFile.name.split('.').pop()
    const fileName = `withdrawal-proofs/${requestId}-receipt-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('transaction-proofs')
      .upload(fileName, receiptFile)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Erreur de téléchargement: ${uploadError.message}`)
    }

    // Get public URL for proof_image_url
    const { data: { publicUrl } } = supabase.storage
      .from('transaction-proofs')
      .getPublicUrl(fileName)

    // FIXED: Calculate fees with proper distribution
    const withdrawalCommission = request.amount * 0.025  // 2.5% agent commission
    const agentTransactionFee = request.amount * 0.015   // 1.5% agent transaction fee
    const platformFee = request.amount * 0.02           // 2% platform fee
    const maintenanceFee = request.amount * 0.02        // 2% maintenance fee
    const totalFees = withdrawalCommission + agentTransactionFee + platformFee + maintenanceFee // 8% total
    const netAmountToUser = request.amount - totalFees

    // Total commission for agent (2.5% + 1.5% = 4%)
    const totalAgentCommission = withdrawalCommission + agentTransactionFee

    // Get current agent
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non connecté')

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, available_balance, platform_balance')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) throw new Error('Agent non trouvé')

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', requestId)
      .single()

    if (transactionError || !transaction) {
      throw new Error('Transaction non trouvée')
    }

    // Validate transaction has user_id
    if (!transaction.user_id) {
      throw new Error('Transaction invalide: user_id manquant')
    }

    let paymentAccount: PaymentAccount | null = null
    let paymentMethodName = 'Méthode de paiement'
    let paymentMethodId = transaction.payment_method_id

    // If payment method is specified in transaction, use it
    if (transaction.payment_method_id) {
      const { data: account, error: paymentAccountError } = await supabase
        .from('agent_payment_accounts')
        .select(`
          id,
          current_balance,
          account_number,
          payment_methods!inner (
            id,
            name,
            code
          )
        `)
        .eq('agent_id', agent.id)
        .eq('payment_method_id', transaction.payment_method_id)
        .single()

      if (paymentAccountError || !account) {
        throw new Error(`Compte de paiement non trouvé pour la méthode sélectionnée`)
      }

      paymentAccount = account
      paymentMethodName = account.payment_methods[0]?.name || 'Méthode inconnue'
      paymentMethodId = account.payment_methods[0]?.id || transaction.payment_method_id

      // Check balance in specific payment account
      if (paymentAccount.current_balance < netAmountToUser) {
        throw new Error(
          `Solde insuffisant dans ${paymentMethodName}. ` +
          `Vous avez ${paymentAccount.current_balance}$, ` +
          `nécessaire: ${netAmountToUser}$`
        )
      }
    } else {
      // If no specific payment method, use the agent's primary payment account
      const { data: primaryAccount, error: primaryAccountError } = await supabase
        .from('agent_payment_accounts')
        .select(`
          id,
          current_balance,
          account_number,
          payment_methods!inner (
            id,
            name,
            code
          )
        `)
        .eq('agent_id', agent.id)
        .eq('is_primary', true)
        .single()

      if (primaryAccountError || !primaryAccount) {
        throw new Error('Aucun compte de paiement principal trouvé')
      }

      paymentAccount = primaryAccount
      paymentMethodName = primaryAccount.payment_methods[0]?.name || 'Méthode inconnue'
      paymentMethodId = primaryAccount.payment_methods[0]?.id

      // Check balance in primary payment account
      if (paymentAccount.current_balance < netAmountToUser) {
        throw new Error(
          `Solde insuffisant dans votre compte principal (${paymentMethodName}). ` +
          `Vous avez ${paymentAccount.current_balance}$, ` +
          `nécessaire: ${netAmountToUser}$`
        )
      }
    }

    // FIXED: Update transaction with all required fields
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        proof_image_url: publicUrl,
        submitted_at: now,
        countdown_start: now,
        payment_method: paymentMethodId,
        agent_id: agent.id,
        user_id: transaction.user_id,
        description: `Retrait approuvé - ${paymentMethodName} - Commission: ${totalAgentCommission.toFixed(2)}$`
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Transaction update error:', updateError)
      throw new Error(`Erreur lors de la mise à jour de la transaction: ${updateError.message}`)
    }

    console.log('Transaction updated successfully')

    // FIXED: Update payment account balance - ONLY deduct from the specific payment account
    const { error: paymentAccountUpdateError } = await supabase
      .from('agent_payment_accounts')
      .update({
        current_balance: paymentAccount.current_balance - netAmountToUser,
        updated_at: now
      })
      .eq('id', paymentAccount.id)

    if (paymentAccountUpdateError) {
      console.error('Payment account update error:', paymentAccountUpdateError)
      throw new Error(`Erreur mise à jour compte paiement: ${paymentAccountUpdateError.message}`)
    }

    // FIXED: Update agent balances - ONLY add commission, don't deduct from available_balance
    const { error: agentBalanceError } = await supabase
      .from('agents')
      .update({
        // DON'T deduct from available_balance - that's for agent's own withdrawals
        available_balance: agent.available_balance, // Keep available_balance unchanged
        platform_balance: (agent.platform_balance || 0) + totalAgentCommission, // Add commission to platform_balance
        updated_at: now
      })
      .eq('id', agent.id)

    if (agentBalanceError) {
      console.error('Agent balance update error:', agentBalanceError)
      throw new Error(`Erreur mise à jour solde agent: ${agentBalanceError.message}`)
    }

    // FIXED: Record agent commission with proper breakdown
    try {
      // Record the 2.5% commission
      const { error: commissionError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id: agent.id,
          transaction_id: requestId,
          amount: withdrawalCommission, // 2.5% commission
          type: 'withdrawal_commission',
          status: 'paid',
          paid_at: now,
          created_at: now
        })

      if (commissionError) {
        console.warn('Error recording commission:', commissionError)
      }

      // Record the 1.5% transaction fee
      const { error: transactionFeeError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id: agent.id,
          transaction_id: requestId,
          amount: agentTransactionFee, // 1.5% transaction fee
          type: 'withdrawal_transaction_fee',
          status: 'paid',
          paid_at: now,
          created_at: now
        })

      if (transactionFeeError) {
        console.warn('Error recording transaction fee:', transactionFeeError)
      }

      console.log('Agent commissions recorded successfully:', {
        commission: withdrawalCommission,
        transactionFee: agentTransactionFee,
        total: totalAgentCommission
      })
    } catch (commissionError) {
      console.warn('Commission recording failed:', commissionError)
    }

    // FIXED: Record admin profit with proper breakdown
    try {
      const { error: profitError } = await supabase
        .from('admin_profit')
        .insert({
          transaction_id: requestId,
          agent_id: agent.id,
          platform_fee: platformFee, // 2% platform fee
          maintenance_fee: maintenanceFee, // 2% maintenance fee
          total_amount: platformFee + maintenanceFee, // 4% total to admin
          created_at: now
        })

      if (profitError) {
        console.warn('Error recording admin profit:', profitError)
      } else {
        console.log('Admin profit recorded successfully:', {
          platform_fee: platformFee,
          maintenance_fee: maintenanceFee,
          total: platformFee + maintenanceFee
        })
      }
    } catch (profitError) {
      console.warn('Admin profit recording failed:', profitError)
    }

    // Record payment details
    try {
      const { error: paymentRecordError } = await supabase
        .from('transaction_payments')
        .insert({
          transaction_id: requestId,
          agent_payment_account_id: paymentAccount.id,
          amount_paid: netAmountToUser,
          payment_method: paymentMethodName,
          created_at: now
        })

      if (paymentRecordError) console.warn('Error recording payment details:', paymentRecordError)
    } catch (paymentRecordError) {
      console.warn('Payment details recording failed:', paymentRecordError)
    }

    // FIXED: Update user balance - deduct the full withdrawal amount
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', transaction.user_id)
        .single()

      if (userProfile) {
        const { error: userBalanceError } = await supabase
          .from('profiles')
          .update({
            balance: (userProfile.balance || 0) - request.amount // Deduct full amount from user
          })
          .eq('id', transaction.user_id)

        if (userBalanceError) {
          console.warn('Error updating user balance:', userBalanceError)
        } else {
          console.log('User balance updated successfully')
        }
      }
    } catch (userBalanceError) {
      console.warn('User balance update failed:', userBalanceError)
    }

    setMessage({ 
      type: 'success', 
      text: `Retrait de ${request.amount}$ approuvé! 
            Méthode: ${paymentMethodName}
            Versé à l'utilisateur: ${netAmountToUser.toFixed(2)}$ 
            Frais totaux: ${totalFees.toFixed(2)}$ (8%)
            Votre commission: ${totalAgentCommission.toFixed(2)}$ (4%)
            Détail: 2.5% commission + 1.5% frais transaction
            Frais plateforme: ${(platformFee + maintenanceFee).toFixed(2)}$ (4%)` 
    })

    setShowApproveModal(false)
    setSelectedRequest(null)
    setReceiptFile(null)

    await fetchPendingWithdrawals()
    onStatusUpdate()

  } catch (error: any) {
    console.error('Error approving withdrawal:', error)
    setMessage({ 
      type: 'error', 
      text: error.message || 'Erreur lors de l\'approbation du retrait' 
    })
  } finally {
    setIsLoading(false)
  }
}

  const handleDeclineWithdrawal = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Veuillez fournir une raison' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      // Update transaction status to failed with reason
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          qr_code_data: reason
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Refund user balance (full amount since transaction is declined)
      const request = pendingWithdrawals.find(w => w.id === requestId)
      if (request) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', request.user_id)
          .single()

        if (userProfile) {
          await supabase
            .from('profiles')
            .update({
              balance: (userProfile.balance || 0) + request.amount
            })
            .eq('id', request.user_id)
        }
      }

      setMessage({ type: 'success', text: 'Retrait refusé avec succès' })
      setShowDeclineModal(false)
      setSelectedRequest(null)
      setDeclineReason('')

      await fetchPendingWithdrawals()
      onStatusUpdate()

    } catch (error) {
      console.error('Error declining withdrawal:', error)
      setMessage({ type: 'error', text: 'Erreur lors du refus du retrait' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
        setMessage({ type: 'error', text: 'Veuillez sélectionner une image ou un PDF' })
        return
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Le fichier ne doit pas dépasser 10MB' })
        return
      }
      
      setReceiptFile(file)
      setMessage({ type: 'success', text: 'Reçu sélectionné avec succès' })
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentMethodDisplay = (request: WithdrawalRequest) => {
    if (request.payment_method) {
      return request.payment_method
    }
    
    const withdrawalData = parseWithdrawalData(request.qr_code_data)
    return withdrawalData.payment_method || 'Mobile Money'
  }

  const getPhoneNumberDisplay = (request: WithdrawalRequest) => {
    if (request.phone_number) {
      return request.phone_number
    }
    
    if (request.user?.phone_number) {
      return request.user.phone_number
    }
    
    const withdrawalData = parseWithdrawalData(request.qr_code_data)
    return withdrawalData.phone_number || 'Non spécifié'
  }

  const getAccountNameDisplay = (request: WithdrawalRequest) => {
    console.log('Getting account name for request:', {
      id: request.id,
      account_name: request.account_name,
      user_username: request.user?.username,
      qr_data: request.qr_code_data
    })

    // First priority: account_name from request
    if (request.account_name) {
      return request.account_name
    }
    
    // Second priority: username from user profile
    if (request.user?.username) {
      return request.user.username
    }
    
    // Third priority: account_name from parsed QR code data
    const withdrawalData = parseWithdrawalData(request.qr_code_data)
    if (withdrawalData.account_name) {
      return withdrawalData.account_name
    }
    
    // Final fallback
    return 'Non spécifié'
  }

  // Debug function to check user data
  const debugUserData = (request: WithdrawalRequest) => {
    console.log('Debug request data:', {
      id: request.id,
      hasUser: !!request.user,
      user: request.user,
      account_name: request.account_name,
      qr_code_data: request.qr_code_data,
      parsedData: parseWithdrawalData(request.qr_code_data)
    })
    return getAccountNameDisplay(request)
  }

  return (
    <div className="space-y-4 p-2">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Retraits</h1>
        <p className="text-sm text-gray-600">Gérez les demandes de retrait des clients</p>
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Scanner un code</h2>
          <button
            onClick={onQRScan}
            className="p-2 bg-primary/10 rounded-lg text-primary hover:bg-primary/20 transition-colors"
            title="Scanner QR Code"
          >
            <QrCode className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              id="withdrawalCode"
              value={withdrawalCode}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="Entrez le code de retrait"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 text-sm"
              required
            />
          </div>

          {/* Balance Indicator */}
          {stats && (
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
              stats.available_balance < 50 
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              Solde: {stats.available_balance.toFixed(2)}$
              {stats.available_balance < 50 && ' • Faible'}
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing || !stats || stats.available_balance <= 0}
            className="w-full bg-primary text-white py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isProcessing ? 'Traitement...' : 'Traiter le retrait'}
          </button>
        </form>
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">En attente</h2>
            <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-full font-medium">
              {pendingWithdrawals.length}
            </span>
          </div>
        </div>

        {pendingWithdrawals.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">Aucune demande en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingWithdrawals.map((request) => {
              const fees = calculateFees(request.amount)
              
              return (
                <div key={request.id} className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {request.amount.toFixed(2)}$
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      En attente
                    </span>
                  </div>

                  {/* Client Info - FIXED: Using getAccountNameDisplay */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-3 w-3 mr-2" />
                      <span className="font-medium">{getAccountNameDisplay(request)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-3 w-3 mr-2" />
                      <span>{getPhoneNumberDisplay(request)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="h-3 w-3 mr-2" />
                      <span>{getPaymentMethodDisplay(request)}</span>
                    </div>
                  </div>

                  {/* Quick Fees Overview */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Frais totaux:</span>
                      <span className="text-red-600 font-medium">-{fees.totalFees.toFixed(2)}$ (8%)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Montant client:</span>
                      <span className="text-green-600 font-medium">{fees.netAmountToUser.toFixed(2)}$</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request)
                        setShowApproveModal(true)
                      }}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      Approuver
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedRequest(request)
                        setShowDeclineModal(true)
                      }}
                      disabled={isLoading}
                      className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm text-blue-800">
            <p className="font-medium">Commission agent: 4%</p>
            <p className="text-xs">Frais totaux: 8% (4% pour vous + 2% plateforme + 2% maintenance)</p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-3 rounded-xl ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center text-sm">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            )}
            <span className="whitespace-pre-line">{message.text}</span>
          </div>
        </div>
      )}

      {/* Approve Modal - Mobile Optimized */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col sm:max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Confirmer l'approbation</h3>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-4 space-y-4">
                {/* Request Summary - FIXED: Using getAccountNameDisplay */}
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Montant:</span>
                      <span className="font-bold text-blue-900">{selectedRequest.amount.toFixed(2)}$</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Client:</span>
                      <span className="text-blue-900">{getAccountNameDisplay(selectedRequest)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Téléphone:</span>
                      <span className="text-blue-900">{getPhoneNumberDisplay(selectedRequest)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Méthode:</span>
                      <span className="text-blue-900">{getPaymentMethodDisplay(selectedRequest)}</span>
                    </div>
                  </div>
                </div>

                {/* Simplified Fees */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Commissions et frais</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-green-600">
                      <span>Votre commission (4%):</span>
                      <span className="font-medium">+{(selectedRequest.amount * 0.04).toFixed(2)}$</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Frais totaux (8%):</span>
                      <span>-{(selectedRequest.amount * 0.08).toFixed(2)}$</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1 text-green-700">
                      <span>Client reçoit:</span>
                      <span>{(selectedRequest.amount * 0.92).toFixed(2)}$</span>
                    </div>
                  </div>
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reçu de transaction
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleReceiptUpload}
                      className="hidden"
                      id="receiptUpload"
                    />
                    <label htmlFor="receiptUpload" className="cursor-pointer">
                      <span className="text-primary hover:text-blue-700 font-medium text-sm">
                        Télécharger le reçu
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {receiptFile ? (
                        <span className="text-green-600 font-medium">✓ {receiptFile.name}</span>
                      ) : (
                        'Capture du paiement'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false)
                    setSelectedRequest(null)
                    setReceiptFile(null)
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2.5 px-4 rounded-xl hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleApproveWithdrawal(selectedRequest.id)}
                  disabled={isLoading || !receiptFile}
                  className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-xl hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Traitement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal - Mobile Optimized */}
      {showDeclineModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col sm:max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Refuser le retrait</h3>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-4 space-y-4">
                {/* Request Info - FIXED: Using getAccountNameDisplay */}
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-sm text-red-800">
                    <strong>{selectedRequest.amount.toFixed(2)}$</strong> • {getAccountNameDisplay(selectedRequest)}
                  </p>
                </div>

                {/* Reason Input */}
                <div>
                  <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Raison du refus
                  </label>
                  <textarea
                    id="declineReason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Expliquez pourquoi vous refusez ce retrait..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    required
                  />
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-700">
                    ⚠️ Le client sera remboursé automatiquement
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeclineModal(false)
                    setSelectedRequest(null)
                    setDeclineReason('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2.5 px-4 rounded-xl hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeclineWithdrawal(selectedRequest.id, declineReason)}
                  disabled={isLoading || !declineReason.trim()}
                  className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-xl hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Traitement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
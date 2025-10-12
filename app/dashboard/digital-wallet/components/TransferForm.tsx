// app/dashboard/digital-wallet/components/TransferForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'

interface UserProfile {
  id: string
  username: string
  balance: number
  avatar_url?: string
}

interface TransferFormProps {
  currentUser: UserProfile | null
  onBalanceUpdate: () => void
  onRequestCreated?: () => void
}

type TransferType = 'send' | 'request'

export default function TransferForm({ currentUser, onBalanceUpdate, onRequestCreated }: TransferFormProps) {
  const [recipientUsername, setRecipientUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [recipient, setRecipient] = useState<UserProfile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchingUser, setSearchingUser] = useState(false)
  const [transferType, setTransferType] = useState<TransferType>('send')
  const [suggestedAmounts] = useState([5, 10, 25, 50, 100, 200])

  const supabase = createClient()
  const { addToast } = useToast()

  // Debounced recipient search
  useEffect(() => {
    if (recipientUsername.trim().length < 3) {
      setRecipient(null)
      return
    }

    const searchRecipient = async () => {
      setSearchingUser(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, balance, avatar_url')
          .eq('username', recipientUsername.trim())
          .single()

        if (data && !error) {
          setRecipient(data)
        } else {
          setRecipient(null)
        }
      } catch (error) {
        setRecipient(null)
      } finally {
        setSearchingUser(false)
      }
    }

    const timeoutId = setTimeout(searchRecipient, 500)
    return () => clearTimeout(timeoutId)
  }, [recipientUsername])

  const handleAmountSuggestion = (suggestedAmount: number) => {
    setAmount(suggestedAmount.toString())
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      const transferAmount = parseFloat(amount)
      
      // Common validations
      if (!recipient) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Veuillez sélectionner un utilisateur valide',
          duration: 5000
        })
        return
      }

      if (isNaN(transferAmount) || transferAmount <= 0) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Montant invalide',
          duration: 5000
        })
        return
      }

      if (!currentUser) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Utilisateur non connecté',
          duration: 5000
        })
        return
      }

      if (currentUser.id === recipient.id) {
        addToast({ 
          type: 'error', 
          title: 'Erreur',
          message: 'Vous ne pouvez pas effectuer cette action avec vous-même',
          duration: 5000
        })
        return
      }

      if (transferType === 'send') {
        await handleSendMoney(transferAmount)
      } else {
        await handleRequestFunds(transferAmount)
      }

    } catch (error) {
      console.error('Error processing transfer:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'L\'opération a échoué. Veuillez réessayer.',
        duration: 5000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendMoney = async (sendAmount: number) => {
    if (!currentUser || !recipient) return

    // Check balance for sending
    if (currentUser.balance < sendAmount) {
      addToast({ 
        type: 'error', 
        title: 'Solde Insuffisant',
        message: `Solde insuffisant. Vous avez ${currentUser.balance.toFixed(2)}$, vous essayez d'envoyer ${sendAmount.toFixed(2)}$`,
        duration: 5000
      })
      return
    }

    // Generate unique reference
    const reference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

    // Create sending transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: currentUser.id,
        type: 'transfer_send',
        amount: sendAmount,
        status: 'completed',
        reference: reference,
        description: description || `Transfert à ${recipient.username}`,
        metadata: {
          recipient_id: recipient.id,
          recipient_username: recipient.username,
          transfer_type: 'peer_to_peer'
        }
      })
      .select()
      .single()

    if (txError) throw txError

    // Create receiving transaction for recipient
    const { error: receiveTxError } = await supabase
      .from('transactions')
      .insert({
        user_id: recipient.id,
        type: 'transfer_receive',
        amount: sendAmount,
        status: 'completed',
        reference: `${reference}-RECV`,
        description: description || `Transfert de ${currentUser.username}`,
        metadata: {
          sender_id: currentUser.id,
          sender_username: currentUser.username,
          transfer_type: 'peer_to_peer',
          original_reference: reference
        }
      })

    if (receiveTxError) throw receiveTxError

    // Update balances
    await supabase
      .from('profiles')
      .update({ balance: currentUser.balance - sendAmount })
      .eq('id', currentUser.id)

    await supabase
      .from('profiles')
      .update({ balance: recipient.balance + sendAmount })
      .eq('id', recipient.id)

    // Show success message
    addToast({
      type: 'success',
      title: 'Transfert Envoyé! ✅',
      message: `Vous avez envoyé ${sendAmount.toFixed(2)}$ à ${recipient.username}`,
      amount: sendAmount,
      duration: 5000
    })

    // Reset form
    resetForm()
    onBalanceUpdate()
  }

  const handleRequestFunds = async (requestAmount: number) => {
    if (!currentUser || !recipient) return

    // Generate unique reference
    const reference = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

    // Create funds request
    const { data: fundsRequest, error } = await supabase
      .from('funds_requests')
      .insert({
        requester_id: currentUser.id,
        recipient_id: recipient.id,
        amount: requestAmount,
        description: description || `Demande de fonds de ${currentUser.username}`,
        reference: reference,
        metadata: {
          requester_username: currentUser.username,
          recipient_username: recipient.username
        }
      })
      .select()
      .single()

    if (error) throw error

    // Show success message
    addToast({
      type: 'success',
      title: 'Demande Envoyée! 📨',
      message: `Vous avez demandé ${requestAmount.toFixed(2)}$ à ${recipient.username}`,
      amount: requestAmount,
      duration: 5000
    })

    // Reset form
    resetForm()
    onRequestCreated?.()
  }

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setRecipient(null)
    setRecipientUsername('')
  }

  const getUsernameStatus = () => {
    if (!recipientUsername.trim()) return null
    
    if (searchingUser) {
      return { type: 'loading', text: 'Recherche en cours...' } as const
    }
    
    if (recipientUsername.trim().length < 3) {
      return { type: 'info', text: 'Entrez au moins 3 caractères' } as const
    }
    
    if (recipient) {
      return { type: 'success', text: `Utilisateur trouvé: ${recipient.username}` } as const
    }
    
    return { type: 'error', text: 'Utilisateur non trouvé' } as const
  }

  const usernameStatus = getUsernameStatus()
  const transferAmount = parseFloat(amount) || 0

  const getActionButtonConfig = () => {
    const baseConfig = {
      send: {
        label: 'Envoyer',
        loadingLabel: 'Envoi en cours...',
        gradient: 'from-blue-600 to-indigo-600',
        hoverGradient: 'from-blue-700 to-indigo-700',
        icon: PaperAirplaneIcon
      },
      request: {
        label: 'Demander',
        loadingLabel: 'Demande en cours...',
        gradient: 'from-green-600 to-emerald-600',
        hoverGradient: 'from-green-700 to-emerald-700',
        icon: HandRaisedIcon
      }
    }

    return baseConfig[transferType]
  }

  const getButtonDisabledState = () => {
    if (isProcessing || !recipient || transferAmount <= 0) return true
    
    if (transferType === 'send') {
      return (currentUser?.balance || 0) < transferAmount
    }
    
    return false
  }

  const buttonConfig = getActionButtonConfig()
  const ActionIcon = buttonConfig.icon

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Transfer Type Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setTransferType('send')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
            transferType === 'send'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Envoyer
        </button>
        <button
          type="button"
          onClick={() => setTransferType('request')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
            transferType === 'request'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Demander
        </button>
      </div>

      <form onSubmit={handleTransfer} className="space-y-6">
        {/* Recipient Input */}
        <div className="space-y-2">
          <label htmlFor="recipientUsername" className="block text-sm font-semibold text-gray-900">
            {transferType === 'send' ? 'À qui envoyez-vous ?' : 'À qui demandez-vous ?'}
          </label>
          <div className="relative">
            <input
              type="text"
              id="recipientUsername"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="ex: john_doe"
              className={`w-full px-4 py-3 border text-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                usernameStatus?.type === 'error' 
                  ? 'border-red-300 bg-red-50' 
                  : usernameStatus?.type === 'success'
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
              }`}
              required
              disabled={isProcessing}
            />
            {usernameStatus && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {usernameStatus.type === 'loading' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                )}
                {usernameStatus.type === 'success' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                )}
                {usernameStatus.type === 'error' && (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
              </div>
            )}
          </div>
          {usernameStatus && (
            <p className={`text-xs font-medium ${
              usernameStatus.type === 'loading' ? 'text-blue-600' :
              usernameStatus.type === 'success' ? 'text-green-600' :
              usernameStatus.type === 'error' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {usernameStatus.text}
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <label htmlFor="amount" className="block text-sm font-semibold text-gray-900">
            Montant {transferType === 'send' ? 'à envoyer' : 'demandé'} ($)
          </label>
          
          {/* Quick Amount Suggestions */}
          <div className="grid grid-cols-3 gap-2">
            {suggestedAmounts.map((suggestedAmount) => (
              <button
                key={suggestedAmount}
                type="button"
                onClick={() => handleAmountSuggestion(suggestedAmount)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  transferAmount === suggestedAmount
                    ? transferType === 'send'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-green-600 border-green-600 text-white shadow-sm'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
                disabled={isProcessing}
              >
                ${suggestedAmount}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium">$</span>
            </div>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              max="10000"
              className="w-full pl-8 pr-4 py-3 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Description (Optional) */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-900">
            Message (optionnel)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              transferType === 'send' 
                ? "Ex: Pour le dîner, Remboursement, Cadeau..."
                : "Ex: Pour le dîner, Urgence, Remboursement..."
            }
            rows={3}
            className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isProcessing}
          />
        </div>

        {/* Transaction Summary */}
        {transferAmount > 0 && recipient && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-400" />
              Récapitulatif
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {transferType === 'send' ? 'Destinataire:' : 'Demandé à:'}
                </span>
                <span className="font-medium text-gray-900">
                  {recipient.username}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Montant:</span>
                <span className="font-semibold text-gray-900">{transferAmount.toFixed(2)}$</span>
              </div>
              
              {transferType === 'send' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Frais:</span>
                    <span className="text-green-600 font-semibold">Gratuit</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Total déduit:</span>
                    <span className="text-lg font-bold text-gray-900">{transferAmount.toFixed(2)}$</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Nouveau solde:</span>
                    <span className={`text-sm font-medium ${
                      (currentUser?.balance || 0 - transferAmount) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((currentUser?.balance || 0) - transferAmount).toFixed(2)}$
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={getButtonDisabledState()}
          className={`w-full bg-gradient-to-r ${buttonConfig.gradient} text-white py-3 px-4 rounded-lg hover:${buttonConfig.hoverGradient} transition-all duration-200 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02]`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {buttonConfig.loadingLabel}
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ActionIcon className="h-4 w-4 mr-2" />
              {buttonConfig.label}
            </div>
          )}
        </button>
      </form>
    </div>
  )
}

// Icon Components
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}

function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
    </svg>
  )
}

function DocumentTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
    </svg>
  )
}

function PaperAirplaneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  )
}

function HandRaisedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.5 1.875a1.125 1.125 0 012.25 0v8.219c.517.162 1.02.382 1.5.659V3.375a1.125 1.125 0 012.25 0v10.937a4.505 4.505 0 00-3.25 2.373 8.963 8.963 0 014-.935A.75.75 0 0018 15v-2.266a3.368 3.368 0 01.988-2.37 1.125 1.125 0 011.591 1.59 1.118 1.118 0 00-.329.79v3.006h-.005a6 6 0 01-1.752 4.007l-1.736 1.736a6 6 0 01-4.242 1.757H10.5a7.5 7.5 0 01-7.5-7.5V6.375a1.125 1.125 0 012.25 0v5.519c.46-.452.965-.832 1.5-1.141V3.375a1.125 1.125 0 012.25 0v6.526c.495-.1.997-.151 1.5-.151V1.875z" />
    </svg>
  )
}
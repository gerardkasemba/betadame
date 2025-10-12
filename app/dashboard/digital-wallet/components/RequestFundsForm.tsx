// app/dashboard/digital-wallet/components/RequestFundsForm.tsx
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

interface RequestFundsFormProps {
  currentUser: UserProfile | null
  onRequestCreated: () => void
}

export default function RequestFundsForm({ currentUser, onRequestCreated }: RequestFundsFormProps) {
  const [recipientUsername, setRecipientUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [recipient, setRecipient] = useState<UserProfile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchingUser, setSearchingUser] = useState(false)
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

  const handleRequestFunds = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      const requestAmount = parseFloat(amount)
      
      // Validations
      if (!recipient || !currentUser) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Destinataire non valide',
          duration: 5000
        })
        return
      }

      if (isNaN(requestAmount) || requestAmount <= 0) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Montant invalide',
          duration: 5000
        })
        return
      }

      if (currentUser.id === recipient.id) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Vous ne pouvez pas vous demander de l\'argent à vous-même',
          duration: 5000
        })
        return
      }

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
      setAmount('')
      setDescription('')
      setRecipient(null)
      setRecipientUsername('')
      onRequestCreated()

    } catch (error) {
      console.error('Error requesting funds:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'La demande a échoué. Veuillez réessayer.',
        duration: 5000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getUsernameStatus = () => {
    if (!recipientUsername.trim()) return null
    if (searchingUser) return { type: 'loading', text: 'Recherche du destinataire...' } as const
    if (recipientUsername.trim().length < 3) return { type: 'info', text: 'Entrez au moins 3 caractères' } as const
    if (recipient) return { type: 'success', text: `Destinataire trouvé: ${recipient.username}` } as const
    return { type: 'error', text: 'Utilisateur non trouvé' } as const
  }

  const usernameStatus = getUsernameStatus()
  const requestAmount = parseFloat(amount) || 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Demander de l'argent</h3>
      
      <form onSubmit={handleRequestFunds} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="requestRecipientUsername" className="block text-sm font-semibold text-gray-900">
            À qui demandez-vous ?
          </label>
          <div className="relative">
            <input
              type="text"
              id="requestRecipientUsername"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="ex: john_doe"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
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

        <div className="space-y-3">
          <label htmlFor="requestAmount" className="block text-sm font-semibold text-gray-900">
            Montant demandé ($)
          </label>
          
          <div className="grid grid-cols-3 gap-2">
            {suggestedAmounts.map((suggestedAmount) => (
              <button
                key={suggestedAmount}
                type="button"
                onClick={() => handleAmountSuggestion(suggestedAmount)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  requestAmount === suggestedAmount
                    ? 'bg-green-600 border-green-600 text-white shadow-sm'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600'
                }`}
                disabled={isProcessing}
              >
                ${suggestedAmount}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium">$</span>
            </div>
            <input
              type="number"
              id="requestAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              max="10000"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="requestDescription" className="block text-sm font-semibold text-gray-900">
            Message (optionnel)
          </label>
          <textarea
            id="requestDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Pour le dîner, Remboursement, Urgence..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            disabled={isProcessing}
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing || !recipient || requestAmount <= 0}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Envoi en cours...' : 'Demander les Fonds'}
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
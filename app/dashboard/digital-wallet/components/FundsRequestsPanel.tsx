// app/dashboard/digital-wallet/components/FundsRequestsPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'

interface FundsRequest {
  id: string
  requester_id: string
  recipient_id: string
  amount: number
  description: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  reference: string
  metadata: {
    requester_username: string
    recipient_username: string
  }
  created_at: string
  expires_at: string
  profiles: {
    username: string
    avatar_url?: string
  }
}

interface FundsRequestsPanelProps {
  currentUser: {
    id: string
    balance: number
  } | null
  isOpen: boolean
  onClose: () => void
  onBalanceUpdate: () => void
}

type RequestTab = 'incoming' | 'outgoing'

export default function FundsRequestsPanel({
  currentUser,
  isOpen,
  onClose,
  onBalanceUpdate,
}: FundsRequestsPanelProps) {
  const [incomingRequests, setIncomingRequests] = useState<FundsRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FundsRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RequestTab>('incoming')
  const [isAnimating, setIsAnimating] = useState(false)

  const supabase = createClient()
  const { addToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      if (currentUser) {
        fetchAllRequests()
        const unsubscribe = setupRealtimeSubscription()
        return unsubscribe
      }
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentUser])

  const fetchAllRequests = async () => {
    if (!currentUser) return

    try {
      setIsLoading(true)

      // Fetch incoming requests (requests made to current user)
      const { data: incomingData, error: incomingError } = await supabase
        .from('funds_requests')
        .select(`
          *,
          profiles:requester_id(username, avatar_url)
        `)
        .eq('recipient_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (incomingError) throw incomingError

      // Fetch outgoing requests (requests made by current user)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('funds_requests')
        .select(`
          *,
          profiles:recipient_id(username, avatar_url)
        `)
        .eq('requester_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (outgoingError) throw outgoingError

      setIncomingRequests(incomingData || [])
      setOutgoingRequests(outgoingData || [])
    } catch (error) {
      console.error('Error fetching funds requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel('funds-requests-changes')

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'funds_requests',
        filter: `recipient_id=eq.${currentUser?.id}`,
      },
      () => {
        fetchAllRequests()
      }
    )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'funds_requests',
        filter: `requester_id=eq.${currentUser?.id}`,
      },
      () => {
        fetchAllRequests()
      }
    )

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const handleAcceptRequest = async (request: FundsRequest) => {
    if (!currentUser) return

    setProcessingRequest(request.id)

    try {
      // First, check if user has sufficient balance
      if ((currentUser.balance || 0) < request.amount) {
        addToast({
          type: 'error',
          title: 'Solde Insuffisant',
          message: `Vous n'avez pas assez de fonds pour accepter cette demande`,
          duration: 5000,
        })
        setProcessingRequest(null)
        return
      }

      // Step 1: Get current balances to ensure we have latest data
      const { data: senderData, error: senderFetchError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.id)
        .single()

      if (senderFetchError) throw new Error('Failed to fetch your current balance')

      const { data: requesterData, error: requesterFetchError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', request.requester_id)
        .single()

      if (requesterFetchError) throw new Error('Failed to fetch recipient balance')

      // Double-check balance
      const currentBalance = senderData.balance || 0
      if (currentBalance < request.amount) {
        addToast({
          type: 'error',
          title: 'Solde Insuffisant',
          message: `Vous n'avez pas assez de fonds pour accepter cette demande`,
          duration: 5000,
        })
        setProcessingRequest(null)
        return
      }

      // Step 2: Update balances (deduct from sender)
      const { error: senderBalanceError } = await supabase
        .from('profiles')
        .update({
          balance: currentBalance - request.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)

      if (senderBalanceError) {
        console.error('Error updating sender balance:', senderBalanceError)
        throw new Error('Failed to deduct funds from your account')
      }

      // Step 3: Update balances (add to requester)
      const { error: requesterBalanceError } = await supabase
        .from('profiles')
        .update({
          balance: (requesterData.balance || 0) + request.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.requester_id)

      if (requesterBalanceError) {
        console.error('Error updating requester balance:', requesterBalanceError)
        // Rollback sender balance
        await supabase.from('profiles').update({ balance: currentBalance }).eq('id', currentUser.id)
        throw new Error('Failed to add funds to recipient account')
      }

      // Step 4: Update the funds request status
      const { error: updateError } = await supabase
        .from('funds_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id)

      if (updateError) {
        console.error('Error updating request status:', updateError)
        // Rollback both balances
        await supabase.from('profiles').update({ balance: currentBalance }).eq('id', currentUser.id)
        await supabase.from('profiles').update({ balance: requesterData.balance }).eq('id', request.requester_id)
        throw new Error('Failed to update request status')
      }

      // Step 5: Create transaction records
      const reference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

      // Create sender transaction
      const { error: sendTxError } = await supabase.from('transactions').insert({
        user_id: currentUser.id,
        type: 'transfer_send',
        amount: request.amount,
        status: 'completed',
        reference: reference,
        description: request.description || `Transfert à ${request.metadata.requester_username}`,
        metadata: {
          recipient_id: request.requester_id,
          recipient_username: request.metadata.requester_username,
          transfer_type: 'funds_request',
          funds_request_id: request.id,
        },
      })

      if (sendTxError) {
        console.error('Error creating sender transaction:', sendTxError)
      }

      // Create receiver transaction
      const { error: receiveTxError } = await supabase.from('transactions').insert({
        user_id: request.requester_id,
        type: 'transfer_receive',
        amount: request.amount,
        status: 'completed',
        reference: `${reference}-RECV`,
        description: request.description || `Transfert de ${request.metadata.recipient_username}`,
        metadata: {
          sender_id: currentUser.id,
          sender_username: request.metadata.recipient_username,
          transfer_type: 'funds_request',
          funds_request_id: request.id,
        },
      })

      if (receiveTxError) {
        console.error('Error creating receiver transaction:', receiveTxError)
      }

      // Step 6: Update UI and show success
      addToast({
        type: 'success',
        title: 'Demande Acceptée! ✅',
        message: `Vous avez envoyé ${request.amount.toFixed(2)}$ à ${request.metadata.requester_username}`,
        amount: request.amount,
        duration: 5000,
      })

      // Refresh balance in parent component
      onBalanceUpdate()

      // Refresh requests list
      await fetchAllRequests()
    } catch (error) {
      console.error('Error accepting funds request:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : "Impossible d'accepter la demande",
        duration: 5000,
      })
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId)

    try {
      const { error } = await supabase.from('funds_requests').update({ status: 'rejected' }).eq('id', requestId)

      if (error) throw error

      addToast({
        type: 'info',
        title: 'Demande Refusée',
        message: 'La demande de fonds a été refusée',
        duration: 3000,
      })
    } catch (error) {
      console.error('Error rejecting funds request:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de refuser la demande',
        duration: 5000,
      })
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    setProcessingRequest(requestId)

    try {
      const { error } = await supabase.from('funds_requests').update({ status: 'cancelled' }).eq('id', requestId)

      if (error) throw error

      addToast({
        type: 'info',
        title: 'Demande Annulée',
        message: 'Votre demande de fonds a été annulée',
        duration: 3000,
      })
    } catch (error) {
      console.error('Error cancelling funds request:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: "Impossible d'annuler la demande",
        duration: 5000,
      })
    } finally {
      setProcessingRequest(null)
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return 'Expirée'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente'
      case 'accepted':
        return 'Acceptée'
      case 'rejected':
        return 'Refusée'
      case 'cancelled':
        return 'Annulée'
      default:
        return status
    }
  }

  const currentRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests
  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'pending').length
  const pendingOutgoingCount = outgoingRequests.filter((r) => r.status === 'pending').length

  if (!isOpen && !isAnimating) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with fade animation */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel with slide animation - 25% width on desktop, full screen on mobile */}
      <div
        className={`absolute right-0 top-0 h-full w-full md:w-1/4 md:min-w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Demandes de Fonds</h2>
              <p className="text-sm text-gray-600 mt-1">Gérez vos demandes d'argent</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm"
            >
              <XIcon className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 py-4 text-center font-medium transition-all duration-200 relative ${
                activeTab === 'incoming' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center">
                Reçues
                {pendingIncomingCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-6 animate-pulse">
                    {pendingIncomingCount}
                  </span>
                )}
              </span>
              {activeTab === 'incoming' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 transition-all duration-200"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex-1 py-4 text-center font-medium transition-all duration-200 relative ${
                activeTab === 'outgoing' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center">
                Envoyées
                {pendingOutgoingCount > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full min-w-6 animate-pulse">
                    {pendingOutgoingCount}
                  </span>
                )}
              </span>
              {activeTab === 'outgoing' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 transition-all duration-200"></div>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : currentRequests.length === 0 ? (
              <div className="text-center text-gray-500 py-12 px-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RequestIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-1">
                  {activeTab === 'incoming' ? 'Aucune demande reçue' : 'Aucune demande envoyée'}
                </p>
                <p className="text-sm">
                  {activeTab === 'incoming'
                    ? 'Les demandes que vous recevez apparaîtront ici'
                    : 'Vos demandes envoyées apparaîtront ici'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {currentRequests.map((request, index) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                          {request.profiles.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{request.profiles.username}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(request.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{request.amount.toFixed(2)}$</p>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {getStatusText(request.status)}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {request.description && (
                      <p className="text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-3">{request.description}</p>
                    )}

                    {/* Actions & Info */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {request.status === 'pending' && (
                          <span className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            Expire dans {getTimeRemaining(request.expires_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {activeTab === 'incoming' && request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptRequest(request)}
                              disabled={processingRequest === request.id || (currentUser?.balance || 0) < request.amount}
                              className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:scale-105 active:scale-95"
                            >
                              {processingRequest === request.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-2" />
                              ) : (
                                'Accepter'
                              )}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={processingRequest === request.id}
                              className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:scale-105 active:scale-95"
                            >
                              {processingRequest === request.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-2" />
                              ) : (
                                'Refuser'
                              )}
                            </button>
                          </>
                        )}
                        {activeTab === 'outgoing' && request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:scale-105 active:scale-95"
                          >
                            {processingRequest === request.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-2" />
                            ) : (
                              'Annuler'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="grid grid-cols-2 gap-4 text-center text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-900">{pendingIncomingCount}</p>
                <p>En attente</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{incomingRequests.length + outgoingRequests.length}</p>
                <p>Total demandes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}

// Icon Components
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RequestIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.5 1.875a1.125 1.125 0 012.25 0v8.219c.517.162 1.02.382 1.5.659V3.375a1.125 1.125 0 012.25 0v10.937a4.505 4.505 0 00-3.25 2.373 8.963 8.963 0 014-.935A.75.75 0 0018 15v-2.266a3.368 3.368 0 01.988-2.37 1.125 1.125 0 011.591 1.59 1.118 1.118 0 00-.329.79v3.006h-.005a6 6 0 01-1.752 4.007l-1.736 1.736a6 6 0 01-4.242 1.757H10.5a7.5 7.5 0 01-7.5-7.5V6.375a1.125 1.125 0 012.25 0v5.519c.46-.452.965-.832 1.5-1.141V3.375a1.125 1.125 0 012.25 0v6.526c.495-.1.997-.151 1.5-.151V1.875z" />
    </svg>
  )
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}
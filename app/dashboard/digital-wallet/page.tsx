// app/dashboard/digital-wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BalanceCard from './components/BalanceCard'
import TransferForm from './components/TransferForm'
import FundsRequestsPanel from './components/FundsRequestsPanel'
import ActionButtons from './components/ActionButtons'

interface UserProfile {
  id: string
  username: string
  balance: number
  avatar_url?: string
}

export default function DigitalWalletPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [sendAmount, setSendAmount] = useState(0)
  const [isRequestsPanelOpen, setIsRequestsPanelOpen] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [hasNewRequest, setHasNewRequest] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCurrentUser()
    fetchPendingRequestsCount()
    
    // Set up real-time subscriptions
    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Subscribe to profile changes (balance updates)
      const profileSubscription = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload.new)
            setCurrentUser(payload.new as UserProfile)
          }
        )
        .subscribe()

      // Subscribe to funds requests (new requests and status changes)
      const fundsRequestsSubscription = supabase
        .channel('funds-requests')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'funds_requests',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New funds request received:', payload)
            // Show new request notification
            setHasNewRequest(true)
            fetchPendingRequestsCount()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'funds_requests',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Funds request updated:', payload)
            fetchPendingRequestsCount()
            
            // If a request was updated and current user is the sender, refresh balance
            if (payload.old.sender_id === user.id && payload.new.status === 'accepted') {
              fetchCurrentUser()
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'funds_requests',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            fetchPendingRequestsCount()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'funds_requests',
            filter: `sender_id=eq.${user.id}`
          },
          () => {
            // Refresh balance when user sends a new request
            fetchCurrentUser()
          }
        )
        .subscribe()

      // Subscribe to transfers (both sent and received)
      const transfersSubscription = supabase
        .channel('transfers')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transfers',
            filter: `from_id=eq.${user.id}`
          },
          () => {
            console.log('Transfer sent - refreshing balance')
            fetchCurrentUser()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transfers',
            filter: `to_id=eq.${user.id}`
          },
          () => {
            console.log('Transfer received - refreshing balance')
            fetchCurrentUser()
          }
        )
        .subscribe()

      return () => {
        profileSubscription.unsubscribe()
        fundsRequestsSubscription.unsubscribe()
        transfersSubscription.unsubscribe()
      }
    }

    const cleanup = setupSubscriptions()

    return () => {
      cleanup.then((unsubscribe) => unsubscribe?.())
    }
  }, [])

  // Reset new request notification when panel opens
  useEffect(() => {
    if (isRequestsPanelOpen && hasNewRequest) {
      setHasNewRequest(false)
    }
  }, [isRequestsPanelOpen, hasNewRequest])

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, balance, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setCurrentUser(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchPendingRequestsCount = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('funds_requests')
        .select('id', { count: 'exact' })
        .eq('recipient_id', currentUser.id)
        .eq('status', 'pending')

      if (error) throw error
      setPendingRequestsCount(data?.length || 0)
    } catch (error) {
      console.error('Error fetching pending requests count:', error)
    }
  }

  const handleBalanceUpdate = () => {
    fetchCurrentUser()
  }

  const handleRequestCreated = () => {
    fetchPendingRequestsCount()
  }

  const handleOpenRequestsPanel = () => {
    // Reset new request notification when opening the panel
    setHasNewRequest(false)
    setIsRequestsPanelOpen(true)
  }

  return (
    <div className="bg-gray-50 py-0">
      <div className="max-w-7xl mx-auto px-4 md:px-0">
        {/* Balance Card */}
        <BalanceCard currentUser={currentUser} sendAmount={sendAmount} />

        {/* Action Buttons */}
        <ActionButtons 
          onRequestFundsClick={handleOpenRequestsPanel}
          pendingRequestsCount={pendingRequestsCount}
          hasNewRequest={hasNewRequest}
        />

        {/* Combined Transfer Form */}
        <TransferForm
          currentUser={currentUser}
          onBalanceUpdate={handleBalanceUpdate}
          onRequestCreated={handleRequestCreated}
        />

        {/* Real-time Status Indicator */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Mises à jour en temps réel activées</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-800 font-medium">
                Les transferts sont instantanés et irréversibles. Vérifiez soigneusement le destinataire et le montant avant de confirmer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Funds Requests Panel */}
      <FundsRequestsPanel
        currentUser={currentUser}
        isOpen={isRequestsPanelOpen}
        onClose={() => setIsRequestsPanelOpen(false)}
        onBalanceUpdate={handleBalanceUpdate}
      />
    </div>
  )
}

// Add the ShieldCheckIcon component
function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}
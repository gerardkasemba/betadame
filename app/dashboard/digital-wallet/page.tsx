// app/dashboard/digital-wallet/page.tsx (simplified)
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

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCurrentUser()
    fetchPendingRequestsCount()
  }, [])

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

  return (
    <div className="bg-gray-50 py-0">
      <div className="max-w-7xl mx-auto px-4 md:px-0">
        {/* Balance Card */}
        <BalanceCard currentUser={currentUser} sendAmount={sendAmount} />

        {/* Action Buttons */}
        <ActionButtons 
          onRequestFundsClick={() => setIsRequestsPanelOpen(true)}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Combined Transfer Form */}
        <TransferForm
          currentUser={currentUser}
          onBalanceUpdate={handleBalanceUpdate}
          onRequestCreated={handleRequestCreated}
        />

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
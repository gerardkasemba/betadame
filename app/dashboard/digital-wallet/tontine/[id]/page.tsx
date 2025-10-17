// app/dashboard/digital-wallet/tontine/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Bell,
  Share2,
  UserPlus,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Settings,
  Download,
  Mail,
  Phone,
  UserCheck,
  Wallet
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TontineGroup {
  id: string
  name: string
  description: string
  target_amount: number
  contribution_amount: number
  duration_weeks: number
  payment_schedule: 'weekly' | 'bi-weekly' | 'monthly'
  status: 'active' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
}

interface TontineMember {
  id: string
  user_id: string
  position: number
  status: 'active' | 'left' | 'removed'
  joined_at: string
  profile: {
    id: string
    username?: string
    email?: string
    phone_number?: string
  }
}

interface TontineCycle {
  id: string
  cycle_number: number
  due_date: string
  status: 'pending' | 'active' | 'completed'
}

interface TontineContribution {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'paid' | 'missed'
  paid_at: string | null
  profile: {
    id: string
    username?: string
    email?: string
  }
}

interface TontinePayout {
  id: string
  cycle_id: string
  recipient_id: string
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
  paid_at: string | null
  profile: {
    id: string
    username?: string
    email?: string
  }
  tontine_cycles: {
    cycle_number: number
  }
}

interface TontineInvitation {
  id: string
  phone_number: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  invited_by: string
  expires_at: string
  created_at: string
  profile: {
    id: string
    username?: string
    email?: string
  }
}

export default function TontineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [tontine, setTontine] = useState<TontineGroup | null>(null)
  const [members, setMembers] = useState<TontineMember[]>([])
  const [contributions, setContributions] = useState<TontineContribution[]>([])
  const [cycles, setCycles] = useState<TontineCycle[]>([])
  const [payouts, setPayouts] = useState<TontinePayout[]>([])
  const [invitations, setInvitations] = useState<TontineInvitation[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invitations' | 'contributions' | 'payouts'>('overview')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveRequest, setLeaveRequest] = useState<any>(null)

  const tontineId = params.id as string

  useEffect(() => {
    fetchTontineData()
    setupRealtimeSubscription()
  }, [tontineId])

  // Helper function to get display name from profile
  const getDisplayName = (profile: any): string => {
    if (!profile) return 'Membre inconnu'
    if (profile.username) return profile.username
    if (profile.email) return profile.email
    return 'Membre inconnu'
  }

  // Helper function to get initials from profile
  const getInitials = (profile: any): string => {
    const name = getDisplayName(profile)
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const fetchTontineData = async () => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      // Fetch user's current balance
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        setUserBalance(userProfile.balance || 0)
      }

      // Fetch tontine group
      const { data: tontineData, error: tontineError } = await supabase
        .from('tontine_groups')
        .select('*')
        .eq('id', tontineId)
        .single()

      if (tontineError) throw tontineError
      setTontine(tontineData)

      // Fetch members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('tontine_members')
        .select(`
          *,
          profiles!tontine_members_user_id_fkey (
            id,
            username,
            email,
            phone_number
          )
        `)
        .eq('tontine_group_id', tontineId)
        .eq('status', 'active')
        .order('position', { ascending: true })

      if (membersError) throw membersError
      
      // Transform the data to match our interface
      const transformedMembers: TontineMember[] = (membersData || []).map(member => ({
        ...member,
        profile: member.profiles || {}
      }))
      setMembers(transformedMembers)

      // Fetch current cycle
      const { data: currentCycle } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('tontine_group_id', tontineId)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single()

      // Fetch contributions for current cycle
      if (currentCycle) {
        const { data: contributionsData, error: contributionsError } = await supabase
          .from('tontine_contributions')
          .select(`
            *,
            profiles!tontine_contributions_user_id_fkey (
              id,
              username,
              email
            )
          `)
          .eq('cycle_id', currentCycle.id)
          .order('created_at', { ascending: false })

        if (contributionsError) throw contributionsError
        
        const transformedContributions: TontineContribution[] = (contributionsData || []).map(contribution => ({
          ...contribution,
          profile: contribution.profiles || {}
        }))
        setContributions(transformedContributions)
      }

      // Fetch all cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('tontine_group_id', tontineId)
        .order('cycle_number', { ascending: true })

      if (cyclesError) throw cyclesError
      setCycles(cyclesData || [])

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('tontine_payouts')
        .select(`
          *,
          profiles!tontine_payouts_recipient_id_fkey (
            id,
            username,
            email
          ),
          tontine_cycles (
            cycle_number
          )
        `)
        .eq('tontine_group_id', tontineId)
        .order('created_at', { ascending: false })

      if (payoutsError) throw payoutsError
      
      const transformedPayouts: TontinePayout[] = (payoutsData || []).map(payout => ({
        ...payout,
        profile: payout.profiles || {},
        tontine_cycles: payout.tontine_cycles || { cycle_number: 0 }
      }))
      setPayouts(transformedPayouts)

      // Fetch invitations (only for admin)
      if (tontineData.created_by === user.id) {
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('tontine_invitations')
          .select(`
            *,
            profiles!tontine_invitations_invited_by_fkey (
              id,
              username,
              email
            )
          `)
          .eq('tontine_group_id', tontineId)
          .order('created_at', { ascending: false })

        if (invitationsError) throw invitationsError
        
        const transformedInvitations: TontineInvitation[] = (invitationsData || []).map(invitation => ({
          ...invitation,
          profile: invitation.profiles || {}
        }))
        setInvitations(transformedInvitations)
      }

    } catch (error) {
      console.error('Error fetching tontine data:', error)
    } finally {
      setIsLoading(false)
    }
  }

    // Determine if user can leave
    const canRequestLeave = () => {
    // Can't leave if user is admin
    if (isUserAdmin) return { allowed: false, reason: "L'administrateur ne peut pas quitter le groupe" }

    // Can't leave if already has pending request
    if (leaveRequest && leaveRequest.status === 'pending') {
        return { allowed: false, reason: "Vous avez déjà une demande de départ en attente" }
    }

    // Check if user has received their payout
    const userHasReceivedPayout = payouts.some(p => 
        p.recipient_id === currentUser?.id && p.status === 'paid'
    )

    if (!userHasReceivedPayout) {
        return { 
        allowed: false, 
        reason: "Vous devez attendre de recevoir votre paiement avant de pouvoir partir" 
        }
    }

    // Check if user still needs to contribute
    const currentCycle = cycles.find(c => c.status === 'active')
    if (currentCycle) {
        const userHasPaid = contributions.some(c => 
        c.user_id === currentUser?.id && 
        c.cycle_id === currentCycle.id && 
        c.status === 'paid'
        )

        if (!userHasPaid) {
        return { 
            allowed: false, 
            reason: "Vous devez payer votre cotisation pour le cycle en cours avant de demander à partir" 
        }
        }
    }

    // Check if all members have been paid (cycle complete)
    const allMembersHaveBeenPaid = members.every(member =>
        payouts.some(p => p.recipient_id === member.user_id && p.status === 'paid')
    )

    if (!allMembersHaveBeenPaid) {
        const currentCycleNum = cycles.find(c => c.status === 'active')?.cycle_number || 0
        return {
        allowed: true,
        scheduledDeparture: true,
        effectiveAfterCycle: Math.max(...members.map(m => m.position)), // After all have been paid
        message: `Votre départ sera effectif après que tous les membres aient reçu leur paiement (fin du cycle ${Math.max(...members.map(m => m.position))})`
        }
    }

    return { allowed: true, immediate: true }
    }

    const handleLeaveRequest = async () => {
    if (!currentUser || !tontine) return

    const leaveCheck = canRequestLeave()
    
    if (!leaveCheck.allowed) {
        alert(leaveCheck.reason)
        return
    }

    try {
        if (leaveCheck.immediate) {
        // Immediate leave - tontine is complete
        const { error } = await supabase
            .from('tontine_members')
            .update({ 
            status: 'left',
            left_at: new Date().toISOString()
            })
            .eq('tontine_group_id', tontineId)
            .eq('user_id', currentUser.id)

        if (error) throw error

        alert('Vous avez quitté la tontine avec succès!')
        router.push('/dashboard/digital-wallet/tontine')
        } else if (leaveCheck.scheduledDeparture) {
        // Schedule departure after cycle completes
        const { error } = await supabase
            .from('tontine_leave_requests')
            .insert({
            tontine_group_id: tontineId,
            user_id: currentUser.id,
            effective_after_cycle: leaveCheck.effectiveAfterCycle,
            status: 'pending'
            })

        if (error) throw error

        alert(leaveCheck.message)
        fetchLeaveRequest()
        setShowLeaveModal(false)
        }
    } catch (error) {
        console.error('Error requesting leave:', error)
        alert('Erreur lors de la demande de départ')
    }
    }

    const handleCancelLeaveRequest = async () => {
    if (!leaveRequest) return

    try {
        const { error } = await supabase
        .from('tontine_leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', leaveRequest.id)

        if (error) throw error

        alert('Demande de départ annulée')
        setLeaveRequest(null)
    } catch (error) {
        console.error('Error cancelling leave request:', error)
        alert('Erreur lors de l\'annulation')
    }
    }

    // Check if user has pending leave request
    const fetchLeaveRequest = async () => {
    if (!currentUser) return

    const { data } = await supabase
        .from('tontine_leave_requests')
        .select('*')
        .eq('tontine_group_id', tontineId)
        .eq('user_id', currentUser.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle()

    setLeaveRequest(data)
    }

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel(`tontine-${tontineId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tontine_contributions',
          filter: `tontine_group_id=eq.${tontineId}`
        },
        () => {
          fetchTontineData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tontine_members',
          filter: `tontine_group_id=eq.${tontineId}`
        },
        () => {
          fetchTontineData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tontine_invitations',
          filter: `tontine_group_id=eq.${tontineId}`
        },
        () => {
          fetchTontineData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tontine_payouts',
          filter: `tontine_group_id=eq.${tontineId}`
        },
        () => {
          fetchTontineData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const handleMakePayment = async () => {
    if (!tontine || !currentUser) return

    setIsProcessingPayment(true)

    try {
      const currentCycle = cycles.find(cycle => cycle.status === 'active')
      if (!currentCycle) {
        alert('Aucun cycle actif pour le moment')
        return
      }

      // Check if user has already paid for this cycle
      const existingContribution = contributions.find(
        c => c.user_id === currentUser.id && c.status === 'paid'
      )
      if (existingContribution) {
        alert('Vous avez déjà payé pour ce cycle')
        return
      }

      // Check if user has sufficient balance
      if (userBalance < tontine.contribution_amount) {
        alert(`Solde insuffisant. Vous avez ${userBalance.toFixed(0)} FC mais il faut ${tontine.contribution_amount.toFixed(0)} FC`)
        return
      }

      // 1. Deduct from user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: userBalance - tontine.contribution_amount 
        })
        .eq('id', currentUser.id)

      if (balanceError) throw balanceError

      // 2. Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          type: 'tontine_contribution',
          amount: -tontine.contribution_amount, // Negative for deduction
          status: 'completed',
          description: `Cotisation tontine: ${tontine.name} - Cycle ${currentCycle.cycle_number}`,
          reference: `TONTINE_${tontineId}_CYCLE_${currentCycle.cycle_number}_${Date.now()}`,
          metadata: {
            tontine_group_id: tontineId,
            cycle_id: currentCycle.id,
            cycle_number: currentCycle.cycle_number
          }
        })
        .select()
        .single()

      if (transactionError) {
        // Rollback balance
        await supabase
          .from('profiles')
          .update({ balance: userBalance })
          .eq('id', currentUser.id)
        throw transactionError
      }

      // 3. Record contribution
      const { error: contributionError } = await supabase
        .from('tontine_contributions')
        .insert({
          tontine_group_id: tontineId,
          cycle_id: currentCycle.id,
          user_id: currentUser.id,
          amount: tontine.contribution_amount,
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id: transaction.id
        })

      if (contributionError) {
        // Rollback balance and transaction
        await supabase
          .from('profiles')
          .update({ balance: userBalance })
          .eq('id', currentUser.id)
        
        await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id)
        
        throw contributionError
      }

      alert('Paiement effectué avec succès!')
      fetchTontineData()
    } catch (error) {
      console.error('Error making payment:', error)
      alert('Erreur lors du paiement. Veuillez réessayer.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const getProgressPercentage = () => {
    if (!tontine) return 0
    const totalPaid = contributions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0)
    return (totalPaid / tontine.target_amount) * 100
  }

  const getNextPayoutMember = () => {
    return members.find(member => 
      !payouts.some(payout => 
        payout.recipient_id === member.user_id && payout.status === 'paid'
      )
    )
  }

  const hasUserPaidThisCycle = () => {
    if (!currentUser) return false
    return contributions.some(c => 
      c.user_id === currentUser.id && c.status === 'paid'
    )
  }

  const isUserAdmin = tontine?.created_by === currentUser?.id
  const pendingInvitationsCount = invitations.filter(inv => inv.status === 'pending').length

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!tontine) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tontine non trouvée</h2>
          <p className="text-gray-600 mb-6">La tontine que vous recherchez n'existe pas ou vous n'y avez pas accès.</p>
          <button
            onClick={() => router.push('/dashboard/digital-wallet/tontine')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour aux tontines
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/digital-wallet/tontine')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{tontine.name}</h1>
            <p className="text-gray-600 text-sm lg:text-base">{tontine.description}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="bg-gray-200 text-gray-800 px-3 lg:px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center text-sm">
            <Share2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          {isUserAdmin && (
            <button className="bg-primary text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Gérer</span>
            </button>
          )}
        </div>
      </div>
        {!isUserAdmin && (
        <button 
            onClick={() => setShowLeaveModal(true)}
            className="bg-red-100 text-red-800 mb-2 px-3 lg:px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center text-sm"
        >
            <XCircle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Quitter</span>
        </button>
        )}

        {leaveRequest && leaveRequest.status === 'pending' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center justify-between">
            <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                <div>
                <p className="text-yellow-800 font-medium">
                    Demande de départ programmée
                </p>
                <p className="text-yellow-700 text-sm">
                    Vous quitterez ce groupe après le cycle {leaveRequest.effective_after_cycle}
                </p>
                </div>
            </div>
            <button
                onClick={handleCancelLeaveRequest}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
            >
                Annuler la demande
            </button>
            </div>
        </div>
        )}
      {/* User Balance Display */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-4 lg:p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Votre Solde Disponible</p>
              <p className="text-2xl lg:text-3xl font-bold">{userBalance.toFixed(0)} FC</p>
            </div>
          </div>
          {tontine.contribution_amount > userBalance && (
            <div className="bg-red-500/20 px-3 py-2 rounded-lg">
              <p className="text-xs lg:text-sm">Solde insuffisant</p>
            </div>
          )}
        </div>
      </div>
        {showLeaveModal && (
        <LeaveModal
            onClose={() => setShowLeaveModal(false)}
            onConfirm={handleLeaveRequest}
            leaveCheck={canRequestLeave()}
        />
        )}
      {/* Progress Overview */}
      <div className="bg-white rounded-2xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Montant Collecté</p>
            <p className="text-lg lg:text-2xl font-bold text-gray-900">
              {contributions
                .filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + c.amount, 0)
                .toFixed(0)} FC
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Objectif</p>
            <p className="text-lg lg:text-2xl font-bold text-gray-900">{tontine.target_amount.toFixed(0)} FC</p>
          </div>
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Membres</p>
            <p className="text-lg lg:text-2xl font-bold text-gray-900">{members.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs lg:text-sm text-gray-600">Cycle Actuel</p>
            <p className="text-lg lg:text-2xl font-bold text-gray-900">
              {cycles.find(c => c.status === 'active')?.cycle_number || 0}/{tontine.duration_weeks}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs lg:text-sm text-gray-600 mb-2">
            <span>Progression globale</span>
            <span>{getProgressPercentage().toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 lg:h-3">
            <div 
              className="bg-green-500 h-2 lg:h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(getProgressPercentage(), 100)}%` }}
            />
          </div>
        </div>

        {/* Next Payout Info */}
        {getNextPayoutMember() && (
          <div className="bg-blue-50 rounded-lg p-3 lg:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium">
                  Prochain bénéficiaire: {getDisplayName(getNextPayoutMember()?.profile)}
                </p>
                <p className="text-xs text-blue-600">
                  Position #{getNextPayoutMember()?.position} • 
                  Cotisation: {tontine.contribution_amount.toFixed(0)} FC
                </p>
                {hasUserPaidThisCycle() && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ✓ Vous avez déjà payé pour ce cycle
                  </p>
                )}
              </div>
              <button
                onClick={handleMakePayment}
                disabled={isProcessingPayment || hasUserPaidThisCycle() || userBalance < tontine.contribution_amount}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessingPayment ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : hasUserPaidThisCycle() ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Déjà payé
                  </>
                ) : userBalance < tontine.contribution_amount ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Solde insuffisant
                  </>
                ) : (
                  'Payer ma cotisation'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto -mb-px">
            <div className="flex space-x-2 lg:space-x-8 px-4 lg:px-6 min-w-max">
              {[
                { id: 'overview' as const, name: 'Aperçu', icon: TrendingUp },
                { id: 'members' as const, name: 'Membres', icon: Users },
                ...(isUserAdmin ? [
                  { 
                    id: 'invitations' as const, 
                    name: 'Invitations', 
                    icon: UserCheck,
                    badge: pendingInvitationsCount
                  }
                ] : []),
                { id: 'contributions' as const, name: 'Contributions', icon: DollarSign },
                { id: 'payouts' as const, name: 'Paiements', icon: CheckCircle },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 lg:py-4 px-2 lg:px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    {tab.name}
                    {'badge' in tab && tab.badge > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 lg:p-6">
          {activeTab === 'overview' && (
            <OverviewTab 
              tontine={tontine}
              members={members}
              contributions={contributions}
              cycles={cycles}
              payouts={payouts}
              getDisplayName={getDisplayName}
            />
          )}

          {activeTab === 'members' && (
            <MembersTab 
              members={members}
              isUserAdmin={isUserAdmin}
              onInvite={() => setShowInviteModal(true)}
              getDisplayName={getDisplayName}
              getInitials={getInitials}
            />
          )}

          {activeTab === 'invitations' && (
            <InvitationsTab 
              invitations={invitations}
              onRefresh={fetchTontineData}
              getDisplayName={getDisplayName}
            />
          )}

          {activeTab === 'contributions' && (
            <ContributionsTab 
              contributions={contributions}
              currentCycle={cycles.find(c => c.status === 'active')}
              getDisplayName={getDisplayName}
            />
          )}

          {activeTab === 'payouts' && (
            <PayoutsTab 
              payouts={payouts} 
              getDisplayName={getDisplayName}
            />
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal 
          tontine={tontine}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            fetchTontineData()
          }}
        />
      )}
    </div>
  )
}
// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ tontine, members, contributions, cycles, payouts, getDisplayName }: {
  tontine: TontineGroup
  members: TontineMember[]
  contributions: TontineContribution[]
  cycles: TontineCycle[]
  payouts: TontinePayout[]
  getDisplayName: (profile: any) => string
}) {
  const paidContributions = contributions.filter(c => c.status === 'paid')
  const totalCollected = paidContributions.reduce((sum, c) => sum + c.amount, 0)
  const completionRate = members.length > 0 ? (paidContributions.length / members.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Informations du Groupe</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Fréquence de paiement:</span>
              <span className="font-medium capitalize">
                {tontine.payment_schedule === 'weekly' ? 'Hebdomadaire' : 
                 tontine.payment_schedule === 'bi-weekly' ? 'Bimensuelle' : 'Mensuelle'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cotisation par membre:</span>
              <span className="font-medium">{tontine.contribution_amount.toFixed(0)} $</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cycle actuel:</span>
              <span className="font-medium">
                {cycles.find(c => c.status === 'active')?.cycle_number || 0}/{tontine.duration_weeks}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Statut:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                tontine.status === 'active' ? 'bg-green-100 text-green-800' :
                tontine.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {tontine.status === 'active' ? 'Actif' : 
                 tontine.status === 'completed' ? 'Terminé' : 'Annulé'}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Performance</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Taux de participation:</span>
              <span className="font-medium">{completionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total collecté ce cycle:</span>
              <span className="font-medium">{totalCollected.toFixed(0)} $</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paiements effectués:</span>
              <span className="font-medium">{payouts.filter(p => p.status === 'paid').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date de création:</span>
              <span className="font-medium">
                {new Date(tontine.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Activité Récente</h3>
        <div className="space-y-2">
          {contributions.slice(0, 5).map((contribution) => (
            <div key={contribution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  contribution.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm">
                  {getDisplayName(contribution.profile)} a {contribution.status === 'paid' ? 'payé' : 'manqué'} sa cotisation
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {contribution.paid_at ? new Date(contribution.paid_at).toLocaleDateString('fr-FR') : 'En attente'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Members Tab Component
function MembersTab({ members, isUserAdmin, onInvite, getDisplayName, getInitials }: {
  members: TontineMember[]
  isUserAdmin: boolean
  onInvite: () => void
  getDisplayName: (profile: any) => string
  getInitials: (profile: any) => string
}) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h3 className="font-semibold text-gray-900">Membres du Groupe ({members.length})</h3>
        {isUserAdmin && (
          <button
            onClick={onInvite}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm w-full sm:w-auto justify-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un membre
          </button>
        )}
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-sm">
                  {getInitials(member.profile)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{getDisplayName(member.profile)}</p>
                <p className="text-sm text-gray-600">{member.profile.email || 'Aucun email'}</p>
              </div>
            </div>
            <div className="text-right sm:text-left">
              <p className="text-sm font-medium text-gray-900">Position #{member.position}</p>
              <p className="text-xs text-gray-600">
                Membre depuis {new Date(member.joined_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Invitations Tab Component
function InvitationsTab({ invitations, onRefresh, getDisplayName }: {
  invitations: TontineInvitation[]
  onRefresh: () => void
  getDisplayName: (profile: any) => string
}) {
  const supabase = createClient()

  const handleResendInvitation = async (invitationId: string) => {
    try {
      // Update expiration date to 7 days from now
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)

      const { error } = await supabase
        .from('tontine_invitations')
        .update({
          expires_at: newExpiresAt.toISOString(),
          status: 'pending'
        })
        .eq('id', invitationId)

      if (error) throw error

      alert('Invitation renvoyée avec succès!')
      onRefresh()
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Erreur lors du renvoi de l\'invitation')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('tontine_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId)

      if (error) throw error

      alert('Invitation annulée!')
      onRefresh()
    } catch (error) {
      console.error('Error canceling invitation:', error)
      alert('Erreur lors de l\'annulation de l\'invitation')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'accepted': return 'Acceptée'
      case 'rejected': return 'Rejetée'
      case 'expired': return 'Expirée'
      default: return status
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">
          Invitations ({invitations.length})
        </h3>
      </div>

      <div className="space-y-3">
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>Aucune invitation envoyée</p>
          </div>
        ) : (
          invitations.map((invitation) => (
            <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <p className="font-medium text-gray-900">{invitation.phone_number}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                    {getStatusText(invitation.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Invité par: {getDisplayName(invitation.profile)}</p>
                  <p>Expire le: {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {invitation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleResendInvitation(invitation.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      Renvoyer
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
function LeaveModal({ 
  onClose, 
  onConfirm, 
  leaveCheck 
}: { 
  onClose: () => void
  onConfirm: () => void
  leaveCheck: any 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            Quitter la Tontine
          </h3>
        </div>

        <div className="p-6">
          {!leaveCheck.allowed ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{leaveCheck.reason}</p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          ) : leaveCheck.scheduledDeparture ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Important:</strong> Vous ne pouvez pas quitter immédiatement.
                </p>
                <p className="text-blue-700 text-sm">
                  {leaveCheck.message}
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm font-medium mb-2">
                  Que se passe-t-il après confirmation?
                </p>
                <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                  <li>Vous devez continuer à payer vos cotisations</li>
                  <li>Vous recevrez votre paiement comme prévu</li>
                  <li>Vous quitterez automatiquement après le dernier cycle</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Confirmer le départ
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700">
                Êtes-vous sûr de vouloir quitter cette tontine? Cette action est irréversible.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Quitter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// Contributions Tab Component
function ContributionsTab({ contributions, currentCycle, getDisplayName }: {
  contributions: TontineContribution[]
  currentCycle: TontineCycle | undefined
  getDisplayName: (profile: any) => string
}) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <h3 className="font-semibold text-gray-900">
          Contributions {currentCycle && `- Cycle ${currentCycle.cycle_number}`}
        </h3>
        <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center text-sm w-full sm:w-auto justify-center">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </button>
      </div>

      <div className="space-y-3">
        {contributions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune contribution pour ce cycle
          </div>
        ) : (
          contributions.map((contribution) => (
            <div key={contribution.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  contribution.status === 'paid' ? 'bg-green-500' :
                  contribution.status === 'missed' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{getDisplayName(contribution.profile)}</p>
                  <p className="text-sm text-gray-600">
                    {contribution.status === 'paid' ? 'Payé' : 
                     contribution.status === 'missed' ? 'Manqué' : 'En attente'}
                  </p>
                </div>
              </div>
              <div className="text-right sm:text-left">
                <p className="font-medium text-gray-900">{contribution.amount.toFixed(0)} $</p>
                <p className="text-xs text-gray-600">
                  {contribution.paid_at 
                    ? new Date(contribution.paid_at).toLocaleDateString('fr-FR')
                    : 'Non payé'
                  }
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Payouts Tab Component
function PayoutsTab({ payouts, getDisplayName }: { 
  payouts: TontinePayout[] 
  getDisplayName: (profile: any) => string
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Historique des Paiements</h3>
      
      <div className="space-y-3">
        {payouts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun paiement effectué pour le moment
          </div>
        ) : (
          payouts.map((payout) => (
            <div key={payout.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  payout.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{getDisplayName(payout.profile)}</p>
                  <p className="text-sm text-gray-600">
                    Cycle {payout.tontine_cycles.cycle_number} • 
                    {payout.status === 'paid' ? ' Payé' : ' En attente'}
                  </p>
                </div>
              </div>
              <div className="text-right sm:text-left">
                <p className="font-medium text-gray-900">{payout.amount.toFixed(0)} $</p>
                <p className="text-xs text-gray-600">
                  {payout.paid_at 
                    ? new Date(payout.paid_at).toLocaleDateString('fr-FR')
                    : 'En cours'
                  }
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Invite Modal Component
function InviteModal({ tontine, onClose, onSuccess }: {
  tontine: TontineGroup
  onClose: () => void
  onSuccess: () => void
}) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Calculate expiration (7 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase
        .from('tontine_invitations')
        .insert({
          tontine_group_id: tontine.id,
          phone_number: phoneNumber,
          invited_by: user.id,
          expires_at: expiresAt.toISOString()
        })

      if (error) throw error

      onSuccess()
      alert('Invitation envoyée avec succès!')
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Erreur lors de l\'envoi de l\'invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Inviter un Membre</h3>
          <p className="text-sm text-gray-600 mt-1">
            Invitez quelqu'un à rejoindre "{tontine.name}"
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de Téléphone *
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0XX XXX XXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              L'invitation sera envoyée à ce numéro
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
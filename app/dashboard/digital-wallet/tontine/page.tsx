// app/dashboard/digital-wallet/tontine/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Plus, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Eye,
  Settings,
  Bell,
  Share2,
  UserPlus,
  UserCheck,
  X,
  Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Enhanced interfaces
interface Profile {
  id: string
  name: string
}

interface TontineMemberWithProfile {
  position: number
  profiles: Profile | Profile[]
}

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
  members_count: number
  current_cycle: number
  total_collected: number
  next_payout_member?: {
    name: string
    position: number
  }
  next_due_date?: string
  user_role: 'admin' | 'member'
}

interface TontineInvitation {
  id: string
  tontine_group_id: string
  phone_number: string
  invited_by: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  expires_at: string
  created_at: string
  tontine_groups: {
    id: string
    name: string
    description: string
    target_amount: number
    contribution_amount: number
    created_by: string
  }
  profiles?: {
    id: string
    full_name?: string
    first_name?: string
    last_name?: string
  }
}

export default function TontinePage() {
  const [groups, setGroups] = useState<TontineGroup[]>([])
  const [invitations, setInvitations] = useState<TontineInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my-groups' | 'invitations'>('my-groups')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTontineData()
  }, [])

  // Add real-time subscriptions
  useEffect(() => {
    if (groups.length === 0) return

    const channel = supabase
      .channel('tontine-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tontine_groups',
          filter: `id=in.(${groups.map(g => `"${g.id}"`).join(',')})`
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
          filter: `tontine_group_id=in.(${groups.map(g => `"${g.id}"`).join(',')})`
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
          table: 'tontine_contributions',
          filter: `tontine_group_id=in.(${groups.map(g => `"${g.id}"`).join(',')})`
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
          table: 'tontine_invitations'
        },
        () => {
          fetchTontineData()
        }
      )

    return () => {
      channel.unsubscribe()
    }
  }, [groups, supabase])

  const fetchTontineData = async () => {
        try {
            setIsLoading(true)
            
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
            router.push('/auth/login')
            return
            }

            // Fetch groups where user is a member
            const { data: groupsData, error } = await supabase
            .from('tontine_members')
            .select(`
                tontine_groups (*),
                position,
                status
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')

            if (error) throw error

            // Fetch invitations sent to the user's phone number
            const { data: userData } = await supabase
            .from('profiles')
            .select('phone_number, username')
            .eq('id', user.id)
            .single()

            console.log('User phone_number:', userData?.phone_number) // Debug log

            if (userData?.phone_number && userData.phone_number !== 'not_provided') {
            const { data: invitationsData, error: invitationsError } = await supabase
                .from('tontine_invitations')
                .select(`
                *,
                tontine_groups (
                    id,
                    name,
                    description,
                    target_amount,
                    contribution_amount,
                    created_by
                ),
                profiles!invited_by (
                    id,
                    username,
                    email
                )
                `)
                .eq('phone_number', userData.phone_number)
                .eq('status', 'pending')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })

            if (invitationsError) {
                console.error('Error fetching invitations:', invitationsError)
            } else {
                console.log('Invitations found:', invitationsData?.length || 0)
                setInvitations(invitationsData || [])
            }

            // Debug: Check what's in the database
            const { data: debugInvitations } = await supabase
                .from('tontine_invitations')
                .select('id, phone_number, status, expires_at')
                .eq('status', 'pending')
            
            console.log('All pending invitations:', debugInvitations)
            } else {
            console.log('No valid phone number found for user')
            }

            if (!groupsData || groupsData.length === 0) {
            setGroups([])
            return
            }

            // Batch fetch all additional data
            const enrichedGroups = await fetchEnrichedGroups(groupsData, user.id)
            setGroups(enrichedGroups)

        } catch (error) {
            console.error('Error fetching tontine data:', error)
        } finally {
            setIsLoading(false)
        }
    }
  

  const fetchEnrichedGroups = async (userGroups: any[], userId: string) => {
    const groupIds = userGroups.map(member => member.tontine_groups.id)
    
    // Batch fetch all required data
    const [
      { data: membersData },
      { data: cyclesData },
      { data: contributionsData },
      { data: nextMembersData }
    ] = await Promise.all([
      // Members count
      supabase
        .from('tontine_members')
        .select('tontine_group_id')
        .in('tontine_group_id', groupIds)
        .eq('status', 'active'),
      
      // Current cycles
      supabase
        .from('tontine_cycles')
        .select('tontine_group_id, cycle_number')
        .in('tontine_group_id', groupIds)
        .order('cycle_number', { ascending: false }),
      
      // Contributions
      supabase
        .from('tontine_contributions')
        .select('tontine_group_id, amount, status')
        .in('tontine_group_id', groupIds)
        .eq('status', 'paid'),
      
      // Next payout members
      supabase
        .from('tontine_members')
        .select(`
          tontine_group_id,
          position,
          profiles (name)
        `)
        .in('tontine_group_id', groupIds)
        .eq('status', 'active')
        .order('position', { ascending: true })
    ])

    // Process data locally
    return userGroups.map(member => {
      const group = member.tontine_groups
      const groupId = group.id
      
      // Calculate members count
      const membersCount = membersData?.filter(m => m.tontine_group_id === groupId).length || 0
      
      // Find current cycle
      const groupCycles = cyclesData?.filter(c => c.tontine_group_id === groupId) || []
      const currentCycle = groupCycles.length > 0 ? Math.max(...groupCycles.map(c => c.cycle_number)) : 0
      
      // Calculate total collected
      const groupContributions = contributionsData?.filter(c => c.tontine_group_id === groupId) || []
      const totalCollected = groupContributions.reduce((sum, c) => sum + c.amount, 0)
      
      // Find next payout member
      const groupNextMember = nextMembersData?.find(m => m.tontine_group_id === groupId)
      const nextPayoutMember = groupNextMember ? {
        name: extractMemberName(groupNextMember),
        position: groupNextMember.position
      } : undefined

      return {
        ...group,
        members_count: membersCount,
        current_cycle: currentCycle,
        total_collected: totalCollected,
        next_payout_member: nextPayoutMember,
        user_role: group.created_by === userId ? 'admin' : 'member'
      }
    })
  }

  const extractMemberName = (member: any): string => {
    if (!member.profiles) return 'Membre inconnu'
    
    if (Array.isArray(member.profiles)) {
      return member.profiles[0]?.name || 'Membre inconnu'
    }
    
    return member.profiles.name || 'Membre inconnu'
  }

  const getProgressPercentage = (group: TontineGroup) => {
    return (group.total_collected / group.target_amount) * 100
  }

  const getNextDueDate = (group: TontineGroup) => {
    const now = new Date()
    let nextDate = new Date(now)
    
    switch (group.payment_schedule) {
      case 'weekly':
        nextDate.setDate(now.getDate() + 7)
        break
      case 'bi-weekly':
        nextDate.setDate(now.getDate() + 14)
        break
      case 'monthly':
        nextDate.setMonth(now.getMonth() + 1)
        break
    }
    
    return nextDate.toLocaleDateString('fr-FR')
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tontines Digitales</h1>
            <p className="text-gray-600">
              Épargnez ensemble en toute transparence et sécurité
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer une Tontine
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview groups={groups} getNextDueDate={getNextDueDate} getProgressPercentage={getProgressPercentage} />

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-groups'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mes Groupes ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invitations ({invitations.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'my-groups' && (
        <GroupsList 
          groups={groups} 
          getProgressPercentage={getProgressPercentage}
          router={router}
          onShowCreateModal={() => setShowCreateModal(true)}
        />
      )}

      {activeTab === 'invitations' && (
        <InvitationsTab 
          invitations={invitations}
          onRefresh={fetchTontineData}
        />
      )}

      {/* Create Tontine Modal */}
      {showCreateModal && (
        <CreateTontineModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchTontineData()
          }}
        />
      )}
    </div>
  )
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg p-4 h-20"></div>
            ))}
          </div>
          
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-2 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-5/6 mb-4"></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[...Array(4)].map((_, j) => (
                <div key={j}>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Stats Overview Component
function StatsOverview({ groups, getNextDueDate, getProgressPercentage }: {
  groups: TontineGroup[]
  getNextDueDate: (group: TontineGroup) => string
  getProgressPercentage: (group: TontineGroup) => number
}) {
  const totalCollected = groups.reduce((sum, group) => sum + group.total_collected, 0)
  const averageProgress = groups.length > 0 
    ? (groups.reduce((sum, group) => sum + getProgressPercentage(group), 0) / groups.length)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <p className="text-sm text-blue-600">Groupes Actifs</p>
            <p className="text-2xl font-bold text-blue-900">{groups.length}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center">
          <DollarSign className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <p className="text-sm text-green-600">Total Collecté</p>
            <p className="text-2xl font-bold text-green-900">
              {totalCollected.toFixed(0)} $
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-center">
          <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <p className="text-sm text-purple-600">Progression Moyenne</p>
            <p className="text-2xl font-bold text-purple-900">
              {averageProgress.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-orange-50 rounded-lg p-4">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 text-orange-600 mr-3" />
          <div>
            <p className="text-sm text-orange-600">Prochain Paiement</p>
            <p className="text-lg font-bold text-orange-900">
              {groups.length > 0 ? getNextDueDate(groups[0]) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Groups List Component
function GroupsList({ groups, getProgressPercentage, router, onShowCreateModal }: {
  groups: TontineGroup[]
  getProgressPercentage: (group: TontineGroup) => number
  router: any
  onShowCreateModal: () => void
}) {
  if (groups.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tontine active</h3>
        <p className="text-gray-600 mb-4">
          Rejoignez une tontine existante ou créez la vôtre pour commencer à épargner ensemble.
        </p>
        <button
          onClick={onShowCreateModal}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Créer ma première tontine
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map((group) => (
        <GroupCard 
          key={group.id}
          group={group}
          getProgressPercentage={getProgressPercentage}
          router={router}
        />
      ))}
    </div>
  )
}

// Group Card Component
function GroupCard({ group, getProgressPercentage, router }: {
  group: TontineGroup
  getProgressPercentage: (group: TontineGroup) => number
  router: any
}) {
  const progress = getProgressPercentage(group)

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{group.description}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            group.user_role === 'admin' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {group.user_role === 'admin' ? 'Admin' : 'Membre'}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progression</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{group.total_collected.toFixed(0)} $</span>
            <span>{group.target_amount.toFixed(0)} $</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-600">Cotisation</p>
            <p className="font-semibold">{group.contribution_amount.toFixed(0)} $</p>
          </div>
          <div>
            <p className="text-gray-600">Membres</p>
            <p className="font-semibold">{group.members_count} personnes</p>
          </div>
          <div>
            <p className="text-gray-600">Cycle</p>
            <p className="font-semibold">{group.current_cycle}/{group.duration_weeks}</p>
          </div>
          <div>
            <p className="text-gray-600">Fréquence</p>
            <p className="font-semibold capitalize">
              {group.payment_schedule === 'weekly' ? 'Hebdomadaire' : 
               group.payment_schedule === 'bi-weekly' ? 'Bimensuelle' : 'Mensuelle'}
            </p>
          </div>
        </div>

        {/* Next Payout */}
        {group.next_payout_member && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 font-medium">
              Prochain bénéficiaire: {group.next_payout_member.name}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Position #{group.next_payout_member.position} dans la rotation
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => router.push(`/dashboard/digital-wallet/tontine/${group.id}`)}
            className="flex-1 bg-primary text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
          >
            <Eye className="h-4 w-4 mr-1" />
            Voir
          </button>
          {group.user_role === 'admin' && (
            <button
              onClick={() => router.push(`/dashboard/digital-wallet/tontine/${group.id}/manage`)}
              className="bg-gray-200 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium flex items-center justify-center"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Invitations Tab Component
function InvitationsTab({ invitations, onRefresh }: {
  invitations: TontineInvitation[]
  onRefresh: () => void
}) {
  const router = useRouter()
  const supabase = createClient()

    const getDisplayName = (profile: any): string => {
    if (!profile) return 'Utilisateur inconnu'
    if (profile.username) return profile.username
    if (profile.email) return profile.email
    return 'Utilisateur inconnu'
    }

  const handleAcceptInvitation = async (invitationId: string, groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Get the next available position in the group
      const { data: members } = await supabase
        .from('tontine_members')
        .select('position')
        .eq('tontine_group_id', groupId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = members && members.length > 0 ? members[0].position + 1 : 1

      // Add user as member
      const { error: memberError } = await supabase
        .from('tontine_members')
        .insert({
          tontine_group_id: groupId,
          user_id: user.id,
          position: nextPosition
        })

      if (memberError) throw memberError

      // Update invitation status
      const { error: invitationError } = await supabase
        .from('tontine_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)

      if (invitationError) throw invitationError

      alert('Invitation acceptée! Vous avez rejoint la tontine.')
      onRefresh()
      router.push(`/dashboard/digital-wallet/tontine/${groupId}`)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      alert('Erreur lors de l\'acceptation de l\'invitation')
    }
  }

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('tontine_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId)

      if (error) throw error

      alert('Invitation rejetée!')
      onRefresh()
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      alert('Erreur lors du rejet de l\'invitation')
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-8">
          <UserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune invitation</h3>
          <p className="text-gray-600">
            Les invitations à rejoindre des tontines apparaîtront ici.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => {
        const expired = isExpired(invitation.expires_at)
        
        return (
          <div key={invitation.id} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {invitation.tontine_groups.name}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {invitation.tontine_groups.description}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    expired 
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {expired ? 'Expirée' : 'En attente'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Montant cible</p>
                    <p className="font-semibold">
                      {invitation.tontine_groups.target_amount.toFixed(0)} $
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cotisation</p>
                    <p className="font-semibold">
                      {invitation.tontine_groups.contribution_amount.toFixed(0)} $
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Invité par</p>
                    <p className="font-semibold">
                      {getDisplayName(invitation.profiles)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expire le</p>
                    <p className="font-semibold">
                      {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 lg:w-48">
                {!expired ? (
                  <>
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id, invitation.tontine_group_id)}
                      className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accepter
                    </button>
                    <button
                      onClick={() => handleRejectInvitation(invitation.id)}
                      className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Refuser
                    </button>
                  </>
                ) : (
                  <button
                    disabled
                    className="bg-gray-100 text-gray-400 py-2 px-4 rounded-lg font-medium cursor-not-allowed"
                  >
                    Invitation expirée
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Create Tontine Modal Component (unchanged)
function CreateTontineModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    contribution_amount: '',
    duration_weeks: '12',
    payment_schedule: 'weekly' as 'weekly' | 'bi-weekly' | 'monthly'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Le nom est requis"
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) 
      return "Le montant cible doit être positif"
    if (!formData.contribution_amount || parseFloat(formData.contribution_amount) <= 0)
      return "La cotisation doit être positive"
    if (parseFloat(formData.target_amount) < parseFloat(formData.contribution_amount))
      return "Le montant cible doit être supérieur à la cotisation"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Create tontine group
      const { data: group, error: groupError } = await supabase
        .from('tontine_groups')
        .insert({
          name: formData.name,
          description: formData.description,
          target_amount: parseFloat(formData.target_amount),
          contribution_amount: parseFloat(formData.contribution_amount),
          duration_weeks: parseInt(formData.duration_weeks),
          payment_schedule: formData.payment_schedule,
          created_by: user.id
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Add creator as first member
      const { error: memberError } = await supabase
        .from('tontine_members')
        .insert({
          tontine_group_id: group.id,
          user_id: user.id,
          position: 1
        })

      if (memberError) throw memberError

      // Create first cycle
      const nextDueDate = new Date()
      nextDueDate.setDate(nextDueDate.getDate() + 7)

      const { error: cycleError } = await supabase
        .from('tontine_cycles')
        .insert({
          tontine_group_id: group.id,
          cycle_number: 1,
          due_date: nextDueDate.toISOString().split('T')[0]
        })

      if (cycleError) throw cycleError

      onSuccess()
      router.push(`/dashboard/digital-wallet/tontine/${group.id}`)

    } catch (error) {
      console.error('Error creating tontine:', error)
      setError('Erreur lors de la création de la tontine. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Créer une Nouvelle Tontine</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la Tontine *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Tontine Business Mars 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Objectif de cette tontine..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant Cible ($) *
              </label>
              <input
                type="number"
                value={formData.target_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                placeholder="500000"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cotisation ($) *
              </label>
              <input
                type="number"
                value={formData.contribution_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, contribution_amount: e.target.value }))}
                placeholder="10000"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (semaines) *
              </label>
              <select
                value={formData.duration_weeks}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_weeks: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="4">4 semaines</option>
                <option value="8">8 semaines</option>
                <option value="12">12 semaines</option>
                <option value="16">16 semaines</option>
                <option value="20">20 semaines</option>
                <option value="24">24 semaines</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fréquence *
              </label>
              <select
                value={formData.payment_schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_schedule: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="weekly">Hebdomadaire</option>
                <option value="bi-weekly">Bimensuelle</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
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
              {isSubmitting ? 'Création...' : 'Créer la Tontine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
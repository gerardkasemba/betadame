// app/dashboard/transactions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  Eye, 
  Download,
  AlertCircle,
  MessageCircle,
  Calendar,
  DollarSign
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Transaction {
  id: string
  reference: string
  type: 'deposit' | 'withdrawal' | 'game_bet' | 'game_win'
  status: 'pending' | 'completed' | 'failed'
  amount: number
  created_at: string
  updated_at: string
  metadata?: any
  proof_image_url?: string
  payment_method_id?: string
  agent_id?: string
  agent?: {
    name: string
    code: string
  }
  payment_method?: {
    name: string
    code: string
  }
}

interface Claim {
  id: string
  transaction_id: string
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resolved'
  user_description: string
  admin_notes?: string
  resolution?: string
  submitted_at: string
  reviewed_at?: string
  resolved_at?: string
  user_rating?: number
  user_feedback?: string
  proof_urls: string[]
}

interface TransactionWithClaim extends Transaction {
  claim?: Claim
}

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'pending' | 'completed' | 'failed'
type SortType = 'newest' | 'oldest' | 'amount_high' | 'amount_low'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithClaim[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('newest')
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithClaim | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [])

  useEffect(() => {
    filterAndSortTransactions()
  }, [transactions, searchTerm, filter, sort])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch transactions first
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (txError) throw txError

      if (!transactionsData || transactionsData.length === 0) {
        setTransactions([])
        return
      }

      // Get agent and payment method data separately
      const agentIds = transactionsData.map(tx => tx.agent_id).filter(Boolean) as string[]
      const paymentMethodIds = transactionsData.map(tx => tx.payment_method_id).filter(Boolean) as string[]

      // Fetch agents
      let agents: any[] = []
      if (agentIds.length > 0) {
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('id, name, code')
          .in('id', agentIds)

        if (!agentsError && agentsData) {
          agents = agentsData
        }
      }

      // Fetch payment methods
      let paymentMethods: any[] = []
      if (paymentMethodIds.length > 0) {
        const { data: methodsData, error: methodsError } = await supabase
          .from('payment_methods')
          .select('id, name, code')
          .in('id', paymentMethodIds)

        if (!methodsError && methodsData) {
          paymentMethods = methodsData
        }
      }

      // Fetch claims for these transactions
      const transactionIds = transactionsData.map(tx => tx.id)
      const { data: claimsData, error: claimsError } = await supabase
        .from('deposit_claims')
        .select('*')
        .in('transaction_id', transactionIds)

      if (claimsError) {
        console.error('Error fetching claims:', claimsError)
      }

      // Combine all data
      const transactionsWithClaims: TransactionWithClaim[] = transactionsData.map(tx => {
        const agent = agents.find(a => a.id === tx.agent_id)
        const paymentMethod = paymentMethods.find(pm => pm.id === tx.payment_method_id)
        const claim = claimsData?.find(claim => claim.transaction_id === tx.id)

        return {
          ...tx,
          agent,
          payment_method: paymentMethod,
          claim
        }
      })

      setTransactions(transactionsWithClaims)

    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortTransactions = () => {
    let filtered = [...transactions]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.payment_method?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type/status filter
    if (filter !== 'all') {
      if (['deposit', 'withdrawal'].includes(filter)) {
        filtered = filtered.filter(tx => tx.type === filter)
      } else {
        filtered = filtered.filter(tx => tx.status === filter)
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'amount_high':
          return b.amount - a.amount
        case 'amount_low':
          return a.amount - b.amount
        default:
          return 0
      }
    })

    setFilteredTransactions(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getClaimStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Soumis'
      case 'under_review':
        return 'En examen'
      case 'approved':
        return 'Approuvé'
      case 'rejected':
        return 'Rejeté'
      case 'resolved':
        return 'Résolu'
      default:
        return status
    }
  }

  const handleRateClaim = async (claimId: string) => {
    if (rating === 0) return

    try {
      setIsSubmittingRating(true)
      
      const { error } = await supabase
        .from('deposit_claims')
        .update({
          user_rating: rating,
          user_feedback: feedback,
          rated_at: new Date().toISOString()
        })
        .eq('id', claimId)

      if (error) throw error

      // Refresh transactions to show updated rating
      await fetchTransactions()
      setShowRatingModal(false)
      setRating(0)
      setFeedback('')

    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const downloadProof = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Historique des Transactions</h1>
            <p className="text-gray-600">
              Consultez l'historique complet de vos transactions et réclamations
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/dashboard/digital-wallet/deposit')}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Nouveau Dépôt
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Toutes les transactions</option>
            <option value="deposit">Dépôts</option>
            <option value="withdrawal">Retraits</option>
            <option value="pending">En attente</option>
            <option value="completed">Complétées</option>
            <option value="failed">Échouées</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="newest">Plus récent</option>
            <option value="oldest">Plus ancien</option>
            <option value="amount_high">Montant (haut)</option>
            <option value="amount_low">Montant (bas)</option>
          </select>

          {/* Results Count */}
          <div className="flex items-center justify-center md:justify-end">
            <span className="text-sm text-gray-600">
              {filteredTransactions.length} transaction(s)
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction trouvée</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filter !== 'all' 
                ? 'Aucune transaction ne correspond à vos critères de recherche.'
                : 'Vous n\'avez effectué aucune transaction pour le moment.'
              }
            </p>
            {!searchTerm && filter === 'all' && (
              <button
                onClick={() => router.push('/dashboard/digital-wallet/deposit')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Effectuer un premier dépôt
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réclamation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${
                            transaction.type === 'deposit' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            <DollarSign className={`h-4 w-4 ${
                              transaction.type === 'deposit' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.type === 'deposit' ? 'Dépôt' : 'Retrait'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.reference}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.amount.toFixed(2)}$
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.payment_method?.name || 'Non spécifié'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status === 'completed' ? 'Complétée' : 
                           transaction.status === 'failed' ? 'Échouée' : 'En attente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.claim ? (
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClaimStatusColor(transaction.claim.status)}`}>
                            {getClaimStatusText(transaction.claim.status)}
                          </span>
                          {transaction.claim.user_rating && (
                            <div className="ml-2 flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < transaction.claim!.user_rating!
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : transaction.status === 'failed' && transaction.type === 'deposit' ? (
                        <button
                          onClick={() => router.push(`/dashboard/digital-wallet/deposit/claim?transaction_id=${transaction.id}`)}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                        >
                          Déposer une réclamation
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction)
                            setShowDetailsModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {transaction.claim && !transaction.claim.user_rating && transaction.claim.status === 'resolved' && (
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setShowRatingModal(true)
                            }}
                            className="text-yellow-600 hover:text-yellow-700 p-1"
                            title="Évaluer la réclamation"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        {transaction.proof_image_url && (
                          <button
                            onClick={() => downloadProof(transaction.proof_image_url!, `preuve-${transaction.reference}.jpg`)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Télécharger la preuve"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Détails de la Transaction</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Référence</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedTransaction.reference}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">
                    {selectedTransaction.type === 'deposit' ? 'Dépôt' : 'Retrait'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant</label>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {selectedTransaction.amount.toFixed(2)}$
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedTransaction.status)}
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.status === 'completed' ? 'Complétée' : 
                       selectedTransaction.status === 'failed' ? 'Échouée' : 'En attente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date de création</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dernière mise à jour</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.updated_at)}</p>
                </div>
              </div>

              {/* Agent and Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.agent?.name || 'Non assigné'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Méthode de paiement</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.payment_method?.name || 'Non spécifié'}
                  </p>
                </div>
              </div>

              {/* Claim Details */}
              {selectedTransaction.claim && (
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Détails de la Réclamation</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Statut</label>
                      <div className="mt-1 flex items-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClaimStatusColor(selectedTransaction.claim.status)}`}>
                          {getClaimStatusText(selectedTransaction.claim.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {selectedTransaction.claim.user_description}
                      </p>
                    </div>
                    {selectedTransaction.claim.admin_notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes de l'admin</label>
                        <p className="mt-1 text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">
                          {selectedTransaction.claim.admin_notes}
                        </p>
                      </div>
                    )}
                    {selectedTransaction.claim.resolution && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Résolution</label>
                        <p className="mt-1 text-sm text-gray-900 bg-green-50 p-3 rounded-lg">
                          {selectedTransaction.claim.resolution}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Soumis le</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.claim.submitted_at)}</p>
                      </div>
                      {selectedTransaction.claim.resolved_at && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Résolu le</label>
                          <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.claim.resolved_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Proof Image */}
              {selectedTransaction.proof_image_url && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preuve de paiement</label>
                  <img
                    src={selectedTransaction.proof_image_url}
                    alt="Preuve de paiement"
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {selectedTransaction.status === 'failed' && selectedTransaction.type === 'deposit' && !selectedTransaction.claim && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    router.push(`/dashboard/digital-wallet/deposit/claim?transaction_id=${selectedTransaction.id}`)
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Déposer une réclamation
                </button>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedTransaction?.claim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Évaluer la réclamation</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Veuillez évaluer votre expérience avec le traitement de cette réclamation.
              </p>

              {/* Star Rating */}
              <div className="flex justify-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-2xl focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Partagez votre expérience..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isSubmittingRating}
              >
                Annuler
              </button>
              <button
                onClick={() => handleRateClaim(selectedTransaction.claim!.id)}
                disabled={rating === 0 || isSubmittingRating}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmittingRating ? 'Envoi...' : 'Soumettre l\'évaluation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
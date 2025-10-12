import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Star, StarOff, X, DollarSign, MoreVertical, Trash2, Edit3, ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PaymentsTabProps {
  agentId: string
  onRefresh: () => void
  refreshing: boolean
  onUpdateBalance: (accountId: string, newBalance: number) => Promise<boolean> // Added this prop
}

interface PaymentMethod {
  id: string
  name: string
  code: string
  is_active: boolean
}

interface PaymentAccount {
  id: string
  account_number: string
  account_name: string
  current_balance: number
  is_primary: boolean
  is_verified: boolean
  payment_methods: PaymentMethod
}

// Mobile-Optimized Modal Components
function BalanceModal({ isOpen, onClose, onSubmit, title, currentBalance = 0, actionType }: any) {
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (isOpen) {
      setAmount('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    let finalAmount = numAmount
    if (actionType === 'add') {
      finalAmount = currentBalance + numAmount
    } else if (actionType === 'subtract') {
      finalAmount = currentBalance - numAmount
    }

    onSubmit(finalAmount)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 sm:items-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {actionType !== 'set' && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Solde actuel: <strong>{currentBalance.toFixed(2)} $</strong>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {actionType === 'add' ? 'Montant à ajouter' : 
               actionType === 'subtract' ? 'Montant à retirer' : 
               'Nouveau solde'} *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="number"
                step="0.01"
                min={actionType === 'subtract' ? 0.01 : 0}
                max={actionType === 'subtract' ? currentBalance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {actionType === 'subtract' && parseFloat(amount) > currentBalance && (
            <p className="text-sm text-red-600">
              Le montant ne peut pas dépasser le solde actuel
            </p>
          )}

          {actionType === 'add' && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                Nouveau solde: <strong>{(currentBalance + (parseFloat(amount) || 0)).toFixed(2)} $</strong>
              </p>
            </div>
          )}

          {actionType === 'subtract' && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                Nouveau solde: <strong>{(currentBalance - (parseFloat(amount) || 0)).toFixed(2)} $</strong>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                !amount || 
                parseFloat(amount) <= 0 || 
                (actionType === 'subtract' && parseFloat(amount) > currentBalance)
              }
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Confirmer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteModal({ isOpen, onClose, onConfirm, accountName }: any) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 sm:items-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-red-600">Supprimer le compte</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer le compte <strong>{accountName}</strong> ?
          </p>
          <p className="text-sm text-red-600">
            ⚠️ Cette action est irréversible.
          </p>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PaymentsTab({ agentId, onRefresh, refreshing, onUpdateBalance }: PaymentsTabProps) {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  // Modal states
  const [balanceModal, setBalanceModal] = useState({
    isOpen: false,
    accountId: null as string | null,
    currentBalance: 0,
    actionType: 'set' as 'add' | 'subtract' | 'set'
  })

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    accountId: null as string | null,
    accountName: ''
  })

  const [newAccount, setNewAccount] = useState({
    payment_method_id: '',
    account_number: '',
    account_name: '',
    current_balance: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchPaymentAccounts()
    fetchPaymentMethods()
  }, [agentId])

  const fetchPaymentAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_payment_accounts')
        .select(`
          id,
          account_number,
          account_name,
          current_balance,
          is_primary,
          is_verified,
          payment_methods (
            id,
            name,
            code,
            is_active
          )
        `)
        .eq('agent_id', agentId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data) {
        const transformedData: PaymentAccount[] = data.map(item => ({
          id: item.id,
          account_number: item.account_number,
          account_name: item.account_name || '',
          current_balance: item.current_balance,
          is_primary: item.is_primary,
          is_verified: item.is_verified,
          payment_methods: Array.isArray(item.payment_methods) 
            ? item.payment_methods[0]
            : item.payment_methods
        }))
        setPaymentAccounts(transformedData)
      }
    } catch (error) {
      console.error('Error fetching payment accounts:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des comptes' })
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

  const addPaymentAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      if (!newAccount.payment_method_id || !newAccount.account_number) {
        setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires' })
        return
      }

      const { data: existingAccount } = await supabase
        .from('agent_payment_accounts')
        .select('id')
        .eq('agent_id', agentId)
        .eq('payment_method_id', newAccount.payment_method_id)
        .single()

      if (existingAccount) {
        setMessage({ type: 'error', text: 'Vous avez déjà un compte pour cette méthode de paiement' })
        return
      }

      const { error } = await supabase
        .from('agent_payment_accounts')
        .insert({
          agent_id: agentId,
          payment_method_id: newAccount.payment_method_id,
          account_number: newAccount.account_number,
          account_name: newAccount.account_name,
          current_balance: newAccount.current_balance || 0,
          is_primary: paymentAccounts.length === 0,
          is_verified: true
          // is_verified: false
        })

      if (error) throw error

      if (newAccount.current_balance > 0) {
        const { data: currentAgent } = await supabase
          .from('agents')
          .select('available_balance')
          .eq('id', agentId)
          .single()

        if (currentAgent) {
          await supabase
            .from('agents')
            .update({ 
              available_balance: (currentAgent.available_balance || 0) + newAccount.current_balance,
              updated_at: new Date().toISOString()
            })
            .eq('id', agentId)
        }
      }

      setMessage({ type: 'success', text: 'Compte ajouté avec succès' })
      setNewAccount({ payment_method_id: '', account_number: '', account_name: '', current_balance: 0 })
      setShowAddForm(false)
      fetchPaymentAccounts()
      onRefresh()

    } catch (error) {
      console.error('Error adding payment account:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout du compte' })
    } finally {
      setIsLoading(false)
    }
  }

  const setPrimaryAccount = async (accountId: string) => {
    setIsLoading(true)
    setMessage(null)

    try {
      await supabase
        .from('agent_payment_accounts')
        .update({ is_primary: false })
        .eq('agent_id', agentId)

      await supabase
        .from('agent_payment_accounts')
        .update({ is_primary: true })
        .eq('id', accountId)

      setMessage({ type: 'success', text: 'Compte principal mis à jour' })
      fetchPaymentAccounts()
      onRefresh()

    } catch (error) {
      console.error('Error setting primary account:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
    } finally {
      setIsLoading(false)
    }
  }

  const updateAccountBalance = async (accountId: string, newBalance: number) => {
    setIsLoading(true)
    try {
      const success = await onUpdateBalance(accountId, newBalance)
      if (success) {
        setMessage({ type: 'success', text: 'Solde mis à jour' })
        fetchPaymentAccounts()
        onRefresh()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
    } finally {
      setIsLoading(false)
    }
  }

  // Modal handlers
  const openBalanceModal = (accountId: string, currentBalance: number, actionType: 'add' | 'subtract' | 'set') => {
    setBalanceModal({ isOpen: true, accountId, currentBalance, actionType })
  }

  const closeBalanceModal = () => {
    setBalanceModal({ isOpen: false, accountId: null, currentBalance: 0, actionType: 'set' })
  }

  const handleBalanceSubmit = (newBalance: number) => {
    if (balanceModal.accountId) {
      updateAccountBalance(balanceModal.accountId, newBalance)
    }
  }

  const openDeleteModal = (accountId: string, accountName: string) => {
    setDeleteModal({ isOpen: true, accountId, accountName })
    setExpandedAccount(null)
  }

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, accountId: null, accountName: '' })
  }

  const handleDeleteConfirm = async () => {
    if (deleteModal.accountId) {
      await deletePaymentAccount(deleteModal.accountId)
      closeDeleteModal()
    }
  }

  const deletePaymentAccount = async (accountId: string) => {
    setIsLoading(true)
    try {
      const { data: account } = await supabase
        .from('agent_payment_accounts')
        .select('current_balance')
        .eq('id', accountId)
        .single()

      await supabase
        .from('agent_payment_accounts')
        .delete()
        .eq('id', accountId)

      if (account && account.current_balance > 0) {
        const { data: currentAgent } = await supabase
          .from('agents')
          .select('available_balance')
          .eq('id', agentId)
          .single()

        if (currentAgent) {
          await supabase
            .from('agents')
            .update({ 
              available_balance: Math.max(0, (currentAgent.available_balance || 0) - account.current_balance),
              updated_at: new Date().toISOString()
            })
            .eq('id', agentId)
        }
      }

      setMessage({ type: 'success', text: 'Compte supprimé' })
      fetchPaymentAccounts()
      onRefresh()

    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId)
  }

  return (
    <div className="space-y-4">
      {/* Modals */}
      <BalanceModal
        isOpen={balanceModal.isOpen}
        onClose={closeBalanceModal}
        onSubmit={handleBalanceSubmit}
        currentBalance={balanceModal.currentBalance}
        actionType={balanceModal.actionType}
        title={
          balanceModal.actionType === 'add' ? 'Ajouter des fonds' :
          balanceModal.actionType === 'subtract' ? 'Retirer des fonds' :
          'Modifier le solde'
        }
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        accountName={deleteModal.accountName}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Comptes de Paiement</h2>
          <p className="text-gray-500 text-sm mt-1">Gérez vos méthodes de paiement</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={refreshing || isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Nouveau Compte</h3>
          <form onSubmit={addPaymentAccount} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Méthode de Paiement *
              </label>
              <select
                value={newAccount.payment_method_id}
                onChange={(e) => setNewAccount({ ...newAccount, payment_method_id: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Choisir une méthode</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de Compte *
              </label>
              <input
                type="text"
                value={newAccount.account_number}
                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Numéro de compte"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du Titulaire
              </label>
              <input
                type="text"
                value={newAccount.account_name}
                onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Nom du titulaire"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg disabled:opacity-50 font-medium"
              >
                {isLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-3">
        {paymentAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun compte de paiement</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary font-medium mt-2"
            >
              Ajouter un compte
            </button>
          </div>
        ) : (
          paymentAccounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Account Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => toggleAccountExpansion(account.id)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    account.is_primary ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {account.is_primary ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{account.payment_methods.name}</div>
                    <div className="text-sm text-gray-500">{account.account_number}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{account.current_balance.toFixed(2)} $</div>
                    <div className={`text-xs ${
                      account.is_verified ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {account.is_verified ? 'Vérifié' : 'En attente'}
                    </div>
                  </div>
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Expanded Actions */}
              {expandedAccount === account.id && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-4 space-y-2">
                  {/* Quick Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openBalanceModal(account.id, account.current_balance, 'add')}
                      className="flex-1 flex items-center justify-center space-x-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span>Ajouter</span>
                    </button>
                    <button
                      onClick={() => openBalanceModal(account.id, account.current_balance, 'subtract')}
                      disabled={account.current_balance === 0}
                      className="flex-1 flex items-center justify-center space-x-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <ArrowDown className="h-4 w-4" />
                      <span>Retirer</span>
                    </button>
                  </div>

                  {/* Management Actions */}
                  <div className="flex space-x-2">
                    {!account.is_primary && (
                      <button
                        onClick={() => setPrimaryAccount(account.id)}
                        className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
                      >
                        <Star className="h-4 w-4" />
                        <span>Principal</span>
                      </button>
                    )}
                    <button
                      onClick={() => openBalanceModal(account.id, account.current_balance, 'set')}
                      className="flex-1 flex items-center justify-center space-x-1 bg-gray-600 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Modifier</span>
                    </button>
                    {!account.is_primary && (
                      <button
                        onClick={() => openDeleteModal(account.id, `${account.payment_methods.name} - ${account.account_number}`)}
                        className="flex-1 flex items-center justify-center space-x-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="font-medium text-blue-800 mb-2">Informations</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Compte principal</strong> : utilisé par défaut</p>
          <p>• <strong>Vérification</strong> : requise par l'administration</p>
          <p>• <strong>Soldes</strong> : synchronisés avec votre solde disponible</p>
        </div>
      </div>
    </div>
  )
}
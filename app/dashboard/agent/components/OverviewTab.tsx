import { CreditCard, Wallet, Scan, Plus, Smartphone, TrendingUp, Clock } from 'lucide-react'
import { TabType } from '../types'

interface OverviewTabProps {
  stats: any
  paymentAccounts: any[]
  recentTransactions: any[]
  withdrawalRequests: any[]
  onTabChange: (tab: TabType) => void
  onWithdraw: () => void
}

export function OverviewTab({ 
  stats, 
  paymentAccounts, 
  recentTransactions, 
  withdrawalRequests,
  onTabChange, 
  onWithdraw 
}: OverviewTabProps) {
  const pendingWithdrawals = withdrawalRequests?.filter(req => req.status === 'pending') || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Actions Rapides</h3>
          <div className="space-y-3">
            <button
              onClick={() => onTabChange('deposit')}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-green-500" />
                <span>Effectuer un Dépôt</span>
              </div>
              <Plus className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => onTabChange('withdrawal')}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wallet className="h-5 w-5 text-orange-500" />
                <span>Traiter un Retrait</span>
              </div>
              <Scan className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => onTabChange('payments')}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-blue-500" />
                <span>Gérer les Comptes</span>
              </div>
              <Plus className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={onWithdraw}
              disabled={!stats?.platform_balance || stats.platform_balance <= 0}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span>Retirer Solde Plateforme</span>
              </div>
              <Plus className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Commission & Balance Info */}
        <div className="space-y-4">
          {/* Commission Structure */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Structure de Commission</h3>
            <div className="space-y-3">
              {/* Deposit Commission */}
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <div>
                  <span className="text-gray-600">Dépôts</span>
                  <p className="text-xs text-gray-500">2.5% commission directe</p>
                </div>
                <span className="font-bold text-green-600">2.5% net</span>
              </div>
              
              {/* Withdrawal Commission & Fees */}
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Retraits Client</span>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Client paye 8%</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>• Frais transaction (2.5%):</span>
                    <span>-2.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Frais plateforme (2%):</span>
                    <span>-2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Frais maintenance (2%):</span>
                    <span>-2%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="font-medium">Commission agent (1.5%):</span>
                    <span className="font-medium text-green-600">+1.5% net</span>
                  </div>
                </div>
              </div>

              {/* Agent Withdrawal Fees */}
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Retraits Agent</span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Frais 4%</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>• Frais plateforme (2%):</span>
                    <span>-2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Frais maintenance (2%):</span>
                    <span>-2%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="font-medium">Montant net reçu:</span>
                    <span className="font-medium text-green-600">96%</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mt-4">
                <p>• Paiements tous les vendredis</p>
                <p>• Solde plateforme minimum: 10$ pour retrait</p>
                <p>• Délai retrait agent: 24 heures max</p>
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Résumé des Soldes</h3>
            <div className="space-y-3">
              {/* Available Balance */}
              <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                <div>
                  <span className="text-green-100">Solde Disponible</span>
                  <p className="text-xs text-green-200">Pour traiter les retraits clients</p>
                </div>
                <span className="font-bold text-xl text-white">
                  {stats?.available_balance?.toFixed(2) || '0.00'}$
                </span>
              </div>
              
              {/* Platform Balance */}
              <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                <div>
                  <span className="text-green-100">Solde Plateforme</span>
                  <p className="text-xs text-green-200">Vos commissions accumulées</p>
                </div>
                <span className="font-bold text-xl text-white">
                  {stats?.platform_balance?.toFixed(2) || '0.00'}$
                </span>
              </div>

              {/* Pending Withdrawals */}
              {pendingWithdrawals.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-yellow-500/20 rounded-lg">
                  <div>
                    <span className="text-yellow-100">Retraits en attente</span>
                    <p className="text-xs text-yellow-200">{pendingWithdrawals.length} demande(s)</p>
                  </div>
                  <span className="font-bold text-white">
                    {pendingWithdrawals.reduce((sum, req) => sum + req.amount, 0).toFixed(2)}$
                  </span>
                </div>
              )}

              {/* Total Accounts */}
              <div className="flex justify-between items-center pt-2 border-t border-white/20">
                <span className="text-green-100">Total comptes de paiement:</span>
                <span className="font-bold text-white">{paymentAccounts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dépôts aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.today_transactions || 0}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Requêtes en attente</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pending_requests || 0}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commissions dépôts</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.deposit_commissions?.toFixed(2) || '0.00'}$
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commissions retraits</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.withdrawal_commissions?.toFixed(2) || '0.00'}$
              </p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wallet className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions & Pending Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Transactions Récentes</h3>
              <button 
                onClick={() => onTabChange('transactions')}
                className="text-sm text-primary hover:underline"
              >
                Voir tout
              </button>
            </div>
          </div>
          <div className="p-4">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune transaction récente</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.username || 'Utilisateur'}</p>
                      <p className="text-sm text-gray-600">{transaction.reference}</p>
                      <p className="text-xs text-gray-500 capitalize">{transaction.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount}$
                      </p>
                      <p className={`text-xs ${
                        transaction.status === 'completed' ? 'text-green-600' : 
                        transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {transaction.status === 'completed' ? 'Traité' : 
                         transaction.status === 'pending' ? 'En attente' : 'Échoué'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Withdrawal Requests */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Retraits en Attente</h3>
              {pendingWithdrawals.length > 0 && (
                <button 
                  onClick={() => onTabChange('withdraw_platform')}
                  className="text-sm text-primary hover:underline"
                >
                  Gérer
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {pendingWithdrawals.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun retrait en attente</p>
                <p className="text-sm text-gray-400 mt-1">Vos demandes de retrait apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingWithdrawals.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">${request.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        Net: ${request.net_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        En attente
                      </span>
                      <p className="text-xs text-gray-500 mt-1">24h max</p>
                    </div>
                  </div>
                ))}
                {pendingWithdrawals.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-gray-500">
                      +{pendingWithdrawals.length - 3} autre(s) demande(s)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
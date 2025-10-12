import { AgentWithdrawalRequest } from '../../types'
import { Clock, CheckCircle, XCircle, Plus, Download, ChevronRight, Info } from 'lucide-react'
import { useState } from 'react'

interface WithdrawPlatformTabProps {
  platformBalance: number
  withdrawalRequests: AgentWithdrawalRequest[]
  onWithdraw: () => void
  isAdmin?: boolean
  onStatusUpdate?: (requestId: string, status: 'approved' | 'rejected', reason?: string) => void
}

type RequestTab = 'pending' | 'completed' | 'all'

export function WithdrawPlatformTab({ 
  platformBalance, 
  withdrawalRequests, 
  onWithdraw,
  isAdmin = false,
  onStatusUpdate
}: WithdrawPlatformTabProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('all')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvé'
      case 'rejected':
        return 'Rejeté'
      default:
        return 'En attente'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50'
      case 'rejected':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  // Filter requests based on active tab
  const filteredRequests = withdrawalRequests.filter(request => {
    switch (activeTab) {
      case 'pending':
        return request.status === 'pending'
      case 'completed':
        return request.status === 'approved' || request.status === 'rejected'
      case 'all':
      default:
        return true
    }
  })

  // Calculate totals for admin
  const pendingTotal = withdrawalRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0)

  const approvedTotal = withdrawalRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0)

  const feesTotal = withdrawalRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.platform_fee + r.maintenance_fee, 0)

  const handleApprove = (requestId: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(requestId, 'approved')
    }
  }

  const handleReject = (requestId: string, reason: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(requestId, 'rejected', reason)
    }
  }

  const downloadReport = () => {
    // Generate CSV report
    const headers = ['ID', 'Montant', 'Frais Plateforme', 'Frais Maintenance', 'Montant Net', 'Statut', 'Date', 'Agent']
    const csvData = withdrawalRequests.map(request => [
      request.id,
      request.amount.toFixed(2),
      request.platform_fee.toFixed(2),
      request.maintenance_fee.toFixed(2),
      request.net_amount.toFixed(2),
      getStatusText(request.status),
      new Date(request.created_at).toLocaleDateString('fr-FR'),
      'Agent ID'
    ])

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `retraits-agents-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {isAdmin ? 'Retraits Agents' : 'Retraits'}
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Gérer les demandes' : 'Solde plateforme'}
            </p>
          </div>
          
          {isAdmin && (
            <button
              onClick={downloadReport}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Balance Card - Only show for agents */}
        {!isAdmin && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-100 text-sm">Solde disponible</p>
                <p className="text-2xl font-bold mt-1">${platformBalance.toFixed(2)}</p>
              </div>
              <button
                onClick={onWithdraw}
                disabled={platformBalance <= 0}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Retirer
              </button>
            </div>
            <div className="mt-2 text-blue-100 text-xs">
              Frais: 4% • Délai: 24h max
            </div>
          </div>
        )}

        {/* Admin Stats */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-yellow-600 text-xs">En Attente</p>
              <p className="text-lg font-bold text-yellow-700">${pendingTotal.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-green-600 text-xs">Approuvés</p>
              <p className="text-lg font-bold text-green-700">${approvedTotal.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-blue-600 text-xs">Frais</p>
              <p className="text-lg font-bold text-blue-700">${feesTotal.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs - Mobile optimized */}
      <div className="bg-white rounded-xl p-2 border border-gray-100">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors relative ${
              activeTab === 'pending'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            En Attente
            {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {withdrawalRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Traités
          </button>
        </div>
      </div>

      {/* Withdrawal Requests List */}
      <div className="space-y-2">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <Clock className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              {activeTab === 'pending' 
                ? 'Aucune demande en attente' 
                : 'Aucune demande de retrait'
              }
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(request.status)}
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      ${request.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Net: ${request.net_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {getStatusText(request.status)}
                </span>
              </div>

              {/* Fee Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-600">Frais plateforme</div>
                  <div className="text-right font-medium">${request.platform_fee.toFixed(2)}</div>
                  <div className="text-gray-600">Frais maintenance</div>
                  <div className="text-right font-medium">${request.maintenance_fee.toFixed(2)}</div>
                  <div className="text-gray-600">Total frais</div>
                  <div className="text-right font-medium text-red-600">
                    ${(request.platform_fee + request.maintenance_fee).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                
                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="bg-red-50 rounded p-2 mt-2">
                    <div className="text-red-700 font-medium text-xs">Raison du rejet</div>
                    <div className="text-red-600 text-xs">{request.rejection_reason}</div>
                  </div>
                )}
                
                {request.status === 'approved' && request.receipt_url && (
                  <a 
                    href={request.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-primary hover:underline text-xs"
                  >
                    <Download className="h-3 w-3" />
                    <span>Télécharger le reçu</span>
                  </a>
                )}
              </div>

              {/* Admin Actions */}
              {isAdmin && request.status === 'pending' && (
                <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Raison du rejet:')
                      if (reason) handleReject(request.id, reason)
                    }}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Information Panel - Collapsible */}
      <details className="bg-white rounded-xl border border-gray-100 group">
        <summary className="flex items-center justify-between p-4 cursor-pointer text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Info className="h-4 w-4" />
            <span className="font-medium">Informations importantes</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="px-4 pb-4 text-xs text-gray-600 space-y-2">
          {!isAdmin ? (
            <>
              <div>• Retraits traités sous 24 heures maximum</div>
              <div>• Frais de retrait: 4% (2% plateforme + 2% maintenance)</div>
              <div>• Notification envoyée après traitement</div>
              <div>• Montant remis au solde en cas de rejet</div>
            </>
          ) : (
            <>
              <div>• Approuvez après virement effectué</div>
              <div>• Ajoutez le reçu de virement</div>
              <div>• Précisez la raison en cas de rejet</div>
              <div>• Frais automatiquement enregistrés</div>
            </>
          )}
        </div>
      </details>
    </div>
  )
}
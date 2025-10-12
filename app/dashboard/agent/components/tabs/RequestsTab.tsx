import { Clock, RefreshCw, CheckCircle, XCircle, AlertCircle, Eye, Info } from 'lucide-react'
import { PendingRequest } from '../../types'

interface RequestsTabProps {
  pendingRequests: PendingRequest[]
  isProcessing: boolean
  onApprove: (requestId: string) => void
  onDecline: (request: PendingRequest) => void
  onRefresh: () => void
  refreshing: boolean
}

export function RequestsTab({
  pendingRequests,
  isProcessing,
  onApprove,
  onDecline,
  onRefresh,
  refreshing
}: RequestsTabProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = (seconds: number) => {
    if (seconds < 300) return 'text-red-600'
    if (seconds < 900) return 'text-orange-600'
    return 'text-green-600'
  }

  const getTimeBgColor = (seconds: number) => {
    if (seconds < 300) return 'bg-red-50 border-red-200'
    if (seconds < 900) return 'bg-orange-50 border-orange-200'
    return 'bg-green-50 border-green-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Demandes de Dépôt en Attente</h3>
          <p className="text-gray-600 mt-1">
            Vous avez {pendingRequests.length} demande(s) en attente de confirmation
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 text-primary hover:text-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune demande en attente</h4>
          <p className="text-gray-500">
            Toutes les demandes ont été traitées. Les nouvelles demandes apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => (
            <div 
              key={request.id} 
              className={`border rounded-lg p-6 transition-all duration-200 ${
                request.time_remaining < 300 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-gray-200 bg-white hover:shadow-sm'
              }`}
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-lg text-gray-900">
                      Dépôt de {request.amount.toFixed(2)}$
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      En attente
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">Référence:</span>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{request.reference}</code>
                    </div>
                    <div>
                      <span className="font-medium">Utilisateur:</span> {request.user.username}
                    </div>
                    {request.user.phone_number && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Téléphone:</span> {request.user.phone_number}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`flex flex-col items-end space-y-1 ${getTimeColor(request.time_remaining)}`}>
                  <div className="flex items-center space-x-1 bg-white px-3 py-2 rounded-lg border shadow-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono font-bold text-lg">{formatTime(request.time_remaining)}</span>
                  </div>
                  <p className="text-xs font-medium">Temps restant</p>
                </div>
              </div>

              {/* Deposit Information */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Détails du Dépôt
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Montant du dépôt:</span>
                    <span className="font-semibold text-blue-800">{request.amount.toFixed(2)}$</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-blue-700">Frais de service:</span>
                    <span className="text-green-600 font-semibold">Gratuit</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-blue-700">Source des fonds:</span>
                    <span className="text-blue-800 font-medium">Solde Plateforme</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-blue-700">Impact sur votre solde:</span>
                    <span className="text-red-600 font-medium">
                      -{request.amount.toFixed(2)}$ (Plateforme)
                    </span>
                  </div>
                </div>
              </div>

              {/* Proof of Payment */}
              {request.proof_url && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preuve de paiement fournie
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <div className="flex space-x-2">
                      <img 
                        src={request.proof_url} 
                        alt="Preuve de paiement"
                        className="h-20 w-20 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => window.open(request.proof_url, '_blank')}
                      />
                      <button
                        onClick={() => window.open(request.proof_url, '_blank')}
                        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-start"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-sm font-medium">Agrandir</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 sm:flex-1">
                      Vérifiez attentivement la preuve de paiement avant de confirmer
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => onApprove(request.id)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Approuver le Dépôt</span>
                </button>
                
                <button
                  onClick={() => onDecline(request)}
                  disabled={isProcessing}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <XCircle className="h-5 w-5" />
                  <span>Refuser</span>
                </button>
              </div>

              {/* Urgent Warning */}
              {request.time_remaining < 300 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      <strong>Attention:</strong> Cette demande expirera dans {formatTime(request.time_remaining)} et sera automatiquement refusée
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Information Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Instructions Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Instructions pour les Dépôts
          </h4>
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-blue-700 mb-2 text-sm">Processus de Vérification:</h5>
              <ul className="text-sm text-blue-700 space-y-1.5">
                <li className="flex items-start">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Vérifiez la preuve de paiement fournie par l'utilisateur
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Approuvez uniquement si vous avez confirmé la réception des fonds
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Refusez en cas de problème avec une raison claire et précise
                </li>
                <li className="flex items-start">
                  <Clock className="h-3.5 w-3.5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                  Les demandes expirent automatiquement après 30 minutes
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Balance Flow Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Flux des Fonds - Dépôts
          </h4>
          <div className="space-y-3">
            <div className="text-sm text-green-700">
              <div className="flex items-center justify-between mb-2 p-2 bg-white rounded border">
                <span className="font-medium">Votre Solde Plateforme</span>
                <span className="text-red-600 font-semibold">- Montant</span>
              </div>
              
              <div className="flex items-center justify-center my-2">
                <div className="text-green-600 font-bold">↓</div>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="font-medium">Solde Utilisateur</span>
                <span className="text-green-600 font-semibold">+ Montant</span>
              </div>
            </div>
            
            <div className="p-3 bg-white rounded border border-green-200">
              <p className="text-xs text-green-700 font-medium">
                💡 <strong>Important:</strong> Les dépôts utilisent uniquement votre <strong>Solde Plateforme</strong>. 
                Votre <strong>Solde Disponible</strong> reste inchangé et continue de servir pour les retraits des utilisateurs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          Guide Rapide - Gestion des Soldes
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Utilisation des Soldes:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• <span className="font-medium text-blue-600">Solde Plateforme:</span> Dépôts uniquement</li>
              <li>• <span className="font-medium text-green-600">Solde Disponible:</span> Retraits uniquement</li>
              <li>• <span className="font-medium text-purple-600">Commissions:</span> Ajoutées au Solde Plateforme</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Rechargement:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Achetez du <strong>Solde Plateforme</strong> pour les dépôts</li>
              <li>• Les commissions de retrait vont dans le <strong>Solde Plateforme</strong></li>
              <li>• Transférez entre comptes si nécessaire</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
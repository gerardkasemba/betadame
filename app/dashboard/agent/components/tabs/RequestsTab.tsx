'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, RefreshCw, CheckCircle, XCircle, AlertCircle, Eye, Info, X, ZoomIn, Image as ImageIcon } from 'lucide-react'
import { PendingRequest } from '../../types'

interface RequestsTabProps {
  pendingRequests: PendingRequest[]
  isProcessing: boolean
  onApprove: (requestId: string) => void
  onDecline: (request: PendingRequest) => void
  onRefresh: () => void
  onAutoComplete: (request: PendingRequest) => Promise<void>
  refreshing: boolean
}

export function RequestsTab({
  pendingRequests,
  isProcessing,
  onApprove,
  onDecline,
  onRefresh,
  onAutoComplete,
  refreshing
}: RequestsTabProps) {
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const autoCompleteRef = useRef(onAutoComplete)
  const isProcessingRef = useRef(false)

  // Update ref when function changes
  useEffect(() => {
    autoCompleteRef.current = onAutoComplete
  }, [onAutoComplete])

  // Auto-completion logic
  useEffect(() => {
    const processExpiredRequests = async () => {
      if (isProcessingRef.current) {
        console.log('⏸️ Already processing, skipping...')
        return
      }

      const expired = pendingRequests.filter(request => 
        request.time_remaining === 0 && 
        !processingIds.has(request.id)
      )

      if (expired.length === 0) {
        return
      }

      console.log(`🔄 Found ${expired.length} expired requests to auto-complete:`, 
        expired.map(r => ({ id: r.id, ref: r.reference, time: r.time_remaining }))
      )

      isProcessingRef.current = true

      for (const request of expired) {
        try {
          console.log(`🤖 Auto-completing: ${request.reference} (ID: ${request.id})`)
          
          setProcessingIds(prev => new Set([...prev, request.id]))
          
          await autoCompleteRef.current(request)
          
          console.log(`✅ Auto-completed successfully: ${request.reference}`)
          
        } catch (error) {
          console.error(`❌ Failed to auto-complete ${request.reference}:`, error)
          
          setProcessingIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(request.id)
            return newSet
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      isProcessingRef.current = false
    }

    processExpiredRequests()

  }, [pendingRequests])

    useEffect(() => {
    console.log('📸 Requests with proof URLs:', 
      pendingRequests.map(r => ({
        ref: r.reference,
        hasProof: !!r.proof_url,
        proofUrl: r.proof_url?.substring(0, 50) + '...'
      }))
    )
  }, [pendingRequests])

  // Clean up processing IDs
  useEffect(() => {
    const currentIds = new Set(pendingRequests.map(req => req.id))
    setProcessingIds(prev => {
      const newSet = new Set<string>()
      for (const id of prev) {
        if (currentIds.has(id)) {
          newSet.add(id)
        }
      }
      return newSet
    })
  }, [pendingRequests])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = (seconds: number) => {
    if (seconds <= 0) return 'text-red-600'
    if (seconds < 60) return 'text-red-600'
    if (seconds < 120) return 'text-orange-600'
    return 'text-green-600'
  }

  const isExpired = (request: PendingRequest) => request.time_remaining <= 0
  const isBeingProcessed = (request: PendingRequest) => processingIds.has(request.id)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Demandes de Dépôt en Attente</h3>
          <p className="text-gray-600 mt-1">
            Vous avez {pendingRequests.length} demande(s) en attente de confirmation
          </p>
          <p className="text-sm text-orange-600 mt-1 font-medium">
            ⏱️ Délai: 3 minutes maximum - Auto-complétion automatique après expiration
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
                isExpired(request)
                  ? 'border-red-300 bg-red-50 shadow-lg'
                  : request.time_remaining < 60
                  ? 'border-red-200 bg-red-50 shadow-lg'
                  : request.time_remaining < 120
                  ? 'border-orange-200 bg-orange-50'
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isBeingProcessed(request)
                        ? 'bg-yellow-100 text-yellow-800 animate-pulse'
                        : isExpired(request) 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isBeingProcessed(request) ? 'Traitement...' : isExpired(request) ? 'Expiré' : 'En attente'}
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
                <div className="flex flex-col items-end space-y-1">
                  <div className={`flex items-center space-x-1 px-3 py-2 rounded-lg border shadow-sm ${
                    isExpired(request) 
                      ? 'bg-red-200 border-red-400 animate-pulse' 
                      : request.time_remaining < 60 
                      ? 'bg-red-100 border-red-300 animate-pulse'
                      : request.time_remaining < 120 
                      ? 'bg-orange-100 border-orange-300'
                      : 'bg-white border-gray-300'
                  }`}>
                    <Clock className={`h-4 w-4 ${getTimeColor(request.time_remaining)}`} />
                    <span className={`font-mono font-bold text-lg ${getTimeColor(request.time_remaining)}`}>
                      {formatTime(request.time_remaining)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-600">
                    {isExpired(request) ? 'Temps écoulé' : 'Temps restant'}
                  </p>
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

              {/* ✅ NEW: Payment Receipt Section */}
              {request.proof_url ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <ImageIcon className="h-4 w-4 mr-1.5 text-gray-600" />
                    Reçu de paiement fourni
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start space-x-3">
                      {/* Thumbnail Preview */}
                      <div 
                        className="relative group cursor-pointer flex-shrink-0"
                        onClick={() => setSelectedProofUrl(request.proof_url || null)}
                      >
                        <img 
                          src={request.proof_url} 
                          alt="Reçu de paiement"
                          className="h-20 w-20 object-cover rounded-lg border-2 border-gray-300 group-hover:border-blue-500 transition-all shadow-sm"
                          onError={(e) => {
                            console.error('❌ Image failed to load:', request.proof_url);
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => console.log('✅ Image loaded successfully:', request.proof_url)}
                        />
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-opacity-40 rounded-lg transition-all flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      
                      {/* Receipt Info and Actions */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 mb-2">
                          L'utilisateur a fourni un reçu de paiement. Vérifiez-le attentivement avant d'approuver.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedProofUrl(request.proof_url || null)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Voir en grand</span>
                          </button>
                          <button
                            onClick={() => window.open(request.proof_url, '_blank')}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>Ouvrir dans un nouvel onglet</span>
                          </button>
                          {/* Debug button */}
                          <button
                            onClick={() => {
                              console.log('🔍 Debug proof URL:', {
                                url: request.proof_url,
                                length: request.proof_url?.length,
                                valid: request.proof_url?.startsWith('http')
                              });
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium shadow-sm"
                          >
                            <span>Debug</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-700 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>
                        <strong>Aucun reçu:</strong> L'utilisateur n'a pas fourni de reçu de paiement
                      </span>
                    </p>
                    {/* Debug info */}
                    <p className="text-xs text-yellow-600 mt-1">
                      Transaction ID: {request.id} | Reference: {request.reference}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons or Status */}
              {isBeingProcessed(request) ? (
                <div className="text-center py-4">
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                    <p className="text-yellow-700 font-semibold">
                      Auto-complétion en cours...
                    </p>
                  </div>
                </div>
              ) : !isExpired(request) ? (
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
              ) : (
                <div className="text-center py-4">
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-700 font-semibold">
                      En cours d'auto-complétion
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Ce dépôt sera traité automatiquement dans quelques instants
                    </p>
                  </div>
                </div>
              )}

              {/* Warning Messages */}
              {isExpired(request) && !isBeingProcessed(request) ? (
                <div className="mt-3 p-3 bg-green-100 border-2 border-green-400 rounded-lg">
                  <p className="text-green-800 text-sm font-bold flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>
                      ✅ AUTO-COMPLÉTION: Ce dépôt va être traité automatiquement
                    </span>
                  </p>
                </div>
              ) : request.time_remaining < 60 ? (
                <div className="mt-3 p-3 bg-red-100 border-2 border-red-300 rounded-lg animate-pulse">
                  <p className="text-red-800 text-sm font-bold flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>
                      🚨 URGENT: Auto-complétion dans {formatTime(request.time_remaining)}!
                    </span>
                  </p>
                </div>
              ) : request.time_remaining < 120 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-700 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      ⚠️ <strong>Attention:</strong> Moins de 2 minutes avant auto-complétion
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ✅ ENHANCED: Image Modal with Better UI */}
      {selectedProofUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedProofUrl(null)}
        >
          <div className="relative max-w-6xl max-h-[95vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Reçu de Paiement
                </h3>
                <button
                  onClick={() => setSelectedProofUrl(null)}
                  className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>

            {/* Image */}
            <img 
              src={selectedProofUrl} 
              alt="Reçu de paiement - Vue agrandie"
              className="max-w-full max-h-[95vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => window.open(selectedProofUrl, '_blank')}
                  className="bg-white text-gray-900 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors shadow-lg flex items-center space-x-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Ouvrir dans un nouvel onglet</span>
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = selectedProofUrl
                    link.download = `receipt-${Date.now()}.jpg`
                    link.click()
                  }}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Télécharger</span>
                </button>
              </div>
            </div>
          </div>
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
                  Vérifiez le reçu de paiement fourni par l'utilisateur
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Cliquez sur "Voir en grand" pour examiner le reçu en détail
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Approuvez uniquement si le reçu est valide et correspond au montant
                </li>
                <li className="flex items-start">
                  <XCircle className="h-3.5 w-3.5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  Refusez en cas de reçu invalide ou suspect avec une raison claire
                </li>
                <li className="flex items-start">
                  <Clock className="h-3.5 w-3.5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                  ⚠️ Délai maximum: <strong>3 minutes</strong> - Auto-complétion après expiration
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
                Votre <strong>Solde Disponible</strong> reste inchangé.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          Guide Rapide - Vérification des Reçus
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Éléments à Vérifier:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• <span className="font-medium text-blue-600">Montant:</span> Doit correspondre exactement</li>
              <li>• <span className="font-medium text-blue-600">Date:</span> Récent (moins de 24h)</li>
              <li>• <span className="font-medium text-blue-600">Méthode:</span> Correspond au compte</li>
              <li>• <span className="font-medium text-blue-600">Clarté:</span> Image nette et lisible</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Signes d'Alerte:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• <span className="font-medium text-red-600">Montant différent</span> du dépôt</li>
              <li>• <span className="font-medium text-red-600">Image floue</span> ou illisible</li>
              <li>• <span className="font-medium text-red-600">Reçu modifié</span> ou suspect</li>
              <li>• <span className="font-medium text-red-600">Date incorrecte</span> ou trop ancienne</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
// components/DepositClaimForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Upload, AlertCircle, Send, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClaimFormData {
  transaction_id: string
  user_id: string
  amount: number
  reference: string
  reason: string
  description: string
  proof_files: File[]
  contact_method: 'email' | 'phone'
  contact_info: string
  urgency: 'low' | 'medium' | 'high'
}

interface TransactionDetails {
  id: string
  reference: string
  amount: number
  created_at: string
  status: string
  metadata?: any
  qr_code_data?: string // This contains the decline reason
}

export default function DepositClaimForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const transactionId = searchParams.get('transaction_id')
  
  const [formData, setFormData] = useState<ClaimFormData>({
    transaction_id: transactionId || '',
    user_id: '',
    amount: 0,
    reference: '',
    reason: '',
    description: '',
    proof_files: [],
    contact_method: 'email',
    contact_info: '',
    urgency: 'medium'
  })
  
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [step, setStep] = useState<'details' | 'claim' | 'success'>('details')
  
  const supabase = createClient()

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails()
    } else {
      setMessage({ type: 'error', text: 'ID de transaction manquant' })
    }
  }, [transactionId])

  const fetchTransactionDetails = async () => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Utilisateur non connecté' })
        return
      }

      // Fetch transaction details
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single()

      if (error || !transaction) {
        setMessage({ type: 'error', text: 'Transaction non trouvée' })
        return
      }

      if (transaction.status !== 'failed') {
        setMessage({ type: 'error', text: 'Cette transaction n\'a pas été refusée' })
        return
      }

      setTransaction(transaction)
      
      // Extract decline reason from qr_code_data or metadata
      const declineReason = transaction.qr_code_data || 
                           transaction.metadata?.failure_reason || 
                           'Raison non spécifiée'

      setFormData(prev => ({
        ...prev,
        transaction_id: transaction.id,
        user_id: user.id,
        amount: transaction.amount,
        reference: transaction.reference,
        reason: declineReason
      }))

    } catch (error) {
      console.error('Error fetching transaction:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des détails' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
        setMessage({ type: 'error', text: 'Seules les images et PDF sont acceptés' })
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Fichier trop volumineux (max 10MB)' })
        return false
      }
      return true
    })

    setFormData(prev => ({
      ...prev,
      proof_files: [...prev.proof_files, ...validFiles]
    }))
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      proof_files: prev.proof_files.filter((_, i) => i !== index)
    }))
  }

  const uploadProofFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    
    for (const file of formData.proof_files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `claim-proofs/${formData.transaction_id}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('transaction-proofs')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        throw new Error(`Erreur upload fichier: ${uploadError.message}`)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('transaction-proofs')
        .getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }
    
    return uploadedUrls
  }

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Validate form
      if (!formData.description.trim()) {
        setMessage({ type: 'error', text: 'Veuillez décrire votre réclamation' })
        return
      }

      if (!formData.contact_info.trim()) {
        setMessage({ type: 'error', text: 'Veuillez fournir vos coordonnées' })
        return
      }

      if (formData.proof_files.length === 0) {
        setMessage({ type: 'error', text: 'Veuillez joindre au moins une preuve' })
        return
      }

      // Upload proof files
      const proofUrls = await uploadProofFiles()

      // Create claim record
      const { error: claimError } = await supabase
        .from('deposit_claims')
        .insert({
          transaction_id: formData.transaction_id,
          user_id: formData.user_id,
          amount: formData.amount,
          reference: formData.reference,
          original_reason: formData.reason,
          user_description: formData.description,
          proof_urls: proofUrls,
          contact_method: formData.contact_method,
          contact_info: formData.contact_info,
          urgency: formData.urgency,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })

      if (claimError) {
        console.error('Error creating claim:', claimError)
        throw new Error(`Erreur création réclamation: ${claimError.message}`)
      }

      // Update transaction metadata to indicate claim was filed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          metadata: {
            ...transaction?.metadata,
            claim_filed: true,
            claim_filed_at: new Date().toISOString(),
            claim_urgency: formData.urgency
          }
        })
        .eq('id', formData.transaction_id)

      if (updateError) {
        console.warn('Warning: Could not update transaction metadata:', updateError)
      }

      setStep('success')
      setMessage({ 
        type: 'success', 
        text: '✅ Votre réclamation a été soumise avec succès !' 
      })

    } catch (error: any) {
      console.error('Error submitting claim:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la soumission de la réclamation' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des détails de la transaction...</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Transaction non trouvée</h1>
          <p className="text-gray-600 mb-4">Impossible de trouver les détails de cette transaction.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Réclamation de Dépôt</h1>
              <p className="text-gray-600">Déposez une réclamation pour un dépôt refusé</p>
            </div>
          </div>
          <FileText className="h-8 w-8 text-primary" />
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-6">
          {['Détails', 'Réclamation', 'Terminé'].map((stepName, index) => {
            const stepNumber = index + 1
            const currentStep = ['details', 'claim', 'success'].indexOf(step) + 1
            const isCompleted = stepNumber < currentStep
            const isActive = stepNumber === currentStep

            return (
              <div key={stepName} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-primary text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                </div>
                <span className={`text-xs mt-2 text-center ${
                  isActive ? 'text-primary font-medium' : 'text-gray-500'
                }`}>
                  {stepName}
                </span>
                {index < 2 && (
                  <div className={`flex-1 h-1 mt-4 -mb-4 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Step 1: Transaction Details */}
      {step === 'details' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Détails de la Transaction Refusée</h2>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                <p className="font-mono bg-gray-100 p-2 rounded">{transaction.reference}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                <p className="text-xl font-bold text-red-600">{transaction.amount.toFixed(2)}$</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <p>{new Date(transaction.created_at).toLocaleString('fr-FR')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison du Refus</label>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 font-medium">{formData.reason}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Instructions pour la Réclamation
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Rassemblez toutes les preuves de votre paiement</li>
              <li>• Décrivez clairement pourquoi vous contestez le refus</li>
              <li>• Fournissez des coordonnées valides pour le suivi</li>
              <li>• Notre équipe examinera votre réclamation sous 24-48 heures</li>
            </ul>
          </div>

          <button
            onClick={() => setStep('claim')}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continuer vers la Réclamation
          </button>
        </div>
      )}

      {/* Step 2: Claim Form */}
      {step === 'claim' && (
        <form onSubmit={submitClaim} className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Formulaire de Réclamation</h2>

          <div className="space-y-6">
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description de la Réclamation *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez en détail pourquoi vous contestez le refus de ce dépôt. Incluez toutes les informations pertinentes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de Contact Préférée *
                </label>
                <select
                  value={formData.contact_method}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact_method: e.target.value as 'email' | 'phone' 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="email">Email</option>
                  <option value="phone">Téléphone</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact_info" className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.contact_method === 'email' ? 'Adresse Email *' : 'Numéro de Téléphone *'}
                </label>
                <input
                  type={formData.contact_method === 'email' ? 'email' : 'tel'}
                  id="contact_info"
                  value={formData.contact_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                  placeholder={formData.contact_method === 'email' ? 'votre@email.com' : '+33 1 23 45 67 89'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau d'Urgence
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  urgency: e.target.value as 'low' | 'medium' | 'high' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="low">Faible - Problème mineur</option>
                <option value="medium">Moyen - Nécessite une attention</option>
                <option value="high">Élevé - Problème urgent</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preuves de Paiement *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="proofUpload"
                />
                <label htmlFor="proofUpload" className="cursor-pointer block">
                  <span className="text-primary hover:text-blue-700 font-medium">
                    Cliquez pour télécharger les preuves
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    Formats: JPG, PNG, PDF (max 10MB par fichier)
                  </p>
                </label>
              </div>

              {/* File List */}
              {formData.proof_files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Fichiers sélectionnés:</p>
                  {formData.proof_files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-600">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Soumission...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Soumettre la Réclamation
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Réclamation Soumise !</h2>
          <p className="text-gray-600 mb-6">
            Votre réclamation a été enregistrée avec succès. Notre équipe l'examinera dans les plus brefs délais.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-green-800 mb-2">Prochaines Étapes</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Vous recevrez un email de confirmation</li>
              <li>• Notre équipe examinera votre réclamation sous 24-48 heures</li>
              <li>• Nous vous contacterons via {formData.contact_method === 'email' ? 'votre email' : 'votre téléphone'}</li>
              <li>• Conservez vos preuves de paiement jusqu'à résolution</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retour au Tableau de Bord
            </button>
            <button
              onClick={() => router.push('/support')}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Contacter le Support
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DepositTabProps {
  depositAmount: string
  depositUsername: string
  isProcessing: boolean
  onAmountChange: (amount: string) => void
  onUsernameChange: (username: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function DepositTab({
  depositAmount,
  depositUsername,
  isProcessing,
  onAmountChange,
  onUsernameChange,
  onSubmit
}: DepositTabProps) {
  const amount = parseFloat(depositAmount) || 0
  const [userFound, setUserFound] = useState<boolean | null>(null)
  const [searchingUser, setSearchingUser] = useState(false)
  const [suggestedAmounts] = useState([10, 25, 50, 100, 200, 500])

  const supabase = createClient()

  // Debounced user search
  useEffect(() => {
    if (depositUsername.trim().length < 3) {
      setUserFound(null)
      return
    }

    const searchUser = async () => {
      setSearchingUser(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', depositUsername.trim())
          .single()

        setUserFound(!!data && !error)
      } catch (error) {
        setUserFound(false)
      } finally {
        setSearchingUser(false)
      }
    }

    const timeoutId = setTimeout(searchUser, 500)
    return () => clearTimeout(timeoutId)
  }, [depositUsername])

  const handleAmountSuggestion = (suggestedAmount: number) => {
    onAmountChange(suggestedAmount.toString())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Additional validation
    if (amount <= 0) {
      return
    }
    
    if (!userFound) {
      return
    }

    onSubmit(e)
  }

  const getUsernameStatus = () => {
    if (!depositUsername.trim()) return null
    
    if (searchingUser) {
      return { type: 'loading', text: 'Recherche de l\'utilisateur...' } as const
    }
    
    if (depositUsername.trim().length < 3) {
      return { type: 'info', text: 'Entrez au moins 3 caractères' } as const
    }
    
    if (userFound === true) {
      return { type: 'success', text: 'Utilisateur trouvé ✓' } as const
    }
    
    if (userFound === false) {
      return { type: 'error', text: 'Utilisateur non trouvé' } as const
    }
    
    return null
  }

  const usernameStatus = getUsernameStatus()

  return (
    <div className="max-w-md space-y-6">
      {/* Information Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-blue-900">
              Dépôt Direct - Informations
            </h3>
            <div className="mt-2 text-sm text-blue-800 space-y-1">
              <p className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1.5 text-green-500" />
                Utilise votre <strong className="mx-1">Solde Plateforme</strong>
              </p>
              <p className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1.5 text-green-500" />
                Aucune commission - Service gratuit
              </p>
              <p className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1.5 text-green-500" />
                Traitement instantané
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username Input */}
        <div className="space-y-2">
          <label htmlFor="depositUsername" className="block text-sm font-semibold text-gray-900">
            Nom d'utilisateur du bénéficiaire
          </label>
          <div className="relative">
            <input
              type="text"
              id="depositUsername"
              value={depositUsername}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="ex: john_doe"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                usernameStatus?.type === 'error' 
                  ? 'border-red-300 bg-red-50' 
                  : usernameStatus?.type === 'success'
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
              }`}
              required
              disabled={isProcessing}
            />
            {usernameStatus && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {usernameStatus.type === 'loading' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                )}
                {usernameStatus.type === 'success' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                )}
                {usernameStatus.type === 'error' && (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
              </div>
            )}
          </div>
          {usernameStatus && (
            <p className={`text-xs font-medium ${
              usernameStatus.type === 'loading' ? 'text-blue-600' :
              usernameStatus.type === 'success' ? 'text-green-600' :
              usernameStatus.type === 'error' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {usernameStatus.text}
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <label htmlFor="depositAmount" className="block text-sm font-semibold text-gray-900">
            Montant du dépôt ($)
          </label>
          
          {/* Quick Amount Suggestions */}
          <div className="grid grid-cols-3 gap-2">
            {suggestedAmounts.map((suggestedAmount) => (
              <button
                key={suggestedAmount}
                type="button"
                onClick={() => handleAmountSuggestion(suggestedAmount)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                  amount === suggestedAmount
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
                }`}
                disabled={isProcessing}
              >
                ${suggestedAmount}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 font-medium">$</span>
            </div>
            <input
              type="number"
              id="depositAmount"
              value={depositAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              max="10000"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={isProcessing}
            />
          </div>

          {/* Amount Summary */}
          {amount > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-600">
                Montant à déduire de votre solde plateforme:
              </p>
              <p className="text-lg font-bold text-gray-900">
                {amount.toFixed(2)}$
              </p>
              <p className="text-xs text-green-600 font-medium flex items-center">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Aucune commission - Dépôt gratuit
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !userFound || amount <= 0}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02]"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Traitement en cours...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ArrowRightIcon className="h-4 w-4 mr-2" />
              Effectuer le Dépôt
            </div>
          )}
        </button>
      </form>

      {/* Transaction Summary */}
      {amount > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-400" />
            Récapitulatif de la transaction
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">Montant du dépôt:</span>
              <span className="font-semibold text-gray-900">{amount.toFixed(2)}$</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">Frais de service:</span>
              <span className="text-green-600 font-semibold">Gratuit</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-gray-200 pt-2">
              <span className="text-sm font-semibold text-gray-900">Total déduit:</span>
              <span className="text-lg font-bold text-gray-900">{amount.toFixed(2)}$</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-xs text-amber-800 font-medium">
              Vérifiez le nom d'utilisateur avant de confirmer. Les transactions sont instantanées et irréversibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Icon Components
function InformationCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  )
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}

function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
    </svg>
  )
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  )
}

function DocumentTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
    </svg>
  )
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}
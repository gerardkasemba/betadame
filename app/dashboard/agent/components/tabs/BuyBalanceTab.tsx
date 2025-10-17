'use client'

import { useState } from 'react'
import { CreditCard, Shield, Zap, Info, ArrowRight, CheckCircle } from 'lucide-react'

interface BuyBalanceTabProps {
  buyBalanceAmount: string
  agentBalance: number
  isProcessing: boolean
  onAmountChange: (amount: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function BuyBalanceTab({
  buyBalanceAmount,
  agentBalance,
  isProcessing,
  onAmountChange,
  onSubmit
}: BuyBalanceTabProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [transactionSuccess, setTransactionSuccess] = useState(false)

  // Quick amount buttons
  const quickAmounts = [20, 50, 100, 200, 500]

  // Handle amount change
  const handleAmountChange = (amount: string) => {
    onAmountChange(amount)
    setTransactionSuccess(false)
  }

  // Set quick amount
  const setQuickAmount = (amount: number) => {
    handleAmountChange(amount.toString())
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTransactionSuccess(true)
    onSubmit(e)
  }

  const selectedAmount = parseFloat(buyBalanceAmount) || 0
  const newBalance = agentBalance + selectedAmount

  return (
    <div className="space-y-4">
      {/* Current Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Solde Plateforme Agent</span>
          </div>
          <Zap className="h-5 w-5" />
        </div>
        <div className="text-3xl font-bold mb-1">{agentBalance.toFixed(2)}$</div>
        <div className="text-blue-100 text-sm">Solde disponible pour approuver les dépôts</div>
      </div>

      {/* Success Message */}
      {transactionSuccess && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Transaction réussie !</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            {selectedAmount}$ ont été ajoutés à votre solde plateforme.
          </p>
        </div>
      )}

      {/* Quick Amounts */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-blue-500" />
          Montants rapides
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setQuickAmount(amount)}
              disabled={isProcessing}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                buyBalanceAmount === amount.toString()
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold">{amount}$</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center transition-all"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Custom Amount */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
          Montant personnalisé
        </h3>
        <div className="relative">
          <input
            type="number"
            value={buyBalanceAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="10"
            disabled={isProcessing}
            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
            $
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
          <span>Minimum 10$</span>
          {selectedAmount >= 10 && (
            <span className="text-blue-600 font-semibold">
              Nouveau solde: {newBalance.toFixed(2)}$
            </span>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {buyBalanceAmount && parseFloat(buyBalanceAmount) >= 10 && (
        <div className="bg-white rounded-xl p-4 border-2 border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Confirmer la transaction
            </h3>
            <div className="text-sm text-gray-600">
              Montant: <span className="font-bold text-blue-600">{selectedAmount}$</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Traitement en cours...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Confirmer l'ajout de {selectedAmount}$</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            )}
          </button>

          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 text-center font-medium">
              ✅ Transaction sécurisée et instantanée
            </p>
          </div>
        </div>
      )}

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 animate-fade-in shadow-sm">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Comment ça marche ?
          </h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Le solde plateforme sert à approuver les dépôts des utilisateurs</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Gagnez 2.5% de commission sur chaque retrait approuvé</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Ajout instantané à votre solde agent</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="bg-blue-200 rounded-full p-1 mt-0.5 flex-shrink-0">
                <ArrowRight className="h-3 w-3 text-blue-700" />
              </div>
              <span>Aucun frais de transaction</span>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-2 text-green-600 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-semibold">Instantané</span>
          </div>
          <p className="text-xs text-gray-600">Crédit immédiat après confirmation</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-2 text-blue-600 mb-1">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-semibold">Sécurisé</span>
          </div>
          <p className="text-xs text-gray-600">Transactions protégées</p>
        </div>
      </div>

      {/* Support Info */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
        <div className="text-sm text-gray-700 font-medium mb-1">Besoin d'aide ?</div>
        <div className="text-xs text-gray-600">
          Contactez le support au{' '}
          <a href="tel:+15551234567" className="text-blue-600 font-semibold hover:underline">
            +1 (555) 123-4567
          </a>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Disponible 24/7 pour vous assister
        </div>
      </div>
    </div>
  )
}
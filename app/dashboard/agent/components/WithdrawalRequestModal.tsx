import { useState } from 'react'
import { X } from 'lucide-react'

interface WithdrawalRequestModalProps {
  isOpen: boolean
  platformBalance: number
  isProcessing: boolean
  onClose: () => void
  onSubmit: (amount: number) => void
}

export function WithdrawalRequestModal({
  isOpen,
  platformBalance,
  isProcessing,
  onClose,
  onSubmit
}: WithdrawalRequestModalProps) {
  const [amount, setAmount] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!isNaN(numAmount) && numAmount > 0) {
      onSubmit(numAmount)
      setAmount('')
    }
  }

  const calculateFees = (amount: number) => {
    const platformFee = amount * 0.02
    const maintenanceFee = amount * 0.02
    const totalFees = platformFee + maintenanceFee
    const netAmount = amount - totalFees
    return { platformFee, maintenanceFee, totalFees, netAmount }
  }

  const fees = amount ? calculateFees(parseFloat(amount)) : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Demander un retrait</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant à retirer
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              max={platformBalance}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Solde plateforme disponible: ${platformBalance.toFixed(2)}
            </p>
          </div>

          {fees && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900">Détail des frais</h4>
              <div className="flex justify-between text-sm">
                <span>Frais plateforme (2%):</span>
                <span className="text-red-600">-${fees.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frais maintenance (2%):</span>
                <span className="text-red-600">-${fees.maintenanceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="font-semibold">Total frais:</span>
                <span className="font-semibold text-red-600">-${fees.totalFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Montant net:</span>
                <span className="text-green-600">${fees.netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ⏱️ Délai de traitement: 24 heures maximum. Vous recevrez une notification lorsque votre demande sera traitée.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isProcessing || !amount || parseFloat(amount) > platformBalance}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Traitement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
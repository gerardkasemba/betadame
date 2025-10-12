// app/dashboard/agent/components/DeclineModal.tsx
import { PendingRequest } from '../types'

interface DeclineModalProps {
  isOpen: boolean
  selectedRequest: PendingRequest | null
  declineReason: string
  isProcessing: boolean
  onReasonChange: (reason: string) => void
  onClose: () => void
  onSubmit: (requestId: string, reason: string) => void
}

export function DeclineModal({
  isOpen,
  selectedRequest,
  declineReason,
  isProcessing,
  onReasonChange,
  onClose,
  onSubmit
}: DeclineModalProps) {
  if (!isOpen || !selectedRequest) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Refuser le Dépôt
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Vous êtes sur le point de refuser un dépôt de <strong>{selectedRequest.amount}$</strong> de {selectedRequest.user.username}.
          </p>
          <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
            Raison du refus *
          </label>
          <textarea
            id="declineReason"
            value={declineReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Expliquez pourquoi vous refusez ce dépôt..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSubmit(selectedRequest.id, declineReason)}
            disabled={isProcessing || !declineReason.trim()}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {isProcessing ? 'Traitement...' : 'Confirmer le Refus'}
          </button>
        </div>
      </div>
    </div>
  )
}
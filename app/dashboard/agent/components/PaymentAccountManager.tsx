'use client'

import { useState } from 'react'
import { PaymentAccount } from '../types'
import { Plus, Minus, RefreshCw } from 'lucide-react'

interface PaymentAccountManagerProps {
  paymentAccounts: PaymentAccount[]
  onUpdateBalance: (accountId: string, newBalance: number) => Promise<boolean>
  onRefresh: () => void
  refreshing: boolean
}

export function PaymentAccountManager({ 
  paymentAccounts, 
  onUpdateBalance, 
  onRefresh,
  refreshing 
}: PaymentAccountManagerProps) {
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpdateBalance = async (accountId: string) => {
    if (!newBalance.trim()) return

    const amount = parseFloat(newBalance)
    if (isNaN(amount) || amount < 0) {
      alert('Montant invalide')
      return
    }

    setIsProcessing(true)
    const success = await onUpdateBalance(accountId, amount)
    
    if (success) {
      setEditingAccount(null)
      setNewBalance('')
      onRefresh() // Refresh the data
    }
    
    setIsProcessing(false)
  }

  const handleAddBalance = async (accountId: string, currentBalance: number) => {
    const amountToAdd = parseFloat(prompt('Montant à ajouter:') || '0')
    if (isNaN(amountToAdd) || amountToAdd <= 0) return

    setIsProcessing(true)
    const success = await onUpdateBalance(accountId, currentBalance + amountToAdd)
    
    if (success) {
      onRefresh()
    }
    
    setIsProcessing(false)
  }

  const handleSubtractBalance = async (accountId: string, currentBalance: number) => {
    const amountToSubtract = parseFloat(prompt('Montant à retirer:') || '0')
    if (isNaN(amountToSubtract) || amountToSubtract <= 0) return

    if (amountToSubtract > currentBalance) {
      alert('Solde insuffisant')
      return
    }

    setIsProcessing(true)
    const success = await onUpdateBalance(accountId, currentBalance - amountToSubtract)
    
    if (success) {
      onRefresh()
    }
    
    setIsProcessing(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des comptes de paiement</h3>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-4">
        {paymentAccounts.map((account) => (
          <div key={account.id} className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">
                  {account.payment_methods?.name || 'Méthode de paiement'}
                  {account.is_primary && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Principal
                    </span>
                  )}
                </h4>
                <p className="text-sm text-gray-600">{account.account_number}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {account.current_balance.toFixed(2)}$
                </p>
                <p className="text-sm text-gray-500">Solde actuel</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAddBalance(account.id, account.current_balance)}
                disabled={isProcessing}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
              
              <button
                onClick={() => handleSubtractBalance(account.id, account.current_balance)}
                disabled={isProcessing || account.current_balance === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                <Minus className="h-4 w-4" />
                Retirer
              </button>

              <button
                onClick={() => {
                  setEditingAccount(account.id)
                  setNewBalance(account.current_balance.toString())
                }}
                disabled={isProcessing}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Modifier
              </button>
            </div>

            {editingAccount === account.id && (
              <div className="mt-3 p-3 bg-white border rounded">
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="Nouveau solde"
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleUpdateBalance(account.id)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? '...' : 'OK'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingAccount(null)
                      setNewBalance('')
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {paymentAccounts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucun compte de paiement configuré
        </div>
      )}
    </div>
  )
}
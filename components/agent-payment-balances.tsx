// components/agent-payment-balances.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PaymentMethod {
  name: string
  code: string
}

interface PaymentAccountWithMethod {
  id: string
  account_number: string
  current_balance: number
  is_primary: boolean
  payment_methods: PaymentMethod
}

export function AgentPaymentBalances({ agentId }: { agentId: string }) {
  const [accounts, setAccounts] = useState<PaymentAccountWithMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadPaymentAccounts()
  }, [agentId])

  const loadPaymentAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_payment_accounts')
        .select(`
          id,
          account_number,
          current_balance,
          is_primary,
          payment_methods (
            name,
            code
          )
        `)
        .eq('agent_id', agentId)
        .order('is_primary', { ascending: false })

      if (error) throw error

      if (data) {
        const transformedData: PaymentAccountWithMethod[] = data.map(item => ({
          id: item.id,
          account_number: item.account_number,
          current_balance: item.current_balance,
          is_primary: item.is_primary,
          payment_methods: Array.isArray(item.payment_methods) 
            ? item.payment_methods[0]
            : item.payment_methods
        }))
        setAccounts(transformedData)
      }
    } catch (error) {
      console.error('Error loading payment accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateBalance = async (accountId: string, newBalance: number) => {
    setUpdatingId(accountId)
    try {
      const { error } = await supabase
        .from('agent_payment_accounts')
        .update({ 
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)

      if (error) throw error
      
      setAccounts(prev => prev.map(account => 
        account.id === accountId 
          ? { ...account, current_balance: newBalance }
          : account
      ))
    } catch (error) {
      console.error('Error updating balance:', error)
      await loadPaymentAccounts()
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement des comptes...</span>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">Aucun compte de paiement configuré</p>
        <p className="text-sm text-gray-400 mt-1">
          Configurez vos moyens de paiement depuis les paramètres
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {accounts.map(account => (
          <div 
            key={account.id} 
            className={`border rounded-lg p-4 ${
              account.is_primary ? 'border-primary border-2' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">
                    {account.payment_methods?.name || 'Moyen de paiement'}
                  </h4>
                  {account.is_primary && (
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{account.account_number}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Solde actuel:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={account.current_balance}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    if (!isNaN(value)) {
                      updateBalance(account.id, value)
                    }
                  }}
                  className="w-32 px-3 py-2 border border-gray-300 rounded text-right focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={updatingId === account.id}
                />
                <span className="font-medium text-gray-900">$</span>
              </div>
            </div>
            
            {updatingId === account.id && (
              <div className="text-xs text-green-600 mt-2 flex items-center">
                <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></p>
                Mise à jour...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
// components/agent-payment-balances-safe.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// More flexible types to handle API response variations
interface PaymentMethodData {
  name?: string
  code?: string
}

interface PaymentAccountData {
  id: string
  account_number: string
  current_balance: number
  is_primary: boolean
  payment_methods: PaymentMethodData | PaymentMethodData[] | null
}

interface PaymentAccountDisplay {
  id: string
  account_number: string
  current_balance: number
  is_primary: boolean
  method_name: string
  method_code: string
}

export function AgentPaymentBalancesSafe({ agentId }: { agentId: string }) {
  const [accounts, setAccounts] = useState<PaymentAccountDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadPaymentAccounts()
  }, [agentId])

  const transformAccountData = (data: PaymentAccountData[]): PaymentAccountDisplay[] => {
    return data.map(item => {
      let methodName = 'Moyen de paiement'
      let methodCode = 'unknown'

      // Handle different response formats from Supabase
      if (item.payment_methods) {
        if (Array.isArray(item.payment_methods) && item.payment_methods.length > 0) {
          methodName = item.payment_methods[0].name || methodName
          methodCode = item.payment_methods[0].code || methodCode
        } else if (typeof item.payment_methods === 'object' && !Array.isArray(item.payment_methods)) {
          methodName = (item.payment_methods as PaymentMethodData).name || methodName
          methodCode = (item.payment_methods as PaymentMethodData).code || methodCode
        }
      }

      return {
        id: item.id,
        account_number: item.account_number,
        current_balance: item.current_balance,
        is_primary: item.is_primary,
        method_name: methodName,
        method_code: methodCode
      }
    })
  }

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
        const transformedData = transformAccountData(data as unknown as PaymentAccountData[])
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
      await loadPaymentAccounts() // Reload on error
    } finally {
      setUpdatingId(null)
    }
  }

  // ... rest of the component remains the same, just use method_name instead of payment_methods.name
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Soldes des comptes de paiement</h3>
        <button
          onClick={loadPaymentAccounts}
          className="text-sm text-primary hover:text-blue-700"
        >
          Actualiser
        </button>
      </div>
      
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
                    {account.method_name}
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
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                Mise à jour...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
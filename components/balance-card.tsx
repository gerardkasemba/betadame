// app/dashboard/components/balance-card.tsx
'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Eye, EyeOff, ArrowUp, ArrowDown, Send } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  amount: number
  type: string
  status: string
  created_at: string
}

interface BalanceCardProps {
  balance: number
  calculatedBalance: number
  userId: string
  transactions: Transaction[]
}

export default function BalanceCard({ balance, calculatedBalance, transactions }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true)

  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5)

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'game_win':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'withdrawal':
      case 'game_bet':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'game_win':
        return 'text-green-600'
      case 'withdrawal':
      case 'game_bet':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Dépôt'
      case 'withdrawal': return 'Retrait'
      case 'game_bet': return 'Mise jeu'
      case 'game_win': return 'Gain jeu'
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-gray-900 font-semibold text-foreground font-heading">
          Solde du Compte
        </h3>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Balance Display */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <DollarSign className="h-6 w-6 text-green-500" />
          <span className="text-3xl font-bold text-gray-900">
            {showBalance ? `${balance.toFixed(2)}` : '••••'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Solde actuel • {calculatedBalance.toFixed(2)} calculé
        </p>
      </div>

      {/* // Action Buttons - Minimalist Design */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Link
          href="/dashboard/deposit"
          className="group flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 hover:shadow-sm"
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="p-1.5 bg-green-100 rounded-lg group-hover:bg-green-500 transition-colors">
              <ArrowDown className="h-4 w-4 text-green-600 group-hover:text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-green-700">Déposer</span>
          </div>
        </Link>

        <Link
          href="/dashboard/withdraw"
          className="group flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 hover:shadow-sm"
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
              <ArrowUp className="h-4 w-4 text-blue-600 group-hover:text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">Retirer</span>
          </div>
        </Link>

        <Link
          href="/dashboard/send-money"
          className="group flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 hover:shadow-sm"
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition-colors">
              <Send className="h-4 w-4 text-purple-600 group-hover:text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-purple-700">Envoyer</span>
          </div>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Dépôts ce mois</p>
          <p className="font-semibold text-green-600">
            +{transactions
              .filter(t => t.type === 'deposit' && new Date(t.created_at).getMonth() === new Date().getMonth())
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}$
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 mb-1">Retraits ce mois</p>
          <p className="font-semibold text-red-600">
            -{transactions
              .filter(t => t.type === 'withdrawal' && new Date(t.created_at).getMonth() === new Date().getMonth())
              .reduce((sum, t) => sum + t.amount, 0)
              .toFixed(2)}$
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h4 className="font-medium text-gray-900 mb-4">Dernières transactions</h4>
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune transaction récente</p>
          ) : (
            recentTransactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="font-medium text-sm text-gray-600">{getTransactionLabel(transaction.type)}</p>
                    <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                  </div>
                </div>
                <span className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                  {transaction.type === 'deposit' || transaction.type === 'game_win' ? '+' : '-'}
                  {transaction.amount}$
                </span>
              </div>
            ))
          )}
        </div>

        {/* View All Transactions Link */}
        {recentTransactions.length > 0 && (
          <div className="mt-4 text-center">
            <Link
              href="/dashboard/transactions"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Voir toutes les transactions →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
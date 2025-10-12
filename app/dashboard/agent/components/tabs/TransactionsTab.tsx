import { Search, CreditCard, Wallet, Filter, Download, ChevronDown, Calendar, User, Phone } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Transaction } from '../../types'

interface TransactionsTabProps {
  recentTransactions: Transaction[]
}

export function TransactionsTab({ recentTransactions }: TransactionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter(transaction => {
      const matchesSearch = 
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [recentTransactions, searchTerm, statusFilter, typeFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'failed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-600'
      case 'withdrawal': return 'text-orange-600'
      case 'game_bet': return 'text-blue-600'
      case 'game_win': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'deposit' || type === 'game_win' ? 
      <CreditCard className="h-4 w-4" /> : 
      <Wallet className="h-4 w-4" />
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Dépôt'
      case 'withdrawal': return 'Retrait'
      case 'game_bet': return 'Mise'
      case 'game_win': return 'Gain'
      default: return type
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Traité'
      case 'pending': return 'En attente'
      case 'failed': return 'Échoué'
      default: return status
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Référence', 'Type', 'Montant', 'Statut', 'Utilisateur', 'Description']
    const csvData = filteredTransactions.map(tx => [
      new Date(tx.created_at).toLocaleDateString('fr-FR'),
      tx.reference,
      getTypeLabel(tx.type),
      `${tx.amount}$`,
      getStatusLabel(tx.status),
      tx.username || 'N/A',
      tx.description || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="space-y-4">
      {/* Quick Stats - Horizontal Scroll */}
      <div className="flex space-x-3 overflow-x-auto pb-2 -mx-2 px-2">
        <div className="bg-white p-3 rounded-xl border border-gray-200 min-w-[120px] flex-shrink-0">
          <p className="text-xs text-gray-600 mb-1">Total</p>
          <p className="text-lg font-bold text-gray-900">{filteredTransactions.length}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 min-w-[120px] flex-shrink-0">
          <p className="text-xs text-gray-600 mb-1">Montant</p>
          <p className="text-lg font-bold text-gray-900">{totalAmount}$</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 min-w-[120px] flex-shrink-0">
          <p className="text-xs text-gray-600 mb-1">Dépôts</p>
          <p className="text-lg font-bold text-green-600">
            {filteredTransactions.filter(tx => tx.type === 'deposit').length}
          </p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 min-w-[120px] flex-shrink-0">
          <p className="text-xs text-gray-600 mb-1">Retraits</p>
          <p className="text-lg font-bold text-orange-600">
            {filteredTransactions.filter(tx => tx.type === 'withdrawal').length}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Rechercher une transaction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'Tous' },
                  { value: 'deposit', label: 'Dépôts' },
                  { value: 'withdrawal', label: 'Retraits' },
                  { value: 'game_bet', label: 'Mises' },
                  { value: 'game_win', label: 'Gains' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTypeFilter(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      typeFilter === option.value
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Statut</label>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {[
                  { value: 'all', label: 'Tous' },
                  { value: 'completed', label: 'Traité' },
                  { value: 'pending', label: 'En attente' },
                  { value: 'failed', label: 'Échoué' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      statusFilter === option.value
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Exporter CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Transactions
            </h3>
            {filteredTransactions.length > 0 && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {filteredTransactions.length}
              </span>
            )}
          </div>
        </div>
        
        <div className="p-2">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-gray-300 mb-3">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500 font-medium mb-1">Aucune transaction</p>
              <p className="text-gray-400 text-sm">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Modifiez vos critères de recherche' 
                  : 'Aucune transaction disponible'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="p-3 border border-gray-200 rounded-lg active:bg-gray-50 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-full ${getTypeColor(transaction.type)} bg-opacity-10`}>
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {getTypeLabel(transaction.type)}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {transaction.reference}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold text-base ${
                        transaction.type === 'deposit' || transaction.type === 'game_win' 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        {transaction.type === 'deposit' || transaction.type === 'game_win' ? '+' : '-'}
                        {transaction.amount}$
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusLabel(transaction.status)}
                      </span>
                    </div>
                  </div>

                  {/* User Info */}
                  {(transaction.username || transaction.phone_number) && (
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                      {transaction.username && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{transaction.username}</span>
                        </div>
                      )}
                      {transaction.phone_number && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{transaction.phone_number}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description and Date */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {transaction.description ? (
                      <p className="truncate flex-1 mr-2">{transaction.description}</p>
                    ) : (
                      <div className="flex-1"></div>
                    )}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
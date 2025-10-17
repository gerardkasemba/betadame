import { Shield, RefreshCw, Wallet, Download, Info, ChevronRight, Wifi, WifiOff, Loader } from 'lucide-react'
import { fr } from '@/lib/i18n'
import { Agent, DashboardStats } from '../types'
import  { useState } from "react"

interface AgentHeaderProps {
  agent: Agent
  stats: DashboardStats | null
  refreshing: boolean
  onRefresh: () => void
  onWithdraw: () => void
  onOnlineStatusChange: (newStatus: 'online' | 'offline') => Promise<void>
}

export function AgentHeader({ 
  agent, 
  stats, 
  refreshing, 
  onRefresh, 
  onWithdraw,
  onOnlineStatusChange 
}: AgentHeaderProps) {
  const getVerificationStatus = (agent: any) => {
    if (agent.verification_status === 'approved') {
      return { text: 'Vérifié', color: 'text-green-600', bg: 'bg-green-100' }
    } else if (agent.verification_status === 'rejected') {
      return { text: 'Rejeté', color: 'text-red-600', bg: 'bg-red-100' }
    } else {
      return { text: 'En attente', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    }
  }

  const verificationStatus = getVerificationStatus(agent)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Agent</h1>
            <p className="text-sm text-gray-500">{agent.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className={`px-2 py-1 rounded-full text-xs font-medium ${verificationStatus.bg} ${verificationStatus.color}`}>
            {verificationStatus.text}
          </div>
        </div>
      </div>

      {/* Online Status Toggle */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            agent.online_status === 'online' ? 'bg-green-100' : 'bg-gray-200'
          }`}>
            {agent.online_status === 'online' ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-gray-600" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              Statut: <span className="capitalize">{agent.online_status}</span>
            </div>
            <div className="text-sm text-gray-600">
              {agent.online_status === 'online' 
                ? 'Visible pour les clients' 
                : 'Non visible pour les clients'
              }
            </div>
          </div>
        </div>
        
        <OnlineStatusToggle 
          agent={agent}
          onStatusChange={onOnlineStatusChange}
        />
      </div>

      {/* Balance Cards - Stacked for mobile */}
      <div className="space-y-3 mb-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Wallet className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Solde Disponible</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats?.available_balance?.toFixed(2) || '0.00'}$
              </div>
              <div className="text-xs text-blue-600 mt-1">Pour les retraits clients</div>
            </div>
            <ChevronRight className="h-4 w-4 text-blue-400" />
          </div>
        </div>

        {/* Platform Balance */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Solde Plateforme</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {stats?.platform_balance?.toFixed(2) || '0.00'}$
              </div>
              <div className="text-xs text-purple-600 mt-1">Pour les dépôts clients</div>
            </div>
            <button
              onClick={onWithdraw}
              disabled={(stats?.platform_balance || 0) <= 0}
              className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Download className="h-3 w-3" />
              Retirer
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{stats?.total_commissions?.toFixed(2) || '0.00'}$</div>
            <div className="text-gray-500 text-xs">Commissions</div>
          </div>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{stats?.today_transactions || 0}</div>
            <div className="text-gray-500 text-xs">Aujourd'hui</div>
          </div>
          <div className="w-px h-6 bg-gray-300"></div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{stats?.pending_requests || 0}</div>
            <div className="text-gray-500 text-xs">En attente</div>
          </div>
        </div>
      </div>

      {/* Agent Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium text-gray-900">Code Agent</div>
            <div className="text-gray-600 font-mono">{agent.code}</div>
          </div>
          <div className="text-right">
            <div className="font-medium text-gray-900">Région</div>
            <div className="text-gray-600">{fr.regions[agent.region as keyof typeof fr.regions] || 'Autre'}</div>
          </div>
        </div>
      </div>

      {/* Fee Info - Collapsible */}
      <details className="mt-3 group">
        <summary className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Info className="h-4 w-4" />
            <span>Informations frais</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-2">
          <div className="font-semibold">Frais appliqués:</div>
          <div>• Dépôts: Gratuit</div>
          <div>• Retraits clients: 8% total</div>
          <div>• Retraits agents: 4%</div>
        </div>
      </details>
    </div>
  )
}

// Online Status Toggle Component
interface OnlineStatusToggleProps {
  agent: Agent
  onStatusChange: (newStatus: 'online' | 'offline') => Promise<void>
}

function OnlineStatusToggle({ agent, onStatusChange }: OnlineStatusToggleProps) {
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(agent.online_status)

  const canGoOnline = agent.is_active && agent.verification_status === 'approved'

  const toggleOnlineStatus = async () => {
    if (!canGoOnline) {
      alert('Votre compte doit être actif et vérifié pour passer en ligne')
      return
    }

    setLoading(true)
    try {
      const newStatus = currentStatus === 'online' ? 'offline' : 'online'
      await onStatusChange(newStatus)
      setCurrentStatus(newStatus)
    } catch (error) {
      console.error('Error updating online status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-3">
      {!canGoOnline && currentStatus === 'offline' && (
        <div className="text-xs text-gray-500 text-right max-w-[80px]">
          {!agent.is_active ? 'Compte inactif' : 'Vérification en attente'}
        </div>
      )}
      
      <button
        onClick={toggleOnlineStatus}
        disabled={loading || !canGoOnline}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          currentStatus === 'online' 
            ? 'bg-green-500' 
            : 'bg-gray-300'
        } ${!canGoOnline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            currentStatus === 'online' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader className="h-3 w-3 animate-spin text-white" />
          </div>
        )}
      </button>
    </div>
  )
}
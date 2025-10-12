import { DollarSign, TrendingUp, CreditCard, Wallet, BarChart3, History } from 'lucide-react'
import { StatCard } from './StatCard'
import { DashboardStats } from '../types'

interface StatsGridProps {
  stats: DashboardStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        title="Ventes Totales"
        value={`${stats.total_sales.toFixed(2)}$`}
        icon={<DollarSign className="h-4 w-4" />}
        color="blue"
      />
      <StatCard
        title="Commissions"
        value={`${stats.total_commissions.toFixed(2)}$`}
        icon={<TrendingUp className="h-4 w-4" />}
        color="green"
      />
      <StatCard
        title="Dépôts"
        value={`${stats.total_deposits.toFixed(2)}$`}
        icon={<CreditCard className="h-4 w-4" />}
        color="emerald"
      />
      <StatCard
        title="Retraits"
        value={`${stats.total_withdrawals.toFixed(2)}$`}
        icon={<Wallet className="h-4 w-4" />}
        color="orange"
      />
      <StatCard
        title="Aujourd'hui"
        value={stats.today_transactions.toString()}
        icon={<BarChart3 className="h-4 w-4" />}
        color="purple"
      />
      <StatCard
        title="En Attente"
        value={stats.pending_transactions.toString()}
        icon={<History className="h-4 w-4" />}
        color="red"
      />
    </div>
  )
}
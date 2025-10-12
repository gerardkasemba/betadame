// app/dashboard/components/quick-stats.tsx
interface QuickStatsProps {
  title: string
  value: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'accent' | 'secondary' | 'purple' | 'orange' | 'red' | 'emerald' | 'yellow'
  change?: string
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  accent: 'bg-accent/20 text-accent-600',
  secondary: 'bg-secondary/20 text-secondary-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  yellow: 'bg-yellow-50 text-yellow-600',
}

export default function QuickStats({ title, value, icon, color, change }: QuickStatsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
          {change && (
            <p className="text-xs text-gray-500 truncate">{change}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]} ml-2 flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
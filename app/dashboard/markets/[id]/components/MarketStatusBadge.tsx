// app/markets/[id]/components/MarketStatusBadge.tsx
interface MarketStatusBadgeProps {
  status: string
}

export function MarketStatusBadge({ status }: MarketStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800', label: 'Active' }
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
      case 'resolved':
        return { color: 'bg-blue-100 text-blue-800', label: 'Resolved' }
      case 'closed':
        return { color: 'bg-gray-100 text-gray-800', label: 'Closed' }
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
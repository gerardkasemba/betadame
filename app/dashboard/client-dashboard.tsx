// app/dashboard/client-dashboard.tsx
'use client'

import { useAuth } from '../auth-provider'

export default function ClientDashboard({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-congolese-yellow"></div>
      </div>
    )
  }

  return <>{children}</>
}
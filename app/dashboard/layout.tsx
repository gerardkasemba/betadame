// app/dashboard/layout.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard-nav'
import ClientDashboard from './client-dashboard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <ClientDashboard>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </ClientDashboard>
  )
}
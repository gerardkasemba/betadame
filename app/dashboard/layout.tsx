// app/dashboard/layout.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard-nav'
import ClientDashboard from './client-dashboard'
import { GlobalGameNotifier } from '@/components/GlobalGameNotifier'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Get user ID for notifications
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ClientDashboard>
      <GlobalGameNotifier userId={user?.id || null}>
        <div className="min-h-screen bg-gray-50">
          <DashboardNav />
          <main className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </GlobalGameNotifier>
    </ClientDashboard>
  )
}
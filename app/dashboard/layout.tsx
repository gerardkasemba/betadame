// app/dashboard/layout.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard-nav'
import ClientDashboard from './client-dashboard'
import { createClient } from '@/lib/supabase/server'
import QuickCreateGameButton from '@/components/quick-create-game-button'
import LiveGamesTicker from '@/components/LiveGamesTicker'

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
      <div className="min-h-screen bg-">
        <DashboardNav />
        <div className="sticky top-16 z-45 pb-4">
          <LiveGamesTicker showControls={true} />
        </div>
        <main className="relative pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {children}
            {/* <QuickCreateGameButton /> */}
          </div>
        </main>
      </div>
    </ClientDashboard>
  )
}
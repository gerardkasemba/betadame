'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Header from '@/components/Header'
import { Suspense } from 'react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        const returnUrl = searchParams.get('returnUrl') || '/dashboard'
        router.push(returnUrl)
      }
    })

    return () => {
      if (data?.subscription) data.subscription.unsubscribe()
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
      <Header />
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#fecf6a] mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-[#194a8d]">Connexion en cours...</h2>
        <p className="text-gray-600">Veuillez patienter pendant que nous authentifions votre compte.</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
        <Header />
        <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#fecf6a] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-[#194a8d]">Chargement...</h2>
          <p className="text-gray-600">Préparation de l'authentification...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
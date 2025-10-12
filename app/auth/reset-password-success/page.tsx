import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Header from '@/components/Header'

export default function ResetPasswordSuccessPage() {
  return (
      <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
        <Header />
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-[#df1c44]" />
        <h2 className="text-2xl font-bold text-[#194a8d]">Mot de passe mis à jour</h2>
        <p className="text-gray-600">
          Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </p>
        <Link
          href="/auth/login"
          className="inline-block mt-4 px-4 py-2 bg-[#fecf6a] text-[#194a8d] font-semibold rounded-lg hover:bg-[#df1c44] hover:text-white transition-colors"
        >
          Se connecter maintenant
        </Link>
      </div>
    </div>
  )
}

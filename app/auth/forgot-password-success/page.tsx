import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Header from '@/components/Header'

export default function ForgotPasswordSuccessPage() {
  return (
    <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
      <Header />
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-[#df1c44]" />
        <h2 className="text-2xl font-bold text-[#194a8d]">Vérifiez votre email</h2>
        <p className="text-gray-600">
          Nous avons envoyé un lien pour réinitialiser votre mot de passe à votre adresse email. 
          Veuillez vérifier votre boîte de réception et suivre les instructions.
        </p>
        <Link
          href="/auth/login"
          className="inline-block mt-4 px-6 py-3 bg-[#fecf6a] text-[#194a8d] font-semibold rounded-lg hover:bg-[#df1c44] hover:text-white transition-colors"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}

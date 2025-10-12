import Header from '@/components/Header'
import { Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
      <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
        <Header />
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8 text-center">
        <Mail className="mx-auto h-16 w-16 text-[#194a8d]" />
        <h2 className="text-2xl font-bold text-[#194a8d]">Vérifiez votre email</h2>
        <p className="text-gray-600 mt-2">
          Nous avons envoyé un lien de vérification à votre adresse email. Veuillez vérifier votre boîte de réception pour activer votre compte et commencer à jouer.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Une fois vérifié, vous pourrez vous connecter et commencer à jouer sur Betadame !
        </p>
      </div>
    </div>
  )
}

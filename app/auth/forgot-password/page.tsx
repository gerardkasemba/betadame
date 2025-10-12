'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { forgotPassword } from '@/lib/auth-actions'
import Header from '@/components/Header'

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const { error } = await forgotPassword(formData)

    if (error) setError(error)
    else setSuccess("Un lien de réinitialisation a été envoyé à votre email.")
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
      <Header />
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#194a8d]">
            Réinitialiser le mot de passe
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Adresse e-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
                placeholder="Adresse e-mail"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#fecf6a] hover:bg-[#df1c44] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fecf6a] transition-colors"
            >
              Envoyer le lien
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="font-medium text-[#194a8d] hover:text-[#df1c44] transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

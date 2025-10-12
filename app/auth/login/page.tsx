'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { signIn } from '@/lib/auth-actions'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: ''
  })
  
  const router = useRouter()

  const validateForm = (email: string, password: string) => {
    const errors = {
      email: '',
      password: ''
    }

    // Email validation
    if (!email) {
      errors.email = 'L\'adresse e-mail est requise'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Veuillez entrer une adresse e-mail valide'
    }

    // Password validation
    if (!password) {
      errors.password = 'Le mot de passe est requis'
    } else if (password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }

    setFieldErrors(errors)
    return !errors.email && !errors.password
  }

  const clearErrors = () => {
    setError('')
    setSuccess('')
    setFieldErrors({ email: '', password: '' })
  }

  // Version alternative avec fallback
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearErrors()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!validateForm(email, password)) {
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn(formData)
      
      if (result?.error) {
        // Gestion des erreurs existante...
        switch (result.error) {
          case 'Invalid login credentials':
            setError('Adresse e-mail ou mot de passe incorrect')
            break
          // ... autres cas d'erreur
          default:
            setError(result.error)
        }
      } else if (result?.success) {
        setSuccess('Connexion réussie! Redirection en cours...')
        
        // Déterminer la destination avec fallback
        let redirectPath = '/dashboard'
        
        if (result.userType === 'wallet') {
          redirectPath = '/dashboard/digital-wallet'
        } else if (result.userType === 'player') {
          redirectPath = '/dashboard'
        }
        
        // Fallback si userType est undefined
        if (!result.userType) {
          console.warn('User type not found, redirecting to default dashboard')
          redirectPath = '/dashboard'
        }
        
        console.log(`User type: ${result.userType}, Redirecting to: ${redirectPath}`)
        
        setTimeout(() => {
          router.push(redirectPath)
        }, 1000)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Une erreur inattendue est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: 'email' | 'password') => {
    // Clear field-specific error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
    // Clear general error when user interacts with form
    if (error) {
      setError('')
    }
  }

  return (
    <>
      <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
        <Header />
        <div className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-[#194a8d]">
              Connexion à votre compte
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Bon retour sur Betadame
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className={`h-5 w-5 ${fieldErrors.email ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`relative block w-full pl-10 pr-3 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      fieldErrors.email 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-[#fecf6a] focus:border-transparent'
                    }`}
                    placeholder="votre@email.com"
                    onChange={() => handleInputChange('email')}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 ${fieldErrors.password ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`relative block w-full pl-10 pr-10 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      fieldErrors.password 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-[#fecf6a] focus:border-transparent'
                    }`}
                    placeholder="Votre mot de passe"
                    onChange={() => handleInputChange('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-[#194a8d] hover:text-[#df1c44] transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition-all duration-200 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#fecf6a] hover:bg-[#df1c44] focus:ring-2 focus:ring-offset-2 focus:ring-[#fecf6a] transform hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/auth/register"
                className="font-medium text-[#194a8d] hover:text-[#df1c44] transition-colors inline-flex items-center"
              >
                Pas de compte ? 
                <span className="ml-1 underline">Inscrivez-vous</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
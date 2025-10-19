// components/PushyRegisterButton.tsx
"use client"

import { useState } from 'react'
import { usePushy } from './PushyProvider'

export function PushyRegisterButton() {
  const { isReady, deviceToken, register } = usePushy()
  const [isRegistering, setIsRegistering] = useState(false)

  const handleRegister = async () => {
    setIsRegistering(true)
    try {
      const token = await register()
      if (token) {
        // Optionnellement enregistrer dans votre backend
        await fetch('/api/pushy/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceToken: token }),
        })
        alert('Inscription aux notifications réussie !')
      } else {
        alert('Échec de l\'inscription. Veuillez autoriser les notifications dans votre navigateur.')
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error)
      alert('L\'inscription a échoué. Veuillez réessayer.')
    } finally {
      setIsRegistering(false)
    }
  }

  if (deviceToken) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707-9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Notifications activées</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleRegister}
      disabled={isRegistering || !isReady}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isRegistering ? 'Inscription en cours...' : 'Activer les notifications'}
    </button>
  )
}
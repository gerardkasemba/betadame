// components/pwa-install-prompt.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

export default function PWAInstallPrompt() {
  const { showInstallPrompt, installApp, dismissPrompt, isInstalled } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isSafari, setIsSafari] = useState(false)

  useEffect(() => {
    // Check if user is on iOS Safari
    const userAgent = window.navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent))
    setIsSafari(/Safari/.test(userAgent) && !/Chrome/.test(userAgent))

    // Check if prompt was recently dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < oneWeek) {
        return
      }
    }

    // Show prompt if not installed and conditions are met
    if (!isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [isInstalled])

  if (!isVisible && !showInstallPrompt) return null

  const handleInstall = () => {
    if (isIOS && isSafari) {
      // Show iOS installation instructions
      return
    }
    installApp()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    dismissPrompt()
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Installer l'App</h3>
              <p className="text-sm text-gray-600">Meilleure expérience sur mobile</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Chargement plus rapide</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Hors ligne disponible</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Expérience native</span>
          </div>
        </div>

        {/* iOS Safari Instructions */}
        {(isIOS && isSafari) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Pour installer sur iOS:
            </p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Appuyez sur le bouton "Partager"</li>
              <li>Sélectionnez "Sur l'écran d'accueil"</li>
              <li>Appuyez sur "Ajouter"</li>
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-4 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium flex items-center justify-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Installer</span>
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'

import Image from 'next/image'
import Link from 'next/link'

interface HeaderProps {
  session?: boolean
}

export default function Header({ session }: HeaderProps) {
  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/">
                <Image 
                src="/logo-betadame-blue.svg"
                alt="BetaDame"
                height={100}
                width={100}
                className="rounded-lg"
              />
            </Link>
          </div>

          {/* Navigation (Desktop) */}
          <nav className="hidden md:flex space-x-8">
            <a 
              href="#features" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Fonctionnalités
            </a>
            <a 
              href="#how-it-works" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Comment ça marche
            </a>
            <a 
              href="#wallet" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Portefeuille
            </a>
          </nav>

          {/* Auth / Dashboard Buttons */}
          <div className="flex items-center space-x-4">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Tableau de Bord
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

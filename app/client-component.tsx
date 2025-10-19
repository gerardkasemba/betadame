"use client"

import './globals.css'
import { AuthProvider } from './auth-provider'
import Footer from '@/components/footer'
import { ToastProvider } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ToastContainer'
import { timeoutService } from '@/lib/background-services'
import { useEffect } from 'react'
import PWAInstallPrompt from '@/components/pwa-install-prompt'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    timeoutService.start()
    return () => {
      timeoutService.stop()
    }
  }, [])

  return (
    <>
    <head>
        <meta name="title" content="Game Platform - Play and Compete for Money" />
        <meta name="description" content="Real-time Congolese checker board game where players challenge others for money. Join, play, and win!" />
        <meta name="keywords" content="game, checkers, play for money, multiplayer, BetaDame" />

        <link rel="icon" type="image/png" sizes="32x32" href="/5.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/5.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        <meta name="theme-color" content="#001370" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BetaDame" />

        <link rel="manifest" href="/manifest.json" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="BetaDame - Play and Compete for Money" />
        <meta property="og:description" content="Real-time Congolese checker board game where players challenge others for money. Join, play, and win!" />
        <meta property="og:url" content="https://www.betadame.vercel.app/" />
        <meta property="og:image" content="https://www.betadame.vercel.app/og-image.png" />
        <meta property="og:site_name" content="BetaDame" />


        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BetaDame - Play and Compete for Money" />
        <meta name="twitter:description" content="Real-time Congolese checker board game where players challenge others for money. Join, play, and win!" />
        <meta name="twitter:image" content="https://www.betadame.vercel.app/og-image.png" />
        <meta name="twitter:creator" content="@betadame" />


        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;700&display=swap" rel="stylesheet" />
    </head>
        <body className="min-h-screen bg-gradient-to-br from-congolese-blue to-congolese-green">
            <AuthProvider>
                <ToastProvider>
                {children}
                <PWAInstallPrompt />
                <ToastContainer />
                <Footer />
                </ToastProvider>
            </AuthProvider>
        </body>
    </>
  )
}
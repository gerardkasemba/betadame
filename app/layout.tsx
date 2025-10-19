"use client"

import './globals.css'
import { AuthProvider } from './auth-provider'
import Footer from '@/components/footer'
import { ToastProvider } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ToastContainer'
import { timeoutService } from '@/lib/background-services'
import { PushyProvider } from '@/components/PushyProvider'
import { useEffect } from 'react'
import Head from 'next/head'

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
    <html lang="en">
      <Head>
        <title>Betadame - Congolese Checkers</title>
        <meta name="description" content="Real-time Congolese checker board game for money" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#001370ff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Betadame - Congolese Checkers" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Alan+Sans:wght@300..900&family=Didact+Gothic&family=Fredoka:wght@300..700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap"
        />
      </Head>
      <body className="min-h-screen bg-gradient-to-br from-congolese-blue to-congolese-green">
        <AuthProvider>
          <PushyProvider>
            <ToastProvider>
              {children}
              <ToastContainer />
              <Footer />
            </ToastProvider>
          </PushyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
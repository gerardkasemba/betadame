// app/layout.tsx
import type { Metadata } from 'next'

import './globals.css'
import { AuthProvider } from './auth-provider'
import Footer from '@/components/footer'
import { ToastProvider } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ToastContainer'


export const metadata: Metadata = {
  title: 'Betadame - Congolese Checkers',
  description: 'Real-time Congolese checker board game for money',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Alan+Sans:wght@300..900&family=Didact+Gothic&family=Fredoka:wght@300..700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-congolese-blue to-congolese-green">
        <AuthProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
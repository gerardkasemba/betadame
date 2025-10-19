// components/PushyProvider.tsx
"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { pushyService } from '@/lib/pushy'
import Script from 'next/script'

interface PushyContextType {
  isReady: boolean;
  deviceToken: string | null;
  register: () => Promise<string | null>;
  subscribe: (topic: string) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;
}

const PushyContext = createContext<PushyContextType | undefined>(undefined)

export function PushyProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if (!scriptLoaded) return;

    // Auto-register on load (or you can require user interaction)
    const initPushy = async () => {
      // Note: Some browsers require user interaction before registration
      // You may want to move this to a button click instead
      const token = await pushyService.register()
      setDeviceToken(token)
      setIsReady(true)
    }

    // Small delay to ensure Pushy SDK is fully loaded
    setTimeout(initPushy, 500)
  }, [scriptLoaded])

  const register = async () => {
    const token = await pushyService.register()
    setDeviceToken(token)
    setIsReady(true)
    return token
  }

  const subscribe = async (topic: string) => {
    await pushyService.subscribe(topic)
  }

  const unsubscribe = async (topic: string) => {
    await pushyService.unsubscribe(topic)
  }

  return (
    <>
      <Script
        src="https://sdk.pushy.me/web/1.0.24/pushy-sdk.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={(e) => console.error('Failed to load Pushy SDK:', e)}
      />
      <PushyContext.Provider value={{ isReady, deviceToken, register, subscribe, unsubscribe }}>
        {children}
      </PushyContext.Provider>
    </>
  )
}

export function usePushy() {
  const context = useContext(PushyContext)
  if (context === undefined) {
    throw new Error('usePushy must be used within a PushyProvider')
  }
  return context
}
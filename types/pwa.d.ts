// types/pwa.d.ts
interface Window {
  deferredPrompt?: BeforeInstallPromptEvent
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
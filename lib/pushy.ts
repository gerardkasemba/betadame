// lib/pushy.ts
declare global {
  interface Window {
    Pushy: any;
  }
}

class PushyService {
  private isInitialized = false;
  private deviceToken: string | null = null;

  async register() {
    if (this.isInitialized) return this.deviceToken;

    // Check if Pushy SDK is loaded
    if (typeof window === 'undefined' || !window.Pushy) {
      console.error('Pushy SDK not loaded');
      return null;
    }

    try {
      // Register visitor for push notifications
      // Note: This must be called from a user-initiated event (like a button click)
      this.deviceToken = await window.Pushy.register({
        appId: process.env.NEXT_PUBLIC_PUSHY_APP_ID,
      });

      console.log('Pushy device token:', this.deviceToken);
      this.isInitialized = true;

      return this.deviceToken;
    } catch (err: any) {
      console.error('Pushy registration failed:', err.message);
      return null;
    }
  }

  getDeviceToken() {
    return this.deviceToken;
  }

  async subscribe(topic: string) {
    if (!this.isInitialized) {
      await this.register();
    }

    if (!window.Pushy) return;

    try {
      await window.Pushy.subscribe(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (err: any) {
      console.error('Failed to subscribe to topic:', err.message);
    }
  }

  async unsubscribe(topic: string) {
    if (!window.Pushy) return;

    try {
      await window.Pushy.unsubscribe(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (err: any) {
      console.error('Failed to unsubscribe from topic:', err.message);
    }
  }

  isReady() {
    return this.isInitialized;
  }
}

export const pushyService = new PushyService();
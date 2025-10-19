// hooks/useNotifications.ts
import { useState, useEffect } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      console.error('Service workers are not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  const subscribeToPush = async () => {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    try {
      // You'll need to generate VAPID keys for production
      // For now, this sets up the subscription structure
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ),
      });
      
      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  };

  const showNotification = async (options: NotificationOptions) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: options.tag || 'default',
      });
    } else {
      // Fallback to basic notification
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
      });
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    registerServiceWorker,
    subscribeToPush,
    showNotification,
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
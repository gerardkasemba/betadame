'use client';
import { useEffect } from 'react';

export function Notification() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        }).then(sub => {
          fetch('/api/notify', {
            method: 'POST',
            body: JSON.stringify({ subscription: sub, message: 'Welcome to Congolese Checkers!' }),
          });
        });
      });
    }
  }, []);

  return null;
}
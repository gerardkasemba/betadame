// File: public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyCpELI_S172QJL0kyylWrujy2YS9nTqI-A",
  authDomain: "betadame-7b606.firebaseapp.com",
  projectId: "betadame-7b606",
  storageBucket: "betadame-7b606.firebasestorage.app",
  messagingSenderId: "138857109711",
  appId: "1:138857109711:web:80ce26702909bb7bbcbfba"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.type || 'general',
    data: payload.data,
    actions: payload.data?.actions ? JSON.parse(payload.data.actions) : []
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

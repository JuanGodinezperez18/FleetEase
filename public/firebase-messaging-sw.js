// public/firebase-messaging-sw.js
// Service Worker para Firebase Cloud Messaging

// Importar Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBqdnnCZf70rQMLiTx9LIguJqXwCGR11ac",
  authDomain: "fleetease-manager.firebaseapp.com",
  databaseURL: "https://fleetease-manager-default-rtdb.firebaseio.com",
  projectId: "fleetease-manager",
  storageBucket: "fleetease-manager.appspot.com",
  messagingSenderId: "347536268653",
  appId: "1:347536268653:web:2148551b5f76504df40e64",
  measurementId: "G-K1BRZB6JEY"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejar mensajes en segundo plano (cuando la app está cerrada o minimizada)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);

  const notificationTitle = payload.notification?.title || 'FleetEase Manager';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.notificationId || 'default',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clicks en las notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Click en notificación:', event.notification.tag);

  event.notification.close();

  // Abrir o enfocar la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocala
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      // Si no, abre una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('[firebase-messaging-sw.js] Service Worker inicializado correctamente');

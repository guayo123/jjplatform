// Service worker minimo: hace la web instalable. No cachea nada a proposito
// (los datos del alumno deben venir siempre frescos del servidor).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

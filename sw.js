const CACHE_NAME = 'dnd-vtt-cache-v2'; // Bump version to trigger update
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/services/db.ts',
  '/hooks/useWindowSync.ts',
  '/hooks/useImageLibrary.ts',
  '/hooks/useFullScreen.ts',
  '/components/Icons.tsx',
  '/components/Viewport.tsx',
  '/components/NavControls.tsx',
  '/components/Toolbar.tsx',
  '/components/ImageLibrary.tsx',
  '/components/PlayerView.tsx',
  '/components/MasterView.tsx',
  '/components/MeasureControls.tsx',
  '/components/FogControls.tsx',
  '/components/Modal.tsx',
  '/components/ConfirmationModal.tsx',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/client',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate new SW immediately
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
            // Network fetch failed, probably offline, the cached response (if any) is already being returned.
        });

        // Return the cached response immediately if it exists, otherwise wait for the network.
        return response || fetchPromise;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of open pages
  );
});
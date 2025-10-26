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
  '/hooks/useServiceWorker.ts',
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
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. Try to get the response from the cache.
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. If not in cache, try to fetch from the network.
      try {
        const networkResponse = await fetch(event.request);

        // If the fetch is successful, clone it and store it in the cache for future use.
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          await cache.put(event.request, responseToCache);
        }
        
        return networkResponse;
      } catch (error) {
        // The network fetch failed, likely because the user is offline.
        // Since we didn't find it in the cache, we let the request fail.
        console.error('Fetch failed, and no cache match was found for:', event.request.url, error);
        throw error;
      }
    })()
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
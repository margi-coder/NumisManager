const CACHE_NAME = 'numismanager-pwa-v19';
const ASSETS_TO_CACHE = [
  '/',
  '/app',
  '/static/manifest.json',
  '/static/img/logo.png',
  '/static/vendor/chartjs/chart.umd.min.js',
  '/static/css/style.css',
  '/static/css/components.css',
  '/static/css/album.css',
  '/static/js/mobile_offline_engine.js',
  '/static/js/api.js',
  '/static/js/auth.js',
  '/static/js/dashboard.js',
  '/static/js/pembelian.js',
  '/static/js/koleksi.js',
  '/static/js/penjualan.js',
  '/static/js/supplier.js',
  '/static/js/manajemen_data.js',
  '/static/js/laporan.js',
  '/static/js/album.js',
  '/static/js/backup.js',
  '/static/js/kreativitas.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

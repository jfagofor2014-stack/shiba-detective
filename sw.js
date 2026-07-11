const CACHE = 'shiba-detective-v1';
const ASSETS = [
  './', './index.html', './style.css', './manifest.json', './icon.svg',
  './data/scenario.json',
  './src/main.js', './src/engine.js', './src/state.js', './src/scenario.js',
  './src/ui/screen.js', './src/ui/art.js', './src/ui/typewriter.js', './src/ui/sound.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Firebase と CDN はキャッシュしない（常にネットワーク）
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit ?? fetch(e.request)));
});

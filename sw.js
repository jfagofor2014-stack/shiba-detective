const CACHE = 'shiba-detective-v4';
// main.js は src/net/*.js を静的 import しているので、オフラインで起動するにはこれらも要る
const ASSETS = [
  './', './index.html', './style.css', './manifest.json', './icon.svg', './icon-180.png', './icon-512.png',
  './data/scenario.json',
  './src/main.js', './src/engine.js', './src/state.js', './src/scenario.js',
  './src/ui/screen.js', './src/ui/art.js', './src/ui/pixel.js', './src/ui/sprites.js', './src/ui/typewriter.js', './src/ui/sound.js',
  './src/net/firebase.js', './src/net/firebase-config.js', './src/net/room.js',
  // 場面画像（art.js の artImages() と同じ並び。合計 1.6MB ほど）
  './img/title.webp', './img/closeup-raizo.webp', './img/closeup-hana.webp', './img/closeup-kuranosuke.webp',
  './img/living-raizo.webp', './img/living-hana.webp', './img/living-kuranosuke.webp',
  './img/entrance-raizo.webp', './img/entrance-hana.webp', './img/entrance-kuranosuke.webp',
  './img/slope-raizo.webp', './img/slope-hana.webp', './img/slope-kuranosuke.webp',
  './img/nikuten-raizo.webp', './img/nikuten-hana.webp', './img/nikuten-kuranosuke.webp',
  './img/shimabaraya-raizo.webp', './img/shimabaraya-hana.webp', './img/shimabaraya-kuranosuke.webp',
  './img/station-raizo.webp', './img/station-hana.webp', './img/station-kuranosuke.webp',
  './img/kichi-raizo.webp', './img/kichi-hana.webp', './img/kichi-kuranosuke.webp',
  './img/finale.webp',
];

self.addEventListener('install', (e) => {
  // ブラウザの HTTP キャッシュ越しに古いファイルを取り込まないよう reload で取り直す
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネットワーク優先: オンラインなら常に最新を返してキャッシュも更新し、オフラインの時だけキャッシュで遊べる。
// キャッシュ優先だと、更新のたびに CACHE 名を上げ忘れると古い JS が残り続ける。
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Firebase と CDN は横取りしない（常にネットワーク）
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit ?? Response.error()))
  );
});

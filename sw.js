// Madde 5.6 - Gerçek PWA desteği: bu service worker sayesinde uygulama ana ekrana eklenebilir
// (manifest.json ile birlikte) ve internet olmadığında da (en azından önceden ziyaret edilmiş
// halinin) açılabilir.
//
// Strateji bilinçli olarak İKİYE ayrılıyor:
//  - Ana HTML dosyası (index.html) için "önce ağ, olmazsa önbellek" (network-first). Bu uygulama
//    Firestore ile canlı senkronize çalışıyor ve sık güncelleniyor; eğer HTML'i cache-first
//    yapsaydık kullanıcılar yeni bir dağıtımdan (deploy) SONRA bile eski/bozuk bir sürümü
//    görmeye devam edebilirdi. Bu yüzden bağlantı varsa her zaman en güncel sürüm indirilir;
//    sadece TAMAMEN çevrimdışıyken önbellekteki son bilinen sürüme düşülür.
//  - Statik varlıklar (manifest, ikonlar) için "önce önbellek" (cache-first) — bunlar nadiren
//    değiştiği için gereksiz ağ isteğinden kaçınmak daha performanslı.
//
// CACHE_VERSION her önemli değişiklikte artırılmalı ki eski önbellek otomatik temizlensin.
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'gorev-takip-' + CACHE_VERSION;
const PRECACHE_URLS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PUT vb. (varsa) doğrudan ağa gitsin, önbelleğe alınmasın

  const isHtmlNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHtmlNavigation) {
    // Ana sayfa: önce ağ, başarısız olursa (çevrimdışı) önbellekteki son bilinen sürüm.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Statik varlıklar: önce önbellek, yoksa ağdan al ve önbelleğe ekle.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});

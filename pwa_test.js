// Madde 5.6 - Gercek PWA (manifest.json + service worker) dogrulama testleri.
// Not: bu testler gorev-takip.html'i eval ETMEZ (uygulama mantigini test etmez), sadece
// PWA icin gereken statik dosyalarin varligini, gecerliligini ve HTML'e dogru baglandigini
// dogrular. Gercek "install edilebilirlik" ve service worker davranisi ancak gercek bir
// tarayicida test edilebilir; bu sandbox'ta o mumkun degil (npm registry erisimi yok, bu
// yuzden Puppeteer/Playwright kullanilamiyor - proje genelinde bilinen bir kisit).
const fs = require('fs');
const path = require('path');

console.log('--- manifest.json dosyasi var mi ve gecerli JSON mu ---');
const manifestRaw = fs.readFileSync('manifest.json', 'utf8');
let manifest;
let manifestParseError = false;
try{ manifest = JSON.parse(manifestRaw); }catch(e){ manifestParseError = true; console.error(e); }
console.log('Gecerli JSON mu:', !manifestParseError);
console.log('name alani var mi:', typeof manifest.name === 'string' && manifest.name.length > 0);
console.log('short_name alani var mi:', typeof manifest.short_name === 'string' && manifest.short_name.length > 0);
console.log('start_url alani var mi:', typeof manifest.start_url === 'string' && manifest.start_url.length > 0);
console.log('display standalone mi:', manifest.display === 'standalone');
console.log('theme_color var mi:', /^#[0-9a-fA-F]{6}$/.test(manifest.theme_color||''));
console.log('background_color var mi:', /^#[0-9a-fA-F]{6}$/.test(manifest.background_color||''));
console.log('icons dizisi en az 2 boyut iceriyor mu (192 ve 512):', Array.isArray(manifest.icons) && manifest.icons.some(i=>i.sizes==='192x192') && manifest.icons.some(i=>i.sizes==='512x512'));

console.log('--- Manifest te referans verilen ikon dosyalari gercekten diskte var mi ---');
manifest.icons.forEach(icon=>{
  const exists = fs.existsSync(icon.src);
  console.log(`${icon.src} dosyasi var mi:`, exists);
  if(exists){
    const stat = fs.statSync(icon.src);
    console.log(`${icon.src} bos degil mi (> 0 byte):`, stat.size > 0);
  }
});

console.log('--- Ikonlarin gercekten PNG olup manifestteki boyutla eslesip eslesmedigi (PNG header + IHDR) ---');
function readPngSize(filePath){
  const buf = fs.readFileSync(filePath);
  // PNG imzasi: 8 byte, ardindan IHDR chunk'inin ilk 4 byte'i length, sonraki 4 byte 'IHDR',
  // ardindan 4 byte width, 4 byte height (big-endian).
  const isPng = buf.slice(0,8).toString('hex') === '89504e470d0a1a0a';
  if(!isPng) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return {width, height};
}
manifest.icons.forEach(icon=>{
  if(!fs.existsSync(icon.src)) return;
  const dims = readPngSize(icon.src);
  const expected = icon.sizes.split('x').map(Number);
  console.log(`${icon.src} gecerli bir PNG mi:`, dims !== null);
  console.log(`${icon.src} boyutu manifest ile eslesiyor mu (${icon.sizes}):`, dims && dims.width === expected[0] && dims.height === expected[1]);
});

console.log('--- sw.js dosyasi var mi ve temel PWA yasam dongusu olaylarini iceriyor mu ---');
const swSource = fs.readFileSync('sw.js', 'utf8');
console.log('install olayi dinleniyor mu:', swSource.includes("addEventListener('install'"));
console.log('activate olayi dinleniyor mu:', swSource.includes("addEventListener('activate'"));
console.log('fetch olayi dinleniyor mu:', swSource.includes("addEventListener('fetch'"));
console.log('Eski cache surumleri temizleniyor mu (caches.delete):', swSource.includes('caches.delete'));
console.log('HTML navigasyonu icin network-first stratejisi var mi (guncel surum garantisi):', swSource.includes('isHtmlNavigation') && swSource.includes('fetch(req)'));
console.log('skipWaiting cagriliyor mu (yeni SW hizli devreye girsin):', swSource.includes('skipWaiting'));

console.log('--- gorev-takip.html PWA dosyalarina dogru baglanmis mi ---');
const html = fs.readFileSync('index.html', 'utf8');
console.log('<link rel="manifest"> var mi:', html.includes('<link rel="manifest" href="manifest.json">'));
console.log('theme-color meta etiketi var mi:', /<meta name="theme-color" content="#[0-9a-fA-F]{6}">/.test(html));
console.log('apple-touch-icon var mi:', html.includes('<link rel="apple-touch-icon"'));
console.log('serviceWorker.register cagrisi var mi:', html.includes("navigator.serviceWorker.register('sw.js')"));
console.log('serviceWorker kaydi typeof kontrolu ile korunmus mu (Node/eski tarayici guvenligi):', html.includes("typeof navigator !== 'undefined'"));

console.log('--- index.html (dagitim kopyasi) de ayni PWA baglantilarini iceriyor mu ---');
if(fs.existsSync('index.html')){
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  console.log('index.html icinde manifest baglantisi var mi:', indexHtml.includes('<link rel="manifest" href="manifest.json">'));
  console.log('index.html icinde SW kaydi var mi:', indexHtml.includes("navigator.serviceWorker.register('sw.js')"));
} else {
  console.log('index.html henuz olusturulmamis (bu asamada normal olabilir).');
}

console.log('TÜM PWA (5.6) DOĞRULAMA TESTLERI TAMAMLANDI');

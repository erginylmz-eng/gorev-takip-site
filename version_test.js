// Madde 8.3 - Surum/degisiklik gunlugu testleri.
const fs = require('fs');

console.log('--- gorev-takip.html icinde APP_VERSION tanimli mi ve semver bicimine uyuyor mu ---');
const html = fs.readFileSync('index.html', 'utf8');
const versionMatch = html.match(/const APP_VERSION = '([^']+)';/);
console.log('APP_VERSION bulundu mu:', versionMatch !== null);
const appVersion = versionMatch ? versionMatch[1] : null;
console.log('Semver bicimine uyuyor mu (X.Y.Z):', /^\d+\.\d+\.\d+$/.test(appVersion || ''));

console.log('--- Baslikta sürüm etiketi (appVersionTag) elemani var mi ---');
console.log('appVersionTag id li span HTML de var mi:', html.includes('id="appVersionTag"'));
console.log('Betik appVersionTag icerigini APP_VERSION ile dolduruyor mu:', html.includes("versionTagEl.textContent = 'v' + APP_VERSION"));

console.log('--- CHANGELOG.md dosyasi var mi ve APP_VERSION ile eslesen bir baslik iceriyor mu ---');
const changelogExists = fs.existsSync('CHANGELOG.md');
console.log('CHANGELOG.md var mi:', changelogExists);
if(changelogExists){
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  console.log('CHANGELOG basligi (# Değişiklik Günlüğü) var mi:', changelog.includes('# Değişiklik Günlüğü'));
  console.log(`En ustteki surum basligi APP_VERSION (${appVersion}) ile eslesiyor mu:`, changelog.includes(`## v${appVersion}`));
  // En ustteki (ilk) surum basligi gercekten dosyanin basinda mi (en yeni surum en ustte olmali)
  const firstHeadingIndex = changelog.indexOf('## v');
  const versionHeadingIndex = changelog.indexOf(`## v${appVersion}`);
  console.log('Mevcut surum, changelog daki EN UST (en yeni) baslik mi:', firstHeadingIndex === versionHeadingIndex && firstHeadingIndex !== -1);
  console.log('Eski surumler icin de en az bir baslik var mi (v1.0.0 dahil, tam gecmis):', changelog.includes('## v1.0.0'));
}

console.log('--- Sistem denetimi ile ilgili ana kategoriler changelog da temsil ediliyor mu (ornek kontrol) ---');
if(changelogExists){
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const expectedMentions = ['Tekrarlanan', 'bildirim merkezi', 'PWA', 'çoklu dil', 'Zaman takibi', 'Firestore güvenlik', 'yedekleme', 'çöp kutusu'];
  expectedMentions.forEach(term=>{
    console.log(`"${term}" gecen bir madde var mi:`, changelog.toLowerCase().includes(term.toLowerCase()));
  });
}

console.log('TÜM SÜRÜM/DEĞİŞİKLİK GÜNLÜĞÜ (8.3) TESTLERI TAMAMLANDI');

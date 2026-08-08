# Değişiklik Günlüğü (Changelog)

Bu dosya, Görev Takip Merkezi uygulamasındaki önemli değişiklikleri sürüm sırasına göre listeler. Biçim [Keep a Changelog](https://keepachangelog.com/) yaklaşımına yakındır (Eklenen / Değişen / Düzeltilen).

**Not:** Sürümleme bu belgeyle birlikte (madde 8.3 kapsamında) geriye dönük olarak eklendi. Bu yüzden eski sürümlerin tam tarihleri yoktur — sürümler geliştirme sırasına göre gruplanmıştır. Bu andan itibaren yeni her sürüm gerçek tarihiyle eklenecektir. Uygulamanın o an hangi sürümde olduğu, sayfanın üst kısmındaki başlığın yanında küçük bir `vX.Y.Z` etiketiyle gösterilir.

## v1.9.2 — 2026-08-07

### Eklenen
- Sürüm/değişiklik günlüğü: bu dosya, uygulama içindeki `APP_VERSION` sabiti ve başlıktaki sürüm etiketi (madde 8.3).

### Değişen
- Mail hatırlatma betiği (`gonder.js`) artık `calcProgress`/`checklistProgress`/`fmtDate`/`escapeHtml` fonksiyonlarını kendi içinde tekrar tanımlamıyor; ortak bir `shared-logic.js` dosyasından kullanıyor. İki taraf (tarayıcı uygulaması ve Node.js betiği) arasındaki davranış tutarlılığı otomatik bir testle (`shared_logic_consistency_test.js`) korunuyor (madde 8.2).

## v1.9.1 — Bakım ve altyapı sağlamlaştırma

### Eklenen
- Alt görev döngü koruması: bir görevin kendi alt görevlerinden birine üst görev olarak atanması engellendi; alt görev derinliği makul bir sınırla korunuyor (madde 6.1–6.2).
- Firestore güvenlik kurallarının repo içinde versiyonlanması (`firestore.rules`), Firebase Console'daki kurallarla senkron tutulması gerektiğine dair belgeleme (madde 8.1).

### Değişen
- Performans denetimi: 500+ görev ve 100 seviyeli iç içe alt görev hiyerarşisiyle test edilip `calcProgress`, Gantt satır oluşturma ve genel render zincirinin makul sürede tamamlandığı doğrulandı (madde 7.1–7.3).

## v1.9.0 — Yeni özellikler paketi

### Eklenen
- **Tekrarlanan (periyodik) görevler**: bir görev "Tamamlandı" olarak işaretlendiğinde, seçilen sıklığa (günlük/haftalık/aylık) göre bir sonraki tekrarı otomatik oluşturuluyor.
- **Genişletilmiş arama**: arama kutusu artık atanan/atadığın görevleri de (alt görev bütünlüğünü koruyarak) süzüyor.
- **Kalıcı bildirim merkezi**: 🔔 zil ikonu, geçmiş "görev atandı"/"görev tamamlandı"/"bağlantı isteği" bildirimlerini okundu/okunmadı durumuyla birlikte kalıcı olarak listeliyor.
- **Atanan görevlerde yorum/not alışverişi**: atayan ve atanan kişi, bir görev üzerinde karşılıklı yorum bırakabiliyor (anında buluta yazılır).
- **Değişiklik geçmişi (audit log)**: atanan görevlerde başlık/durum/öncelik/tarih değişiklikleri otomatik olarak okunabilir bir geçmiş listesine kaydediliyor.
- **Gerçek PWA desteği**: `manifest.json` + `sw.js` (service worker) ile uygulama ana ekrana eklenebiliyor ve çevrimdışı açılabiliyor.
- **Çoklu dil desteği altyapısı**: `t()` fonksiyonu ve `data-i18n` işaretleyicileriyle çalışan bir çeviri sistemi; başlık çubuğu 🌐 TR/EN düğmesiyle anında dil değiştirebiliyor (tam uygulama çevirisi değil, genişletilebilir bir altyapı).
- **Yönetici / Genel Bakış paneli**: 📈 düğmesiyle, atadığın görevlerin kişi bazında özetini (toplam/tamamlanan/gecikmiş) görebiliyorsun.
- **Zaman takibi**: her göreve dakika cinsinden zaman kaydı (opsiyonel not ile) eklenebiliyor, toplam harcanan süre görev satırında gösteriliyor.

## v1.8.0 — Güvenlik, güvenilirlik ve erişilebilirlik denetimi

### Eklenen
- Ücretsiz otomatik yedekleme (GitHub Actions ile günlük Firestore yedeği, 30 günlük saklama).
- Geri alınabilir silme (soft delete / çöp kutusu): hem kişisel hem atanan görevler için, 30 gün sonra otomatik kalıcı silme.
- Netlify'ın GitHub'a bağlanarak otomatik dağıtım yapması için kurulum rehberi.
- Mail otomasyonu başarısızlık bildirimi: günlük hatırlatma ya da yedekleme betiği hata verirse e-posta ile uyarı.
- GitHub Actions ile otomatik test (CI) — hem ana uygulama hem mail otomasyonu için ayrı test paketleri.
- Erişilebilirlik: klavye ile gezinme (Tab + Enter/Boşluk), aria-label'lar, WCAG kontrast düzeltmesi, tam karanlık mod.

### Güvenlik
- `userDirectory` koleksiyonu uid yerine e-posta ile anahtarlandı ve client-side `list` sorgusu güvenlik kurallarıyla engellendi (kullanıcı keşfi/toplu tarama riski kapatıldı).
- Dosya eklerinde tehlikeli uzantı/MIME türü engelleme (çalıştırılabilir/betik dosyaları reddediliyor).

## v1.7.0 — Mail hatırlatma sistemi

### Eklenen
- Termine 3/2/1 gün kalan, henüz tamamlanmamış görevler için günlük özet hatırlatma maili (GitHub Actions ile otomatik gönderim).
- Uygulama içi mail alıcı listesi yönetim ekranı (✉️ Mail Ayarları).

## v1.6.0 — Gelişmiş Gantt görünümü

### Eklenen
- Gantt şeridinde kategori başlık satırları, atanan görevlerin (bana atananlar/benim atadıklarım) Gantt'a dahil edilmesi.
- Bölüm başlıkları (TAKVİM / GÖREV DURUMU / GÖREVLERİM / ONLINE GÖREVLER) ile sayfa düzeninin netleştirilmesi.
- Kategori kartlarında yaklaşan termin uyarısı, koyu arka plan tonu iyileştirmesi.

## v1.5.0 — Görev atama ve ekip sistemi

### Eklenen
- Kullanıcı dizini + bağlantı (çalışan ekleme) sistemi, karşılıklı onay akışı.
- Görev atama: bir çalışana görev atayabilme, atanan görevlerin gerçek zamanlı (Firestore) senkronizasyonu.
- Görev tamamlanma bildirimi: karşı taraf bir görevi tamamladığında anlık toast bildirimi.
- Dashboard'a "Bana Atananlar" kartı, Excel dışa aktarımına atanan görevlerin dahil edilmesi.

## v1.4.0 — Dosya ekleri

### Eklenen
- Görevlere dosya ekleyebilme (kişisel ve atanan görevlerde), boyut sınırı ve önizleme/indirme.

## v1.3.0 — Görev detaylarının zenginleştirilmesi

### Eklenen
- Mini görevler (kontrol listesi), durum etiketi (Başlamadı/Yapılmakta/Tamamlandı/Tamamlanamadı), öncelik seviyeleri.
- ESC ile modalda değişiklik kontrolü (kaydetmeden çıkarken uyarı).
- Görev satırına tıklayınca doğrudan düzenleme modalının açılması.

## v1.2.0 — Takvim ve Gantt

### Eklenen
- Sayfanın üstünde takvim/Gantt şeridi görünümü, Haftalık/Aylık/Yıllık görünüm seçici.
- Beklenen ilerleme / gecikme riski hesaplama mantığı ve risk ikonları.
- Alt görev tarihlerinin üst görev aralığıyla sınırlandırılması, miras alınan tarihli alt görev çubuklarının görsel ayrımı.

## v1.1.0 — Temel iyileştirmeler

### Eklenen
- Sesli giriş (mikrofon ile görev başlığı/açıklaması yazdırma).
- Dashboard'a "Toplam" kartı, Excel'e aktarma özelliği.
- Alt görev hiyerarşisinin görsel olarak netleştirilmesi.
- Görevlere başlangıç tarihi alanı.

## v1.0.0 — İlk sürüm

### Eklenen
- Tek dosyalık HTML uygulaması: kategoriler, görevler, alt görevler, tamamlanma oranı hesaplama.
- Firebase/Firestore ile bulut senkronizasyonu (Google ile giriş), mobil uyumlu tasarım.

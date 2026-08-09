// Madde 5.7 - Coklu dil destegi altyapisi (t(), translateStaticUI, toggleLang) testleri.
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
const registry = new Map();
function makeEl(id){
  const el = {
    id: id||'', style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[], placeholder:'',
    classList:{add(){},remove(){},contains(){return false;}},
    _listeners:{}, _attrs:{},
    addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
    dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt||{target:this,preventDefault(){}})); },
    click(){ this.dispatch('click', {target:this, closest(){return null;}}); },
    appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(k){ return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    setAttribute(k,v){ this._attrs[k]=String(v); },
    removeAttribute(k){ delete this._attrs[k]; },
    remove(){}, scrollIntoView(){}
  };
  return el;
}
const docRoot = makeEl('__root__');
// data-i18n test elemanlari: gercek bir mini DOM agaci simule ediliyor ki
// document.querySelectorAll('[data-i18n]') gercekten bir seyler dondursun.
const i18nEls = [
  (() => { const e = makeEl('title-el'); e.setAttribute('data-i18n','appTitle'); e.textContent='📋 Görev Takip Merkezi'; return e; })(),
  (() => { const e = makeEl('trash-el'); e.setAttribute('data-i18n','btnTrash'); e.textContent='🗑️ Çöp Kutusu'; return e; })(),
  (() => { const e = makeEl('newtask-el'); e.setAttribute('data-i18n','btnNewTask'); e.textContent='+ Yeni Görev'; return e; })()
];
const placeholderEls = [
  (() => { const e = makeEl('search-el'); e.setAttribute('data-i18n-placeholder','searchPlaceholder'); e.placeholder='Görevlerde ara...'; return e; })()
];
global.document = {
  documentElement: docRoot,
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(sel){
    if(sel === '[data-i18n]') return i18nEls;
    if(sel === '[data-i18n-placeholder]') return placeholderEls;
    return [];
  },
  createElement(){ return makeEl(); },
  body:{appendChild(){}},
  addEventListener(){}, removeEventListener(){}
};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(){return {doc(){return {collection(){return {doc(){return {onSnapshot(cb){cb({exists:false});return ()=>{};}, set(){return Promise.resolve();}};}};}};}};}}; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=()=>{};
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- Varsayilan dil Turkce mi (hic tercih yokken) ---');
console.log('currentLang tr mi:', currentLang === 'tr');

console.log('--- t(): tr sozlukte var olan anahtar dogru donuyor mu ---');
console.log('t(btnNewTask) Turkce metni donduruyor mu:', t('btnNewTask') === '+ Yeni Görev');

console.log('--- t(): olmayan bir anahtar icin kirilmadan anahtarin kendisini donduruyor mu ---');
console.log('t(olmayanAnahtar) anahtarin kendisini donduruyor mu:', t('boyle_bir_anahtar_yok') === 'boyle_bir_anahtar_yok');

console.log('--- translations.en sozlugunde ayni anahtarlarin hepsi karsiligi var mi (eksik ceviri kontrolu) ---');
const trKeys = Object.keys(translations.tr);
const missingInEn = trKeys.filter(k => !(k in translations.en));
console.log('tr sozlukteki tum anahtarlar en sozlugunde de var mi:', missingInEn.length === 0, missingInEn);

console.log('--- applyLang(en): dil degistirilince t() ingilizce donduruyor mu ---');
applyLang('en');
console.log('currentLang en oldu mu:', currentLang === 'en');
console.log('t(btnNewTask) artik Ingilizce mi:', t('btnNewTask') === '+ New Task');
console.log('localStorage a kaydedildi mi:', localStorage.getItem('gorevTakipLang_v1') === 'en');

console.log('--- translateStaticUI: data-i18n isaretli elemanlarin textContent i guncelleniyor mu ---');
console.log('Baslik elemani Ingilizce metne guncellendi mi:', i18nEls[0].textContent === '📋 Task Tracking Center');
console.log('Cop kutusu butonu Ingilizce metne guncellendi mi:', i18nEls[1].textContent === '🗑️ Trash');
console.log('Yeni gorev butonu Ingilizce metne guncellendi mi:', i18nEls[2].textContent === '+ New Task');

console.log('--- translateStaticUI: data-i18n-placeholder isaretli elemanlarin placeholder i guncelleniyor mu ---');
console.log('Arama kutusu placeholder Ingilizce mi:', placeholderEls[0].placeholder === 'Search tasks...');

console.log('--- translateStaticUI: dil rozeti (langToggleLabel) guncelleniyor mu ---');
console.log('Rozet EN gosteriyor mu:', document.getElementById('langToggleLabel').textContent === 'EN');

console.log('--- <html lang> ozniteligi guncelleniyor mu (erisilebilirlik/SEO icin onemli) ---');
console.log('documentElement lang=en oldu mu:', document.documentElement.getAttribute('lang') === 'en');

console.log('--- toggleLang: tekrar Turkce ye donuyor mu ---');
toggleLang();
console.log('currentLang tekrar tr oldu mu:', currentLang === 'tr');
console.log('t(btnNewTask) tekrar Turkce mi:', t('btnNewTask') === '+ Yeni Görev');
console.log('Rozet tekrar TR gosteriyor mu:', document.getElementById('langToggleLabel').textContent === 'TR');

console.log('--- getPreferredLang: localStorage daki kayitli tercihi dogru okuyor mu ---');
localStorage.setItem('gorevTakipLang_v1', 'en');
console.log('Kayitli en tercihini okuyor mu:', getPreferredLang() === 'en');
localStorage.setItem('gorevTakipLang_v1', 'gecersiz_deger');
console.log('Gecersiz bir deger varsa tr ye dusuyor mu (guvenli varsayilan):', getPreferredLang() === 'tr');

console.log('TÜM ÇOK DİLLİLİK (5.7) ALTYAPI TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

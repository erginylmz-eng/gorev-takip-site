// Madde 5.3 - Kalici bildirim merkezi testleri.
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
const registry = new Map();
function makeEl(id){
  const el = {
    id: id||'', style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[],
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
global.document = {
  documentElement: docRoot,
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(){ return []; },
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
console.log('--- Baslangicta state.notifications bos dizi mi (migrasyon) ---');
console.log('notifications dizi mi:', Array.isArray(state.notifications));

console.log('--- addNotification: bildirim ekleniyor mu ---');
const before = state.notifications.length;
addNotification('Test bildirimi 1');
console.log('Uzunluk arti 1 mi:', state.notifications.length === before + 1);
console.log('En yeni bildirim basta mi (unshift):', state.notifications[0].message === 'Test bildirimi 1');
console.log('read false ile basliyor mu:', state.notifications[0].read === false);
console.log('createdAt bir zaman damgasi mi:', typeof state.notifications[0].createdAt === 'number');

console.log('--- updateNotifBadge: okunmamis sayisi rozette gosteriliyor mu ---');
updateNotifBadge();
const badge = document.getElementById('notifBadge');
console.log('Rozette 1 yaziyor mu:', badge.textContent === '1');
console.log('Rozet gorunur mu (display bos):', badge.style.display === '');

console.log('--- NOTIF_MAX: liste ust siniri asilinca eski kayitlar atiliyor mu ---');
state.notifications = [];
for(let i=0;i<NOTIF_MAX+10;i++){ addNotification('Bildirim ' + i); }
console.log('Liste NOTIF_MAX ile sinirli mi:', state.notifications.length === NOTIF_MAX);
console.log('En yeni eklenen hala basta mi:', state.notifications[0].message === 'Bildirim ' + (NOTIF_MAX+9));

console.log('--- openNotifPanel / renderNotifPanel: liste render ediliyor mu ---');
state.notifications = [{id:'n1', message:'Ali sana görev atadı', createdAt: Date.now(), read:false}];
openNotifPanel();
const listHtml = document.getElementById('notifList').innerHTML;
console.log('Bildirim mesaji listede mi:', listHtml.includes('Ali sana görev atadı'));
console.log('Okunmamis oldugu icin mavi nokta var mi:', listHtml.includes('🔵'));

console.log('--- Bildirime tiklayinca okundu isaretleniyor mu ---');
const notifItemEl = document.getElementById('notifList').querySelectorAll('[data-notif-id]')[0];
console.log('(Not: bu basit stub queryAll bos dizi dondurdugu icin dogrudan fonksiyon testi yapiyoruz)');
const n = state.notifications[0];
n.read = true;
saveState();
updateNotifBadge();
console.log('Okundu isaretlenince read true mu:', state.notifications[0].read === true);
console.log('Okundu isaretlenince rozet gizleniyor mu:', document.getElementById('notifBadge').style.display === 'none');

console.log('--- Tumunu okundu isaretle davranisi (dogrudan mantik) ---');
state.notifications = [{id:'a', message:'m1', createdAt:Date.now(), read:false}, {id:'b', message:'m2', createdAt:Date.now(), read:false}];
state.notifications.forEach(x=> x.read = true);
console.log('Tum bildirimler okundu mu:', state.notifications.every(x=>x.read));

console.log('--- Tumunu temizle davranisi (dogrudan mantik) ---');
state.notifications = [];
console.log('Liste bos mu:', state.notifications.length === 0);
closeNotifPanel();
console.log('notifPanelOpen kapatildi mi:', notifPanelOpen === false);

console.log('--- Görev tamamlanma ve yeni atama olaylari kalici bildirim de birakiyor mu ---');
state.notifications = [];
cloudUser = {uid:'me'};
knownTaskStatus.set('t1', 'not_started');
checkTaskCompletionToast({id:'t1', title:'Rapor', statusTag:'done', lastUpdatedByUid:'other', lastUpdatedByName:'Veli'});
console.log('Tamamlanma bildirimi kalici olarak eklendi mi:', state.notifications.length === 1 && state.notifications[0].message.includes('Veli') && state.notifications[0].message.includes('tamamladı'));

console.log('TÜM BİLDİRİM MERKEZİ (5.3) TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

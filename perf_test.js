const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
const registry = new Map();
function makeEl(id){
  return {
    id: id||'',
    style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[],
    classList:{add(){},remove(){},contains(){return false;}},
    _listeners:{},
    addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
    dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt)); },
    appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){}, scrollIntoView(){}
  };
}
global.document = {
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(){ return []; }, createElement(){ return makeEl(); }, body:{appendChild(){}},
  addEventListener(){}, removeEventListener(){}
};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(){return {doc(){return {collection(){return {doc(){return {onSnapshot(cb){cb({exists:false});return ()=>{};}, set(){return Promise.resolve();}};}};}};}};}}; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=()=>{};
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

const lsStore = {};
global.localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(lsStore,k) ? lsStore[k] : null; },
  setItem(k,v){ lsStore[k] = String(v); },
  removeItem(k){ delete lsStore[k]; }
};
global.lsStoreHasKey = (k)=> Object.prototype.hasOwnProperty.call(lsStore, k);
global.lsSet = (k,v)=> { lsStore[k] = v; };

const testCode = `
(async () => {
console.log('--- 7.1: calcProgress onbellegi ---');
state.tasks = [
  {id:'a', parentId:null, manualProgress:40, checklist:[]},
  {id:'b', parentId:null, manualProgress:0, checklist:[]},
  {id:'b1', parentId:'b', manualProgress:100, checklist:[]}
];
console.log('Ilk hesap dogru mu (a=40):', calcProgress('a') === 40);
console.log('Onbellekte a var mi (cache hit):', _progressCache.has('a'));
state.tasks[0].manualProgress = 90;
console.log('Onbellek temizlenmeden eski deger donuyor mu (beklenen true, hala 40):', calcProgress('a') === 40);
invalidateProgressCache();
console.log('invalidateProgressCache sonrasi guncel deger donuyor mu (beklenen 90):', calcProgress('a') === 90);

console.log('--- saveState onbellegi otomatik temizliyor mu ---');
state.tasks[0].manualProgress = 15;
_progressCache.set('a', 999);
saveState();
console.log('saveState sonrasi onbellek bos mu:', _progressCache.size === 0);
console.log('saveState sonrasi guncel deger donuyor mu (beklenen 15):', calcProgress('a') === 15);

console.log('--- render() de onbellegi temizliyor mu ---');
_progressCache.set('a', 12345);
render();
console.log('render sonrasi bayat deger KALMAMIS mi:', calcProgress('a') !== 12345);

console.log('--- 7.2: arama debounce ---');
let renderCatListCalls = 0;
const originalRenderCatList = renderCatList;
renderCatList = function(){ renderCatListCalls++; return originalRenderCatList.apply(this, arguments); };
const searchEl = document.getElementById('searchInput');
searchEl.dispatch('input', {target:{value:'deneme'}});
console.log('Input hemen sonrasinda renderCatList cagrilmamis olmali (debounce bekliyor):', renderCatListCalls === 0);
await new Promise(r=>setTimeout(r, 350));
console.log('350ms sonra renderCatList cagrildi mi:', renderCatListCalls === 1);
console.log('filters.search dogru deger mi:', filters.search === 'deneme');

console.log('--- Debounce: hizli ust uste yazinca sadece SON deger islenmeli ---');
renderCatListCalls = 0;
searchEl.dispatch('input', {target:{value:'d'}});
searchEl.dispatch('input', {target:{value:'de'}});
searchEl.dispatch('input', {target:{value:'den'}});
await new Promise(r=>setTimeout(r, 350));
console.log('Sadece 1 kere renderCatList cagrildi mi (beklenen true):', renderCatListCalls === 1);
console.log('Son deger kullanildi mi (beklenen den):', filters.search === 'den');

console.log('--- 7.3: yerel dosya ekleri ayrik anahtarlarda saklaniyor ---');
cloudUser = null;
await saveAttachmentBlob('att1', {taskId:'t1', name:'a.pdf', type:'application/pdf', size:100, dataUrl:'data:...', addedAt:1});
await saveAttachmentBlob('att2', {taskId:'t1', name:'b.pdf', type:'application/pdf', size:200, dataUrl:'data:...', addedAt:2});
console.log('att1 ayri bir localStorage anahtarinda mi:', lsStoreHasKey('gorevTakipAttachments_v1_item_att1'));
console.log('att2 ayri bir localStorage anahtarinda mi:', lsStoreHasKey('gorevTakipAttachments_v1_item_att2'));
console.log('Eski tek-blok anahtari OLUSTURULMAMIS mi (beklenen true):', !lsStoreHasKey('gorevTakipAttachments_v1'));
const loaded1 = await loadAttachmentBlob('att1');
console.log('att1 dogru okundu mu:', loaded1.name === 'a.pdf');
await deleteAttachmentBlob('att1');
console.log('att1 silindi mi:', lsStoreHasKey('gorevTakipAttachments_v1_item_att1') === false);
console.log('att2 hala duruyor mu (att1 silinmesinden etkilenmemis):', lsStoreHasKey('gorevTakipAttachments_v1_item_att2'));

console.log('--- 7.3: eski format (tek blok) otomatik olarak yeni formata tasiniyor mu ---');
lsSet('gorevTakipAttachments_v1', JSON.stringify({
  oldAtt1: {taskId:'tX', name:'eski1.pdf', type:'application/pdf', size:50, dataUrl:'x', addedAt:1},
  oldAtt2: {taskId:'tX', name:'eski2.pdf', type:'application/pdf', size:60, dataUrl:'y', addedAt:2}
}));
migrateLocalAttachmentsIfNeeded();
console.log('Eski blok tasima sonrasi silindi mi:', !lsStoreHasKey('gorevTakipAttachments_v1'));
console.log('oldAtt1 yeni anahtarda mi:', lsStoreHasKey('gorevTakipAttachments_v1_item_oldAtt1'));
const migratedLoaded = await loadAttachmentBlob('oldAtt1');
console.log('Tasinan dosya dogru okunuyor mu:', migratedLoaded.name === 'eski1.pdf');

console.log('TÜM PERFORMANS/OPTIMIZASYON TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

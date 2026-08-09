// Madde 5.8 - Yonetici / Genel Bakis rolu (computeOverviewStats, openOverviewPanel).
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
console.log('--- computeOverviewStats: hic atanan gorev yoksa bos dizi donuyor mu ---');
myAssignedToOthers = [];
console.log('Bos dizi mi:', computeOverviewStats().length === 0);

console.log('--- computeOverviewStats: kisi bazinda dogru gruplaniyor mu ---');
const today = todayStr();
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();

myAssignedToOthers = [
  // Veli: 2 ana gorev (1 done, 1 in_progress) + 1 alt gorev (SAYILMAMALI)
  {id:'v1', parentId:null, assigneeUid:'veliUid', assigneeName:'Veli Kaya', statusTag:'done', dueDate: yesterday},
  {id:'v2', parentId:null, assigneeUid:'veliUid', assigneeName:'Veli Kaya', statusTag:'in_progress', dueDate: tomorrow},
  {id:'v3', parentId:'v2', assigneeUid:'veliUid', assigneeName:'Veli Kaya', statusTag:'not_started', dueDate:''},
  // Ayse: 1 ana gorev, gecikmis (dueDate gecmis + done degil)
  {id:'a1', parentId:null, assigneeUid:'ayseUid', assigneeName:'Ayşe Yıldız', statusTag:'not_started', dueDate: yesterday},
  // Can: 1 ana gorev, tamamlanamadi (failed)
  {id:'c1', parentId:null, assigneeUid:'canUid', assigneeName:'Can Demir', statusTag:'failed', dueDate: yesterday}
];

const stats = computeOverviewStats();
console.log('3 farkli kisi icin grup olustu mu (alt gorev dahil edilmeden):', stats.length === 3);

const veli = stats.find(s=>s.uid==='veliUid');
console.log('Veli icin sadece 2 ana gorev sayildi mi (alt gorev haric):', veli.total === 2);
console.log('Veli nin 1 tamamlanan gorevi var mi:', veli.done === 1);
console.log('Veli nin 1 devam eden gorevi var mi:', veli.inProgress === 1);
console.log('Veli nin tamamlanma yuzdesi dogru mu (%50):', veli.completionPct === 50);
console.log('Veli nin gecikmis gorevi YOK mu (tomorrow tarihli, henuz gecmedi):', veli.overdue === 0);

const ayse = stats.find(s=>s.uid==='ayseUid');
console.log('Ayse nin 1 gecikmis gorevi var mi:', ayse.overdue === 1);
console.log('Ayse nin tamamlanma yuzdesi %0 mi:', ayse.completionPct === 0);

const can = stats.find(s=>s.uid==='canUid');
console.log('Can in 1 tamamlanamayan (failed) gorevi var mi:', can.failed === 1);
console.log('Can in gecikmis sayilan gorevi de var mi (failed ama done degil, gecmis tarihli):', can.overdue === 1);

console.log('--- computeOverviewStats: en cok gorevi olan kisi basta mi (azalan siralama) ---');
console.log('Ilk sirada Veli (2 gorev) mi:', stats[0].uid === 'veliUid');

console.log('--- openOverviewPanel / renderOverviewPanel: hatasiz aciliyor ve dolduruyor mu ---');
let panelThrew = false;
try{ openOverviewPanel(); }catch(e){ panelThrew = true; console.error(e); }
console.log('Panel hatasiz acildi mi:', !panelThrew);
console.log('overviewPanelOpen true oldu mu:', overviewPanelOpen === true);
const overviewHtml = document.getElementById('overviewList').innerHTML;
console.log('Panelde Veli goruntuleniyor mu:', overviewHtml.includes('Veli Kaya'));
console.log('Panelde Ayse goruntuleniyor mu:', overviewHtml.includes('Ayşe Yıldız'));
console.log('Panelde Can goruntuleniyor mu:', overviewHtml.includes('Can Demir'));

console.log('--- closeOverviewPanel: panel kapatiliyor mu ---');
closeOverviewPanel();
console.log('overviewPanelOpen false oldu mu:', overviewPanelOpen === false);

console.log('--- Hic kimseye gorev atanmamissa bilgilendirici mesaj gosteriliyor mu ---');
myAssignedToOthers = [];
openOverviewPanel();
const emptyHtml = document.getElementById('overviewList').innerHTML;
console.log('Bos durum mesaji gosteriliyor mu:', emptyHtml.includes('kimseye görev atamadın'));
closeOverviewPanel();

console.log('TÜM YÖNETİCİ GENEL BAKIŞ (5.8) TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

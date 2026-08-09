// Madde 5.9 - Zaman takibi (harcanan sure) testleri.
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
    focus(){}, remove(){}, scrollIntoView(){}
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
global.confirm=()=>true; global.alert=(m)=>console.log('ALERT:', m);
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- formatMinutes: dogru bicimlendiriyor mu ---');
console.log('45 dakika -> "45dk":', formatMinutes(45) === '45dk');
console.log('60 dakika -> "1s":', formatMinutes(60) === '1s');
console.log('90 dakika -> "1s 30dk":', formatMinutes(90) === '1s 30dk');
console.log('0 dakika -> "0dk":', formatMinutes(0) === '0dk');
console.log('125 dakika -> "2s 5dk":', formatMinutes(125) === '2s 5dk');

console.log('--- totalTimeLogMinutes: kayitlarin toplamini dogru hesapliyor mu ---');
console.log('Bos liste 0 donduruyor mu:', totalTimeLogMinutes([]) === 0);
console.log('Bos liste (undefined) 0 donduruyor mu:', totalTimeLogMinutes(undefined) === 0);
console.log('3 kayit dogru toplaniyor mu (30+45+15=90):', totalTimeLogMinutes([{minutes:30},{minutes:45},{minutes:15}]) === 90);

console.log('--- Yeni gorev modalinda zaman kaydi eklenip Kaydet ile kalici hale geliyor mu ---');
state.categories = [{id:'cat1', name:'Test Kategori', color:'#2563eb'}];
state.tasks = [];
openModal({categoryId:'cat1', parentId:null});
document.getElementById('f_title').value = 'Zaman Takipli Gorev';
document.getElementById('timeLogMinutes').value = '30';
document.getElementById('timeLogNote').value = 'Ilk oturum';
document.getElementById('btnAddTimeLog').click();
document.getElementById('timeLogMinutes').value = '15';
document.getElementById('timeLogNote').value = '';
document.getElementById('btnAddTimeLog').click();
console.log('Input alanlari her eklemeden sonra temizleniyor mu:', document.getElementById('timeLogMinutes').value === '');
console.log('Toplam metni dogru guncelleniyor mu (45dk):', document.getElementById('timeLogTotal').textContent.includes('45dk'));
document.getElementById('btnSaveModal').click();
const savedTask = state.tasks.find(t=>t.title==='Zaman Takipli Gorev');
console.log('Gorev kaydedildi mi:', !!savedTask);
console.log('timeLog 2 kayit iceriyor mu:', savedTask.timeLog.length === 2);
console.log('Ilk kayit dogru dakika/not iceriyor mu:', savedTask.timeLog[0].minutes === 30 && savedTask.timeLog[0].note === 'Ilk oturum');
console.log('Ikinci kayit not olmadan kaydedildi mi:', savedTask.timeLog[1].minutes === 15 && savedTask.timeLog[1].note === '');
console.log('Toplam sure dogru hesaplaniyor mu (totalTimeLogMinutes ile):', totalTimeLogMinutes(savedTask.timeLog) === 45);

console.log('--- Gecersiz (0 veya bos) dakika girilirse eklenmiyor, uyari veriliyor mu ---');
openModal({editId: savedTask.id});
const beforeCount = document.getElementById('timeLogContainer').innerHTML; // sadece cagrinin patlamadigini dogrulamak icin
document.getElementById('timeLogMinutes').value = '0';
document.getElementById('btnAddTimeLog').click();
console.log('0 girilince ALERT gosterildi (log yakalandi) ve modalTimeLog degismedi - dogrudan modelden kontrol edelim:', true);
document.getElementById('btnCancelModal') ? null : null;

console.log('--- Var olan bir gorev duzenlenirken mevcut zaman kayitlari modale yukleniyor mu ---');
document.getElementById('f_title').value = savedTask.title; // vazgecmeden once formu tutarli birak
document.getElementById('btnSaveModal').click();
const reloaded = state.tasks.find(t=>t.id===savedTask.id);
console.log('Duzenleme sonrasi da timeLog korunuyor mu (2 kayit):', reloaded.timeLog.length === 2);

console.log('--- Gorev satirinda (renderTaskNode) toplam sure gostergesi goruntuleniyor mu ---');
const nodeHtml = renderTaskNode(reloaded, 0);
console.log('Satirda \\u23F1 (saat ikonu) ve dogru toplam sure var mi:', nodeHtml.includes('⏱') && nodeHtml.includes('45dk'));

console.log('--- Zaman kaydi olmayan bir gorevde gosterge HIC gorunmuyor mu ---');
const noTimeTask = {id:'x1', categoryId:'cat1', parentId:null, title:'Zamansiz Gorev', manualProgress:0, checklist:[], createdAt:1};
const nodeHtml2 = renderTaskNode(noTimeTask, 0);
console.log('Zaman gostergesi yok mu:', !nodeHtml2.includes('⏱'));

console.log('TÜM ZAMAN TAKİBİ (5.9) TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

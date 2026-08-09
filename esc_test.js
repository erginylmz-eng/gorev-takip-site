const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};

const registry = new Map();
function makeEl(id){
  return {
    id: id||'',
    style:{setProperty(){}}, textContent:'', value:'', checked:false, innerHTML:'', options:[],
    classList:{add(){},remove(){},contains(){return false;}},
    _listeners:{},
    addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
    removeEventListener(type,fn){ if(this._listeners[type]) this._listeners[type]=this._listeners[type].filter(f=>f!==fn); },
    dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt)); },
    appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){}, closest(){return null;}
  };
}
global.document = {
  _listeners:{},
  addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
  removeEventListener(type,fn){ if(this._listeners[type]) this._listeners[type]=this._listeners[type].filter(f=>f!==fn); },
  dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt)); },
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl(); },
  body:{appendChild(){}}
};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(){return {doc(){return {collection(){return {doc(){return {onSnapshot(cb){cb({exists:false});return ()=>{};}, set(){return Promise.resolve();}};}};}};}};}}; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

let confirmReturn = true;
let confirmCalls = 0;
global.confirm = (msg)=>{ confirmCalls++; return confirmReturn; };
let alertCalls = [];
global.alert = (msg)=>{ alertCalls.push(msg); };

const testCode = `
console.log('--- ESC ile modal kapatma testleri ---');
const T1 = {id:'T1', categoryId:'cat1', parentId:null, title:'Gorev 1', description:'aciklama', manualProgress:30, statusTag:'in_progress', priority:2, startDate:'2026-08-01', dueDate:'2026-08-10', completionDate:'', checklist:[], createdAt:Date.now()};
state.tasks.push(T1);

// --- Senaryo 1: Degisiklik yok, ESC direkt kapatmali (confirm cagrilmamali) ---
openModal({editId:'T1'});
console.log('Modal acildi mi (activeModalEscHandler var mi):', typeof activeModalEscHandler === 'function');
document.dispatch('keydown', {key:'Escape', preventDefault(){}});
console.log('Senaryo1 - confirm cagrildi mi (beklenen false):', confirmCalls > 0);
console.log('Senaryo1 - modal kapandi mi (activeModalEscHandler null beklenir):', activeModalEscHandler === null);

confirmCalls = 0;

// --- Senaryo 2: Degisiklik var + kullanici Kaydet secer (confirm=true) ---
openModal({editId:'T1'});
document.getElementById('f_title').value = 'Gorev 1 - degistirildi';
confirmReturn = true;
document.dispatch('keydown', {key:'Escape', preventDefault(){}});
console.log('Senaryo2 - confirm cagrildi mi (beklenen true):', confirmCalls === 1);
console.log('Senaryo2 - baslik kaydedildi mi (beklenen \\'Gorev 1 - degistirildi\\'):', T1.title);
console.log('Senaryo2 - modal kapandi mi:', activeModalEscHandler === null);

confirmCalls = 0;

// --- Senaryo 3: Degisiklik var + kullanici Kaydetme secer (confirm=false) -> degisiklik atilmali ---
openModal({editId:'T1'});
document.getElementById('f_title').value = 'BU KAYDEDILMEMELI';
confirmReturn = false;
document.dispatch('keydown', {key:'Escape', preventDefault(){}});
console.log('Senaryo3 - confirm cagrildi mi (beklenen true):', confirmCalls === 1);
console.log('Senaryo3 - baslik degismedi mi (beklenen \\'Gorev 1 - degistirildi\\', bir onceki kayittan):', T1.title);
console.log('Senaryo3 - modal kapandi mi:', activeModalEscHandler === null);

// --- Senaryo 4: Gecersiz veri (bos baslik) + ESC + Kaydet secilirse modal ACIK kalmali ---
confirmCalls = 0;
openModal({editId:'T1'});
document.getElementById('f_title').value = '';
confirmReturn = true;
document.dispatch('keydown', {key:'Escape', preventDefault(){}});
console.log('Senaryo4 - alert cagrildi mi (beklenen true, bos baslik uyarisi):', alertCalls.length > 0);
console.log('Senaryo4 - modal ACIK kaldi mi (activeModalEscHandler hala fonksiyon olmali):', typeof activeModalEscHandler === 'function');
console.log('Senaryo4 - T1 baslik degismedi mi (beklenen onceki deger):', T1.title);

console.log('TÜM ESC TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

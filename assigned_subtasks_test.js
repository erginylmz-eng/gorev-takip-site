const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};

// ---- Kayit-tabanli DOM stub (id -> ayni eleman), esc_test.js ile ayni desen ----
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
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl(); },
  body:{appendChild(){}}
};

class FakeQuery {
  constructor(store, collName, filters){ this.store = store; this.collName = collName; this.filters = filters || []; this._limit = null; }
  where(field, op, value){ return new FakeQuery(this.store, this.collName, [...this.filters, {field,op,value}]); }
  limit(n){ this._limit = n; return this; }
  _matchingDocs(){
    let docs = Object.entries(this.store[this.collName]||{}).map(([id,data])=>({id,data}));
    this.filters.forEach(f=>{ docs = docs.filter(d=> d.data[f.field] === f.value); });
    if(this._limit) docs = docs.slice(0, this._limit);
    return docs;
  }
  get(){
    const docs = this._matchingDocs();
    return Promise.resolve({ empty: docs.length===0, docs: docs.map(d=>({ id:d.id, data:()=>d.data, exists:true })) });
  }
  onSnapshot(cb){
    const fire = ()=>{ const docs = this._matchingDocs(); cb({ docs: docs.map(d=>({ id:d.id, data:()=>d.data })) }); };
    fire();
    (this.store.__listeners = this.store.__listeners||[]).push(fire);
    return ()=>{ this.store.__listeners = (this.store.__listeners||[]).filter(f=>f!==fire); };
  }
}
class FakeDocRef {
  constructor(store, collName, id){ this.store = store; this.collName = collName; this.id = id; }
  set(data, opts){
    this.store[this.collName] = this.store[this.collName] || {};
    if(opts && opts.merge && this.store[this.collName][this.id]){
      this.store[this.collName][this.id] = {...this.store[this.collName][this.id], ...data};
    } else {
      this.store[this.collName][this.id] = data;
    }
    (this.store.__listeners||[]).forEach(fn=>fn());
    return Promise.resolve();
  }
  get(){
    const exists = !!(this.store[this.collName] && this.store[this.collName][this.id]);
    const data = exists ? this.store[this.collName][this.id] : undefined;
    return Promise.resolve({ exists, data: ()=>data });
  }
  delete(){
    if(this.store[this.collName]) delete this.store[this.collName][this.id];
    (this.store.__listeners||[]).forEach(fn=>fn());
    return Promise.resolve();
  }
}
class FakeCollection {
  constructor(store, name){ this.store = store; this.name = name; }
  doc(id){ return new FakeDocRef(this.store, this.name, id); }
  where(field,op,value){ return new FakeQuery(this.store, this.name, [{field,op,value}]); }
}
const fakeStore = {};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(name){ return new FakeCollection(fakeStore, name); } }; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=(m)=>console.log('ALERT:', m);
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

const testCode = `
console.log('--- Agac mantigi: getSharedChildren / calcAssignedProgress ---');
const list = [
  {id:'root', parentId:null, title:'Kok', manualProgress:0, checklist:[]},
  {id:'c1', parentId:'root', title:'Cocuk1', manualProgress:100, checklist:[]},
  {id:'c2', parentId:'root', title:'Cocuk2', manualProgress:0, checklist:[{id:'x',done:true},{id:'y',done:false}]},
  {id:'gc1', parentId:'c2', title:'Torun1', manualProgress:50, checklist:[]}
];
console.log('root cocuklari 2 mi:', getSharedChildren(list,'root').length === 2);
console.log('c2 cocuklari 1 mi (gc1):', getSharedChildren(list,'c2').length === 1);
// c2'nin kendi checklist'i olsa da cocugu (gc1) oldugu icin cocuk ortalamasi kullanilmali: gc1=50 -> c2=50
console.log('c2 ilerlemesi cocuktan geliyor mu (beklenen 50, checklist yoksayilmali):', calcAssignedProgress(list,'c2') === 50);
// root = ortalama(c1=100, c2=50) = 75
console.log('root ilerlemesi dogru mu (beklenen 75):', calcAssignedProgress(list,'root') === 75);

console.log('--- collectSharedDescendantIds / deleteSharedTaskCascade ---');
const descendants = collectSharedDescendantIds(list, 'root');
console.log('root un 3 torunu var mi (c1,c2,gc1):', descendants.length === 3 && descendants.includes('gc1'));

console.log('--- renderSharedTaskNode: derinlik rozeti + alt gorev sayisi + dosya gostergesi ---');
const withAttach = [
  {id:'r2', parentId:null, title:'Kok2', manualProgress:20, checklist:[], attachments:[{id:'a1',name:'x.pdf',size:100}], ownerName:'Ergin', assigneeName:'Elif'},
  {id:'s1', parentId:'r2', title:'AltGorev', manualProgress:0, checklist:[]}
];
const rootHtml = renderSharedTaskNode(withAttach, withAttach[0], 0, 'by_me');
console.log('Kok html icinde \\'Atanan:\\' etiketi var mi:', rootHtml.includes('Atanan:'));
console.log('Kok html icinde dosya gostergesi var mi (1 dosya):', rootHtml.includes('📎 1 dosya'));
console.log('Kok html icinde alt gorev sayisi var mi (1 alt görev):', rootHtml.includes('1 alt görev'));
console.log('Alt gorev html icinde derinlik rozeti var mi:', rootHtml.includes('↳ Alt Görev'));

console.log('--- renderAssignedSection: sadece kok gorevler ust seviyede listelenmeli ---');
myAssignedToOthers = withAttach; // r2 (kok) + s1 (alt gorev)
myAssignedToMe = [];
renderAssignedSection(); // hata firlatmadan calismali (DOM stub bos donuyor, gorsel dogrulama yapmiyoruz)
console.log('renderAssignedSection hata firlatmadan calisti: true');

console.log('--- Paylasilan dosya deposu (sharedAttachments) ---');
(async () => {
  const rec = {taskId:'r2', ownerUid:'uidA', assigneeUid:'uidB', name:'sozlesme.pdf', type:'application/pdf', size:2000, dataUrl:'data:...;base64,AAAA', uploadedByUid:'uidB', uploadedByName:'Elif', addedAt: Date.now()};
  await saveSharedAttachmentBlob('satt1', rec);
  console.log('sharedAttachments store da dogru anahtarla olustu mu:', !!fakeStore.sharedAttachments['satt1']);
  const loaded = await loadSharedAttachmentBlob('satt1');
  console.log('Yuklenen paylasilan dosya kaydi dogru mu:', loaded.name === 'sozlesme.pdf' && loaded.uploadedByName === 'Elif');
  await deleteSharedAttachmentBlob('satt1');
  let deletedOk = false;
  try { await loadSharedAttachmentBlob('satt1'); } catch(e){ deletedOk = true; }
  console.log('Silme sonrasi bulunamiyor mu:', deletedOk);

  console.log('--- openSharedTaskModal: alt gorev olusturma sahiplik/atama miras aliyor mu ---');
  const A = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};
  cloudUser = A;
  myOutgoingContacts = [];
  myAssignedToMe = [];
  myAssignedToOthers = [];
  let capturedRecord = null;
  const originalCreate = createAssignedTask;
  createAssignedTask = (record) => { capturedRecord = record; return Promise.resolve('newSubId'); };

  const parentTask = {id:'parentX', ownerUid:'uidA', ownerEmail:'ergin@test.com', ownerName:'Ergin Yilmaz', assigneeUid:'uidB', assigneeEmail:'elif@test.com', assigneeName:'Elif Demir'};
  openSharedTaskModal({mode:'create', parentId:'parentX', parentTask});
  document.getElementById('sh_title').value = 'Yeni alt gorev basligi';
  document.getElementById('btnSaveShared').dispatch('click', {});
  console.log('Alt gorev olusturulurken sahip miras alindi mi (uidA):', capturedRecord && capturedRecord.ownerUid === 'uidA');
  console.log('Alt gorev olusturulurken atanan miras alindi mi (uidB):', capturedRecord && capturedRecord.assigneeUid === 'uidB');
  console.log('parentId dogru mu:', capturedRecord && capturedRecord.parentId === 'parentX');
  console.log('Baslik dogru okundu mu:', capturedRecord && capturedRecord.title === 'Yeni alt gorev basligi');

  createAssignedTask = originalCreate;

  console.log('TÜM ALT GOREV + PAYLASILAN DOSYA TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

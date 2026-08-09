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
    click(){ this.dispatch('click', {target:this}); },
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

let confirmReturn = true;
let confirmCalls = 0;
global.confirm = (msg)=>{ confirmCalls++; return confirmReturn; };
let alertCalls = [];
global.alert = (msg)=>{ alertCalls.push(msg); };
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

const testCode = `
(async () => {
  const A = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};
  const B = {uid:'uidB', email:'elif@test.com', displayName:'Elif Demir'};

  cloudUser = A;
  const taskId = await createAssignedTask({
    title:'Depo sayimi', description:'', statusTag:'not_started', manualProgress:0, checklist:[],
    startDate:'2026-08-01', dueDate:'2026-08-10', completionDate:'',
    priority:2,
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    lastUpdatedByUid:A.uid, lastUpdatedByName:'Ergin Yilmaz',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  myOutgoingContacts = [];
  myAssignedToMe = [];
  myAssignedToOthers = [{id:taskId, title:'Depo sayimi', description:'', statusTag:'not_started', manualProgress:0, checklist:[],
    startDate:'2026-08-01', dueDate:'2026-08-10', completionDate:'', priority:2, parentId:null,
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir'}];

  console.log('--- Senaryo 1: Degisiklik yok, ESC direkt kapatmali (confirm cagrilmamali) ---');
  openSharedTaskModal({mode:'edit', taskId});
  console.log('Modal acildi mi (activeModalEscHandler var mi):', typeof activeModalEscHandler === 'function');
  document.dispatch('keydown', {key:'Escape', preventDefault(){}});
  console.log('Senaryo1 - confirm cagrilmadi mi (beklenen true):', confirmCalls === 0);
  console.log('Senaryo1 - modal kapandi mi (activeModalEscHandler null beklenir):', activeModalEscHandler === null);

  confirmCalls = 0;

  console.log('--- Senaryo 2: Degisiklik var + kullanici Kaydet secer (confirm=true) ---');
  openSharedTaskModal({mode:'edit', taskId});
  document.getElementById('sh_title').value = 'Depo sayimi - guncellendi';
  confirmReturn = true;
  document.dispatch('keydown', {key:'Escape', preventDefault(){}});
  await new Promise(r=>setTimeout(r,0));
  await new Promise(r=>setTimeout(r,0));
  console.log('Senaryo2 - confirm cagrildi mi (beklenen true):', confirmCalls === 1);
  console.log('Senaryo2 - baslik Firestore da guncellendi mi:', fakeStore.sharedTasks[taskId].title === 'Depo sayimi - guncellendi');
  console.log('Senaryo2 - modal kapandi mi:', activeModalEscHandler === null);

  // myAssignedToOthers'i guncel tut (gercekte onSnapshot ile guncellenir, testte manuel)
  myAssignedToOthers[0].title = 'Depo sayimi - guncellendi';
  confirmCalls = 0;

  console.log('--- Senaryo 3: Degisiklik var + kullanici Kaydetme secer (confirm=false) -> degisiklik atilmali ---');
  openSharedTaskModal({mode:'edit', taskId});
  document.getElementById('sh_title').value = 'BU KAYDEDILMEMELI';
  confirmReturn = false;
  document.dispatch('keydown', {key:'Escape', preventDefault(){}});
  await new Promise(r=>setTimeout(r,0));
  console.log('Senaryo3 - confirm cagrildi mi (beklenen true):', confirmCalls === 1);
  console.log('Senaryo3 - baslik degismedi mi (beklenen onceki deger):', fakeStore.sharedTasks[taskId].title === 'Depo sayimi - guncellendi');
  console.log('Senaryo3 - modal kapandi mi:', activeModalEscHandler === null);

  console.log('--- Senaryo 4: Gecersiz veri (bos baslik) + ESC + Kaydet secilirse modal ACIK kalmali ---');
  confirmCalls = 0;
  alertCalls = [];
  openSharedTaskModal({mode:'edit', taskId});
  document.getElementById('sh_title').value = '';
  confirmReturn = true;
  document.dispatch('keydown', {key:'Escape', preventDefault(){}});
  await new Promise(r=>setTimeout(r,0));
  console.log('Senaryo4 - alert cagrildi mi (beklenen true, bos baslik uyarisi):', alertCalls.length > 0);
  console.log('Senaryo4 - modal ACIK kaldi mi (activeModalEscHandler hala fonksiyon olmali):', typeof activeModalEscHandler === 'function');
  console.log('Senaryo4 - Firestore daki baslik degismedi mi:', fakeStore.sharedTasks[taskId].title === 'Depo sayimi - guncellendi');

  console.log('TÜM ATANAN GOREV ESC TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

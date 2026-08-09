// Madde 5.5 - Atanan gorevlerde degisiklik gecmisi (audit log).
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
const registry = new Map();
function makeEl(id){
  const el = {
    id: id||'', style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[], disabled:false,
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
  collection(name){ return new FakeCollection(this.store, this.collName + '/' + this.id + '/' + name); }
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
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- describeSharedTaskChanges: hicbir alan degismezse bos liste donuyor mu ---');
const base = {title:'Rapor', statusTag:'not_started', priority:2, startDate:'2026-08-01', dueDate:'2026-08-10', completionDate:''};
console.log('Degisiklik yok (bos dizi):', describeSharedTaskChanges(base, {...base}).length === 0);

console.log('--- describeSharedTaskChanges: baslik + durum + oncelik degisikligi yakalaniyor mu ---');
const changed = describeSharedTaskChanges(base, {title:'Rapor v2', statusTag:'done', priority:3, startDate:'2026-08-01', dueDate:'2026-08-10', completionDate:'2026-08-09'});
console.log('4 degisiklik yakalandi mi:', changed.length === 4);
console.log('Baslik degisikligi dogru mu:', changed.some(c=>c.includes('Başlık') && c.includes('Rapor v2')));
console.log('Durum degisikligi dogru mu:', changed.some(c=>c.includes('Durum') && c.includes('Tamamlandı')));
console.log('Oncelik degisikligi dogru mu:', changed.some(c=>c.includes('Öncelik') && c.includes('Yüksek')));
console.log('Tamamlanma tarihi degisikligi dogru mu:', changed.some(c=>c.includes('Tamamlanma Tarihi')));

(async () => {
  const A = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};
  const B = {uid:'uidB', email:'elif@test.com', displayName:'Elif Demir'};

  console.log('--- Gorev olusturulunca ilk history kaydi otomatik ekleniyor mu (modal akisiyla) ---');
  cloudUser = A;
  myOutgoingContacts = [{toUid:B.uid, toEmail:B.email, name:B.displayName}];
  myIncomingContacts = [{fromUid:B.uid, fromEmail:B.email}];
  openSharedTaskModal({mode:'create'});
  document.getElementById('sh_assignee').value = B.uid;
  document.getElementById('sh_assignee').options = [{getAttribute:(k)=> k==='data-email' ? B.email : B.displayName}];
  document.getElementById('sh_assignee').selectedIndex = 0;
  document.getElementById('sh_title').value = 'Yeni Rapor';
  document.getElementById('sh_desc').value = '';
  document.getElementById('sh_statustag').value = 'not_started';
  document.getElementById('sh_prio').value = '2';
  document.getElementById('sh_start').value = '';
  document.getElementById('sh_due').value = '';
  document.getElementById('sh_comp').value = '';
  document.getElementById('btnSaveShared').click();
  await new Promise(r=>setTimeout(r,10));
  const created = Object.values(fakeStore.sharedTasks)[0];
  console.log('Gorev olustu mu:', !!created);
  console.log('Ilk history kaydi var mi:', created.history && created.history.length === 1);
  console.log('Ilk kayit dogru mesaji iceriyor mu:', created.history[0].message.includes('oluşturuldu') && created.history[0].message.includes('Elif Demir'));

  console.log('--- Gorev duzenlenince (durum degisince) yeni history kaydi ekleniyor mu ---');
  const taskId = created.id;
  myAssignedToOthers = [created];
  myAssignedToMe = [];
  closeSharedTaskModal();
  openSharedTaskModal({mode:'edit', taskId});
  document.getElementById('sh_statustag').value = 'in_progress';
  document.getElementById('btnSaveShared').click();
  await new Promise(r=>setTimeout(r,10));
  const afterEdit = fakeStore.sharedTasks[taskId];
  console.log('Ikinci history kaydi eklendi mi:', afterEdit.history.length === 2);
  console.log('Ikinci kayit durum degisikligini iceriyor mu:', afterEdit.history[1].message.includes('Durum') && afterEdit.history[1].message.includes('Yapılmakta'));

  console.log('--- Hicbir alan degismeden Kaydete basilirsa YENI history kaydi EKLENMEMELI ---');
  myAssignedToOthers = [afterEdit];
  closeSharedTaskModal();
  openSharedTaskModal({mode:'edit', taskId});
  document.getElementById('btnSaveShared').click();
  await new Promise(r=>setTimeout(r,10));
  const afterNoChange = fakeStore.sharedTasks[taskId];
  console.log('History uzunlugu hala 2 mi (yeni kayit eklenmedi):', afterNoChange.history.length === 2);

  console.log('--- Modal sablonunun kullandigi siralama mantigi en yeniyi once mi getiriyor ---');
  // Not: bu basit Node stub'i overlay.innerHTML icindeki string'i gercek DOM'a parse etmiyor,
  // bu yuzden getElementById ile o alt elemani bulamiyoruz (yorumlar bolumu boyle CALISIYOR
  // cunku orasi ayrica JS ile box.innerHTML=... olarak set ediliyor). O yuzden burada modalin
  // kullandigi AYNI sort ifadesini dogrudan existing.history uzerinde calistirip dogruluyoruz.
  const sorted = afterNoChange.history.slice().sort((a,b)=>b.createdAt-a.createdAt);
  console.log('En yeni (Durum degisikligi) basta mi:', sorted[0].message.includes('Durum'));
  console.log('En eski (olusturuldu) sonda mi:', sorted[1].message.includes('oluşturuldu'));
  console.log('createdAt gercekten azalan sirada mi:', sorted[0].createdAt >= sorted[1].createdAt);

  console.log('TÜM DEĞİŞİKLİK GEÇMİŞİ (5.5) TESTLERI TAMAMLANDI');
})();
`;
eval(script + '\n' + testCode);

const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};
function makeEl(){
  return { style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[], classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){} };
}
global.document = {
  getElementById(){ return makeEl(); }, querySelectorAll(){ return []; }, createElement(){ return makeEl(); }, body:{appendChild(){}},
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
  // Gerçek Firestore'da bir dokümanın alt koleksiyonu olabilir (örn. users/{uid}/data/state).
  // saveState()'in kullandığı cloudDocRef bu zinciri kullanıyor; madde 5.3 (bildirim merkezi)
  // artık bazı olaylarda saveState() tetiklediği için bu zincir bu testlerde de gerçek çalışmalı.
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

const testCode = `
let toastMsgs = [];
showToast = (m)=>{ toastMsgs.push(m); };

(async () => {
  const A = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};
  const B = {uid:'uidB', email:'elif@test.com', displayName:'Elif Demir'};

  console.log('--- Zaten tamamlanmis eski gorev icin ilk yuklemede bildirim ATILMAMALI ---');
  cloudUser = A;
  const oldDoneId = await createAssignedTask({
    title:'Eski tamamlanmis gorev', statusTag:'done', manualProgress:100, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    lastUpdatedByUid:B.uid, lastUpdatedByName:'Elif Demir',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  detachAssignedTaskListeners();
  cloudUser = A;
  toastMsgs = [];
  attachAssignedTaskListeners(); // ilk yukleme, oldDoneId zaten 'done' -> bildirim olmamali
  console.log('Ilk yuklemede tamamlanma bildirimi YOK (beklenen true):', toastMsgs.length === 0);

  console.log('--- B, kendine atanan yeni bir gorevi tamamliyor, A canli baglantidayken bildirim almali ---');
  const newId = await createAssignedTask({
    title:'Depo sayimi', statusTag:'not_started', manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    lastUpdatedByUid:A.uid, lastUpdatedByName:'Ergin Yilmaz',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  toastMsgs = [];
  // A'nin dinleyicisi acik (yukarida attach edildi, cloudUser hala A -- Firestore'da gercekte
  // guncellemeyi KIMIN yaptigi patch icindeki lastUpdatedByUid alanindan anlasilir, cloudUser
  // burada sadece "hangi oturum bu event'i isliyor" anlamina gelir, gercek uygulamada A ve B
  // ayri tarayicilarda ayri cloudUser'a sahip olur). B'nin gorevi tamamladigini simule ediyoruz:
  await updateAssignedTask(newId, {statusTag:'done', manualProgress:100, lastUpdatedByUid:B.uid, lastUpdatedByName:'Elif Demir', updatedAt: Date.now()});
  console.log('A tamamlanma bildirimi aldi mi:', toastMsgs.some(m=>m.includes('Elif Demir') && m.includes('Depo sayimi')));

  console.log('--- A kendi gorevini tamamlarsa KENDINE bildirim gitmemeli ---');
  const newId2 = await createAssignedTask({
    title:'Ikinci gorev', statusTag:'not_started', manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    lastUpdatedByUid:A.uid, lastUpdatedByName:'Ergin Yilmaz',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  toastMsgs = [];
  await updateAssignedTask(newId2, {statusTag:'done', manualProgress:100, lastUpdatedByUid:A.uid, lastUpdatedByName:'Ergin Yilmaz', updatedAt: Date.now()});
  console.log('A kendi degisikligi icin bildirim ALMADI (beklenen true):', toastMsgs.length === 0);

  detachAssignedTaskListeners();

  console.log('--- B tarafinda da ayni mekanizma calismali (A tamamlarsa B bilgilendirilir) ---');
  cloudUser = B;
  toastMsgs = [];
  attachAssignedTaskListeners(); // B baglaniyor, mevcut durumlar (done olanlar dahil) ilk yukleme sayilir, bildirim yok
  console.log('B ilk yuklemede bildirim almadi (beklenen true):', toastMsgs.length === 0);

  const newId3 = await createAssignedTask({
    title:'Ucuncu gorev', statusTag:'not_started', manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    lastUpdatedByUid:A.uid, lastUpdatedByName:'Ergin Yilmaz',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  toastMsgs = [];
  // cloudUser hala B (B'nin dinleyicisi aktif); A'nin tamamladigini lastUpdatedByUid ile simule ediyoruz.
  await updateAssignedTask(newId3, {statusTag:'done', manualProgress:100, lastUpdatedByUid:A.uid, lastUpdatedByName:'Ergin Yilmaz', updatedAt: Date.now()});
  console.log('B, A nin tamamladigini gordu mu:', toastMsgs.some(m=>m.includes('Ergin Yilmaz') && m.includes('Ucuncu gorev')));

  console.log('TÜM TAMAMLANMA BILDIRIMI TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

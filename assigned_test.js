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
  onSnapshot(cb, errCb){
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

  console.log('--- calcAssignedProgress (liste tabanli imza, ayrintili agac testi assigned_subtasks_test.js icinde) ---');
  const soloList = [{id:'solo', parentId:null, checklist:[{done:true},{done:false}]}];
  console.log('Checklist 1/2 (beklenen 50):', calcAssignedProgress(soloList,'solo') === 50);
  const soloList2 = [{id:'solo2', parentId:null, manualProgress:65, checklist:[]}];
  console.log('Manuel 65 (checklist yok, beklenen 65):', calcAssignedProgress(soloList2,'solo2') === 65);

  console.log('--- A gorevi B ye atiyor ---');
  cloudUser = A;
  attachAssignedTaskListeners();
  const newId = await createAssignedTask({
    title:'Depo sayimi', description:'', statusTag:'not_started',
    startDate:'2026-08-10', dueDate:'2026-08-20', completionDate:'', priority:3,
    manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  console.log('sharedTasks store da dogru id ile olusturuldu mu:', fakeStore.sharedTasks[newId].title === 'Depo sayimi');
  console.log('A tarafinda Atadiklarim listesinde var mi:', myAssignedToOthers.some(t=>t.id===newId));
  detachAssignedTaskListeners();
  console.log('detach sonrasi A listeleri bosaldi mi:', myAssignedToOthers.length === 0 && myAssignedToMe.length === 0);

  console.log('--- B oturumu: gorev ekraninda gormeli + toast almali ---');
  cloudUser = B;
  toastMsgs = [];
  attachAssignedTaskListeners();
  console.log('Ilk yuklemede toast YOK (beklenen true, ilk yukleme sayilmaz):', toastMsgs.length === 0);
  console.log('B, Bana Atananlar listesinde goruyor mu:', myAssignedToMe.some(t=>t.id===newId));

  console.log('--- B gorevi gunceller (tam yetki: baslik da dahil) ---');
  await updateAssignedTask(newId, {title:'Depo sayimi (guncellendi)', manualProgress:40, updatedAt: Date.now()});
  console.log('Guncelleme B tarafinda yansidi mi:', myAssignedToMe.find(t=>t.id===newId).title === 'Depo sayimi (guncellendi)');
  console.log('manualProgress guncellendi mi:', myAssignedToMe.find(t=>t.id===newId).manualProgress === 40);

  detachAssignedTaskListeners();

  console.log('--- A oturumuna don: B nin guncellemesini gormeli ---');
  detachAssignedTaskListeners(); // onceki (B) dinleyicisini kapat, gercekte iki ayri tarayici olurdu
  cloudUser = A;
  attachAssignedTaskListeners();
  console.log('A, guncel basligi goruyor mu:', myAssignedToOthers.find(t=>t.id===newId).title === 'Depo sayimi (guncellendi)');
  detachAssignedTaskListeners();

  console.log('--- Yeni bir gorev daha atiyoruz, B canli baglantidayken (dinleyici acik) toast beklenir ---');
  cloudUser = B;
  attachAssignedTaskListeners(); // B tekrar baglaniyor (mevcut 1 gorev icin toast atmamali)
  toastMsgs = [];
  // B'nin dinleyicisi simdi acik. A, yeni bir gorev atiyor; gercek Firestore'da bu B'nin
  // ZATEN ACIK olan onSnapshot dinleyicisini tetikler.
  const ownerBackup = cloudUser;
  cloudUser = A;
  const secondId = await createAssignedTask({
    title:'Ikinci gorev', description:'', statusTag:'not_started',
    startDate:'', dueDate:'', completionDate:'', priority:2, manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  cloudUser = ownerBackup; // B
  console.log('Yeni atanan gorev icin toast geldi mi:', toastMsgs.length === 1);
  console.log('Toast icerigi dogru gorevi isaret ediyor mu:', toastMsgs.length === 1 && toastMsgs[0].includes('Ikinci gorev'));

  console.log('--- Silme: sadece sahibi silebilir (rule client tarafinda simule edilmiyor, fonksiyon calisiyor mu kontrolu) ---');
  await deleteAssignedTask(newId);
  console.log('Silinen gorev store dan kalkti mi:', !fakeStore.sharedTasks[newId]);

  console.log('TÜM GOREV ATAMA TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

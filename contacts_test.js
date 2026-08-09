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

// ---- Genel amacli sahte Firestore ----
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
global.confirm=()=>true;
let alertMsgs = [];
global.alert=(m)=>{ alertMsgs.push(m); };
let toastMsgs = [];
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

const testCode = `
showToast = (m)=>{ toastMsgs.push(m); };

(async () => {
  const A = {uid:'uidA', email:'Ergin@Test.com', displayName:'Ergin Yilmaz'};
  const B = {uid:'uidB', email:'elif@test.com', displayName:'Elif Demir'};

  console.log('--- A oturumu: dizine kaydol + B daha once girmis olsun ---');
  cloudUser = A;
  upsertUserDirectory(A);
  upsertUserDirectory(B); // B'nin de daha once giris yaptigini simule ediyoruz
  attachContactsListeners();

  const foundB = await findUserByEmail('ELIF@test.com'); // buyuk/kucuk harf duyarsiz olmali
  console.log('E-posta ile B bulundu mu (kucuk/buyuk harf duyarsiz):', !!foundB && foundB.uid === 'uidB');

  const notFound = await findUserByEmail('yok@test.com');
  console.log('Olmayan eposta null donuyor mu:', notFound === null);

  await addContact(B.uid, B.email, 'Elif Demir', 'Depo Sorumlusu');
  console.log('A -> B contacts kaydi olustu mu:', !!fakeStore.contacts['uidA_uidB']);
  console.log('A tarafinda henuz mutual DEGIL (B daha eklemedi):', isMutual('uidB') === false);
  console.log('A outgoing listesinde B var mi:', myOutgoingContacts.some(c=>c.toUid==='uidB'));

  detachContactsListeners();

  console.log('--- B oturumu: A kendisini eklemis, gormeli ---');
  cloudUser = B;
  toastMsgs = [];
  attachContactsListeners(); // ilk yukleme - henuz toast atmamali (contactsInitialized ilk kez true oluyor)
  console.log('B, gelen listede A yi goruyor mu:', myIncomingContacts.some(c=>c.fromUid==='uidA'));
  console.log('Ilk yuklemede toast atilmadi mi (beklenen true):', toastMsgs.length === 0);
  console.log('B tarafinda henuz mutual DEGIL:', isMutual('uidA') === false);

  await addContact(A.uid, A.email, 'Ergin Yilmaz', 'Satis Gelistirme Yoneticisi');
  console.log('B -> A contacts kaydi olustu mu:', !!fakeStore.contacts['uidB_uidA']);
  console.log('B tarafinda simdi mutual mi:', isMutual('uidA') === true);

  detachContactsListeners();

  console.log('--- A oturumuna geri don: karsilikli baglanti gormeli + yeni ekleme toast\\'i almali ---');
  cloudUser = A;
  toastMsgs = [];
  attachContactsListeners();
  console.log('A tarafinda simdi mutual mi:', isMutual('uidB') === true);
  console.log('A, B nin kendisini ekledigini goruyor mu (incoming):', myIncomingContacts.some(c=>c.fromUid==='uidB'));

  console.log('--- Kendi kendine ekleme kontrolu (UI seviyesinde, manuel dogrulama) ---');
  console.log('normalizeEmail calisiyor mu:', normalizeEmail('Ergin@Test.com') === 'ergin@test.com');

  console.log('TÜM BAGLANTI TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

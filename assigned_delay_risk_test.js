// Madde 9.4 - Atadigin gorevler icin gecikme riski bildirimi.
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

function isoDaysFromNow(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

const testCode = `
let toastMsgs = [];
let notifMsgs = [];
showToast = (m)=>{ toastMsgs.push(m); };
const _origAddNotification = addNotification;
addNotification = (m)=>{ notifMsgs.push(m); _origAddNotification(m); };

(async () => {
  const A = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};
  const B = {uid:'uidB', email:'elif@test.com', displayName:'Elif Demir'};

  console.log('--- paceStatusFromRangeProgress: kritik risk esigi (gap>30) dogru mu ---');
  const range = {start:'${isoDaysFromNow(-10)}', end:'${isoDaysFromNow(10)}'};
  const p1 = paceStatusFromRangeProgress(range, 0);
  console.log('20 gunluk araligin yarisi gecmis, %0 ilerleme -> critical mi:', p1.level === 'critical');

  console.log('--- A, B ye YAKIN VADELI VE GERIDE bir gorev atiyor (baslangic gecmiste, ilerleme 0) ---');
  cloudUser = A;
  attachAssignedTaskListeners();
  const riskyId = await createAssignedTask({
    title:'Riskli Gorev', description:'', statusTag:'in_progress',
    startDate:'${isoDaysFromNow(-10)}', dueDate:'${isoDaysFromNow(10)}', completionDate:'', priority:3,
    manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  console.log('Gorev olusturuldu mu:', !!fakeStore.sharedTasks[riskyId]);
  console.log('Canli baglantida ANLIK olusan risk icin toast da atildi mi (gercek zamanli, spam-onleme sadece ILK ACILISA ozel):', toastMsgs.some(m=>m.includes('Riskli Gorev')));

  console.log('--- Uygulamayi KAPATIP ACMA simulasyonu: dinleyiciyi kopar, halihazirda riskli veriyle YENIDEN bagla ---');
  detachAssignedTaskListeners();
  toastMsgs = [];
  notifMsgs = [];
  attachAssignedTaskListeners();
  console.log('--- Ilk yukleme sirasinda (halihazirda riskli) SESSIZ bildirim: notif VAR, toast YOK ---');
  console.log('Bildirim merkezine eklendi mi:', notifMsgs.some(m=>m.includes('Riskli Gorev')));
  console.log('Ilk yuklemede toast atilmadi mi (spam onleme):', !toastMsgs.some(m=>m.includes('Riskli Gorev')));
  console.log('assignedRiskLevel Map critical olarak isaretledi mi:', assignedRiskLevel.get(riskyId) === 'critical');

  console.log('--- Ayni seviyede kaldigi surece TEKRAR bildirim URETILMEMELI ---');
  notifMsgs = [];
  checkAssignedDelayRisk(myAssignedToOthers);
  console.log('Seviye degismedigi icin yeni bildirim eklenmedi mi:', notifMsgs.length === 0);

  console.log('--- Gorev tamamlanip risk ortadan kalkinca Map den silinmeli ---');
  await updateAssignedTask(riskyId, {manualProgress:100, updatedAt: Date.now()});
  checkAssignedDelayRisk(myAssignedToOthers);
  console.log('Risk Map den silindi mi (tamamlandi, artik risk yok):', !assignedRiskLevel.has(riskyId));

  console.log('--- Risk azaldiktan (tamamlandiktan) SONRA yeniden geriye dusulurse (manuel dusuru) YENIDEN bildirilmeli ---');
  notifMsgs = [];
  toastMsgs = [];
  await updateAssignedTask(riskyId, {manualProgress:0, updatedAt: Date.now()});
  checkAssignedDelayRisk(myAssignedToOthers);
  console.log('Risk yeniden algilandi mi (toast bu kez VAR, cunku artik ilk yukleme degil):', toastMsgs.some(m=>m.includes('Riskli Gorev')));
  console.log('Bildirim merkezine tekrar eklendi mi:', notifMsgs.some(m=>m.includes('Riskli Gorev')));

  console.log('--- Termini/baslangici olmayan (aralik hesaplanamayan) gorev icin hata VERMEMELI, risk uretmemeli ---');
  const noDateId = await createAssignedTask({
    title:'Tarihsiz Gorev', description:'', statusTag:'not_started',
    startDate:'', dueDate:'', completionDate:'', priority:1, manualProgress:0, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  let noDateError = false;
  try{ checkAssignedDelayRisk(myAssignedToOthers); }catch(e){ noDateError = true; console.error(e); }
  console.log('Tarihsiz gorev hataya sebep olmadi mi:', !noDateError);
  console.log('Tarihsiz gorev icin risk kaydi olusmadi mi:', !assignedRiskLevel.has(noDateId));

  console.log('--- Zamaninda giden (risk yok) bir gorev icin hic bildirim uretilmemeli ---');
  notifMsgs = [];
  const okId = await createAssignedTask({
    title:'Yolunda Giden Gorev', description:'', statusTag:'in_progress',
    startDate:'${isoDaysFromNow(-5)}', dueDate:'${isoDaysFromNow(5)}', completionDate:'', priority:2,
    manualProgress:60, checklist:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:'Elif Demir',
    createdAt: Date.now(), updatedAt: Date.now()
  });
  console.log('Yolunda giden gorev icin bildirim URETILMEDI mi:', !notifMsgs.some(m=>m.includes('Yolunda Giden Gorev')));
  console.log('assignedRiskLevel de kaydi yok mu:', !assignedRiskLevel.has(okId));

  detachAssignedTaskListeners();
  console.log('detach sonrasi assignedRiskLevel de temizlendi mi:', assignedRiskLevel.size === 0);

  console.log('TÜM GECIKME RISKI BILDIRIMI (9.4) TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

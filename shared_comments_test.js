// Madde 5.4 - Atanan gorevlerde yorum/not alisverisi.
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
(async () => {
  const A = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};
  const B = {uid:'uidB', email:'elif@test.com', displayName:'Elif Demir'};

  console.log('--- Gorev olusturuluyor (A, B ye atiyor) ---');
  cloudUser = A;
  const taskId = await createAssignedTask({
    title:'Rapor hazirla', description:'', statusTag:'not_started', priority:2, manualProgress:0,
    checklist:[], attachments:[], comments:[],
    ownerUid:A.uid, ownerEmail:A.email, ownerName:A.displayName,
    assigneeUid:B.uid, assigneeEmail:B.email, assigneeName:B.displayName,
    createdAt: Date.now(), updatedAt: Date.now()
  });
  console.log('Gorev olustu mu:', !!taskId);

  console.log('--- updateAssignedTask ile yorum ekleniyor (A yorum yapiyor) ---');
  let doc = await sharedTaskDocRef(taskId).get();
  console.log('Baslangicta comments bos mu:', (doc.data().comments||[]).length === 0);

  const commentA = {id: uid(), text:'Ilk taslak hazir, goz atar misin?', authorUid:A.uid, authorName:A.displayName, authorEmail:A.email, createdAt: Date.now()};
  await updateAssignedTask(taskId, {comments: [commentA]});
  doc = await sharedTaskDocRef(taskId).get();
  console.log('A nin yorumu kaydedildi mi:', doc.data().comments.length === 1 && doc.data().comments[0].text === commentA.text);
  console.log('Yazar bilgisi dogru mu:', doc.data().comments[0].authorName === 'Ergin Yilmaz');

  console.log('--- B tarafi ayni gorevi okuyup kendi yorumunu ekliyor (mevcut yorumlar korunmali) ---');
  cloudUser = B;
  doc = await sharedTaskDocRef(taskId).get();
  const existingComments = doc.data().comments || [];
  const commentB = {id: uid(), text:'Tamam, inceliyorum.', authorUid:B.uid, authorName:B.displayName, authorEmail:B.email, createdAt: Date.now()+1000};
  await updateAssignedTask(taskId, {comments: [...existingComments, commentB]});
  doc = await sharedTaskDocRef(taskId).get();
  console.log('Iki yorum da var mi:', doc.data().comments.length === 2);
  console.log('Sira korunuyor mu (A once, B sonra):', doc.data().comments[0].text === commentA.text && doc.data().comments[1].text === commentB.text);
  console.log('Diger alanlar (baslik) etkilenmedi mi (merge calisiyor mu):', doc.data().title === 'Rapor hazirla');

  console.log('--- openSharedTaskModal: yorum bolumu dogru render ediliyor mu ---');
  cloudUser = A;
  myAssignedToOthers = [doc.data()];
  myAssignedToMe = [];
  openSharedTaskModal({mode:'edit', taskId: taskId});
  const commentsHtml = document.getElementById('sh_commentsContainer').innerHTML;
  console.log('Iki yorum da modalde goruntuleniyor mu:', commentsHtml.includes(commentA.text) && commentsHtml.includes(commentB.text));
  console.log('Yazar isimleri goruntuleniyor mu:', commentsHtml.includes('Ergin Yilmaz') && commentsHtml.includes('Elif Demir'));

  console.log('--- Modal uzerinden yeni yorum gonderme (addComment akisi) ---');
  document.getElementById('sh_commentNewText').value = 'Son kontrolu yaptim, onaylandi.';
  document.getElementById('sh_btnAddComment').click();
  await new Promise(r=>setTimeout(r, 10));
  const afterDoc = await sharedTaskDocRef(taskId).get();
  console.log('Ucuncu yorum kaydedildi mi:', afterDoc.data().comments.length === 3);
  console.log('Input temizlendi mi:', document.getElementById('sh_commentNewText').value === '');

  console.log('--- Yeni (henuz kaydedilmemis) gorev modali hatasiz aciliyor mu (yorum alani sadece isEdit da render edilir) ---');
  closeSharedTaskModal();
  let createModalThrew = false;
  try{ openSharedTaskModal({mode:'create'}); }catch(e){ createModalThrew = true; console.error(e); }
  console.log('Hata firlatmadan acildi mi:', !createModalThrew);
  closeSharedTaskModal();

  console.log('TÜM YORUM (5.4) TESTLERI TAMAMLANDI');
})();
`;
eval(script + '\n' + testCode);

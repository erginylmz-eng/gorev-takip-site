const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
const registry = new Map();
function makeEl(id){
  return {
    id: id||'', style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[],
    classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){}, scrollIntoView(){}
  };
}
global.document = {
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(){ return []; }, createElement(){ return makeEl(); }, body:{appendChild(){}},
  addEventListener(){}, removeEventListener(){}
};
const fakeSharedStore = {};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){
    return {
      enablePersistence(){return {catch(){}};},
      collection(collName){
        if(collName === 'sharedTasks'){
          return {
            doc(id){
              return {
                set(data, opts){
                  if(opts && opts.merge && fakeSharedStore[id]) Object.assign(fakeSharedStore[id], data);
                  else fakeSharedStore[id] = {...data};
                  return Promise.resolve();
                },
                delete(){ delete fakeSharedStore[id]; return Promise.resolve(); }
              };
            }
          };
        }
        return { doc(){ return { collection(){ return { doc(){ return {
          onSnapshot(cb){ cb({exists:false}); return ()=>{}; }, set(){ return Promise.resolve(); }
        };}};}};}};
      }
    };
  },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=()=>{};
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- Kisisel gorev silme artik state.trash icine tasiyor mu (kalici silmiyor mu) ---');
state.tasks = [
  {id:'p1', categoryId:'cat1', parentId:null, title:'Ana gorev', manualProgress:0, checklist:[], createdAt:1},
  {id:'p1a', categoryId:'cat1', parentId:'p1', title:'Alt gorev', manualProgress:0, checklist:[], createdAt:2}
];
state.trash = [];
deleteTaskCascade('p1');
console.log('state.tasks bos mu (ikisi de tasindi):', state.tasks.length === 0);
console.log('state.trash 2 kayit iceriyor mu:', state.trash.length === 2);
console.log('Trash kayitlari ayni deletedAt batch ile mi:', state.trash[0].deletedAt === state.trash[1].deletedAt);

console.log('--- trashBatches tek bir silme islemini grupluyor mu ---');
const batches = trashBatches();
console.log('Tek batch var mi:', batches.length === 1);
console.log('rootTitle dogru mu:', batches[0].rootTitle === 'Ana gorev');
console.log('childCount dogru mu (1 alt gorev):', batches[0].childCount === 1);

console.log('--- restoreTrashBatch geri yukluyor mu ---');
restoreTrashBatch(batches[0].deletedAt);
console.log('state.tasks tekrar 2 eleman mi:', state.tasks.length === 2);
console.log('state.trash bosaldi mi:', state.trash.length === 0);
console.log('Geri yuklenen gorevin ID leri dogru mu:', state.tasks.some(t=>t.id==='p1') && state.tasks.some(t=>t.id==='p1a'));

console.log('--- permanentlyDeleteTrashBatch kalici siliyor mu ---');
deleteTaskCascade('p1');
const batch2 = trashBatches()[0];
permanentlyDeleteTrashBatch(batch2.deletedAt);
console.log('trash bosaldi mi:', state.trash.length === 0);
console.log('tasks hala bos mu (geri gelmedi):', state.tasks.length === 0);

console.log('--- purgeExpiredTrash: eski kayitlari otomatik temizliyor mu ---');
state.tasks = [{id:'old1', categoryId:'cat1', parentId:null, title:'Eski silinmis', manualProgress:0, checklist:[], createdAt:1}];
deleteTaskCascade('old1');
// deletedAt'i yapay olarak 40 gun once yap (TRASH_RETENTION_DAYS=30 asilmis olsun)
state.trash[0].deletedAt = Date.now() - 40*86400000;
const purged = purgeExpiredTrash();
console.log('purgeExpiredTrash true dondu mu (bir sey silindi):', purged === true);
console.log('trash bosaldi mi:', state.trash.length === 0);

console.log('--- Yeni (henuz suresi dolmamis) kayitlar purge edilmiyor mu ---');
state.tasks = [{id:'new1', categoryId:'cat1', parentId:null, title:'Yeni silinmis', manualProgress:0, checklist:[], createdAt:1}];
deleteTaskCascade('new1');
const purged2 = purgeExpiredTrash();
console.log('purgeExpiredTrash false dondu mu (henuz suresi dolmadi):', purged2 === false);
console.log('trash hala 1 kayit mi:', state.trash.length === 1);

console.log('--- ensureTrash: trash alani olmayan eski veriye geriye donuk uyum ---');
const oldStyleState = {categories:[], tasks:[]};
ensureTrash(oldStyleState);
console.log('trash dizisi eklendi mi:', Array.isArray(oldStyleState.trash) && oldStyleState.trash.length === 0);

console.log('--- Atanan (shared) gorev: silme deleted:true olarak isaretliyor mu (kalici silmiyor mu) ---');
cloudUser = {uid:'owner1', email:'owner@x.com', displayName:'Owner'};
const sharedList = [
  {id:'s1', ownerUid:'owner1', assigneeUid:'assignee1', parentId:null, title:'Atanan ana', manualProgress:0, checklist:[]},
  {id:'s1a', ownerUid:'owner1', assigneeUid:'assignee1', parentId:'s1', title:'Atanan alt', manualProgress:0, checklist:[]}
];
fakeSharedStore.s1 = {...sharedList[0]};
fakeSharedStore.s1a = {...sharedList[1]};
deleteSharedTaskCascade(sharedList, 's1').then(()=>{
  console.log('Firestore dokumanlari hala mevcut mu (silinmedi, isaretlendi):', 's1' in fakeSharedStore && 's1a' in fakeSharedStore);
  console.log('deleted:true olarak isaretlendi mi:', fakeSharedStore.s1.deleted === true && fakeSharedStore.s1a.deleted === true);
  console.log('Ayni deletedAt batch ile mi isaretlendi:', fakeSharedStore.s1.deletedAt === fakeSharedStore.s1a.deletedAt);

  console.log('--- restoreAssignedTask geri yukluyor mu ---');
  return restoreAssignedTask('s1');
}).then(()=>{
  console.log('deleted:false oldu mu:', fakeSharedStore.s1.deleted === false);

  console.log('--- purgeExpiredSharedTrash: suresi dolani kalici siliyor mu ---');
  const trashedList = [
    {id:'exp1', deleted:true, deletedAt: Date.now() - 40*86400000},
    {id:'exp2', deleted:true, deletedAt: Date.now() - 5*86400000}
  ];
  fakeSharedStore.exp1 = {...trashedList[0]};
  fakeSharedStore.exp2 = {...trashedList[1]};
  purgeExpiredSharedTrash(trashedList);
  return new Promise(r=>setTimeout(r, 10));
}).then(()=>{
  console.log('40 gunluk kayit kalici silindi mi:', !('exp1' in fakeSharedStore));
  console.log('5 gunluk kayit hala duruyor mu (suresi dolmadi):', 'exp2' in fakeSharedStore);

  console.log('TÜM ÇÖP KUTUSU (SOFT DELETE) TESTLERI TAMAMLANDI');
}).catch(err=>{ console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

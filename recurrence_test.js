const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
function makeEl(){
  return { style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[], classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, removeAttribute(){}, remove(){} };
}
global.document = {
  documentElement: makeEl(),
  getElementById(){ return makeEl(); }, querySelectorAll(){ return []; }, createElement(){ return makeEl(); }, body:{appendChild(){}},
  addEventListener(){}, removeEventListener(){}
};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(){return {doc(){return {collection(){return {doc(){return {onSnapshot(cb){cb({exists:false});return ()=>{};}, set(){return Promise.resolve();}};}};}};}};}}; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=()=>{};
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- addRecurrenceInterval: gunluk/haftalik/aylik dogru ilerliyor mu ---');
console.log('Gunluk (2026-08-07 -> 2026-08-08):', addRecurrenceInterval('2026-08-07','daily') === '2026-08-08');
console.log('Haftalik (2026-08-07 -> 2026-08-14):', addRecurrenceInterval('2026-08-07','weekly') === '2026-08-14');
console.log('Aylik (2026-08-07 -> 2026-09-07):', addRecurrenceInterval('2026-08-07','monthly') === '2026-09-07');
console.log('Ay tasmasi (2026-01-31 + 1 ay -> Mart a taşar, JS Date davranışı):', addRecurrenceInterval('2026-01-31','monthly') === '2026-03-03');
console.log('none icin degismez:', addRecurrenceInterval('2026-08-07','none') === '2026-08-07');

console.log('--- spawnNextRecurrence: dueDate yoksa hicbir sey olusturmuyor ---');
state.tasks = [];
const noDate = {id:'t0', categoryId:'cat1', parentId:null, title:'Tarihsiz', recurrence:'daily', dueDate:'', manualProgress:0, checklist:[]};
console.log('null donuyor mu:', spawnNextRecurrence(noDate) === null);

console.log('--- spawnNextRecurrence: recurrence none ise hicbir sey olusturmuyor ---');
const noneRecur = {id:'t1', categoryId:'cat1', parentId:null, title:'Tekrarsiz', recurrence:'none', dueDate:'2026-08-07', manualProgress:0, checklist:[]};
console.log('null donuyor mu:', spawnNextRecurrence(noneRecur) === null);

console.log('--- spawnNextRecurrence: haftalik tekrar dogru olusuyor mu ---');
state.tasks = [];
const weeklyTask = {
  id:'w1', categoryId:'cat1', parentId:null, title:'Haftalik Rapor', description:'aciklama',
  recurrence:'weekly', startDate:'2026-08-03', dueDate:'2026-08-07', priority:3,
  manualProgress:100, checklist:[{id:'c1', text:'madde', done:true}], attachments:[{id:'a1'}], statusTag:'done'
};
const spawned = spawnNextRecurrence(weeklyTask);
console.log('Yeni gorev olustu mu:', spawned !== null);
console.log('Yeni ID orijinalden farkli mi:', spawned.id !== weeklyTask.id);
console.log('Baslik aynen kopyalandi mi:', spawned.title === 'Haftalik Rapor');
console.log('Yeni termin dogru mu (2026-08-14):', spawned.dueDate === '2026-08-14');
console.log('Baslangic-termin farki korunuyor mu (4 gun once, 2026-08-10):', spawned.startDate === '2026-08-10');
console.log('statusTag sifirlandi mi (not_started):', spawned.statusTag === 'not_started');
console.log('manualProgress sifirlandi mi:', spawned.manualProgress === 0);
console.log('completionDate bos mu:', spawned.completionDate === '');
console.log('checklist maddesi korundu ama isaret sifirlandi mi:', spawned.checklist.length === 1 && spawned.checklist[0].done === false && spawned.checklist[0].text === 'madde');
console.log('attachments kopyalanmadi mi (bos dizi):', spawned.attachments.length === 0);
console.log('recurrence korundu mu:', spawned.recurrence === 'weekly');
console.log('state.tasks a eklendi mi:', state.tasks.includes(spawned));

console.log('--- Ayni gorev tekrar Tamamlandi olarak kaydedilirse (statusTag zaten done idi) yeni tekrar OLUSMAMALI ---');
console.log('(Bu mantik saveModalTask icinde prevStatusTag kontrolu ile saglaniyor, spawnNextRecurrence kendisi her cagrildiginda calisir; asil koruma UI katmaninda.)');

console.log('TÜM TEKRARLANAN GOREV TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

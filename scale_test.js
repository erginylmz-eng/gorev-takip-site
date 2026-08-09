// Madde 3.4 - Ölçek testi: yüzlerce görev, derin alt görev hiyerarşisi ve çok-yıllık Gantt
// (365+ gün sütunu) gerçek veriye yakın büyüklükte üretilip performansın makul kalıp kalmadığı
// ve hiçbir fonksiyonun hata/sonsuz döngüye girmediği doğrulanır. Gerçek bir tarayıcı DOM'u
// olmadığı için piksel/render süresi ölçülmüyor, ama uygulamanın JS mantığı (calcProgress,
// buildGanttRows, render zinciri) gerçek boyutlu veriyle tam olarak çalıştırılıyor.

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
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(){return {doc(){return {collection(){return {doc(){return {onSnapshot(cb){cb({exists:false});return ()=>{};}, set(){return Promise.resolve();}};}};}};}};}}; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=()=>{};
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- Sentetik buyuk veri seti olusturuluyor (300+ gorev, 3 yillik tarih araligi) ---');
const CATS = [
  {id:'catA', name:'Kategori A', color:'#2563eb'},
  {id:'catB', name:'Kategori B', color:'#16a34a'},
  {id:'catC', name:'Kategori C', color:'#d97706'},
  {id:'catD', name:'Kategori D', color:'#7c3aed'},
  {id:'catE', name:'Kategori E', color:'#dc2626'}
];
state.categories = CATS;
state.tasks = [];
state.trash = [];

function randomDateIso(baseYear, spreadYears){
  const y = baseYear + Math.floor(Math.random()*spreadYears);
  const m = 1 + Math.floor(Math.random()*12);
  const d = 1 + Math.floor(Math.random()*28);
  return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
}

let taskCounter = 0;
const ROOT_COUNT = 150; // her kategoride 30 kok gorev x 5 kategori = 150 kok (+ alt/torun gorevlerle 300+)
CATS.forEach(cat=>{
  for(let i=0;i<ROOT_COUNT/5;i++){
    const rootId = 'root_' + (taskCounter++);
    state.tasks.push({
      id: rootId, categoryId: cat.id, parentId: null,
      title: 'Kok gorev ' + rootId, description:'',
      dueDate: randomDateIso(2024, 3), completionDate:'', priority: 1+Math.floor(Math.random()*3),
      manualProgress: Math.floor(Math.random()*100), checklist:[], createdAt: Date.now()
    });
    // Her koke 0-4 alt gorev, bazilarina da 2. seviye alt gorev ekleyerek derinlik olustur
    const childCount = Math.floor(Math.random()*5);
    for(let c=0;c<childCount;c++){
      const childId = 'child_' + (taskCounter++);
      state.tasks.push({
        id: childId, categoryId: cat.id, parentId: rootId,
        title: 'Alt gorev ' + childId, description:'',
        dueDate: randomDateIso(2024, 3), completionDate:'', priority: 2,
        manualProgress: Math.floor(Math.random()*100), checklist:[], createdAt: Date.now()
      });
      if(c === 0){
        // bir tanesine 3. seviye ekle (derinlik testi)
        const grandChildId = 'grandchild_' + (taskCounter++);
        state.tasks.push({
          id: grandChildId, categoryId: cat.id, parentId: childId,
          title: 'Torun gorev ' + grandChildId, description:'',
          dueDate: '', completionDate:'', priority: 2,
          manualProgress: Math.floor(Math.random()*100), checklist:[], createdAt: Date.now()
        });
      }
    }
  }
});
console.log('Toplam uretilen gorev sayisi:', state.tasks.length);
console.log('Beklenen (>= 300):', state.tasks.length >= 300);

console.log('--- calcProgress: TUM kok gorevler icin hesaplama suresi ---');
invalidateProgressCache();
const t0 = Date.now();
const rootTasks = state.tasks.filter(t=>!t.parentId);
rootTasks.forEach(t => calcProgress(t.id));
const calcMs = Date.now() - t0;
console.log('Sure (ms):', calcMs);
console.log('Makul surede bitti mi (< 2000ms):', calcMs < 2000);

console.log('--- buildGanttRows: 3 yillik veriyle (yil gorunumu, 365+ gun) ---');
ganttViewMode = 'year';
ganttYear = 2025;
const t1 = Date.now();
let ganttRows;
let ganttThrew = false;
try{ ganttRows = buildGanttRows(); }catch(e){ ganttThrew = true; console.error(e); }
const ganttMs = Date.now() - t1;
console.log('Hata firlatmadan bitti mi:', !ganttThrew);
console.log('Satir uretti mi (> 0):', ganttRows && ganttRows.length > 0);
console.log('Sure (ms):', ganttMs);
console.log('Makul surede bitti mi (< 2000ms):', ganttMs < 2000);

console.log('--- render(): tum zincirin (dashboard + liste + gantt) 300+ gorevle calismasi ---');
const t2 = Date.now();
let renderThrew = false;
try{ render(); }catch(e){ renderThrew = true; console.error(e); }
const renderMs = Date.now() - t2;
console.log('Hata firlatmadan bitti mi:', !renderThrew);
console.log('Sure (ms):', renderMs);
console.log('Makul surede bitti mi (< 3000ms):', renderMs < 3000);

console.log('--- Cok derin (100 seviyeli) tekil zincir: yigin tasmasi (stack overflow) olmadan bitiyor mu ---');
state.tasks = [];
let prevId = null;
for(let i=0;i<100;i++){
  const id = 'deep_' + i;
  state.tasks.push({id, categoryId:'catA', parentId: prevId, title:'Derin ' + i, manualProgress: i%100, checklist:[], createdAt:1});
  prevId = id;
}
invalidateProgressCache();
let deepThrew = false;
let deepResult;
try{ deepResult = calcProgress('deep_0'); }catch(e){ deepThrew = true; console.error(e); }
console.log('100 seviyeli zincirde hata firlatmadan bitti mi:', !deepThrew);
console.log('Bir sayi dondu mu:', typeof deepResult === 'number' && !Number.isNaN(deepResult));

console.log('--- Genis (500 kardes) tek seviye: performans makul mu ---');
state.tasks = [];
for(let i=0;i<500;i++){
  state.tasks.push({id:'wide_'+i, categoryId:'catA', parentId:null, title:'Genis '+i, manualProgress: i%100, checklist:[], createdAt:1});
}
invalidateProgressCache();
const t3 = Date.now();
state.tasks.forEach(t=>calcProgress(t.id));
const wideMs = Date.now() - t3;
console.log('500 kardes gorev hesaplama suresi (ms):', wideMs);
console.log('Makul surede bitti mi (< 1000ms):', wideMs < 1000);

console.log('TÜM ÖLÇEK (SCALE) TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

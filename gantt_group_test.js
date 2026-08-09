const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};

function makeGanttContainer(){
  let html = '';
  const el = {
    get innerHTML(){ return html; },
    set innerHTML(v){ html = v; },
    style:{setProperty(){}}, textContent:'', value:'',
    classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(){}, appendChild(){}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){}, scrollIntoView(){},
    __handlers: {},
    querySelectorAll(sel){
      const attrMatch = sel.match(/\[(data-[a-z-]+)\]/);
      if(!attrMatch) return [];
      const attr = attrMatch[1];
      const re = new RegExp(attr + '="([^"]*)"', 'g');
      const results = [];
      let m;
      while((m = re.exec(html))){
        const id = m[1];
        results.push({
          getAttribute(name){ return name===attr ? id : null; },
          addEventListener: (type, fn) => { if(type==='click'){ (el.__handlers[attr] = el.__handlers[attr]||{})[id] = fn; } }
        });
      }
      return results;
    }
  };
  return el;
}

function makeEl(id){
  return {
    id: id||'', style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[],
    classList:{add(){},remove(){},contains(){return false;}},
    addEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){}, scrollIntoView(){}
  };
}

const registry = new Map();
const ganttSidebarEl = makeGanttContainer();
const ganttRowsEl = makeGanttContainer();
global.document = {
  getElementById(id){
    if(id === 'ganttSidebar') return ganttSidebarEl;
    if(id === 'ganttRows') return ganttRowsEl;
    if(!registry.has(id)) registry.set(id, makeEl(id));
    return registry.get(id);
  },
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

const testCode = `
console.log('--- Kurulum: kategoriler + tarihli gorevler ---');
state.categories = [
  {id:'cat1', name:'Mevcut Musteri Talepleri', color:'#2563eb'},
  {id:'cat2', name:'Yeni Musteri', color:'#16a34a'}
];
state.tasks = [
  {id:'t1', categoryId:'cat1', parentId:null, title:'Cat1 Görev A', startDate:'2026-08-01', dueDate:'2026-08-10', manualProgress:40, checklist:[]},
  {id:'t2', categoryId:'cat2', parentId:null, title:'Cat2 Görev B', startDate:'2026-08-05', dueDate:'2026-08-15', manualProgress:0, checklist:[]}
];
ganttMonthIndex = 7; ganttMonthYear = 2026; ganttViewMode = 'month';
recomputeGanttWindow();

console.log('--- Oturum kapaliyken: sadece kategori basliklari olmali, atanan grup YOK ---');
cloudUser = null;
myAssignedToMe = [{id:'a1', parentId:null, title:'Bana atanan gorev', startDate:'2026-08-03', dueDate:'2026-08-08', manualProgress:50, checklist:[]}];
myAssignedToOthers = [{id:'a2', parentId:null, title:'Benim atadigim gorev', startDate:'2026-08-04', dueDate:'2026-08-09', manualProgress:20, checklist:[]}];
const rowsClosed = buildGanttRows();
console.log('Kategori basliklari var mi (2 tane):', rowsClosed.filter(r=>r.type==='header' && (r.label==='Mevcut Musteri Talepleri' || r.label==='Yeni Musteri')).length === 2);
console.log('Bana Atananlar grubu YOK (beklenen true):', !rowsClosed.some(r=>r.type==='header' && r.label.includes('Bana Atananlar')));
console.log('Atadiklarim grubu YOK (beklenen true):', !rowsClosed.some(r=>r.type==='header' && r.label.includes('Atadıklarım')));

console.log('--- Oturum acikken: kategori basliklari + Bana Atananlar + Atadiklarim gruplari gorunmeli ---');
cloudUser = {uid:'uidX', email:'x@test.com'};
renderGantt();
const sidebarHtml = document.getElementById('ganttSidebar').innerHTML;
console.log('Cat1 basligi sidebarda var mi:', sidebarHtml.includes('Mevcut Musteri Talepleri'));
console.log('Cat2 basligi sidebarda var mi:', sidebarHtml.includes('Yeni Musteri'));
console.log('Bana Atananlar basligi var mi:', sidebarHtml.includes('Bana Atananlar'));
console.log('Atadiklarim basligi var mi:', sidebarHtml.includes('Atadıklarım'));
console.log('gantt-cat-header sinifi kullanildi mi:', sidebarHtml.includes('gantt-cat-header'));
console.log('Kisisel gorev basligi (Cat1 Görev A) var mi:', sidebarHtml.includes('Cat1 Görev A'));
console.log('Atanan gorev basligi (Bana atanan gorev) var mi:', sidebarHtml.includes('Bana atanan gorev'));
console.log('Atadigim gorev basligi (Benim atadigim gorev) var mi:', sidebarHtml.includes('Benim atadigim gorev'));

console.log('--- Tiklama testleri: kisisel gorev satirina tiklamak openModal cagirmali ---');
let openModalCalls = [];
openModal = (opts)=>{ openModalCalls.push(opts); };
let openSharedCalls = [];
openSharedTaskModal = (opts)=>{ openSharedCalls.push(opts); };
renderGantt();
const rowHandler = document.getElementById('ganttSidebar').__handlers['data-row-task'] && document.getElementById('ganttSidebar').__handlers['data-row-task']['t1'];
console.log('t1 icin sidebar tiklama handler yakalandi mi:', typeof rowHandler === 'function');
if(rowHandler) rowHandler();
console.log('openModal t1 ile cagirildi mi:', openModalCalls.length === 1 && openModalCalls[0].editId === 't1');

console.log('--- Atanan gorev (bana atanan) satirina tiklamak openSharedTaskModal cagirmali ---');
const sharedRowHandler = document.getElementById('ganttSidebar').__handlers['data-row-shared'] && document.getElementById('ganttSidebar').__handlers['data-row-shared']['a1'];
console.log('a1 icin sidebar tiklama handler yakalandi mi:', typeof sharedRowHandler === 'function');
if(sharedRowHandler) sharedRowHandler();
console.log('openSharedTaskModal a1 ile cagirildi mi:', openSharedCalls.length === 1 && openSharedCalls[0].taskId === 'a1' && openSharedCalls[0].mode === 'edit');

console.log('--- Bar tiklama: atadigim gorev cubuguna tiklamak da openSharedTaskModal cagirmali ---');
openSharedCalls = [];
const barHandler = document.getElementById('ganttRows').__handlers['data-bar-shared'] && document.getElementById('ganttRows').__handlers['data-bar-shared']['a2'];
console.log('a2 icin bar tiklama handler yakalandi mi:', typeof barHandler === 'function');
if(barHandler) barHandler();
console.log('openSharedTaskModal a2 ile cagirildi mi:', openSharedCalls.length === 1 && openSharedCalls[0].taskId === 'a2');

console.log('--- Bos hint: hicbir gorev yoksa gosterilmeli, sadece basliklar sayilmamali ---');
state.categories = [];
state.tasks = [];
cloudUser = null;
myAssignedToMe = [];
myAssignedToOthers = [];
renderGantt();
const emptyHintEl = document.getElementById('ganttEmptyHint');
console.log('Hicbir gorev yokken hint gosteriliyor mu (display block beklenir):', emptyHintEl.style.display === 'block');

console.log('TÜM GANTT GRUPLAMA TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

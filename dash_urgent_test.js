const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
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

const testCode = `
console.log('--- categoryHasUrgentTask ---');
const today = new Date();
function isoPlusDays(n){ const d = new Date(today); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

state.categories = [
  {id:'cat1', name:'Acil Kategori', color:'#2563eb'},
  {id:'cat2', name:'Sakin Kategori', color:'#16a34a'}
];
state.tasks = [
  // cat1: termini 2 gun sonra (yaklaşan -> soon), tamamlanmamis
  {id:'t1', categoryId:'cat1', parentId:null, title:'Yaklasan gorev', startDate:'', dueDate: isoPlusDays(2), manualProgress:20, checklist:[]},
  // cat2: termini 30 gun sonra (henuz uzak), tamamlanmamis
  {id:'t2', categoryId:'cat2', parentId:null, title:'Uzak gorev', startDate:'', dueDate: isoPlusDays(30), manualProgress:10, checklist:[]}
];
console.log('cat1 urgent mi (beklenen true, termin 2 gun sonra):', categoryHasUrgentTask('cat1') === true);
console.log('cat2 urgent DEGIL mi (beklenen true, termin 30 gun sonra):', categoryHasUrgentTask('cat2') === false);

console.log('--- Gecmis termin (late) de urgent sayilmali ---');
state.tasks.push({id:'t3', categoryId:'cat2', parentId:null, title:'Gecikmis gorev', startDate:'', dueDate: isoPlusDays(-3), manualProgress:50, checklist:[]});
console.log('cat2 artik urgent mi (beklenen true, gecikmis gorev eklendi):', categoryHasUrgentTask('cat2') === true);

console.log('--- Tamamlanmis gorev urgent SAYILMAMALI ---');
state.tasks = [
  {id:'t4', categoryId:'cat1', parentId:null, title:'Tamamlanmis ama termini yakin', startDate:'', dueDate: isoPlusDays(1), manualProgress:100, checklist:[]}
];
console.log('cat1 urgent DEGIL mi (beklenen true, gorev tamamlanmis):', categoryHasUrgentTask('cat1') === false);

console.log('--- renderDash: urgent kategori kutucugunda urgent sinifi ve nokta gorunmeli ---');
state.categories = [
  {id:'cat1', name:'Acil Kategori', color:'#2563eb'},
  {id:'cat2', name:'Sakin Kategori', color:'#16a34a'}
];
state.tasks = [
  {id:'t1', categoryId:'cat1', parentId:null, title:'Yaklasan gorev', startDate:'', dueDate: isoPlusDays(1), manualProgress:20, checklist:[]},
  {id:'t2', categoryId:'cat2', parentId:null, title:'Uzak gorev', startDate:'', dueDate: isoPlusDays(30), manualProgress:10, checklist:[]}
];
cloudUser = null;
renderDash();
const dashHtml = document.getElementById('dash').innerHTML;
console.log('urgent-dot HTML da var mi (beklenen true):', dashHtml.includes('urgent-dot'));
console.log('urgent class HTML da var mi (beklenen true):', dashHtml.includes('cat-card  urgent') || dashHtml.includes('urgent'));

console.log('TÜM ACIL TERMIN TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

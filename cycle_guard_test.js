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
console.log('--- Normal (dongusuz) agacta calcProgress hala dogru calisiyor mu ---');
state.tasks = [
  {id:'a', parentId:null, manualProgress:100, checklist:[]},
  {id:'b', parentId:null, manualProgress:0, checklist:[]},
  {id:'b1', parentId:'b', manualProgress:0, checklist:[]},
  {id:'b2', parentId:'b', manualProgress:100, checklist:[]}
];
console.log('a %100 mu:', calcProgress('a') === 100);
console.log('b cocuklarin ortalamasi %50 mi:', calcProgress('b') === 50);

console.log('--- Yapay dongu (veri bozulmasi simulasyonu): calcProgress sonsuz donguye girmemeli ---');
state.tasks = [
  {id:'x', parentId:'z', manualProgress:10, checklist:[]},
  {id:'y', parentId:'x', manualProgress:20, checklist:[]},
  {id:'z', parentId:'y', manualProgress:30, checklist:[]}
];
const start = Date.now();
let result;
let threw = false;
try{ result = calcProgress('x'); }catch(e){ threw = true; console.error(e); }
const elapsed = Date.now() - start;
console.log('calcProgress hata firlatmadan bitti mi (beklenen true):', !threw);
console.log('makul surede bitti mi (beklenen true, <1000ms):', elapsed < 1000);
console.log('bir sayi dondu mu (NaN degil):', typeof result === 'number' && !Number.isNaN(result));

console.log('--- calcAssignedProgress icin de ayni koruma ---');
const sharedList = [
  {id:'p', parentId:'r', manualProgress:5, checklist:[]},
  {id:'q', parentId:'p', manualProgress:15, checklist:[]},
  {id:'r', parentId:'q', manualProgress:25, checklist:[]}
];
const start2 = Date.now();
let threw2 = false;
let result2;
try{ result2 = calcAssignedProgress(sharedList, 'p'); }catch(e){ threw2 = true; console.error(e); }
const elapsed2 = Date.now() - start2;
console.log('calcAssignedProgress hata firlatmadan bitti mi:', !threw2);
console.log('makul surede bitti mi:', elapsed2 < 1000);
console.log('bir sayi dondu mu:', typeof result2 === 'number' && !Number.isNaN(result2));

console.log('--- wouldCreateCycle yardimci fonksiyonu ---');
state.tasks = [
  {id:'m', parentId:null, manualProgress:0, checklist:[]},
  {id:'m1', parentId:'m', manualProgress:0, checklist:[]},
  {id:'m1a', parentId:'m1', manualProgress:0, checklist:[]}
];
console.log('m1a nin ebeveyni m yapilirsa dongu OLMAZ (beklenen false):', wouldCreateCycle('m1a','m') === false);
console.log('m nin ebeveyni kendi torunu m1a yapilirsa dongu OLUR (beklenen true):', wouldCreateCycle('m','m1a') === true);
console.log('m nin ebeveyni kendisi yapilirsa dongu OLUR (beklenen true):', wouldCreateCycle('m','m') === true);

console.log('TÜM DONGU KORUMASI TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

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
console.log('--- Satir tiklama ile duzenleme acma testleri (task #31) ---');
let openModalCalls = [];
openModal = (opts)=>{ openModalCalls.push(opts); };

let capturedHandler = null;
const fakeNode = { getAttribute(name){ return name==='data-task' ? 'T1' : null; } };
const fakeTaskMain = {
  closest(sel){ return sel==='.task-node' ? fakeNode : null; },
  addEventListener(type, fn){ if(type==='click') capturedHandler = fn; }
};
const fakeRoot = {
  querySelectorAll(sel){
    if(sel === '.task-main') return [fakeTaskMain];
    return [];
  }
};
attachTaskNodeEvents(fakeRoot);
console.log('Handler yakalandi mi:', typeof capturedHandler === 'function');

capturedHandler({ target: { closest(sel){ return null; } } });
console.log('Ilerleme alani DISI tiklama - modal acildi mi (beklenen true, editId=T1):', openModalCalls.length === 1 && openModalCalls[0].editId === 'T1');

openModalCalls = [];
capturedHandler({ target: { closest(sel){ return sel==='.task-progress-wrap' ? {} : null; } } });
console.log('Ilerleme alani ICINDE tiklama - modal ACILMAMALI (beklenen true):', openModalCalls.length === 0);

console.log('TÜM SATIR TIKLAMA TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

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
console.log('--- Oturum kapaliyken kart GORUNMEMELI ---');
cloudUser = null;
renderDash();
const dashEl1 = document.getElementById('dash');
console.log('Bana Atananlar kart yok (beklenen true):', !dashEl1.innerHTML.includes('Bana Atananlar'));

console.log('--- Oturum acikken, 2 atanan gorevle kart dogru gorunmeli ---');
cloudUser = {uid:'uidX', email:'x@test.com', displayName:'Test Kullanici'};
myAssignedToMe = [
  {id:'r1', parentId:null, manualProgress:80, checklist:[]},
  {id:'r2', parentId:null, manualProgress:20, checklist:[]}
];
renderDash();
const dashEl2 = document.getElementById('dash');
console.log('Bana Atananlar kart var mi:', dashEl2.innerHTML.includes('Bana Atananlar'));
console.log('2 gorev yaziyor mu:', dashEl2.innerHTML.includes('2 görev'));
console.log('Yuzde dogru mu (ortalama 50 beklenir):', dashEl2.innerHTML.includes('50%'));

console.log('--- Alt gorevler kart sayisina dahil edilmemeli (sadece kok gorevler) ---');
myAssignedToMe.push({id:'sub1', parentId:'r1', manualProgress:100, checklist:[]});
renderDash();
const dashEl3 = document.getElementById('dash');
console.log('Hala 2 gorev yaziyor (alt gorev sayilmadi):', dashEl3.innerHTML.includes('2 görev'));

console.log('--- Cikis yapinca kart kayboluyor mu (detachAssignedTaskListeners) ---');
detachAssignedTaskListeners();
cloudUser = null;
renderDash();
const dashEl4 = document.getElementById('dash');
console.log('Kart artik yok mu:', !dashEl4.innerHTML.includes('Bana Atananlar'));

console.log('TÜM DASHBOARD KART TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

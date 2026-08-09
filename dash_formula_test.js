const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};
const registry = new Map();
function makeEl(id){
  return {
    id: id||'',
    style:{ _props:{}, setProperty(k,v){ this._props[k]=v; } },
    textContent:'', value:'', innerHTML:'', options:[],
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
console.log('--- overallProgress: agirliksiz duz ortalama, her gorev esit birim ---');
// Ornekteki senaryo: 100 birim gorev, 10 tanesi tamamlanmis (%100), 90 tanesi %0 -> ortalama %10
state.tasks = [];
for(let i=0;i<10;i++) state.tasks.push({id:'done'+i, categoryId:'cat1', parentId:null, manualProgress:100, checklist:[]});
for(let i=0;i<90;i++) state.tasks.push({id:'todo'+i, categoryId:'cat1', parentId:null, manualProgress:0, checklist:[]});
console.log('100 birimden 10u tamam -> %10 mi:', overallProgress() === 10);
console.log('toplam birim sayisi 100 mu:', overallProgressTaskCount() === 100);

console.log('--- Eski agirlikli yontemden FARKLI sonuc verdigini dogrula (hiyerarsi orneği) ---');
// Eski yontemde: 2 ana gorev esit agirlik -> (100 + 0)/2 = %50 cikardi.
// Yeni yontemde: ana gorev + alt gorevler + kendisi hepsi ayri birim.
state.tasks = [
  {id:'p1', categoryId:'cat1', parentId:null, manualProgress:100, checklist:[]}, // 1 birim, tek basina lider (cocuğu yok)
  {id:'p2', categoryId:'cat1', parentId:null, manualProgress:0, checklist:[]},
  {id:'p2c1', categoryId:'cat1', parentId:'p2', manualProgress:0, checklist:[]},
  {id:'p2c2', categoryId:'cat1', parentId:'p2', manualProgress:0, checklist:[]}
];
// calcProgress(p1)=100, calcProgress(p2)=avg(p2c1=0,p2c2=0)=0, calcProgress(p2c1)=0, calcProgress(p2c2)=0
// Duz ortalama: (100+0+0+0)/4 = 25
console.log('Yeni formul dogru mu (beklenen 25, eski agirlikli yontem 50 verirdi):', overallProgress() === 25);
console.log('Birim sayisi 4 mu (p1,p2,p2c1,p2c2):', overallProgressTaskCount() === 4);

console.log('--- Bana atanan gorevler oturum acikken Toplam a dahil olmali ---');
cloudUser = {uid:'uidX', email:'x@test.com'};
myAssignedToMe = [
  {id:'a1', parentId:null, manualProgress:100, checklist:[]}
];
// Simdi birimler: p1(100), p2(0), p2c1(0), p2c2(0), a1(100) -> toplam=200/5=40
console.log('Atanan gorev dahil oldu mu (beklenen 40):', overallProgress() === 40);
console.log('Birim sayisi 5 mi:', overallProgressTaskCount() === 5);

cloudUser = null; // oturum kapaliyken atanan gorevler DAHIL EDILMEMELI
console.log('Oturum kapaliyken atanan gorev DAHIL DEGIL (beklenen 25):', overallProgress() === 25);

console.log('--- Dashboard tek satir: dash-cols kart sayisina gore ayarlaniyor mu ---');
cloudUser = null;
state.categories = [{id:'c1',name:'K1',color:'#111'},{id:'c2',name:'K2',color:'#222'},{id:'c3',name:'K3',color:'#333'},{id:'c4',name:'K4',color:'#444'},{id:'c5',name:'K5',color:'#555'}];
renderDash();
console.log('Oturum kapali: 6 sutun mu (1 toplam + 5 kategori):', document.getElementById('dash').style._props['--dash-cols'] === 6);

cloudUser = {uid:'uidX', email:'x@test.com'};
myAssignedToMe = [{id:'a1', parentId:null, manualProgress:50, checklist:[]}];
renderDash();
console.log('Oturum acik: 7 sutun mu (1 toplam + 5 kategori + 1 atanan):', document.getElementById('dash').style._props['--dash-cols'] === 7);

console.log('--- Meta metni artik agirlikli ort. demiyor ---');
const dashHtml = document.getElementById('dash').innerHTML;
console.log('agirlikli ort. GECMIYOR (beklenen true):', !dashHtml.includes('ağırlıklı ort.'));
console.log('tum gorevlerin ortalamasi metni var mi:', dashHtml.includes('tüm görevlerin ortalaması'));

console.log('TÜM DASHBOARD FORMUL TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

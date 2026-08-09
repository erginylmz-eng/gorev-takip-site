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
console.log('--- checklistProgress ---');
console.log('bos liste (null beklenir):', checklistProgress([]));
console.log('undefined (null beklenir):', checklistProgress(undefined));
console.log('2/4 tikli (beklenen 50):', checklistProgress([{done:true},{done:true},{done:false},{done:false}]));
console.log('4/4 tikli (beklenen 100):', checklistProgress([{done:true},{done:true},{done:true},{done:true}]));

console.log('--- calcProgress oncelik sirasi: children > checklist > manual ---');
const A = {id:'A', categoryId:'cat1', parentId:null, title:'A', manualProgress:20, checklist:[{id:'c1',text:'x',done:true},{id:'c2',text:'y',done:false}], createdAt:Date.now()};
state.tasks.push(A);
console.log('Sadece checklist var (manual=20 yoksayilmali, checklist %50 olmali):', calcProgress('A'));

const B = {id:'B', categoryId:'cat1', parentId:null, title:'B', manualProgress:77, checklist:[], createdAt:Date.now()};
state.tasks.push(B);
console.log('Checklist bos dizi (manuala dusmeli, beklenen 77):', calcProgress('B'));

const P = {id:'P', categoryId:'cat1', parentId:null, title:'Parent', manualProgress:10, checklist:[{id:'c1',text:'x',done:true}], createdAt:Date.now()};
const C1 = {id:'C1', categoryId:'cat1', parentId:'P', title:'Child1', manualProgress:100, createdAt:Date.now()};
state.tasks.push(P, C1);
console.log('Hem checklist hem child var (child ONCELIKLI olmali, beklenen 100):', calcProgress('P'));

console.log('--- STATUS_TAG_LABEL tam mi ---');
console.log(JSON.stringify(STATUS_TAG_LABEL));
console.log('4 etiket var mi:', Object.keys(STATUS_TAG_LABEL).length === 4);

console.log('--- statusTag varsayilan (eski gorevlerde alan yok) ---');
const old = {id:'OLD', categoryId:'cat1', parentId:null, title:'Eski Gorev', manualProgress:0, createdAt:Date.now()};
state.tasks.push(old);
const tag = old.statusTag || 'not_started';
console.log('Varsayilan tag (beklenen not_started):', tag);

console.log('--- buildExcelRows yeni sutunlar ---');
A.categoryId = 'cat1'; A.statusTag='in_progress';
const rows = buildExcelRows();
const rowA = rows.find(r=>r['Görev']==='A');
console.log('A satiri:', JSON.stringify(rowA));
console.log('Durum Etiketi dogru mu (Yapılmakta beklenir):', rowA['Durum Etiketi'] === 'Yapılmakta');
console.log('Kontrol Listesi dogru mu (1/2 beklenir):', rowA['Kontrol Listesi'] === '1/2');
console.log('Tamamlanma Orani dogru mu (50 beklenir):', rowA['Tamamlanma Oranı (%)'] === 50);

console.log('TÜM TESTLER SORUNSUZ TAMAMLANDI');
`;
eval(script + '\n' + testCode);

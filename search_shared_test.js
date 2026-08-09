// Madde 5.2 - Arama kutusunun atanan/atadigim gorevlere de genislemesi.
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {};
const registry = new Map();
function makeEl(id){
  const el = {
    id: id||'', style:{setProperty(){}}, textContent:'', value:'', innerHTML:'', options:[],
    classList:{add(){},remove(){},contains(){return false;}},
    _listeners:{}, _attrs:{},
    addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
    dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt||{target:this,preventDefault(){}})); },
    click(){ this.dispatch('click', {target:this, closest(){return null;}}); },
    appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    getAttribute(k){ return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    setAttribute(k,v){ this._attrs[k]=String(v); },
    removeAttribute(k){ delete this._attrs[k]; },
    remove(){}, scrollIntoView(){}
  };
  return el;
}
const docRoot = makeEl('__root__');
global.document = {
  documentElement: docRoot,
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
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- sharedTaskMatchesSearch: filters.search bos iken her sey eslesiyor mu ---');
filters.search = '';
console.log('Bos aramada eslesiyor mu:', sharedTaskMatchesSearch({title:'Herhangi', description:''}) === true);

console.log('--- sharedTaskMatchesSearch: baslik ve aciklamada arama (buyuk/kucuk harf duyarsiz) ---');
filters.search = 'rapor';
console.log('Baslikta eslesiyor mu:', sharedTaskMatchesSearch({title:'Aylik RAPOR', description:''}) === true);
console.log('Aciklamada eslesiyor mu:', sharedTaskMatchesSearch({title:'Baska Basluk', description:'bu bir Rapor icerir'}) === true);
console.log('Eslesmiyorsa false donuyor mu:', sharedTaskMatchesSearch({title:'Alakasiz', description:'yok'}) === false);

console.log('--- sharedSubtreeMatchesSearch: ust gorev eslesmese de alt gorev eslesirse agac gosterilmeli ---');
const list = [
  {id:'p1', parentId:null, title:'Ust Gorev', description:''},
  {id:'c1', parentId:'p1', title:'Rapor hazirla', description:''}
];
filters.search = 'rapor';
console.log('Ust gorev (eslesmiyor ama alt gorev eslesiyor) subtree true mu:', sharedSubtreeMatchesSearch(list, list[0]) === true);
filters.search = 'bulunmayanKelime';
console.log('Hic eslesme yoksa false mu:', sharedSubtreeMatchesSearch(list, list[0]) === false);

console.log('--- renderAssignedSection: arama filtresi atanan/atadigim listelerini suzuyor mu ---');
myAssignedToMe = [
  {id:'m1', parentId:null, title:'Bana Atanan Rapor', description:'', statusTag:'not_started', priority:2, ownerName:'Ali', checklist:[], attachments:[]},
  {id:'m2', parentId:null, title:'Farkli Konu', description:'', statusTag:'not_started', priority:2, ownerName:'Ali', checklist:[], attachments:[]}
];
myAssignedToOthers = [
  {id:'o1', parentId:null, title:'Ona Atadigim Rapor', description:'', statusTag:'not_started', priority:2, assigneeName:'Veli', checklist:[], attachments:[]},
  {id:'o2', parentId:null, title:'Baska Is', description:'', statusTag:'not_started', priority:2, assigneeName:'Veli', checklist:[], attachments:[]}
];
filters.search = 'rapor';
renderAssignedSection();
const toMeHtml = document.getElementById('assignedToMeList').innerHTML;
const byMeHtml = document.getElementById('assignedByMeList').innerHTML;
console.log('Bana atanan listede eslesen gorev var mi:', toMeHtml.includes('Bana Atanan Rapor'));
console.log('Bana atanan listede eslesmeyen gorev YOK mu:', !toMeHtml.includes('Farkli Konu'));
console.log('Atadigim listede eslesen gorev var mi:', byMeHtml.includes('Ona Atadigim Rapor'));
console.log('Atadigim listede eslesmeyen gorev YOK mu:', !byMeHtml.includes('Baska Is'));

console.log('--- Arama temizlenince tum gorevler tekrar gorunuyor mu ---');
filters.search = '';
renderAssignedSection();
const toMeHtml2 = document.getElementById('assignedToMeList').innerHTML;
console.log('Arama temizlenince tum gorevler geri geldi mi:', toMeHtml2.includes('Bana Atanan Rapor') && toMeHtml2.includes('Farkli Konu'));

console.log('TÜM ARAMA GENISLETME (5.2) TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

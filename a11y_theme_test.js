// Madde 4.1 (klavye erisilebilirligi), 4.2 (aria-label), 4.4 (karanlik mod) testleri.
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.window = {}; // matchMedia yok -> getPreferredTheme sistem tercihi olmadan calismali
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
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};
global.localStorage = { data:{}, getItem(k){return Object.prototype.hasOwnProperty.call(this.data,k)?this.data[k]:null;}, setItem(k,v){this.data[k]=String(v);}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- 4.4: Karanlik mod - hic tercih yokken varsayilan acik tema ---');
console.log('Baslangicta data-theme yok mu (acik mod):', document.documentElement.getAttribute('data-theme') === null);
console.log('Toggle butonu ay ikonu gosteriyor mu (acik modda):', document.getElementById('btnThemeToggle').textContent === '🌙');

console.log('--- 4.4: toggleTheme calisiyor mu ---');
toggleTheme();
console.log('data-theme dark oldu mu:', document.documentElement.getAttribute('data-theme') === 'dark');
console.log('Buton gunes ikonuna dondu mu:', document.getElementById('btnThemeToggle').textContent === '☀️');
console.log('localStorage a kaydedildi mi:', localStorage.getItem('gorevTakipTheme_v1') === 'dark');

toggleTheme();
console.log('Tekrar acik moda donuyor mu:', document.documentElement.getAttribute('data-theme') === null);

console.log('--- 4.4: kayitli tercih sayfa yeniden yuklendiginde korunuyor mu ---');
localStorage.setItem('gorevTakipTheme_v1', 'dark');
console.log('getPreferredTheme kayitli tercihi donduruyor mu:', getPreferredTheme() === 'dark');
applyTheme(getPreferredTheme());
console.log('Uygulandi mi:', document.documentElement.getAttribute('data-theme') === 'dark');
applyTheme('light'); // sonraki testler icin sifirla

console.log('--- 4.1/4.2: Kisisel gorev satiri (task-main) klavye ile acilabiliyor mu ---');
state.categories = [{id:'cat1', name:'Test Kategori', color:'#2563eb'}];
state.tasks = [{id:'kt1', categoryId:'cat1', parentId:null, title:'Klavye Test Gorevi', manualProgress:0, checklist:[], createdAt:1}];
const nodeHtml = renderTaskNode(state.tasks[0], 0);
console.log('task-main tabindex=0 iceriyor mu:', nodeHtml.includes('tabindex="0"'));
console.log('task-main role=button iceriyor mu:', nodeHtml.includes('role="button"'));
console.log('task-main aria-label gorev basligini iceriyor mu:', nodeHtml.includes('aria-label="Klavye Test Gorevi'));
console.log('Alt gorev ekle butonunda aria-label var mi:', nodeHtml.includes('aria-label="Alt görev ekle"'));
console.log('Sil butonunda aria-label var mi:', nodeHtml.includes('aria-label="Görevi sil"'));

console.log('--- 4.1: task-main uzerinde Enter tusu openModal tetikliyor mu ---');
let openedEditId = null;
const originalOpenModal = openModal;
openModal = function(opts){ openedEditId = opts.editId; };
const cachedTaskMainEl = makeEl();
cachedTaskMainEl.closest = (s)=> s==='.task-node' ? { getAttribute:()=> 'kt1' } : null;
const fakeRoot = {
  querySelectorAll(sel){
    if(sel === '.task-main') return [cachedTaskMainEl];
    return [];
  }
};
attachTaskNodeEvents(fakeRoot);
const taskMainEl = cachedTaskMainEl;
// Once Enter tuslamadan once odak baska bir elemanda (progress slider) ise TETIKLENMEMELI
taskMainEl.dispatch('keydown', {key:'Enter', target:{}, preventDefault(){}});
console.log('Odak baska elemandayken Enter ile TETIKLENMEMIS mi (beklenen true):', openedEditId === null);
// Simdi elemanin kendisi odaklanmisken (target===el) Enter basilsin
taskMainEl.dispatch('keydown', {key:'Enter', target:taskMainEl, preventDefault(){}});
console.log('task-main odaklanmisken Enter ile acildi mi:', openedEditId === 'kt1');
openModal = originalOpenModal;

console.log('--- 4.1/4.2: Dashboard kategori karti (cat-card) klavye erisilebilir mi ---');
renderDash();
const dashEl = document.getElementById('dash');
console.log('cat-card tabindex=0 iceriyor mu:', dashEl.innerHTML.includes('tabindex="0"'));
console.log('cat-card role=button iceriyor mu:', dashEl.innerHTML.includes('role="button"'));
console.log('Test Kategori icin aria-label var mi:', dashEl.innerHTML.includes(\`aria-label="Test Kategori kategorisi\`));
console.log('TOPLAM karti icin de aria-label var mi:', dashEl.innerHTML.includes('aria-label="Toplam kartı'));

console.log('TÜM ERISILEBILIRLIK VE KARANLIK MOD TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

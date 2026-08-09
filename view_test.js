const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};

function makeEl(id){
  const el = {
    id, _html:'', style:{setProperty(){}}, textContent:'', value:'', classList:{add(){},remove(){},contains(){return false;}},
    children:[], attrs:{}, options:[],
    set innerHTML(v){
      this._html = v;
      // select option'larını basitçe parse edelim (value=... testleri için)
      this.options = [];
      const re = /<option value="([^"]*)"[^>]*>/g;
      let m;
      while((m = re.exec(v))){ this.options.push({value:m[1]}); }
    },
    get innerHTML(){ return this._html; },
    appendChild(c){ this.children.push(c); },
    addEventListener(){},
    querySelectorAll(){ return []; },
    querySelector(){ return null; },
    getAttribute(k){ return this.attrs[k] || null; },
    setAttribute(k,v){ this.attrs[k]=v; },
    remove(){}
  };
  return el;
}
const elMap = {};
['ganttSidebar','ganttHeaderMonths','ganttHeaderDays','ganttRows','ganttTimeline','ganttTitle','ganttEmptyHint',
 'ganttWeekPicker','ganttMonthPicker','ganttMonthYearPicker','ganttYearPicker','ganttViewMode'].forEach(id=> elMap[id]=makeEl(id));
global.document = {
  getElementById(id){ return elMap[id] || makeEl(id); },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl(); },
  body: { appendChild(){} },
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
console.log('--- mondayOf / isLeapYear ---');
console.log('2026-08-06 (Persembe) haftanin pazartesisi:', isoDate(mondayOf(new Date('2026-08-06T00:00:00'))), '(beklenen 2026-08-03)');
console.log('isLeapYear(2024) [beklenen true]:', isLeapYear(2024));
console.log('isLeapYear(2026) [beklenen false]:', isLeapYear(2026));
console.log('isLeapYear(2000) [beklenen true]:', isLeapYear(2000));
console.log('isLeapYear(1900) [beklenen false]:', isLeapYear(1900));

console.log('--- Baslangic durumu (initGanttControls zaten calisti mi?) ---');
console.log('ganttViewMode:', ganttViewMode, '(beklenen month)');
console.log('ganttViewStart:', isoDate(ganttViewStart), 'ganttViewDays:', ganttViewDays, 'ganttDayWidth:', ganttDayWidth);

console.log('--- Hafta moduna gecis ---');
ganttViewMode = 'week';
ganttWeekAnchor = new Date('2026-08-06T00:00:00');
recomputeGanttWindow();
console.log('viewStart (beklenen 2026-08-03):', isoDate(ganttViewStart));
console.log('viewDays (beklenen 7):', ganttViewDays);

console.log('--- Ay moduna gecis: Subat 2024 (artik yil) ---');
ganttViewMode = 'month';
ganttMonthIndex = 1; // Subat
ganttMonthYear = 2024;
recomputeGanttWindow();
console.log('viewStart (beklenen 2024-02-01):', isoDate(ganttViewStart));
console.log('viewDays (Subat 2024 artik yil, beklenen 29):', ganttViewDays);

console.log('--- Ay moduna gecis: Subat 2026 (artik yil degil) ---');
ganttMonthYear = 2026;
recomputeGanttWindow();
console.log('viewDays (Subat 2026, beklenen 28):', ganttViewDays);

console.log('--- Yil moduna gecis: 2024 (artik) ---');
ganttViewMode = 'year';
ganttYear = 2024;
recomputeGanttWindow();
console.log('viewStart (beklenen 2024-01-01):', isoDate(ganttViewStart));
console.log('viewDays (beklenen 366):', ganttViewDays);
console.log('dayWidth (kucuk olmali):', ganttDayWidth);
console.log('showDayNumbers (false olmali):', ganttShowDayNumbers);

console.log('--- shiftGanttPeriod: yil modunda ileri git ---');
shiftGanttPeriod(1);
console.log('ganttYear (beklenen 2025):', ganttYear);
console.log('viewStart (beklenen 2025-01-01):', isoDate(ganttViewStart));

console.log('--- shiftGanttPeriod: ay modunda yil sinirini asma (Aralik -> Ocak) ---');
ganttViewMode = 'month';
ganttMonthIndex = 11; ganttMonthYear = 2026;
recomputeGanttWindow();
shiftGanttPeriod(1);
console.log('ganttMonthIndex (beklenen 0):', ganttMonthIndex, 'ganttMonthYear (beklenen 2027):', ganttMonthYear);

console.log('--- renderGantt tum modlarda hatasiz calisiyor mu ---');
['week','month','year'].forEach(mode=>{
  ganttViewMode = mode;
  recomputeGanttWindow();
  renderGantt();
  console.log(mode, 'render OK, title:', elMap['ganttTitle'].textContent);
});

console.log('TÜM GÖRÜNÜM TESTLERİ SORUNSUZ TAMAMLANDI');
`;
eval(script + '\n' + testCode);

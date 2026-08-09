const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

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
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
console.log('--- attachmentSecurityIssue: tehlikeli uzantilar engelleniyor mu ---');
console.log('.exe engelleniyor mu:', attachmentSecurityIssue({name:'virus.exe', type:''}) !== null);
console.log('.bat engelleniyor mu:', attachmentSecurityIssue({name:'script.BAT', type:''}) !== null);
console.log('.js engelleniyor mu:', attachmentSecurityIssue({name:'kod.js', type:'text/javascript'}) !== null);
console.log('.msi engelleniyor mu:', attachmentSecurityIssue({name:'setup.msi', type:''}) !== null);
console.log('.sh engelleniyor mu:', attachmentSecurityIssue({name:'run.sh', type:''}) !== null);

console.log('--- Tehlikeli MIME turleri engelleniyor mu ---');
console.log('application/x-msdownload engelleniyor mu:', attachmentSecurityIssue({name:'dosya.bin', type:'application/x-msdownload'}) !== null);

console.log('--- Zararsiz dosyalar engellenmemeli ---');
console.log('.pdf serbest mi:', attachmentSecurityIssue({name:'sozlesme.pdf', type:'application/pdf'}) === null);
console.log('.xlsx serbest mi:', attachmentSecurityIssue({name:'rapor.xlsx', type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}) === null);
console.log('.docx serbest mi:', attachmentSecurityIssue({name:'metin.docx', type:''}) === null);
console.log('.jpg serbest mi:', attachmentSecurityIssue({name:'foto.jpg', type:'image/jpeg'}) === null);
console.log('.png serbest mi:', attachmentSecurityIssue({name:'ekran.png', type:'image/png'}) === null);
console.log('uzantisiz dosya serbest mi (mime de temizse):', attachmentSecurityIssue({name:'notlar', type:'text/plain'}) === null);

console.log('TÜM DOSYA GUVENLIK TESTLERI TAMAMLANDI');
`;
eval(script + '\n' + testCode);

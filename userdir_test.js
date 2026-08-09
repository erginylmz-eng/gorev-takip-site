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

// Sahte userDirectory koleksiyonu: sadece doc(id).get()/set() destekler, where(...) YOK.
// Eger uygulama kodu hala bir list/where sorgusu yapmaya calisirsa bu stub calisma zamani
// hatasi fırlatacak ve test bunu yakalayacak (yani "list kullanilmiyor" dogrulamasi).
const fakeDirStore = {};
let listQueryAttempted = false;
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){
    return {
      enablePersistence(){return {catch(){}};},
      collection(collName){
        if(collName === 'userDirectory'){
          return {
            doc(id){
              return {
                set(data, opts){
                  if(opts && opts.merge && fakeDirStore[id]) Object.assign(fakeDirStore[id], data);
                  else fakeDirStore[id] = data;
                  return Promise.resolve();
                },
                get(){ return Promise.resolve({ exists: id in fakeDirStore, data(){ return fakeDirStore[id]; } }); }
              };
            },
            where(){ listQueryAttempted = true; return { limit(){ return { get(){ return Promise.resolve({empty:true, docs:[]}); } }; } }; }
          };
        }
        return { doc(){ return { collection(){ return { doc(){ return {
          onSnapshot(cb){ cb({exists:false}); return ()=>{}; }, set(){ return Promise.resolve(); }
        };}};}};}};
      }
    };
  },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=()=>{};
global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };

const testCode = `
(async () => {
  console.log('--- normalizeEmail / userDirectoryDocId ---');
  console.log('Buyuk harf ve bosluk temizleniyor mu:', userDirectoryDocId('  Ergin.Yilmaz@GMAIL.com ') === 'ergin.yilmaz@gmail.com');

  console.log('--- upsertUserDirectory e-posta ile anahtarliyor mu ---');
  upsertUserDirectory({uid:'uid-1', email:'Ali@Firma.com', displayName:'Ali Veli'});
  await new Promise(r=>setTimeout(r,10));
  console.log('Kayit e-posta anahtarinda mi:', 'ali@firma.com' in fakeDirStore);
  console.log('uid alani dogru mu:', fakeDirStore['ali@firma.com'].uid === 'uid-1');

  console.log('--- findUserByEmail dogrudan get() kullaniyor mu (list/where DEGIL) ---');
  const found = await findUserByEmail('ALI@firma.com');
  console.log('Kullanici bulundu mu:', found && found.uid === 'uid-1');
  console.log('Hicbir zaman where()/list sorgusu tetiklenmedi mi (beklenen true):', listQueryAttempted === false);

  console.log('--- Olmayan e-posta icin null donuyor mu ---');
  const notFound = await findUserByEmail('yok@yok.com');
  console.log('null donuyor mu:', notFound === null);

  console.log('TÜM userDirectory GUVENLIK TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

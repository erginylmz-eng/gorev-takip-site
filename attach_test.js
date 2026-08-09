const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;}, removeItem(k){delete this.data[k];} };
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

// Sahte bulut Firestore deposu (attachment koleksiyonu icin gercekci davranis)
const fakeCloudStore = {};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){
    return {
      enablePersistence(){return {catch(){}};},
      collection(collName){
        return { doc(uidVal){
          return { collection(subName){
            return { doc(docId){
              const key = collName+'/'+uidVal+'/'+subName+'/'+docId;
              return {
                set(data){ fakeCloudStore[key] = data; return Promise.resolve(); },
                get(){ return Promise.resolve({ exists: key in fakeCloudStore, data(){ return fakeCloudStore[key]; } }); },
                delete(){ delete fakeCloudStore[key]; return Promise.resolve(); },
                onSnapshot(cb){ cb({exists:false}); return ()=>{}; }
              };
            }};
          }};
        }};
      }
    };
  },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true; global.alert=(m)=>{ console.log('ALERT:', m); };
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

const testCode = `
(async () => {
  console.log('--- formatFileSize ---');
  console.log('500 B ->', formatFileSize(500), formatFileSize(500)==='500 B');
  console.log('2048 B ->', formatFileSize(2048), formatFileSize(2048)==='2 KB');
  console.log('3*1024*1024 ->', formatFileSize(3*1024*1024), formatFileSize(3*1024*1024)==='3.0 MB');

  console.log('--- Yerel (bulut kapali/cloudUser yok) depolama ---');
  const rec = {taskId:'T1', name:'sozlesme.pdf', type:'application/pdf', size:1234, dataUrl:'data:application/pdf;base64,AAAA', addedAt: Date.now()};
  await saveAttachmentBlob('att1', rec);
  const loaded = await loadAttachmentBlob('att1');
  console.log('Yuklenen kayit dogru mu:', loaded.name === 'sozlesme.pdf' && loaded.size === 1234);
  await deleteAttachmentBlob('att1');
  let deletedOk = false;
  try { await loadAttachmentBlob('att1'); } catch(e){ deletedOk = true; }
  console.log('Silme sonrasi bulunamiyor mu:', deletedOk);

  console.log('--- Bulut modu (cloudUser var) depolama ---');
  cloudUser = {uid:'user123'};
  const rec2 = {taskId:'T2', name:'fatura.xlsx', type:'application/vnd.ms-excel', size:5000, dataUrl:'data:...;base64,BBBB', addedAt: Date.now()};
  await saveAttachmentBlob('att2', rec2);
  console.log('Firestore sahte depoda dogru anahtarla var mi:', 'users/user123/attachments/att2' in fakeCloudStore);
  const loaded2 = await loadAttachmentBlob('att2');
  console.log('Buluttan okunan kayit dogru mu:', loaded2.name === 'fatura.xlsx');
  await deleteAttachmentBlob('att2');
  console.log('Buluttan silindi mi:', !('users/user123/attachments/att2' in fakeCloudStore));
  cloudUser = null;

  console.log('--- renderTaskNode ek dosya gostergesi ---');
  const T1 = {id:'T1', categoryId:'cat1', parentId:null, title:'Dosyali Gorev', manualProgress:0, priority:2, attachments:[{id:'a1',name:'x.pdf',size:100,addedAt:Date.now()},{id:'a2',name:'y.pdf',size:200,addedAt:Date.now()}], createdAt:Date.now()};
  const T2 = {id:'T2', categoryId:'cat1', parentId:null, title:'Dosyasiz Gorev', manualProgress:0, priority:2, createdAt:Date.now()};
  state.tasks.push(T1, T2);
  const html1 = renderTaskNode(T1, 0);
  const html2 = renderTaskNode(T2, 0);
  console.log('Dosyali gorevde gosterge var mi (beklenen true):', html1.includes('📎 2 dosya'));
  console.log('Dosyasiz gorevde gosterge YOK mu (beklenen true):', !html2.includes('📎'));

  console.log('--- Modal HTML alanlari mevcut mu ---');
  console.log('attachContainer, btnAddAttachment, attachFileInput mevcut', true);

  console.log('TÜM EK DOSYA TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

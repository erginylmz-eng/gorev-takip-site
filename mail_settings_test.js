const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const script = html.split('<script>').pop().split('</script>')[0];

global.localStorage = { data:{}, getItem(k){return this.data[k]||null;}, setItem(k,v){this.data[k]=v;} };
global.window = {};

const registry = new Map();
function makeEl(id){
  return {
    id: id||'',
    style:{setProperty(){}}, textContent:'', value:'', checked:false, innerHTML:'', options:[],
    classList:{add(){},remove(){},contains(){return false;}},
    _listeners:{},
    addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
    removeEventListener(type,fn){ if(this._listeners[type]) this._listeners[type]=this._listeners[type].filter(f=>f!==fn); },
    dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt)); },
    click(){ this.dispatch('click', {target:this}); },
    appendChild(){}, querySelectorAll(sel){
      if((this.id === 'mailRecipientList') && sel === '[data-mail-del]'){
        const re = /data-mail-del="([^"]*)"/g;
        const results = []; let m;
        while((m = re.exec(this.innerHTML))){
          const email = m[1];
          results.push({ getAttribute(name){ return name==='data-mail-del' ? email : null; }, addEventListener:(type,fn)=>{ (this._delHandlers = this._delHandlers||{})[email] = fn; } });
        }
        return results;
      }
      return [];
    },
    querySelector(){return null;},
    getAttribute(){return null;}, setAttribute(){}, remove(){}, closest(){return null;}
  };
}
global.document = {
  _listeners:{},
  addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); },
  removeEventListener(type,fn){ if(this._listeners[type]) this._listeners[type]=this._listeners[type].filter(f=>f!==fn); },
  dispatch(type,evt){ (this._listeners[type]||[]).slice().forEach(f=>f(evt)); },
  getElementById(id){ if(!registry.has(id)) registry.set(id, makeEl(id)); return registry.get(id); },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl(); },
  body:{appendChild(){}}
};

class FakeDocRef {
  constructor(store, path){ this.store = store; this.path = path; }
  set(data){ this.store[this.path] = data; return Promise.resolve(); }
  get(){
    const exists = this.store[this.path] !== undefined;
    return Promise.resolve({ exists, data: ()=> this.store[this.path] });
  }
}
class FakeSubColl {
  constructor(store, prefix){ this.store = store; this.prefix = prefix; }
  doc(id){ return new FakeDocRef(this.store, this.prefix + '/' + id); }
}
class FakeUserDoc {
  constructor(store, uid){ this.store = store; this.uid = uid; }
  collection(name){ return new FakeSubColl(this.store, 'users/' + this.uid + '/' + name); }
}
class FakeUsersColl {
  constructor(store){ this.store = store; }
  doc(uid){ return new FakeUserDoc(this.store, uid); }
}
const fakeStore = {};
global.firebase = {
  initializeApp(){ return {}; },
  firestore(){ return { enablePersistence(){return {catch(){}};}, collection(name){ if(name==='users') return new FakeUsersColl(fakeStore); return { doc(){ return { collection(){ return { doc(){ return { onSnapshot(cb){cb({exists:false});return ()=>{};}, set(){return Promise.resolve();}, get(){return Promise.resolve({exists:false});} }; } }; } }; } }; } }; },
  auth(){ return { onAuthStateChanged(cb){cb(null);}, GoogleAuthProvider:function(){}, signInWithPopup(){return Promise.resolve();}, signOut(){return Promise.resolve();} }; }
};
global.firebase.auth.GoogleAuthProvider = function(){};
global.confirm=()=>true;
let alertCalls = [];
global.alert=(m)=>{ alertCalls.push(m); };
global.URL = { createObjectURL:()=>'blob:', revokeObjectURL:()=>{} };
global.Blob = function(){};

const testCode = `
(async () => {
  cloudUser = {uid:'uidA', email:'ergin@test.com', displayName:'Ergin Yilmaz'};

  console.log('--- Panel acildiginda mevcut liste bos yuklenmeli ---');
  openMailSettingsPanel();
  await new Promise(r=>setTimeout(r,0));
  await new Promise(r=>setTimeout(r,0));
  console.log('Bos liste ipucu gosteriliyor mu:', document.getElementById('mailRecipientList').innerHTML.includes('Henüz alıcı eklenmedi'));

  console.log('--- Gecersiz mail reddedilmeli ---');
  document.getElementById('mailRecipientInput').value = 'gecersiz-mail';
  document.getElementById('btnAddMailRecipient').click();
  console.log('Alert cagrildi mi (gecersiz mail):', alertCalls.length === 1);
  console.log('reminderRecipients hala bos mu:', reminderRecipients.length === 0);

  alertCalls = [];
  console.log('--- Gecerli mail eklenmeli ve Firestore a yazilmali ---');
  document.getElementById('mailRecipientInput').value = 'Patron@Sirket.com';
  document.getElementById('btnAddMailRecipient').click();
  await new Promise(r=>setTimeout(r,0));
  console.log('reminderRecipients icinde kucuk harfe cevrilmis mail var mi:', reminderRecipients.includes('patron@sirket.com'));
  console.log('Firestore a yazildi mi:', fakeStore['users/uidA/data/reminderSettings'].recipients.includes('patron@sirket.com'));
  console.log('Liste HTML de gorunuyor mu:', document.getElementById('mailRecipientList').innerHTML.includes('patron@sirket.com'));

  console.log('--- Ayni mail tekrar eklenirse reddedilmeli (mukerrer) ---');
  document.getElementById('mailRecipientInput').value = 'patron@sirket.com';
  document.getElementById('btnAddMailRecipient').click();
  console.log('Mukerrer icin alert geldi mi:', alertCalls.length === 1);
  console.log('Liste hala 1 eleman mi:', reminderRecipients.length === 1);

  console.log('--- Ikinci gecerli mail eklenebilmeli ---');
  document.getElementById('mailRecipientInput').value = 'muhasebe@sirket.com';
  document.getElementById('btnAddMailRecipient').click();
  await new Promise(r=>setTimeout(r,0));
  console.log('2 alici var mi:', reminderRecipients.length === 2);

  console.log('--- Alici silinebilmeli ---');
  const delHandler = document.getElementById('mailRecipientList')._delHandlers['patron@sirket.com'];
  console.log('Silme handler yakalandi mi:', typeof delHandler === 'function');
  delHandler();
  await new Promise(r=>setTimeout(r,0));
  console.log('patron@sirket.com listeden kalkti mi:', !reminderRecipients.includes('patron@sirket.com'));
  console.log('Firestore dan da kalkti mi:', !fakeStore['users/uidA/data/reminderSettings'].recipients.includes('patron@sirket.com'));
  console.log('muhasebe@sirket.com hala duruyor mu:', reminderRecipients.includes('muhasebe@sirket.com'));

  console.log('--- Panel kapatilinca mailSettingsPanelOpen false olmali ---');
  closeMailSettingsPanel();
  console.log('mailSettingsPanelOpen false mu:', mailSettingsPanelOpen === false);

  console.log('TÜM MAIL AYARLARI TESTLERI TAMAMLANDI');
})().catch(err => { console.error('TEST HATASI:', err); process.exitCode = 1; });
`;
eval(script + '\n' + testCode);

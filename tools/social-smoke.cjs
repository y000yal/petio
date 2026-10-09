const {app,BrowserWindow}=require('electron');
app.disableHardwareAcceleration();
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createService}=require('./social-server.cjs');
const directory=path.join(__dirname,'../.smoke/social-'+Date.now());fs.mkdirSync(directory,{recursive:true});
app.setName('PetioSocialSmoke');app.setPath('userData',directory);
fs.writeFileSync(path.join(directory,'personality.json'),JSON.stringify({aware:false,notify:false,roaming:false,attention:false,sounds:false,water:false}));
const {server}=createService();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=12000){for(let i=0;i<timeout/150;i++){const value=await fn();if(value)return value;await wait(150);}throw new Error('Timed out waiting for desktop state');}
async function remote(route,data={},token=''){const r=await fetch('http://127.0.0.1:4319'+route,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
(async()=>{
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4319,'127.0.0.1',resolve);});
  require('../src/main.cjs');await app.whenReady();
  const owner=await until(()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html')));
  await until(()=>owner.webContents.executeJavaScript('!!window.pet').catch(()=>false));await until(()=>owner.isVisible());
  const command=data=>owner.webContents.executeJavaScript('window.pet.socialCommand('+JSON.stringify(data)+')');
  assert.equal((await command({command:'register',name:'Desktop owner'})).ok,true);
  const saved=JSON.parse(fs.readFileSync(path.join(directory,'social.json'),'utf8'));
  assert.equal(saved.version,2);assert.equal(saved.profiles[saved.server].token,undefined);assert(saved.profiles[saved.server].encryptedToken);
  assert.equal((await command({command:'create',name:'Smoke group'})).ok,true);
  let state=await owner.webContents.executeJavaScript('window.pet.socialRead()');const friend=await remote('/register',{name:'Remote friend'});
  await remote('/room/join',{code:state.room.code},friend.token);await remote('/preferences',{accept:true},friend.token);
  const heart=setInterval(()=>remote('/state',{},friend.token).catch(()=>{}),2000);
  assert.equal((await command({command:'send',host:friend.id,message:'Lunch? 👻'})).ok,true);
  await until(()=>!owner.isVisible());const arriving=(await remote('/state',{},friend.token)).incoming;assert.equal(arriving.phase,'arriving');
  await remote('/visit/arrive',{id:arriving.id},friend.token);await remote('/visit/return',{id:arriving.id,reply:'Yes, lunch!'},friend.token);
  await until(()=>owner.isVisible());assert.match(await owner.webContents.executeJavaScript('document.querySelector("#speech").textContent'),/Yes, lunch/);
  assert.equal((await command({command:'accept',accept:true})).ok,true);state=await owner.webContents.executeJavaScript('window.pet.socialRead()');
  await remote('/visit/send',{host:state.me.id,type:'luffy',message:'Woof from your friend 🐶'},friend.token);
  const outgoing=(await remote('/state',{},friend.token)).outgoing;await remote('/visit/depart',{id:outgoing.id},friend.token);
  const visitor=await until(()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('visitor.html')&&w.isVisible()));
  assert.equal(owner.isVisible(),true);
  assert.match(await visitor.webContents.executeJavaScript('document.body.innerText'),/Remote friend/);
  assert.match(await visitor.webContents.executeJavaScript('document.body.innerText'),/Woof from your friend/);
  await wait(1600);assert.equal(await visitor.webContents.executeJavaScript('document.querySelector("canvas").getContext("2d").getImageData(0,0,340,200).data.some(v=>v>0)'),true);
  const image=await visitor.webContents.capturePage();fs.writeFileSync(path.join(directory,'visitor.png'),image.toPNG());
  await visitor.webContents.executeJavaScript('void window.visitor.sendHome("Scritches delivered! 🐾")');await until(()=>visitor.isDestroyed());
  assert.equal(visitor.isDestroyed(),true);assert.equal((await remote('/state',{},friend.token)).recent.at(-1).reply,'Scritches delivered! 🐾');
  owner.webContents.executeJavaScript('window.pet.command("settings")');
  const settings=await until(()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('settings.html')));
  await until(()=>settings.webContents.executeJavaScript('!!window.pet&&!!document.querySelector("#social-status")').catch(()=>false));
  await settings.webContents.executeJavaScript('document.querySelector("[data-tab=friends]").click()');await wait(500);
  await until(()=>settings.isVisible());
  assert.match(await settings.webContents.executeJavaScript('document.querySelector("#social-room-name").textContent'),/Smoke group/);
  fs.writeFileSync(path.join(directory,'friends.png'),(await settings.webContents.capturePage()).toPNG());
  assert.equal((await command({command:'send',host:friend.id,message:'Recall test'})).ok,true);await until(()=>!owner.isVisible());
  assert.equal((await command({command:'recall'})).ok,true);await until(()=>owner.isVisible());
  assert.equal((await command({command:'send',host:friend.id,message:'Outage test'})).ok,true);await until(()=>!owner.isVisible());
  clearInterval(heart);await new Promise(r=>server.close(r));await until(()=>owner.isVisible(),32000);
  console.log('PASS: owner departure, reply return, visitor alongside own pet, rendered artwork, send home, recall, server outage recovery and group settings. Captures: '+directory);
  server.close();app.quit();
 }catch(e){console.error(e);server.close();app.exit(1);}
})();

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {startUpdates}=require('../src/updates.cjs');

function harness({packaged=false,autoDownload=false}={}){
 const notices=[],dialogs=[];
 const updater={
  autoDownload:false,autoInstallOnAppQuit:false,downloads:0,installed:false,
  on(name,fn){(this.events[name]||=[]).push(fn);},
  emit(name,payload){(this.events[name]||[]).forEach(fn=>fn(payload));},
  events:{},
  checkForUpdates(){
   this.emit('checking-for-update');
   this.emit('update-available',{version:'0.6.8'});
   if(this.autoDownload)this.downloadUpdate();
   return Promise.resolve();
  },
  downloadUpdate(){this.downloads+=1;return Promise.resolve(['installer']);},
  quitAndInstall(){this.installed=true;}
 };
 const updates=startUpdates({
  app:{isPackaged:packaged,getVersion:()=>'0.6.7'},
  dialog:{showMessageBox:(_parent,options)=>{dialogs.push(options);return Promise.resolve({response:1});}},
  getParent:()=>null,
  notify:version=>notices.push(version),
  autoDownload,
  updater
 });
 return {updates,updater,notices,dialogs};
}

test('auto download off only reports an update until the user asks for it',async()=>{
 const {updates,updater,notices,dialogs}=harness({packaged:true,autoDownload:false});
 await updates.check();
 assert.equal(updates.snapshot().status,'available');
 assert.equal(updater.downloads,0);
 assert.deepEqual(notices,['0.6.8']);
 assert.equal(dialogs.length,0);
 updates.setAutoDownload(true);
 assert.equal(updates.snapshot().status,'downloading');
 assert.equal(updater.downloads,1);
});

test('auto download on starts the download when the update is found',async()=>{
 const {updates,updater,notices,dialogs}=harness({packaged:true,autoDownload:true});
 await updates.check();
 assert.equal(updates.snapshot().status,'downloading');
 assert.equal(updates.snapshot().message,'Downloading Petio 0.6.8…');
 assert.equal(updater.downloads,1);
 assert.equal(notices.length,0);
 updater.emit('download-progress',{percent:40});
 assert.equal(updates.snapshot().percent,40);
 updater.emit('update-downloaded',{version:'0.6.8'});
 assert.equal(updates.snapshot().status,'ready');
 assert.equal(dialogs.at(-1).buttons[0],'Restart now');
 await Promise.resolve();
 assert.equal(updater.installed,false);
 updates.install();
 assert.equal(updater.installed,true);
});

test('turning auto download off before a check does not download',async()=>{
 const {updates,updater}=harness({packaged:true,autoDownload:true});
 updates.setAutoDownload(false);
 await updates.check();
 assert.equal(updates.snapshot().status,'available');
 assert.equal(updater.downloads,0);
});

test('source preview waits while auto download is off, then finishes when it is turned on',async()=>{
 const {updates,updater}=harness({packaged:false,autoDownload:false});
 assert.equal(updates.snapshot().status,'available');
 assert.equal(updates.snapshot().version,'0.6.9');
 assert.equal(updater.downloads,0);
 const done=updates.setAutoDownload(true);
 assert.equal(updates.snapshot().status,'downloading');
 assert.equal((await updates.check()).status,'downloading');
 assert.equal((await done).status,'ready');
 assert.equal((await updates.check()).status,'ready');
 updates.install();
 assert.equal(updater.installed,false);
});

test('source preview starts the download immediately when auto download is already on',async()=>{
 const {updates}=harness({packaged:false,autoDownload:true});
 assert.equal(updates.snapshot().status,'downloading');
 const ready=await new Promise(resolve=>{
  const stop=updates.subscribe(status=>{if(status.status==='ready'){stop();resolve(status);}});
 });
 assert.equal(ready.version,'0.6.9');
 assert.equal(ready.percent,100);
});

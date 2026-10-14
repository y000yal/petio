function startUpdates({app,dialog,getParent,notify,autoDownload=false,updater}={}){
 const autoUpdater=updater||require('electron-updater').autoUpdater;
 const state={status:'idle',version:'',percent:0,message:'',current:app.getVersion()};
 if(!app.isPackaged){state.version='0.6.9';if(!autoDownload){state.status='available';state.message='Update available: Petio 0.6.9';}}
 const listeners=new Set();
 let prompting=false,notified='',manual=false;
 const publish=()=>{state.current=app.getVersion();for(const fn of listeners)fn({...state});};
 autoUpdater.autoDownload=!!autoDownload;
 autoUpdater.autoInstallOnAppQuit=true;
 autoUpdater.on('checking-for-update',()=>{state.status='checking';state.message='Checking for updates…';publish();});
 autoUpdater.on('update-available',info=>{
  state.version=info&&info.version||'';state.percent=0;
  if(autoUpdater.autoDownload){state.status='downloading';state.message='Downloading Petio '+(state.version||'update')+'…';if(manual)say(state.message);}
  else{state.status='available';state.message='Petio '+state.version+' is available. Download and install it when you are ready.';if(manual)askDownload();else if(notified!==state.version){notified=state.version;if(typeof notify==='function')notify(state.version);}}
  publish();
 });
 autoUpdater.on('update-not-available',()=>{state.status='current';state.message='Petio '+app.getVersion()+' is up to date.';publish();if(manual)say(state.message);});
 autoUpdater.on('download-progress',progress=>{state.status='downloading';state.percent=Math.max(0,Math.min(100,Math.round(progress&&progress.percent||0)));state.message='Downloading… '+state.percent+'%';publish();});
 autoUpdater.on('update-downloaded',info=>{state.status='ready';state.version=info&&info.version||state.version;state.percent=100;state.message='Petio '+state.version+' is ready. Restart to install it.';publish();promptRestart();});
 autoUpdater.on('error',()=>{if(state.status==='ready')return;if(state.version&&(state.status==='downloading'||state.status==='available')){state.status='available';state.message='Could not download Petio '+state.version+'. Try again.';publish();if(manual)say(state.message);return;}state.status='error';state.message='Could not check for updates. Try again in a little while.';publish();if(manual)say(state.message);});
 function say(message){
  const parent=getParent();
  dialog.showMessageBox(parent&&!parent.isDestroyed()?parent:undefined,{type:'info',buttons:['OK'],title:'Petio',message}).catch(()=>{});
 }
 function askDownload(){
  if(prompting)return;
  prompting=true;
  const parent=getParent();
  dialog.showMessageBox(parent&&!parent.isDestroyed()?parent:undefined,{
   type:'info',buttons:['Download and install','Later'],defaultId:0,cancelId:1,title:'Update Petio',
   message:'Petio '+state.version+' is available',
   detail:'Download it, then restart to install. Your companion and settings stay on this computer.'
  }).then(result=>{prompting=false;if(result.response===0)download();}).catch(()=>{prompting=false;});
 }
 function promptRestart(){
  if(prompting||state.status!=='ready')return;
  prompting=true;
  const parent=getParent();
  dialog.showMessageBox(parent&&!parent.isDestroyed()?parent:undefined,{
   type:'info',buttons:['Restart now','Later'],defaultId:0,cancelId:1,title:'Update Petio',
   message:'Petio '+state.version+' is ready',
   detail:'Restart to install it. Your companion, reminders, and chats stay on this computer.'
  }).then(result=>{prompting=false;if(result.response===0)autoUpdater.quitAndInstall(false,true);}).catch(()=>{prompting=false;});
 }
 let previewTask=null;
 function previewDownload(){
  if(state.status==='ready')return Promise.resolve({...state});
  if(previewTask)return previewTask;
  state.version='0.6.9';state.status='downloading';state.percent=0;state.message='Downloading Petio '+state.version+'…';publish();
  previewTask=new Promise(resolve=>{
   const step=()=>{
    state.percent=Math.min(100,state.percent+34);
    if(state.percent>=100){previewTask=null;state.status='ready';state.percent=100;state.message='Petio '+state.version+' is ready. Restart to install it.';publish();resolve({...state});return;}
    state.message='Downloading… '+state.percent+'%';publish();setTimeout(step,400);
   };
   setTimeout(step,400);
  });
  return previewTask;
 }
 function check(fromUser){
  manual=!!fromUser;
  if(!app.isPackaged){manual=false;state.version='0.6.9';if(state.status==='ready'||state.status==='downloading')return Promise.resolve({...state});if(autoUpdater.autoDownload)return previewDownload();state.status='available';state.percent=0;state.message='Update available: Petio 0.6.9';publish();return Promise.resolve({...state});}
  if(state.status==='ready'){promptRestart();return Promise.resolve({...state});}
  if(state.status==='checking'||state.status==='downloading')return Promise.resolve({...state});
  return autoUpdater.checkForUpdates().then(()=>({...state})).catch(()=>({...state})).finally(()=>{manual=false;});
 }
 function download(){
  if(!app.isPackaged)return previewDownload();
  if(state.status==='ready'){promptRestart();return Promise.resolve({...state});}
  if(state.status==='checking'||state.status==='downloading')return Promise.resolve({...state});
  state.status='downloading';state.percent=0;state.message='Downloading Petio '+(state.version||'update')+'…';publish();
  return autoUpdater.downloadUpdate().then(()=>({...state})).catch(()=>({...state}));
 }
 function install(){if(state.status!=='ready')return check();if(!app.isPackaged)return Promise.resolve({...state});autoUpdater.quitAndInstall(false,true);}
 function setAutoDownload(on){autoUpdater.autoDownload=!!on;if(on&&state.status==='available')return download();}
 if(!app.isPackaged&&autoUpdater.autoDownload)previewDownload();
 return {check,download,install,setAutoDownload,snapshot:()=>({...state,current:app.getVersion()}),subscribe(fn){listeners.add(fn);fn({...state,current:app.getVersion()});return ()=>listeners.delete(fn);}};
}

module.exports={startUpdates};

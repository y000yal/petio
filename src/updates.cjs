const {autoUpdater}=require('electron-updater');

function startUpdates({app,dialog,getParent,notify,autoDownload=false}){
 const state={status:'idle',version:'',percent:0,message:'',current:app.getVersion()};
 const listeners=new Set();
 let prompting=false,notified='';
 const publish=()=>{state.current=app.getVersion();for(const fn of listeners)fn({...state});};
 autoUpdater.autoDownload=!!autoDownload;
 autoUpdater.autoInstallOnAppQuit=true;
 autoUpdater.on('checking-for-update',()=>{state.status='checking';state.message='Checking for updates…';publish();});
 autoUpdater.on('update-available',info=>{
  state.version=info&&info.version||'';state.percent=0;
  if(autoUpdater.autoDownload){state.status='downloading';state.message='Downloading Petio '+(state.version||'update')+'…';}
  else{state.status='available';state.message='Petio '+state.version+' is available. Download and install it when you are ready.';if(notified!==state.version){notified=state.version;if(typeof notify==='function')notify(state.version);}}
  publish();
 });
 autoUpdater.on('update-not-available',()=>{state.status='current';state.message='Petio '+app.getVersion()+' is up to date.';publish();});
 autoUpdater.on('download-progress',progress=>{state.status='downloading';state.percent=Math.max(0,Math.min(100,Math.round(progress&&progress.percent||0)));state.message='Downloading… '+state.percent+'%';publish();});
 autoUpdater.on('update-downloaded',info=>{state.status='ready';state.version=info&&info.version||state.version;state.percent=100;state.message='Petio '+state.version+' is ready. Restart to install it.';publish();promptRestart();});
 autoUpdater.on('error',()=>{if(state.status==='ready')return;if(state.version&&(state.status==='downloading'||state.status==='available')){state.status='available';state.message='Could not download Petio '+state.version+'. Try again.';publish();return;}state.status='error';state.message='Could not check for updates. Try again in a little while.';publish();});
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
 function check(){
  if(!app.isPackaged){state.status='dev';state.message='Updates run from the installed app. This source copy stays as it is.';publish();return Promise.resolve({...state});}
  if(state.status==='ready'){promptRestart();return Promise.resolve({...state});}
  if(state.status==='checking'||state.status==='downloading')return Promise.resolve({...state});
  return autoUpdater.checkForUpdates().then(()=>({...state})).catch(()=>({...state}));
 }
 function download(){
  if(!app.isPackaged)return check();
  if(state.status==='ready'){promptRestart();return Promise.resolve({...state});}
  if(state.status==='checking'||state.status==='downloading')return Promise.resolve({...state});
  state.status='downloading';state.percent=0;state.message='Downloading Petio '+(state.version||'update')+'…';publish();
  return autoUpdater.downloadUpdate().then(()=>({...state})).catch(()=>({...state}));
 }
 function install(){if(state.status==='ready')autoUpdater.quitAndInstall(false,true);else return check();}
 function setAutoDownload(on){autoUpdater.autoDownload=!!on;if(on&&state.status==='available')return download();}
 return {check,download,install,setAutoDownload,snapshot:()=>({...state,current:app.getVersion()}),subscribe(fn){listeners.add(fn);fn({...state,current:app.getVersion()});return ()=>listeners.delete(fn);}};
}

module.exports={startUpdates};

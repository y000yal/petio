const {BrowserWindow,ipcMain,screen,safeStorage,clipboard}=require('electron');
const {localServer,serverAddress,hosted,apiAddress}=require('./social-config.cjs');
const fs=require('node:fs');
const path=require('node:path');
function startSocial({directory,readPet,setAway,returned,onState}){
 const file=path.join(directory,'social.json');let identity=null,latest={connected:false},visitor=null,visitorId=null,busy=false,stopped=false,lastReturn='',away=false,unavailableAt=0,server=localServer;
 let profiles={};
 try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(saved.version===2){server=serverAddress(saved.server);profiles=saved.profiles||{};}else if(saved.token){profiles[localServer]=saved;}}catch{}
 const loadIdentity=()=>{const saved=profiles[server];identity=saved?{...saved,token:saved.encryptedToken?safeStorage.decryptString(Buffer.from(saved.encryptedToken,'base64')):saved.token}:null;};
 try{loadIdentity();}catch{latest.error='Windows could not unlock this profile. Restore it with your recovery code.';}
 const persist=()=>{if(identity){if(!safeStorage.isEncryptionAvailable())throw new Error('Secure credential storage is unavailable on this computer.');const {token,encryptedToken,...rest}=identity;profiles[server]={...rest,encryptedToken:safeStorage.encryptString(token).toString('base64')};}fs.writeFileSync(file,JSON.stringify({version:2,server,profiles}));};
 if(identity&&safeStorage.isEncryptionAvailable())persist();
 if(identity?.away){away=true;setAway(true);}
 async function request(route,data={},token=identity?.token||''){
  const res=await fetch(apiAddress(server,route),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data),signal:AbortSignal.timeout(hosted(server)?12000:4000)});
  let value;try{value=await res.json();}catch{throw new Error('The server did not return JSON. Check its URL and Vercel deployment protection.');}if(!res.ok)throw new Error(value.error||'Connection failed');return value;
 }
 function closeVisitor(){if(visitor&&!visitor.isDestroyed())visitor.destroy();visitor=null;visitorId=null;}
 async function sync(){
  if(busy||stopped)return;if(!identity){onState({...latest,server,hasProfile:false});return;}busy=true;
  try{
   latest={...await request('/state'),connected:true};unavailableAt=0;
   const v=latest.outgoing;
   if(v){if(!away){away=true;identity.away=true;persist();await setAway(true);}if(v.phase==='departing')await request('/visit/depart',{id:v.id});}
   else if(away){away=false;identity.away=false;persist();setAway(false);const r=latest.recent.at(-1);if(r&&r.id!==lastReturn){lastReturn=r.id;returned(r.reply?`${r.hostName}: ${r.reply}`:'Home again! 🏡');}}
   const incoming=latest.incoming;
   if(incoming&&['arriving','active'].includes(incoming.phase)){
    if(visitor&&visitorId!==incoming.id)closeVisitor();
    if(!visitor){
     const a=screen.getPrimaryDisplay().workArea;visitor=new BrowserWindow({width:340,height:480,x:a.x+a.width-380,y:a.y+a.height-520,frame:false,transparent:true,resizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,webPreferences:{preload:path.join(__dirname,'visitor-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
     visitor.webContents.setWindowOpenHandler(()=>({action:'deny'}));visitor.webContents.on('will-navigate',e=>e.preventDefault());
     visitorId=incoming.id;const arrivingWindow=visitor;
     visitor.on('closed',()=>{if(visitor===arrivingWindow){visitor=null;visitorId=null;}});
     visitor.webContents.once('did-finish-load',()=>{if(!stopped&&visitor===arrivingWindow&&!arrivingWindow.isDestroyed()){arrivingWindow.webContents.send('visitor-state',incoming);arrivingWindow.showInactive();if(incoming.phase==='arriving')request('/visit/arrive',{id:incoming.id}).catch(()=>closeVisitor());}});
     visitor.loadFile(path.join(__dirname,'visitor.html'));
    }
   }else closeVisitor();
  }catch(e){latest={...latest,connected:false,error:hosted(server)?e.message+' Check the server deployment.':'Local server unavailable. Start npm run social:server.'};closeVisitor();unavailableAt||=Date.now();if(away&&Date.now()-unavailableAt>(hosted(server)?40000:20000)){away=false;identity.away=false;persist();setAway(false);returned('The connection faded, so I came home. 🏡');}}
  finally{busy=false;onState({...latest,server,hasProfile:!!identity});}
 }
 let nextPoll=0;const timer=setInterval(()=>{if(Date.now()<nextPoll)return;nextPoll=Date.now()+(hosted(server)?5000:2000);sync();},1000);sync();
 ipcMain.handle('visitor-return',async(e,reply)=>{
  if(!visitor||visitor.isDestroyed()||e.sender!==visitor.webContents)return {error:'Visitor unavailable.'};
  const id=latest.incoming?.id;if(!id)return {error:'Visit ended.'};
  try{await request('/visit/return',{id,...(typeof reply==='string'&&reply.trim()?{reply:reply.trim()}: {})});closeVisitor();await sync();return {ok:true};}catch(e){return {error:e.message};}
 });
 return {state:()=>({...latest,server,hasProfile:!!identity}),isAway:()=>away,async command(data){
  try{
   if(!data||typeof data!=='object')throw new Error('Invalid request.');
   if(busy)throw new Error('Connecting. Try again in a moment.');
   if(data.command==='server'){if(away||visitor)throw new Error('End the current visit before switching servers.');server=serverAddress(data.url);latest={connected:false};loadIdentity();persist();nextPoll=0;}
   else if(data.command==='backup'){if(!identity)throw new Error('Create a profile first.');clipboard.writeText(identity.token);return {ok:true,state:{...latest,server,hasProfile:true},notice:'Recovery code copied. Keep it private and save it securely.'};}
   else if(data.command==='restore'){if(identity)throw new Error('A profile already exists on this server.');if(typeof data.token!=='string'||!/^[a-f0-9]{48}$/.test(data.token.trim()))throw new Error('Enter a valid recovery code.');const token=data.token.trim(),result=await request('/identity',{},token);identity={id:result.id,token};persist();}
   else if(data.command==='register'){if(identity)throw new Error('Profile already exists.');if(!safeStorage.isEncryptionAvailable())throw new Error('Secure credential storage is unavailable.');identity=await request('/register',{name:data.name,accessCode:data.accessCode});persist();}
   else if(data.command==='create')await request('/room/create',{name:data.name});
   else if(data.command==='join')await request('/room/join',{code:data.code});
   else if(data.command==='accept')await request('/preferences',{accept:data.accept});
   else if(data.command==='send')await request('/visit/send',{host:data.host,message:data.message,type:readPet().type});
   else if(data.command==='recall')await request('/visit/return',{id:latest.outgoing?.id});
   else if(data.command!=='refresh')throw new Error('Unknown action.');
   await sync();return {ok:true,state:{...latest,server,hasProfile:!!identity}};
  }catch(e){return {error:e.message};}
 },stop(){stopped=true;clearInterval(timer);closeVisitor();ipcMain.removeHandler('visitor-return');}};
}
module.exports={startSocial};

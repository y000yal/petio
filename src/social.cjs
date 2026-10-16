const {BrowserWindow,ipcMain,screen,safeStorage,clipboard}=require('electron');
const {localServer,serverAddress,hosted,apiAddress}=require('./social-config.cjs');
const fs=require('node:fs');
const path=require('node:path');
const {visitorWindow}=require('./visitor-layout.cjs');
function startSocial({directory,readPet,readHost,setAway,returned,onState,onNotice,onPlay}){
 const file=path.join(directory,'social.json');let identity=null,latest={connected:false},visitor=null,visitorStateKey='',busy=false,stopped=false,lastReturn='',away=false,unavailableAt=0,server=localServer,seenNotices=new Set();
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
 async function checkServer(){
  const res=await fetch(server+(hosted(server)?'/api/health':'/health'),{redirect:'error',signal:AbortSignal.timeout(hosted(server)?12000:4000)});
  let value;try{value=await res.json();}catch{throw new Error('The server did not return JSON. Check its address and deployment protection.');}
  if(!res.ok||value.ok!==true||value.service!=='petio')throw new Error(value.error||'This server is not ready for Petio.');
 }
 function closeVisitor(){try{onPlay?.(null,0,'end');}catch{}const closing=visitor;visitor=null;visitorStateKey='';if(closing&&!closing.isDestroyed()){closing.setIgnoreMouseEvents(true,{forward:true});closing.webContents.send('visitor-exit');setTimeout(()=>{if(!closing.isDestroyed())closing.destroy();},370);}}
 function placeVisitor(){
  let area=screen.getPrimaryDisplay().workArea;
  try{const host=readHost?.();if(host&&Number.isFinite(host.x)&&Number.isFinite(host.y))area=screen.getDisplayNearestPoint({x:Math.round(host.x),y:Math.round(host.y)}).workArea;}catch{}
  return visitorWindow(area);
 }
 function showVisitors(window,visits){
  const key=JSON.stringify(visits);if(key!==visitorStateKey){visitorStateKey=key;window.webContents.send('visitor-state',{visits});}
  window.showInactive();
  for(const v of visits)if(v.phase==='arriving')request('/visit/arrive',{id:v.id}).catch(()=>{visitorStateKey='';});
 }
 async function sync(check=false){
  if(busy||stopped)return;
  if(!identity){
   if(check){busy=true;latest={connected:false,connecting:true};onState({...latest,server,hasProfile:false});
    try{await checkServer();latest={connected:false,reachable:true};}
    catch(e){latest={connected:false,reachable:false,error:e.name==='TimeoutError'?'Connection timed out. Try again.':e.message==='fetch failed'?'Could not reach the server. Check your address and internet connection.':e.message};}
    finally{busy=false;}
   }
   onState({...latest,server,hasProfile:false});return;
  }
  busy=true;
  try{
   latest={...await request('/state',{capacity:5}),connected:true};unavailableAt=0;
   for(const n of latest.notices||[])if(n&&n.id&&!seenNotices.has(n.id)){seenNotices.add(n.id);try{onNotice?.(n);}catch{}}
   const v=latest.outgoing;
   if(v){if(!away){away=true;identity.away=true;persist();await setAway(true);}if(v.phase==='departing')await request('/visit/depart',{id:v.id});}
   else if(away){away=false;identity.away=false;persist();setAway(false);const r=latest.recent.at(-1);if(r&&r.id!==lastReturn){lastReturn=r.id;returned(r.reply?`${r.hostName}: ${r.reply}`:'Home again! 🏡');}}
   const incoming=(latest.incomingVisits||(latest.incoming?[latest.incoming]:[])).filter(v=>['arriving','active'].includes(v.phase)).slice(0,5);
   if(incoming.length){
    const bounds=placeVisitor();
    if(!visitor){
     visitor=new BrowserWindow({...bounds,frame:false,transparent:true,resizable:false,movable:false,skipTaskbar:true,alwaysOnTop:true,show:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,'visitor-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
     visitor.setIgnoreMouseEvents(true,{forward:true});
     visitor.webContents.setWindowOpenHandler(()=>({action:'deny'}));visitor.webContents.on('will-navigate',e=>e.preventDefault());
     const arrivingWindow=visitor;
     visitor.on('closed',()=>{if(visitor===arrivingWindow){visitor=null;visitorStateKey='';}});
     visitor.webContents.once('did-finish-load',()=>{if(!stopped&&visitor===arrivingWindow&&!arrivingWindow.isDestroyed())showVisitors(arrivingWindow,incoming);});
     visitor.loadFile(path.join(__dirname,'visitor.html'));
    }else if(!visitor.webContents.isLoading()){
     const current=visitor.getBounds();
     if(Math.abs(current.x-bounds.x)>2||Math.abs(current.y-bounds.y)>2||Math.abs(current.width-bounds.width)>2||Math.abs(current.height-bounds.height)>2)visitor.setBounds(bounds);
     showVisitors(visitor,incoming);
    }
   }else closeVisitor();
  }catch(e){latest={...latest,connected:false,error:hosted(server)?e.message+' Check the server deployment.':'Local server unavailable. Start npm run social:server.'};closeVisitor();unavailableAt||=Date.now();if(away&&Date.now()-unavailableAt>(hosted(server)?40000:20000)){away=false;identity.away=false;persist();setAway(false);returned('The connection faded, so I came home. 🏡');}}
  finally{busy=false;onState({...latest,server,hasProfile:!!identity});}
 }
 let nextPoll=0;const timer=setInterval(()=>{if(Date.now()<nextPoll)return;nextPoll=Date.now()+(hosted(server)?5000:2000);sync();},1000);sync(true);
 ipcMain.on('visitor-hit',(e,hit)=>{if(visitor&&!visitor.isDestroyed()&&e.sender===visitor.webContents&&typeof hit==='boolean')visitor.setIgnoreMouseEvents(!hit,{forward:true});});
 ipcMain.handle('visitor-host',e=>{
  if(!visitor||visitor.isDestroyed()||e.sender!==visitor.webContents||typeof readHost!=='function')return null;
  const h=readHost();if(!h)return null;const b=visitor.getBounds();
  return {type:h.type,name:h.name,scale:h.scale||.65,busy:!!h.busy,x:h.x-b.x,y:h.y-b.y};
 });
 ipcMain.on('visitor-play',(e,data)=>{if(!visitor||visitor.isDestroyed()||e.sender!==visitor.webContents||!data||!['greet','guest','host','play','end'].includes(data.stage)||![-1,1].includes(data.side))return;const visit=(latest.incomingVisits||[latest.incoming]).find(v=>v&&v.id===data.id&&v.type===data.guest);if(!visit)return;try{onPlay?.(visit.type,data.side,data.stage,Number.isInteger(data.variation)?data.variation%20:0,visit.petName||'');}catch{}});
 ipcMain.handle('visitor-return',async(e,reply,id)=>{
  if(!visitor||visitor.isDestroyed()||e.sender!==visitor.webContents)return {error:'Visitor unavailable.'};
  const visits=latest.incomingVisits||(latest.incoming?[latest.incoming]:[]);id||=visits[0]?.id;if(!visits.some(v=>v.id===id))return {error:'Visit ended.'};
  try{visitor.webContents.send('visitor-exit',id);await new Promise(resolve=>setTimeout(resolve,370));await request('/visit/return',{id,...(typeof reply==='string'&&reply.trim()?{reply:reply.trim()}: {})});visitorStateKey='';await sync();return {ok:true};}catch(e){return {error:e.message};}
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
   else if(data.command==='accept')await request('/preferences',{accept:data.accept,visitorLimit:data.visitorLimit});
   else if(data.command==='visit'){if(data.message!==undefined&&(typeof data.message!=='string'||data.message.length>1000))throw new Error('Keep your visit message within 1000 characters.');await request('/visit/send',{host:typeof data.host==='string'?data.host:'',type:readPet().type,petName:require('./personal.js').petName(readPet(),readPet().type),message:data.message?.trim()||'Hi! I came over to keep you company. 👋'});}
   else if(data.command==='send')await request('/message',{message:data.message,host:data.host==='group'||typeof data.host!=='string'?'group':data.host,...(typeof data.reply==='string'&&data.reply?{reply:data.reply}:{})});
   else if(data.command==='unsend')await request('/unsend',{id:typeof data.id==='string'?data.id:''});
   else if(data.command==='react')await request('/react',{id:typeof data.id==='string'?data.id:'',emoji:typeof data.emoji==='string'?data.emoji:''});
   else if(data.command==='pin')await request('/pin',{id:typeof data.id==='string'?data.id:''});
   else if(data.command==='typing')await request('/typing',{host:data.host==='group'||typeof data.host!=='string'?'group':data.host,active:data.active!==false});
   else if(data.command==='seen')await request('/seen',{host:data.host==='group'||typeof data.host!=='string'?'group':data.host});
   else if(data.command==='recall')await request('/visit/return',{id:latest.outgoing?.id});
   else if(data.command!=='refresh')throw new Error('Unknown action.');
   await sync(!identity);return {ok:!latest.error,state:{...latest,server,hasProfile:!!identity}};
  }catch(e){return {error:e.message};}
 },stop(){stopped=true;clearInterval(timer);closeVisitor();ipcMain.removeHandler('visitor-return');ipcMain.removeHandler('visitor-host');ipcMain.removeAllListeners('visitor-hit');ipcMain.removeAllListeners('visitor-play');}};
}
module.exports={startSocial};

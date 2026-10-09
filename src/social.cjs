const {BrowserWindow,ipcMain,screen}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
function startSocial({directory,readPet,setAway,returned,onState}){
 const file=path.join(directory,'social.json');let identity=null,latest={connected:false},visitor=null,busy=false,stopped=false,lastReturn='',away=false,unavailableAt=0;
 try{identity=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const persist=()=>fs.writeFileSync(file,JSON.stringify(identity));
 if(identity?.away){away=true;setAway(true);}
 async function request(route,data={}){
  const res=await fetch('http://127.0.0.1:4319'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(identity?.token||'')},body:JSON.stringify(data),signal:AbortSignal.timeout(4000)});
  const value=await res.json();if(!res.ok)throw new Error(value.error||'Connection failed');return value;
 }
 function closeVisitor(){if(visitor&&!visitor.isDestroyed())visitor.destroy();visitor=null;}
 async function sync(){
  if(busy||stopped||!identity)return;busy=true;
  try{
   latest={...await request('/state'),connected:true};unavailableAt=0;
   const v=latest.outgoing;
   if(v){if(!away){away=true;identity.away=true;persist();await setAway(true);}if(v.phase==='departing')await request('/visit/depart',{id:v.id});}
   else if(away){away=false;identity.away=false;persist();setAway(false);const r=latest.recent.at(-1);if(r&&r.id!==lastReturn){lastReturn=r.id;returned(r.reply?`${r.hostName}: ${r.reply}`:'Home again! 🏡');}}
   const incoming=latest.incoming;
   if(incoming&&['arriving','active'].includes(incoming.phase)){
    if(!visitor){
     const a=screen.getPrimaryDisplay().workArea;visitor=new BrowserWindow({width:340,height:480,x:a.x+a.width-380,y:a.y+a.height-520,frame:false,transparent:true,resizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,webPreferences:{preload:path.join(__dirname,'visitor-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
     visitor.webContents.setWindowOpenHandler(()=>({action:'deny'}));visitor.webContents.on('will-navigate',e=>e.preventDefault());
     visitor.on('closed',()=>{visitor=null;});
     visitor.webContents.once('did-finish-load',()=>{if(visitor&&!visitor.isDestroyed()){visitor.webContents.send('visitor-state',incoming);visitor.showInactive();request('/visit/arrive',{id:incoming.id}).catch(()=>{});}});
     visitor.loadFile(path.join(__dirname,'visitor.html'));
    }
   }else closeVisitor();
  }catch(e){latest={...latest,connected:false,error:'Local server unavailable. Start npm run social:server.'};closeVisitor();unavailableAt||=Date.now();if(away&&Date.now()-unavailableAt>20000){away=false;identity.away=false;persist();setAway(false);returned('The connection faded, so I came home. 🏡');}}
  finally{busy=false;onState(latest);}
 }
 const timer=setInterval(sync,2000);sync();
 ipcMain.handle('visitor-return',async(e,reply)=>{
  if(!visitor||visitor.isDestroyed()||e.sender!==visitor.webContents)return {error:'Visitor unavailable.'};
  const id=latest.incoming?.id;if(!id)return {error:'Visit ended.'};
  try{await request('/visit/return',{id,...(typeof reply==='string'&&reply.trim()?{reply:reply.trim()}: {})});closeVisitor();await sync();return {ok:true};}catch(e){return {error:e.message};}
 });
 return {state:()=>latest,isAway:()=>away,async command(data){
  try{
   if(!data||typeof data!=='object')throw new Error('Invalid request.');
   if(data.command==='register'){if(identity)throw new Error('Profile already exists.');identity=await request('/register',{name:data.name});fs.writeFileSync(file,JSON.stringify(identity));}
   else if(data.command==='create')await request('/room/create',{name:data.name});
   else if(data.command==='join')await request('/room/join',{code:data.code});
   else if(data.command==='accept')await request('/preferences',{accept:data.accept});
   else if(data.command==='send')await request('/visit/send',{host:data.host,message:data.message,type:readPet().type});
   else if(data.command==='recall')await request('/visit/return',{id:latest.outgoing?.id});
   else if(data.command!=='refresh')throw new Error('Unknown action.');
   await sync();return {ok:true,state:latest};
  }catch(e){return {error:e.message};}
 },stop(){stopped=true;clearInterval(timer);closeVisitor();ipcMain.removeHandler('visitor-return');}};
}
module.exports={startSocial};

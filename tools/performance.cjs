const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../.smoke/performance-profile');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'personality.json'),JSON.stringify({type:'boo',attention:false,roaming:false}));app.setPath('userData',dir);
const wait=ms=>new Promise(r=>setTimeout(r,ms));let active=false;
const watchdog=setTimeout(()=>app.exit(1),45000);
app.on('browser-window-created',(_e,w)=>{if(active)return;active=true;w.once('ready-to-show',async()=>{
 try{
  await wait(1000);const results={gpu:app.getGPUFeatureStatus(),samples:{}};
  for(const mode of ['idle','hidden','roaming']){
   if(mode==='hidden')w.hide();else{w.showInactive();await w.webContents.executeJavaScript(`window.pet.command('${mode==='idle'?'idle':'wander'}')`);}
   app.getAppMetrics();const samples=[];
   for(let i=0;i<6;i++){await wait(1000);const metrics=app.getAppMetrics();samples.push({cpu:metrics.reduce((n,p)=>n+p.cpu.percentCPUUsage,0),workingSetMB:metrics.reduce((n,p)=>n+(p.memory?.workingSetSize||0),0)/1024});}
   results.samples[mode]={meanCPUPercent:samples.reduce((n,s)=>n+s.cpu,0)/samples.length,maxWorkingSetMB:Math.max(...samples.map(s=>s.workingSetMB)),window:w.getBounds()};
  }
  fs.writeFileSync(path.resolve(__dirname,'../.smoke/performance.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));clearTimeout(watchdog);app.quit();
 }catch(error){console.error(error);clearTimeout(watchdog);app.exit(1);}
 });});
require('../src/main.cjs');

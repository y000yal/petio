const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../.smoke/reminder-profile');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'personality.json'),JSON.stringify({sounds:false,attention:false,roaming:false}));app.setPath('userData',dir);
const wait=ms=>new Promise(r=>setTimeout(r,ms));let active=false,offset=0;const realNow=Date.now;Date.now=()=>realNow()+offset;
const watchdog=setTimeout(()=>{console.error('Reminder integration timed out');app.exit(1);},30000);
app.on('browser-window-created',(_event,w)=>{if(active)return;active=true;w.webContents.once('did-finish-load',async()=>{
 try{
  await wait(300);const run=code=>w.webContents.executeJavaScript(code);
  await run("window.pet.reminder({text:'Every minute test',minutes:1,recurring:true})");
  await run("window.pet.reminder({text:'Every hour test',minutes:60,recurring:true})");
  await run("window.pet.reminder({text:'One-time test',minutes:1,recurring:false})");
  assert.equal((await run('window.pet.read()')).reminders.length,3);
  offset=61000;await wait(1300);let state=await run('window.pet.read()');assert.equal(state.reminders.length,2);assert(state.reminders.every(r=>r.due>Date.now()));
  const firstMinute=state.reminders.find(r=>r.text==='Every minute test').due;
  assert((await run("document.querySelector('#speech').textContent")).includes('Every minute test'));
  offset=121000;await wait(1300);state=await run('window.pet.read()');assert(state.reminders.find(r=>r.text==='Every minute test').due>firstMinute);
  offset=3601000;await wait(1300);state=await run('window.pet.read()');assert.equal(state.reminders.length,2);assert(state.reminders.every(r=>r.due>Date.now()));assert((await run("document.querySelector('#speech').textContent")).includes('Every hour test'));
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'personality.json'),'utf8'));assert.equal(saved.reminders.length,2);assert(saved.reminders.some(r=>r.intervalMs===3600000));
  for(const r of state.reminders)await run(`window.pet.reminder({remove:${JSON.stringify(r.id)}})`);
  offset+=3600000;await wait(1200);assert.equal((await run('window.pet.read()')).reminders.length,0);
  console.log('PASS: native scheduler delivers two consecutive minute reminders, hourly reminders, removes one-time reminders, saves future recurrence, and honors deletion (clock advanced).');
  clearTimeout(watchdog);app.quit();
 }catch(e){console.error(e);clearTimeout(watchdog);app.exit(1);}
 });});
require('../src/main.cjs');

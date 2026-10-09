process.env.PETIO_SMOKE='1';
const { app, BrowserWindow, screen } = require('electron');
app.disableHardwareAcceleration();
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../.smoke');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'personality.json'),JSON.stringify({attention:false}));app.setPath('userData',output);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function capture(window){
 let error;
 for(let attempt=0;attempt<3;attempt++){try{return await window.webContents.capturePage(undefined,{stayAwake:true});}catch(e){error=e;window.show();window.moveTop();await sleep(350);}}
 throw error;
}
async function until(check,timeout=7000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await sleep(50);}throw new Error('Timed out waiting for expected native state');}
const watchdog=setTimeout(()=>{console.error('Smoke test timed out');app.exit(1);},60000);
let checked=false;
app.on('browser-window-created',(_event,window)=>{
 if(checked)return;checked=true;
 const errors=[];window.webContents.on('console-message',(_e,level,message)=>{if(level===3)errors.push(message);});
 window.once('ready-to-show',async()=>{
  const run=code=>window.webContents.executeJavaScript(code);
  try{
   await sleep(500);assert(window.isVisible());assert(window.isAlwaysOnTop());
   const cursor=screen.getCursorScreenPoint();screen.getCursorScreenPoint=()=>cursor;
   const nativeSetIgnore=window.setIgnoreMouseEvents.bind(window);let ignoresMouse=false;window.setIgnoreMouseEvents=(ignore,options)=>{ignoresMouse=ignore;return nativeSetIgnore(ignore,options);};
   const initialBounds=window.getBounds();cursor.x=initialBounds.x+260;cursor.y=initialBounds.y+250;await sleep(150);assert.equal(ignoresMouse,false);
   await run("window.pet.command('down')");await sleep(80);assert.equal(await run('state.action'),'carried');
   await run("window.pet.command('up')");await sleep(80);assert.equal(await run('state.quick'),true);assert.equal(await run("document.querySelector('#morebtn').hidden"),false);await run("window.pet.command('more')");await sleep(80);assert.equal(await run('state.options'),true);assert.equal(await run("document.querySelector('#actions').hidden"),false);
   fs.writeFileSync(path.join(output,'actions.png'),(await window.webContents.capturePage()).toPNG());
   assert.equal(await run("document.querySelectorAll('#actions button').length"),6);
   await run("document.querySelector('[data-action=\"page:play\"]').click()");assert.equal(await run("document.querySelectorAll('#actions button').length"),5);
   await run("window.pet.command('close');window.pet.command('down')");await sleep(100);cursor.x+=100;await sleep(180);assert(await run('swing')>.01,'Dragging right must rotate the hanging body left about its top pivot');
   await run("window.pet.command('up')");await sleep(1500);assert(Math.abs(await run('swing'))<.03);
   for(const [command,expected]of [['jump','jump'],['flip','flip'],['dead','dead'],['idle','idle'],['wander','walk']]){await run(`window.pet.command('${command}')`);await sleep(80);assert.equal(await run('state.action'),expected);}
   for(const type of ['miso','ember','bumble','boo','drowsy','merlin']){
    await run(`window.pet.update({type:'${type}',scale:1.4})`);await sleep(35);assert.equal(await run('state.type'),type);
    assert.equal(await run('state.scale'),.9);
    await run("window.pet.command('special')");await sleep(40);assert.equal(await run('state.action'),({mochi:'hug',miso:'chase',sprig:'grow',drowsy:'yawn',ember:'micdrop',bumble:'pollinate',boo:'vanish',merlin:'spell',luffy:'gomu',byte:'pose'})[type]);
   }
   for(const scale of [.3,.9]){
    await run(`window.pet.update({type:'bumble',scale:${scale}})`);await run("window.pet.command('pet')");await sleep(100);
    const bottom=await run("document.querySelector('#speech').getBoundingClientRect().bottom");assert(Math.abs(bottom-(250+(20.88-40)*4*scale-10))<2);
    fs.writeFileSync(path.join(output,`bumble-${scale}.png`),(await window.webContents.capturePage()).toPNG());
   }
   await run("window.pet.update({type:'boo',scale:.65})");await sleep(100);fs.writeFileSync(path.join(output,'boo.png'),(await window.webContents.capturePage()).toPNG());
   await run("window._drawCount=0;window._draw=drawPet;drawPet=(...args)=>{window._drawCount++;return window._draw(...args)};void 0");await sleep(600);
   const draws=await run('window._drawCount');assert(draws>3&&draws<=21,`30 fps cap: ${draws} frames in 600 ms`);
   window.hide();await sleep(100);const hiddenFrames=await run('window._drawCount');await sleep(400);assert.equal(await run('window._drawCount'),hiddenFrames);window.showInactive();await sleep(100);
   await run('receive({...state,paused:true})');await sleep(150);const pausedFrames=await run('window._drawCount');await sleep(300);assert.equal(await run('window._drawCount'),pausedFrames);await run('window.pet.read().then(receive)');
   await run("window.pet.update({type:'merlin',scale:1})");await run("window.pet.command('settings')");await sleep(700);
   const settings=BrowserWindow.getAllWindows().find(w=>w!==window);assert(settings);const ui=code=>settings.webContents.executeJavaScript(code);
   assert.equal(await ui("document.querySelectorAll('[data-type]').length"),7);
   assert.equal(await ui("document.querySelector('#pet-name').textContent"),'Merlin');
   fs.writeFileSync(path.join(output,'wardrobe.png'),(await capture(settings)).toPNG());
   await ui("document.querySelector('[data-type=boo]').click()");await sleep(100);assert.equal(await run('state.type'),'merlin','Clicking a character only previews it');assert.equal(await ui("document.querySelector('#use-pet').hidden"),false);await ui("document.querySelector('#use-pet').click()");await sleep(150);assert.equal(await run('state.type'),'boo');
   await ui("document.querySelector('[data-tab=reminders]').click();document.querySelector('#reminder-text').value='Take a stretch';document.querySelector('#reminder-minutes').value='5';document.querySelector('#reminder-form').requestSubmit()");await sleep(100);
   assert.equal(await run('state.reminders.length'),1);assert.equal(JSON.parse(fs.readFileSync(path.join(output,'personality.json'),'utf8')).reminders.length,1);
   await ui("document.querySelector('.reminder button').click()");await sleep(100);assert.equal(await run('state.reminders.length'),0);
   assert.equal(await ui('previewTimer'),null);
   for(const unit of ['minutes','hours']){
    await ui(`document.querySelector('#reminder-mode').value='repeat';document.querySelector('#reminder-unit').value='${unit}';document.querySelector('#reminder-minutes').value='1';document.querySelector('#reminder-text').value='Recurring stretch';document.querySelector('#reminder-form').requestSubmit()`);await sleep(100);
    assert.equal(await run('state.reminders[0].intervalMs'),unit==='hours'?3600000:60000);
    await ui("document.querySelector('.reminder button').click()");await sleep(100);
   }
   await ui("document.querySelector('#reminder-mode').value='repeat';document.querySelector('#reminder-mode').dispatchEvent(new Event('change'));document.querySelector('#reminder-window-enabled').click();document.querySelector('#reminder-window-start').value='22:00';document.querySelector('#reminder-window-end').value='06:00';document.querySelector('#reminder-text').value='Night stretch';document.querySelector('#reminder-form').requestSubmit()");await sleep(150);
   assert.deepEqual(await run('state.reminders[0].window'),{start:'22:00',end:'06:00'});
   assert.equal(await ui("document.querySelector('#reminder-window-times').hidden"),false);
   assert((await ui("document.querySelector('.reminder small').textContent")).includes('22:00–06:00'));
   assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'personality.json'),'utf8')).reminders[0].window,{start:'22:00',end:'06:00'});
   await ui("document.querySelector('.reminder button').click()");await sleep(100);
   assert((await ui("window.pet.reminder({text:'Invalid window',minutes:1,recurring:true,window:{start:'25:00',end:'06:00'}})")).error);
   const bad=await ui("window.pet.reminder({text:'',minutes:-1})");assert(bad.error);
   await run("window.pet.command('idle')");assert.equal(await run('state.roaming'),false,'Stay here turns wandering off');await run("window.pet.command('wander')");assert.equal(await run('state.roaming'),true,'Explore turns wandering on');await run("window.pet.command('idle')");
   const boundsBefore=window.getBounds(),monitor=screen.getDisplayNearestPoint({x:boundsBefore.x+260,y:boundsBefore.y+250}).workArea;
   for(const edge of [monitor.x+35,monitor.x+monitor.width-35]){
    window.setPosition(Math.round(edge-260),Math.round(monitor.y+monitor.height/2-250));const before=window.getBounds();
    await run("window.pet.command('menu')");await sleep(250);const after=window.getBounds(),offset=await run('({x:state.petX,y:state.petY})');
    assert(Math.abs(before.x+260-after.x-offset.x)<2,'Opening menu must not shift the pet');
    assert.equal(await run("Array.from(document.querySelectorAll('#actions button')).every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=520&&r.top>=0&&r.bottom<=440})"),true);
    fs.writeFileSync(path.join(output,edge<monitor.x+monitor.width/2?'menu-left.png':'menu-right.png'),(await capture(window)).toPNG());
    await run("window.pet.command('close')");await sleep(450);
   }
   await run("window.pet.update({sounds:true,volume:.15})");await sleep(1000);
   assert.equal(await run("playPetSound({type:'miso',action:'happy',sounds:true,volume:.15,preview:true})"),true);
   assert.equal(await run("clipCache.get('miso').el.duration>.3"),true);assert.equal(await run('petAudio.state'),'running');await sleep(2600);assert.equal(await run('petAudio.state'),'suspended');
   assert.equal(await run("playPetSound({type:'merlin',sounds:false,volume:.15,preview:true})"),false);
   await run("window.pet.update({sounds:false})");
   await run("window.pet.command('attention')");await sleep(100);assert.equal(await run('state.action'),'beg');
   await run("window.pet.command('pet')");await sleep(100);assert.equal(await run('state.action'),'relax');
   if(screen.getAllDisplays().length>1){
    const {nextDisplay}=require('../src/brain.cjs');
    for(const type of ['merlin','boo']){
     await run(`window.pet.update({type:'${type}'})`);await sleep(100);await run("window.pet.command('idle')");await sleep(80);
     const bounds=window.getBounds(),origin=screen.getDisplayNearestPoint({x:bounds.x+260,y:bounds.y+250});
     if(type==='boo'){const a=origin.workArea,dir=await run('state.direction');window.setPosition(Math.round((dir>0?a.x+a.width-45:a.x+45)-260),Math.round(a.y+a.height/2-250));await run("window.pet.command('menu')");await sleep(80);await run("window.pet.command('close')");await sleep(450);}
     const destination=nextDisplay(screen.getAllDisplays(),origin.id,await run('state.direction'));
     await run("window.pet.command('visit')");await until(async()=>await run('state.action')===(type==='merlin'?'portalOut':'phase'));
     if(type==='merlin'){
      const portals=BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('portal.html'));assert.equal(portals.length,2);assert(portals.every(p=>p.isVisible()));await sleep(220);fs.writeFileSync(path.join(output,'portal.png'),(await capture(portals[0])).toPNG());
      assert.equal(new Set(portals.map(p=>{const b=p.getBounds();return screen.getDisplayNearestPoint({x:b.x+48,y:b.y+110}).id;})).size,2);
     }
     if(type==='merlin')await until(async()=>await run('state.action')==='portalIn');await until(async()=>await run('state.action')==='walk',12000);assert.equal(BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('portal.html')).length,0);
     const moved=window.getBounds();assert.equal(screen.getDisplayNearestPoint({x:moved.x+260,y:moved.y+250}).id,destination.id);
    }
   }
   assert.equal(errors.length,0,errors.join('\n'));
   const sheet=await run(`(()=>{
    const c=document.createElement('canvas');c.width=1000;c.height=660;const context=c.getContext('2d');context.fillStyle='#171b25';context.fillRect(0,0,c.width,c.height);
    const phases=[.12,.34,.5,.82,.99];
    ['jump','flip','dance'].forEach((action,row)=>phases.forEach((phase,col)=>{
     drawPet(context,{type:'miso',action,started:0,until:1500,direction:1},phase*2,phase*1.5,col*200+100,row*220+125,.85);
     context.fillStyle='#eee6ff';context.font='13px sans-serif';context.fillText(action+' · '+['prepare','launch','air / tuck','land','settle'][col],col*200+28,row*220+205);
    }));return c.toDataURL('image/png');
   })()`);
   fs.writeFileSync(path.join(output,'animation-poses.png'),Buffer.from(sheet.split(',')[1],'base64'));
   const profiles=await run(`(()=>{
    const c=document.createElement('canvas');c.width=1000;c.height=440;const context=c.getContext('2d');context.fillStyle='#171b25';context.fillRect(0,0,c.width,c.height);
    ['miso','ember','bumble','boo','drowsy','merlin'].forEach((type,i)=>{
     const x=(i%3)*330+165,y=Math.floor(i/3)*220+120;
     drawPet(context,{type,action:type==='ember'?'trident':'walk',started:0,until:5000,direction:1},1,1,x,y,.9);
     context.fillStyle='#eee6ff';context.font='13px sans-serif';context.fillText(type,x-25,y+98);
    });return c.toDataURL('image/png');
   })()`);
   fs.writeFileSync(path.join(output,'character-profiles.png'),Buffer.from(profiles.split(',')[1],'base64'));
   console.log('PASS: native window, seven characters, radial actions, jumps/flips/dead, wardrobe, saved settings, reminder creation/removal, attention positioning, physical monitor travel.');
   console.log('Physical monitor count:',screen.getAllDisplays().length);
   app.once('before-quit',event=>{event.preventDefault();setTimeout(()=>{assert(window.isDestroyed());console.log('PASS: closing the pet with settings open stops movement callbacks without a destroyed-window exception.');clearTimeout(watchdog);app.quit();},200);});
   window.destroy();
  }catch(e){console.error(e);clearTimeout(watchdog);app.exit(1);}
 });
});
require('../src/main.cjs');

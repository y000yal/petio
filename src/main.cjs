const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, Notification, powerMonitor } = require('electron');
const { characterLine, soundCaption } = require('./characters.js');
// Light on memory: software rendering is plenty for one small canvas and avoids a heavy GPU process; audio stays in-process.
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-features','AudioServiceOutOfProcess');
const path = require('node:path');
const fs = require('node:fs');
const appIcon = path.join(__dirname, 'assets/petio.png');
if (process.platform === 'win32') app.setAppUserModelId('studio.petio.desktop');
const { sanitize, choose, keepOnScreen, nextDisplay, dueReminders, normalizeWindow, nextWindowTime, nativePoint, ghostTravelPoint, types } = require('./brain.cjs');
let playing=false;
let win, settings, tray, timer, state, savePath, drag, travel, attentionHome, social;
if(process.env.PETIO_PROFILE){const profile=process.env.PETIO_PROFILE;if(!/^[a-z0-9-]{1,30}$/i.test(profile))throw new Error('Invalid test profile');const directory=path.join(app.getPath('appData'),'Petio-prototype-'+profile);fs.mkdirSync(directory,{recursive:true});app.setPath('userData',directory);}
let action = 'idle', started = Date.now(), until = 0, direction = 1, paused = false, options = false, composing = false, chatBox = null, meetUntil = 0;
let last = Date.now(), lastSave = 0, lastAttention = Date.now(), lastReminderCheck = 0, ignoringMouse, speechUntil=0, lastTrident=0;
let desiredPosition, logicalDisplayId, pointerCheck=0, petReady=false;
let petOffset={x:260,y:250};
const monitorHeights=new Map();
let nextScare=0,exciteLevel=0,awayAt=0,nextWater=0,lastLook='',closeTimer,quickUntil=0,viewBox={l:0,r:520,t:0,b:440},lastView='',menuSide='right',needLevel=0,needStep=0,needLine=0;
const hobbies=['coffee','phone','laptop','stretch','book','snack','juggle'];
const ownHobbies={miso:['groom','yarnplay','loaf'],ember:['marshmallow','tridentspin','flamejuggle'],bumble:['flower','honey','waggle'],boo:['peekaboo','lantern','spook'],drowsy:['nodoff','sheep','cocoa'],merlin:['cauldron','spellpractice','crystalball'],luffy:['sniff','tailchase','earscratch']};
// Mostly the character's own pastimes, sometimes a shared one.
const pickHobby=()=>{const own=ownHobbies[state.type]||[],pool=Math.random()<.7&&own.length?own:hobbies;return pool[Math.floor(Math.random()*pool.length)];};
let climb=0,vertical=false,vdir=1,lastWalk=0,turnAt=0,pendingTurn=null;
let portalWindows=[];
const reverseReasons=['Nah, not this way.','Wrong way! Turning around.','Hmm, too boring over here.','Forgot something back there!','Nope, changed my mind.'],sideReasons=['Ooh, something interesting that way!','Let me peek over there.','This way smells like adventure.','Shortcut!'];
const pick=list=>list[Math.floor(Math.random()*list.length)];
// Directions the walker can turn to from its current heading; the last entry is always turning back.
function turnWays(p,box){
 const ways=[];
 if(vertical){if(p.x>box.left+40)ways.push('left');if(p.x<box.right-40)ways.push('right');ways.push(vdir>0?'up':'down');}
 else{if(p.y>box.top+40)ways.push('up');if(p.y<box.bottom-40)ways.push('down');ways.push(direction>0?'left':'right');}
 return ways;
}
function setHeading(c){if(c==='left'||c==='right'){vertical=false;direction=c==='right'?1:-1;}else{vertical=true;vdir=c==='down'?1:-1;}climb=vertical?vdir:0;}
function cancelTravel(){if(travel&&alive())win.webContents.send('pet-clip',null);travel=null;for(const portal of portalWindows)if(!portal.isDestroyed())portal.destroy();portalWindows=[];}
let userCue=0; // set when you click something; Boo only makes noise for those, and only some of the time
function sound(action,preview=false,force=false,hasMessage=false){if(state.type==='boo'&&!force&&action!=='reminder'&&action!=='water'&&(Date.now()-userCue>500||Math.random()<.5))return;if(alive()&&state.sounds&&state.volume>0)win.webContents.send('pet-sound',{type:state.type,action,sounds:state.sounds,volume:state.volume,preview}); if(!hasMessage&&state.prompts&&alive()&&state.sounds&&state.volume>0&&!['reminder','water','menu'].includes(action))emit(soundCaption(state.type));}
const restSize = { width: 520, height: 440 }, chatSize = { width: 880, height: 640 };
const size = { width: restSize.width, height: restSize.height };
const preferences = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, autoplayPolicy:'no-user-gesture-required' };
function phrase(event='curious') { return characterLine(state.type,event); }
function save() { try { fs.writeFileSync(savePath + '.tmp', JSON.stringify(state)); fs.renameSync(savePath + '.tmp', savePath); } catch (e) { console.error('Could not save memory:', e.message); } }
function snapshot(message) { return { ...state, action, started, until, direction, paused, options, playing, message, petX:petOffset.x,petY:petOffset.y,travelContinuous:!!travel?.continuous,travelSplit:travel?.split||.5,climb:action==='walk'?climb:0,need:needLevel,excite:exciteLevel,screens:screen.getAllDisplays().length,quick:quickUntil>Date.now(),menuSide,meet:Date.now()<meetUntil,hidden: !alive() || !win.isVisible(), packaged: app.isPackaged, login: app.getLoginItemSettings().openAtLogin }; }
function ignoreMouse(ignore) { if(alive() && ignoringMouse!==ignore){win.setIgnoreMouseEvents(ignore,{forward:true});ignoringMouse=ignore;} }
function emit(message) { if(message)speechUntil=Date.now()+(action==='attention'?14000:5500);for (const w of [win, settings]) if (w && !w.isDestroyed()) w.webContents.send('pet-state', snapshot(message)); }
function act(next, duration = 5000, message, quiet=false) { pendingTurn=null;action = next; started = Date.now(); until = started + duration; emit(message);if(!quiet&&['happy','pet','jump','flip','dance','attention','trident','pounce','hover','vanish','spell','yawn','portalOut','sleep'].includes(next)&&alive()&&win.isVisible())sound(next,false,false,!!message); }
function alive() { return win && !win.isDestroyed(); }
function nativeAnchor() { const b = alive() ? win.getBounds() : { x: 0, y: 0 }; return { x: b.x + petOffset.x, y: b.y + petOffset.y }; }
function anchor() { return desiredPosition || nativeAnchor(); }
function syncDisplay(){logicalDisplayId=screen.getDisplayNearestPoint(nativePoint(anchor())).id;ignoringMouse=undefined;}
function move(p) {
 const point=nativePoint({x:p?.x-petOffset.x,y:p?.y-petOffset.y});if(!alive()||!point)return false;
 desiredPosition={x:p.x,y:p.y};
 const b=win.getBounds();
 // Fractional Windows DPI can round a 440-DIP surface to 441. Do not resize it every frame.
 if(Math.abs(b.width-size.width)>1||Math.abs(b.height-size.height)>1)win.setBounds({...point,...size});
 else if(b.x!==point.x||b.y!==point.y)win.setPosition(point.x,point.y);
 return true;
}
function constrain(p, display) {
 const safe=nativePoint(p)||nativePoint(nativeAnchor());
 display ||= screen.getDisplayNearestPoint(safe);p=safe;
 const a = state.zone||display.workArea, s = state.scale, clampR=(v,lo,hi)=>hi<lo?(lo+hi)/2:Math.max(lo,Math.min(hi,v));
 return { x: clampR(p.x,a.x + 65*s,a.x+a.width-65*s), y: clampR(p.y,a.y+100*s,a.y+a.height-100*s) };
}
// Window move and renderer repaint are separate steps, so hide the window for the few frames in between.
function shift(change){
 win.setOpacity(0);change();
 setTimeout(()=>{if(alive())win.setOpacity(1);},90);
}
function pushView(){
 if(!alive())return;
 const b=win.getBounds(),d=screen.getDisplayMatching(b).workArea,v={l:Math.max(0,d.x-b.x),r:Math.min(size.width,d.x+d.width-b.x),t:Math.max(0,d.y-b.y),b:Math.min(size.height,d.y+d.height-b.y),w:size.width,h:size.height},key=JSON.stringify(v);
 if(key===lastView)return;lastView=key;viewBox=v;win.webContents.send('pet-view',v);
}
function placeComposer(open){
 if(!alive())return;
 composing=open;
 ignoreMouse(!(open||options||drag||playing));
 const world=nativeAnchor();
 if(open){
  size.width=chatSize.width;size.height=chatSize.height;
  const area=state.zone||screen.getDisplayNearestPoint(nativePoint(world)).workArea;
  const side=area.x+area.width-world.x>=world.x-area.x?'right':'left';
  const desired={x:side==='right'?160:size.width-160,y:Math.round(size.height*.62)};
  const safe=keepOnScreen({x:world.x-desired.x,y:world.y-desired.y,width:size.width,height:size.height},area,size);
  const next={x:world.x-safe.x,y:world.y-safe.y};
  petOffset=next;move(world);emit();pushView();
 }else if(!options){
  chatBox=null;size.width=restSize.width;size.height=restSize.height;const at=nativeAnchor();petOffset={x:260,y:250};move(at);emit();pushView();
 }
}
function setOptions(open, immediate=false) {
 if (!alive()) return;
 clearTimeout(closeTimer);
 const world=nativeAnchor();options=open;
 if(open){cancelTravel();const area=state.zone||screen.getDisplayNearestPoint(nativePoint(world)).workArea,room={left:world.x-area.x,right:area.x+area.width-world.x,top:world.y-area.y,bottom:area.y+area.height-world.y};
  // Prefer the side with the most free space; the menu column is tall, so favour left/right.
  menuSide=Object.entries({left:room.left+90,right:room.right+90,top:room.top,bottom:room.bottom}).sort((p,q)=>q[1]-p[1])[0][0];
  const safe=keepOnScreen(win.getBounds(),screen.getDisplayNearestPoint(nativePoint(world)).workArea,size),next={x:world.x-safe.x,y:world.y-safe.y},apply=()=>{petOffset=next;move(world);ignoreMouse(false);act('happy',30000,undefined,true);};
  next.x!==petOffset.x||next.y!==petOffset.y?shift(apply):apply();sound('menu',true);}
 else{
  if(composing){emit();return;}
  const apply=()=>{const at=nativeAnchor();petOffset={x:260,y:250};move(at);emit();},moved=petOffset.x!==260||petOffset.y!==250;
  // Let the renderer play its closing animation before the window is moved back, otherwise the menu would blink out.
  if(!moved)apply();else if(immediate)shift(apply);else{emit();closeTimer=setTimeout(()=>{if(alive()&&!options)shift(apply);},340);}
 }
}
// A single click: the pet says something and offers a "…" button; the full menu only opens from that button.
function quickTalk(){
 userCue=Date.now();
 const events=['happy','curious','idle','special','jump','dance'];
 quickUntil=Date.now()+7000;paused=false;
 act('happy',2500,phrase(events[Math.floor(Math.random()*events.length)]));
}
// Screen awareness: comment on the app in front and tuck away during full-screen use. Only the app name and window title are read, in memory.
let awareHandle=null,lastCat=null,lastAppComment=0,hiddenByFull=false;const catAt=new Map();
function onAwareness(info){
 const cat=require('./appmood.cjs').classify(info.fg,process.pid),full=!!info.fg&&info.fg.fullscreen&&info.fg.pid!==process.pid&&(!cat||['video','game','meeting'].includes(cat)),now=Date.now(); // tuck away only for full-screen video, games and meetings; a maximized or full-screen browser/editor still shows the pet
 if(!alive())return;
 if(full&&win.isVisible()&&!hiddenByFull){hiddenByFull=true;if(options)setOptions(false,true);win.hide();}
 else if(!full&&hiddenByFull){hiddenByFull=false;win.showInactive();}
 if(cat&&cat!==lastCat&&!full&&state.prompts&&win.isVisible()&&!options&&!drag&&!travel&&!needLevel&&!['carried','sleep','dead','alert','beg'].includes(action)&&now-lastAppComment>60000&&now-(catAt.get(cat)||0)>480000){
  lastAppComment=now;catAt.set(cat,now);emit(phrase('app_'+cat));
 }
 lastCat=cat;
}
function applyAwareness(){
 const on=state.aware&&process.platform==='win32'&&!process.env.PETIO_SMOKE; // the smoke test must not react to whatever is on screen
 if(on&&!awareHandle)awareHandle=require('./awareness.cjs').start(onAwareness);
 else if(!on&&awareHandle){awareHandle.stop();awareHandle=null;if(hiddenByFull&&alive()){hiddenByFull=false;win.showInactive();}}
}
// Welcome back: excitement grows with how long you were away (screen locked / PC asleep), and a bigger greeting after a restart with launch-at-login on.
function welcome(level,line){
 if(!alive()||!win.isVisible()||hiddenByFull||needLevel||drag)return;
 cancelTravel();if(options)setOptions(false,true);quickUntil=0;exciteLevel=level;
 act('welcome',3500+level*1800,state.prompts?phrase(line):undefined);sound('happy',true);
}
function welcomeBack(awayMs){welcome(awayMs<600000?1:awayMs<7200000?2:3,awayMs<600000?'welcome_short':awayMs<7200000?'welcome_mid':'welcome_long');}
function welcomeBoot(){
 const h=new Date().getHours();welcome(3,h>=5&&h<11?'welcome_boot_morning':h<17?'welcome_boot_day':h<22?'welcome_boot_evening':'welcome_boot_night');
}
function watchPower(){
 const gone=()=>{if(!awayAt)awayAt=Date.now();},back=()=>{const d=awayAt?Date.now()-awayAt:0;awayAt=0;if(d>20000)setTimeout(()=>welcomeBack(d),900);};
 powerMonitor.on('lock-screen',gone);powerMonitor.on('suspend',gone);powerMonitor.on('unlock-screen',back);powerMonitor.on('resume',()=>setTimeout(back,1500));
}
// Windows notifications (opt-in): when one arrives the pet hops and shows a few words in its thought bubble; clicking the bubble opens the Windows notification panel for the rest.
let noticeHandle=null,noticeQueue=[],noticeTimer=null,lastNoticeApp=null;
function openNotificationPanel(){
 if(process.platform!=='win32')return;
 const ps=`Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, int f, int e);' -Name K -Namespace W;
$key = if([Environment]::OSVersion.Version.Build -ge 22000){0x4E}else{0x41}  # Win+N (Windows 11) or Win+A (Windows 10)
[W.K]::keybd_event(0x5B,0,0,0);[W.K]::keybd_event($key,0,0,0);[W.K]::keybd_event($key,0,2,0);[W.K]::keybd_event(0x5B,0,2,0)`;
 require('node:child_process').spawn('powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command',ps],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});
}
// Clicking a notification bubble opens the app that sent it (by its app id); the notification panel is the fallback.
function openNoticeApp(){
 const id=lastNoticeApp;
 if(process.platform!=='win32'||!id||!/^[\w.!{}-]+$/.test(id)||id.includes('..'))return openNotificationPanel();
 const child=require('node:child_process').spawn('explorer.exe',['shell:AppsFolder'+String.fromCharCode(92)+id],{windowsHide:true,stdio:'ignore'});
 child.on('error',()=>openNotificationPanel());
}
function drainNotices(){
 clearTimeout(noticeTimer);if(!noticeQueue.length)return;
 const busy=!alive()||!win.isVisible()||hiddenByFull||drag||needLevel||['carried','sleep','dead','alert','beg','welcome','scare','scratch'].includes(action);
 if(busy){noticeTimer=setTimeout(drainNotices,3000);return;}
 let item;
 if(noticeQueue.length>2){item={text:'📩 '+noticeQueue.length+' new notifications\n↗ Open notifications',aumid:''};noticeQueue=[];}
 else item=noticeQueue.shift();
 lastNoticeApp=item.aumid||null;
 if(options)emit(item.text);else act('ping',1100,item.text,true);sound('water',true);
 noticeTimer=setTimeout(drainNotices,7000);
}
function onNotice(n){
 if(/petio/i.test(n.aumid))return; // never echo our own reminders
 const clip=(s,k)=>s.length>k?s.slice(0,k-1)+'…':s,snippet=clip(n.lines.join(': '),48),label=/YourPhone/i.test(n.aumid)?'Phone Link':n.app;
 noticeQueue.push({text:'📩 '+n.app+'\n'+snippet+'\n↗ Open '+label,aumid:n.aumid});
 if(noticeQueue.length>6)noticeQueue.shift();
 drainNotices();
}
function applyNotifications(){
 const on=state.notify&&process.platform==='win32'&&!process.env.PETIO_SMOKE;
 if(on&&!noticeHandle)noticeHandle=require('./notifications.cjs').start(onNotice);
 else if(!on&&noticeHandle){noticeHandle.stop();noticeHandle=null;noticeQueue=[];}
}
// Character zone: the user draws a rectangle on screen; the pet then stays inside it.
let zoneWindows=[];
function pickZone(){
 return new Promise(resolve=>{
  let finished=false;
  const finish=rect=>{if(finished)return;finished=true;ipcMain.removeListener('zone-picked',onPicked);for(const w of zoneWindows)if(!w.isDestroyed())w.destroy();zoneWindows=[];resolve(rect);};
  const onPicked=(e,r)=>{
   const w=BrowserWindow.fromWebContents(e.sender);
   if(!r||!w||w.isDestroyed()||![r.x,r.y,r.width,r.height].every(Number.isFinite))return finish(null);
   const b=w.getBounds();finish({x:Math.round(b.x+r.x),y:Math.round(b.y+r.y),width:Math.round(r.width),height:Math.round(r.height)});
  };
  ipcMain.on('zone-picked',onPicked);
  for(const d of screen.getAllDisplays()){
   const w=new BrowserWindow({x:d.bounds.x,y:d.bounds.y,width:d.bounds.width,height:d.bounds.height,frame:false,transparent:true,resizable:false,movable:false,fullscreenable:false,skipTaskbar:true,hasShadow:false,alwaysOnTop:true,webPreferences:{preload:path.join(__dirname,'overlay-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
   w.setAlwaysOnTop(true,'screen-saver');secure(w);w.loadFile(path.join(__dirname,'overlay.html'));w.on('closed',()=>{if(!finished&&zoneWindows.every(z=>z.isDestroyed()))finish(null);});zoneWindows.push(w);
  }
  zoneWindows[0]&&zoneWindows[0].once('ready-to-show',()=>{});
  for(const w of zoneWindows)w.once('ready-to-show',()=>{w.show();w.focus();});
 });
}
// Scratching: moving the cursor back and forth over the character's head pets it (no button needed).
const scratch={x:0,y:0,dir:0,run:0,revs:[],lastMove:0,active:false,since:0,lastLine:0};
function endScratch(now){
 scratch.active=false;scratch.revs=[];scratch.dir=0;scratch.run=0;
 if(action==='scratch')act('relax',3000,state.prompts&&now-scratch.since>2500?phrase('relax'):undefined,true);
}
function scratchUpdate(c,hit,s,now,dt){
 const sc=scratch,inHead=c.x>hit.x-48*s&&c.x<hit.x+52*s&&c.y>hit.y-62*s&&c.y<hit.y+24*s;
 if(!inHead||drag||options||paused||!win.isVisible()){if(sc.active)endScratch(now);sc.dir=0;sc.revs=[];sc.x=c.x;sc.y=c.y;return;}
 const dx=c.x-sc.x,dy=c.y-sc.y,mv=Math.abs(dx)+Math.abs(dy);sc.x=c.x;sc.y=c.y;
 if(mv>=2){
  sc.lastMove=now;
  const d=Math.abs(dx)>=Math.abs(dy)?Math.sign(dx):Math.sign(dy)*10;
  if(sc.dir===0||d===sc.dir){sc.dir=d;sc.run+=mv;}else{if(sc.run>=7)sc.revs.push(now);sc.dir=d;sc.run=mv;}
 }
 sc.revs=sc.revs.filter(t=>now-t<1500);
 if(!sc.active){
  const blocked=['sleep','dead','carried','alert','welcome','scare','ping','drink','beg'].includes(action)&&!(action==='beg');
  if(sc.revs.length>=3&&!blocked){
   sc.active=true;sc.since=now;userCue=now;if(needLevel){needLevel=0;lastAttention=now;}
   act('scratch',3600000,state.prompts&&now-sc.lastLine>20000?phrase('happy'):undefined,true);sc.lastLine=now;sound('happy',true);
  }
 }else{
  state.bond=Math.min(100,state.bond+dt*.5);
  if(now-sc.lastMove>900)endScratch(now);
 }
}
function secure(w) { w.webContents.setWindowOpenHandler(() => ({ action: 'deny' })); w.webContents.on('will-navigate', e => e.preventDefault()); }
function closeGames(){if(!playing)return;playing=false;lastAttention=Date.now();setOptions(false);if(alive())act('idle',1500,undefined,true);}
function openGames(){if(social?.isAway())return;cancelTravel();drag=null;needLevel=0;attentionHome=null;playing=true;setOptions(true);const world=nativeAnchor(),area=screen.getDisplayNearestPoint(nativePoint(world)).workArea,safe=keepOnScreen({x:world.x-260,y:world.y-355},area,size);petOffset={x:world.x-safe.x,y:world.y-safe.y};move(world);act('gameThink',30000,undefined,true);}
function openSettings(tab = 'appearance', maximize = false) {
 closeGames();
 setOptions(false);
 if (settings && !settings.isDestroyed()) { settings.show(); settings.focus(); if(maximize)settings.maximize(); settings.webContents.send('settings-tab', tab); return; }
 settings = new BrowserWindow({ icon: appIcon, width: 1000, height: 780, minWidth: 740, minHeight: 620, backgroundColor: '#1c1814', autoHideMenuBar: true, title: 'Petio · Your little companion', webPreferences: preferences });
 if (process.platform === 'win32') settings.setAppDetails({ appId: 'studio.petio.desktop', appIconPath: app.isPackaged ? process.execPath : path.join(__dirname, '../build/petio.ico'), appIconIndex: 0, relaunchDisplayName: 'Petio' });
 secure(settings); settings.loadFile(path.join(__dirname, 'settings.html'));
 settings.webContents.once('did-finish-load', () => { emit(); if(maximize)settings.maximize(); settings.webContents.send('settings-tab', tab); });
 settings.on('closed', () => { settings = null; });
}
function attention(manual = false) {
 if (!alive()) return;
 if (needLevel||!manual && (!state.attention || paused || options || drag || travel || !win.isVisible() || action === 'sleep' || action === 'dead')) return;
 // Needy mode: stay put, jump and twirl, and get more desperate until petted.
 cancelTravel(); options = false; lastAttention = needStep = needLine = Date.now(); needLevel = 1; win.showInactive();
 act('beg', 3600000, state.prompts ? phrase('need1') : undefined, true); sound('attention', true);
}
function needier(now,hovering){
 // Hovering over the pet: it stops jumping and waits, wagging; leave without petting and it starts jumping again.
 if(hovering){needStep=Math.max(needStep,now-20000);if(action!=='expect')act('expect',3600000,undefined,true);return;}
 if(action==='expect'){act('beg',3600000,undefined,true);return;}
 if(now-needStep>25000&&needLevel<5){needLevel++;needStep=needLine=now;act('beg',3600000,state.prompts?phrase('need'+needLevel):undefined,true);sound('attention',true);}
 else if(action!=='beg'){act('beg',3600000,undefined,true);}
 else if(now-needLine>14000){needLine=now;if(state.prompts)emit(phrase('need'+needLevel));if(needLevel>=3)sound('attention',true);}
}
function travelTo(next) {
 if(travel||state.zone)return; // a zone keeps the pet on one screen
 const from=anchor(),a=next.workArea,current=screen.getAllDisplays().find(d=>d.id===logicalDisplayId)||screen.getDisplayNearestPoint(nativePoint(from)),source=current.workArea;
 monitorHeights.set(current.id,from.y);
 const to=constrain({x:direction>0?a.x+100*state.scale:a.x+a.width-100*state.scale,y:monitorHeights.get(next.id)??from.y},next);
 monitorHeights.set(next.id,to.y);
 travel={from,to,exit:{x:direction>0?source.x+source.width+70*state.scale:source.x-70*state.scale,y:from.y},entry:{x:direction>0?a.x-70*state.scale:a.x+a.width+70*state.scale,y:to.y},targetId:next.id,start:Date.now(),switched:false};
 if(state.type==='boo'){
  travel.continuous=Math.abs((direction>0?source.x+source.width:source.x)-(direction>0?a.x:a.x+a.width))<2&&Math.abs(from.y-to.y)<1;
  const outgoing=Math.abs(travel.exit.x-from.x),incoming=Math.abs(to.x-travel.entry.x);
  travel.split=outgoing/(outgoing+incoming);travel.duration=1000*(travel.continuous?Math.abs(to.x-from.x):outgoing+incoming)/state.speed;
 }
 if(state.type==='merlin'){
  const route=travel;route.pending=true;
  route.sourcePortal={x:direction>0?source.x+source.width-40*state.scale:source.x+40*state.scale,y:from.y};
  route.destinationPortal={x:direction>0?a.x+40*state.scale:a.x+a.width-40*state.scale,y:to.y};
  route.from={x:route.sourcePortal.x-direction*70*state.scale,y:from.y};
  move(route.from);
  const loading=[route.sourcePortal,route.destinationPortal].map(point=>{
   const portal=new BrowserWindow({...nativePoint({x:point.x-80,y:point.y-200}),width:160,height:400,frame:false,transparent:true,resizable:false,focusable:false,skipTaskbar:true,alwaysOnTop:state.alwaysOnTop,hasShadow:false,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
   portalWindows.push(portal);portal.setIgnoreMouseEvents(true);secure(portal);
   return portal.loadFile(path.join(__dirname,'portal.html'),{query:{scale:String(state.scale)}}).then(()=>{if(travel===route&&!portal.isDestroyed())portal.showInactive();});
  });
  Promise.all(loading).then(()=>{if(travel===route){route.pending=false;route.start=Date.now();act('portalOut',900,state.prompts?phrase('travel'):undefined);}}).catch(error=>{if(travel===route){console.warn('Portal unavailable:',error.message);move(route.to);logicalDisplayId=route.targetId;cancelTravel();act('idle');}});
  return;
 }
 act(state.type === 'boo' ? 'phase' : 'travel',travel.duration||1800,state.prompts?phrase('travel'):undefined);
}
function perform(command) {
 if (!alive()) return;
 userCue=Date.now();
 // The menu stays open after a choice; only movement commands (they take the pet away) close it.
 const keep=options&&['pet','jump','flip','dance','dead','idle','sleep','special'].includes(command);
 if(!keep){if(options)setOptions(false);options = false;}
 cancelTravel(); attentionHome = null; lastAttention = Date.now();
 // "Stay here" and "Explore" are the same switch as Settings > Wander around, so they always agree.
 if(command==='idle'||command==='wander'||command==='visit'){const want=command!=='idle';if(state.roaming!==want){state.roaming=want;save();}}
 if (command === 'settings' || command === 'reminder' || command === 'friends') return openSettings(command === 'reminder' ? 'reminders' : command === 'friends' ? 'friends-chat' : 'appearance', command === 'friends');
 if (command === 'attention') return attention(true);
 if(command==='special'){
  const special={miso:['chase','A dangling ball of yarn? This is definitely not a trap.'],drowsy:['yawn','That was a very productive yawn.'],ember:['micdrop','Ladies and gentlemen... me.'],bumble:['pollinate','Pollen run! Honey delivery coming up.'],boo:['vanish','Now you see me… boo!'],merlin:['spell','I summon a sprinkle of good luck.'],luffy:['gomu','Gomu Gomu no...']}[state.type];
  paused=false;act(special[0],special[0]==='chase'?8200:special[0]==='pollinate'?8500:special[0]==='micdrop'?7500:special[0]==='gomu'?4200:4000,phrase('special'));if(special[0]==='gomu'){sound('gomu',true,true,true);}if(special[0]==='gomu'){const punchStarted=started;setTimeout(()=>{if(action!=='gomu'||started!==punchStarted||!alive())return;if(state.prompts)emit('PISTOL!!');sound('gomu_hit',true,true,true);},1512);}return;
 }
 if (command === 'visit') { const d = nextDisplay(screen.getAllDisplays(), screen.getDisplayNearestPoint(nativePoint(anchor())).id, direction); if (d) travelTo(d); else act('curious', 4000, 'One screen today. More worlds another day!'); return; }
 const actions = { pet: ['pet',4500,phrase()], jump: ['jump',state.type==='luffy'?1800:1300,'Boing!'], flip: ['flip',state.type==='luffy'?2100:1500,'Watch my tiny stunt!'], dead: ['dead',12000,'Dramatic? Me? Never.'], dance: ['dance',6500,'A tiny dance, just for you.'], sleep: ['sleep',60000,'Saving my dreams...'], idle: ['idle',3600000,'I will stay right here.'], wander: ['walk',10000,'Time for a little expedition.'] };
 if (actions[command]) { paused = false; if (command === 'pet') {state.bond = Math.min(100,state.bond+2);if(needLevel){needLevel=0;lastAttention=Date.now();act('relax',5500,phrase('relax'));return;}} act(actions[command][0],actions[command][1],phrase(command==='pet'?'happy':command==='wander'?'walk':command)); save(); } else emit();
}
function menu() { return Menu.buildFromTemplate([
 { label: 'Petio · Settings & character wardrobe', click: () => openSettings() },
 { label: 'Friends & visits', click: () => openSettings('friends') },
 { label: social?.isAway() ? 'Recall travelling companion' : 'Companion is home', enabled:!!social?.isAway(), click: () => social.command({command:'recall'}) },
 { label: 'Reminders', click: () => openSettings('reminders') }, { type: 'separator' },
 { label: 'Come say hello', click: () => attention(true) }, { label: 'Visit next screen', click: () => perform('visit') },
 { label: paused ? 'Resume companion' : 'Pause companion', click: () => { paused=!paused; options=false; cancelTravel(); act('idle'); } },
 { label: win.isVisible() ? 'Hide companion' : 'Show companion', click: () => { options=false; drag=null; cancelTravel(); win.isVisible() ? win.hide() : win.showInactive(); } },
 { type: 'separator' }, { label: 'Quit Petio', click: () => app.quit() }
]); }
if (!app.requestSingleInstanceLock()) app.quit();
else {
 app.on('second-instance', () => { if (alive()) { win.showInactive(); openSettings(); } });
 app.whenReady().then(() => {
 if(process.argv.includes('--dev')){ // reload windows on UI edits; tools/dev.cjs restarts on main-process edits
  let hot;fs.watch(__dirname,(_e,file)=>{if(/^(main|preload|brain|awareness|appmood|notifications|overlay-preload)\.cjs$|^characters\.js$/.test(file||''))return;clearTimeout(hot);hot=setTimeout(()=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.reloadIgnoringCache();},150);});
 }

  savePath=path.join(app.getPath('userData'),'personality.json');
  try { state=sanitize(JSON.parse(fs.readFileSync(savePath,'utf8')) ?? {}); } catch { state=sanitize(); }
  win=new BrowserWindow({ icon:appIcon, ...size, frame:false, transparent:true, resizable:false, maximizable:false, fullscreenable:false, skipTaskbar:true, alwaysOnTop:state.alwaysOnTop, show:false, hasShadow:false, webPreferences:preferences });
  win.on('closed',()=>{clearInterval(timer);drag=null;cancelTravel();win=null;app.quit();});
  win.on('blur',()=>{if(options&&!drag&&!playing)setOptions(false);});win.on('hide',()=>emit());win.on('show',()=>{if(social?.isAway()){win.hide();return;}ignoringMouse=undefined;ignoreMouse(false);emit();});
  secure(win);win.webContents.on('did-finish-load',()=>{win.webContents.setZoomFactor(1);win.webContents.setVisualZoomLevelLimits(1,1);});win.loadFile(path.join(__dirname,'index.html'));
  const primary=screen.getPrimaryDisplay(),a=primary.workArea;logicalDisplayId=primary.id;move(constrain({ x:a.x+a.width-200, y:a.y+a.height-160 }));
  win.webContents.once('did-finish-load', () => { if(alive()){petReady=true;win.showInactive();// Launched at login, or soon after the PC booted with launch-at-login on: a big excited hello instead of the usual one.
   const booted=app.isPackaged&&app.getLoginItemSettings().openAtLogin&&(process.argv.includes('--autostart')||require('node:os').uptime()<900);
   if(booted)setTimeout(welcomeBoot,1200);else act('happy',6500,phrase('happy')+'\nClick for activities. Drag to move.');} });
  tray=new Tray(nativeImage.createFromPath(appIcon).resize({width:32,height:32})); tray.setToolTip('Petio · Your little companion');
  tray.on('click',()=>tray.popUpContextMenu(menu())); tray.on('right-click',()=>tray.popUpContextMenu(menu()));
  const trusted=e=>alive()&&(e.sender===win.webContents||(settings&&!settings.isDestroyed()&&e.sender===settings.webContents));
  ipcMain.handle('pet-read',e=>trusted(e)?snapshot():null);
  social=require('./social.cjs').startSocial({directory:app.getPath('userData'),readPet:()=>state,
   readHost:()=>{const p=nativeAnchor();return {type:state.type,x:p.x,y:p.y,scale:state.scale,busy:!!(options||composing||drag||playing||travel)||['sleep','dead','beg','carried','gameThink'].includes(action)||!alive()||!win.isVisible()};},
   onNotice:n=>{
    if(!n||typeof n.name!=='string')return;
    const {notePlain}=require('./note-gifs.js');
    const spoken=n.kind==='message'&&typeof n.text==='string'?notePlain(n.text):'';
    const text=n.kind==='join'?n.name+' joined your group':spoken?n.name+': '+(spoken.length>140?spoken.slice(0,139)+'…':spoken):'';
    if(!text)return;
    if(Notification.isSupported())new Notification({title:n.kind==='message'?n.name:'Petio',body:n.kind==='message'?spoken:text,icon:appIcon}).show();
    const bubble=n.kind==='message'?n.name+': '+n.text:text;
    if(alive()&&win.isVisible()&&!travel&&!drag&&!playing&&action!=='portalOut')act('happy',n.kind==='message'?9000:7000,bubble);
   },
   onPlay:(guest,side)=>{if(!alive()||!win.isVisible()||options||drag||playing||travel||['sleep','dead','beg','carried','gameThink','portalOut','portalIn'].includes(action))return;const duo=require('./pairs.js').pairPlay(state.type,guest);direction=side>0?-1:1;meetUntil=Date.now()+3400;act(duo.host,3400,undefined,true);},
   setAway:async away=>{cancelTravel();drag=null;options=false;needLevel=0;if(away&&alive()){
    closeGames();
    act('portalOut',850,'Off to visit a friend! ✨');
    const p=anchor(),point=nativePoint({x:p.x-48,y:p.y-110});
    const portal=new BrowserWindow({...point,width:96,height:220,frame:false,transparent:true,resizable:false,skipTaskbar:true,alwaysOnTop:true,show:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,'overlay-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    secure(portal);await portal.loadFile(path.join(__dirname,'portal.html'),{query:{scale:String(state.scale)}}).catch(()=>{});if(!portal.isDestroyed())portal.showInactive();
    await new Promise(resolve=>setTimeout(resolve,850));if(!portal.isDestroyed())portal.destroy();if(alive())win.hide();
   }else if(alive()&&!hiddenByFull)win.showInactive();},
   returned:message=>{if(alive())act('happy',8000,message);},
   onState:value=>{if(settings&&!settings.isDestroyed())settings.webContents.send('social-state',value);if(alive())win.webContents.send('social-state',value);}
  });
  ipcMain.handle('social-read',e=>trusted(e)?social.state():null);
  ipcMain.handle('social-command',(e,data)=>trusted(e)?social.command(data):{error:'Untrusted request.'});
  ipcMain.on('pet-composer',(e,open)=>{if(!alive()||e.sender!==win.webContents||typeof open!=='boolean'||open===composing)return;placeComposer(open);});
  ipcMain.on('pet-composer-box',(e,box)=>{if(!alive()||e.sender!==win.webContents)return;chatBox=box&&[box.x,box.y,box.w,box.h].every(Number.isFinite)?box:null;});
  ipcMain.handle('pet-settings',(e,patch)=>{
   if(!trusted(e)||!patch||typeof patch!=='object')return null;
   const allowed=['type','scale','speed','personality','roaming','alwaysOnTop','attention','attentionMinutes','menuSize','lookAt','aware','notify','water','waterMinutes','prompts','crossScreens','sounds','volume'];
   const safe=Object.fromEntries(allowed.filter(k=>Object.hasOwn(patch,k)).map(k=>[k,patch[k]]));
   state=sanitize({...state,...safe}); applyAwareness(); applyNotifications(); nextWater=0; nextScare=0; cancelTravel(); attentionHome=null; lastAttention=Date.now();
   win.setAlwaysOnTop(state.alwaysOnTop); move(constrain(anchor()));syncDisplay();monitorHeights.clear();
   if(typeof patch.login==='boolean'&&app.isPackaged)app.setLoginItemSettings({openAtLogin:patch.login,args:['--autostart']});
   save(); act('happy',2500); return snapshot();
  });
  ipcMain.on('pet-preview-sound',(e,type)=>{if(types.includes(type)&&alive()&&state.sounds&&state.volume>0)win.webContents.send('pet-sound',{type,action:'happy',sounds:state.sounds,volume:state.volume,preview:true});});
  ipcMain.handle('pet-zone-set',async()=>{
   if(options)setOptions(false,true);
   const rect=await pickZone();
   if(rect){state.zone=rect;state.crossScreens=false;cancelTravel();monitorHeights.clear();save();logicalDisplayId=screen.getDisplayMatching(rect).id;move(constrain(anchor()));act('happy',3500,state.prompts?'This is my zone now! I will stay in here.':undefined);}
   return snapshot();
  });
  ipcMain.handle('pet-zone-clear',()=>{state.zone=null;save();emit();return snapshot();});
  ipcMain.handle('pet-reminder',(e,data)=>{
   if(!trusted(e)||!data)return {error:'Invalid request.'};
   if(typeof data.remove==='string')state.reminders=state.reminders.filter(r=>r.id!==data.remove);
   else {
    const text=typeof data.text==='string'?data.text.trim():'',minutes=Number(data.minutes);
    if(!text||text.length>140||!Number.isFinite(minutes)||minutes<1||minutes>10080||state.reminders.length>=50)return {error:'Use 1–10,080 minutes and a message up to 140 characters (maximum 50 reminders).'};
    const window=data.recurring===true?normalizeWindow(data.window):null;
    if(data.window&&!window)return {error:'Choose different start and end times in 24-hour HH:mm format.'};
    state.reminders.push({id:require('node:crypto').randomUUID(),text,due:nextWindowTime(Date.now()+minutes*60000,window),intervalMs:data.recurring===true?minutes*60000:0,window});
   }
   save();emit();return {ok:true};
  });
  ipcMain.on('game-close',e=>{if(trusted(e)&&e.sender===win?.webContents)closeGames();});
  ipcMain.on('game-phase',(e,phase)=>{if(!playing||e.sender!==win?.webContents||!['think','reveal','place'].includes(phase))return;act(phase==='think'?'gameThink':phase==='reveal'?'gameReveal':'gamePlace',phase==='think'?30000:900,undefined,true);});
  ipcMain.on('game-result',(e,result)=>{if(!playing||e.sender!==win?.webContents||!['pet','player','draw'].includes(result))return;act(result==='pet'?'happy':result==='player'?'gameLose':'gameDraw',2200,undefined,true);sound(result==='pet'?'happy':'menu',true);});
  ipcMain.on('pet-command',(e,command)=>{
   if(!trusted(e))return;
   if(command==='games'){openGames();return;}
   if(command==='sound-test'){sound('happy',true,true);return;}
   if(command==='notifications'){openNoticeApp();return;}
   if(command==='menu'){if(playing){closeGames();return;}drag=null;quickUntil=0;setOptions(!options);return;}
   if(command==='more'){drag=null;quickUntil=0;if(!options)setOptions(true);return;}
   if(command==='close'){closeGames();setOptions(false);return;}
   if(command==='down'||command==='carry'){if(playing)return;cancelTravel();attentionHome=null;lastAttention=Date.now();const p=screen.getCursorScreenPoint(),b=win.getBounds();drag={x:p.x-b.x,y:p.y-b.y,startX:p.x,startY:p.y,previousX:p.x,previousY:p.y,moved:false,quiet:command==='carry'};act('carried',60000);return;}
   if(command==='up'){if(!drag)return;const moved=drag.moved,quiet=drag.quiet;drag=null;syncDisplay();monitorHeights.clear();win.webContents.send('pet-motion',{x:0,y:0});if(moved)act('land',600,phrase('land'));else if(quiet)act('idle',3000,undefined,true);else{state.bond=Math.min(100,state.bond+1);options?setOptions(false):quickTalk();}return;}
   perform(command);
  });
  for(const event of ['display-removed','display-metrics-changed'])screen.on(event,()=>{if(alive()){cancelTravel();move(constrain(anchor()));syncDisplay();monitorHeights.clear();}});
  const tick=()=>{
   if(!alive()){clearInterval(timer);return;}
   const now=Date.now(),dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;
   if(petReady&&!social?.isAway()&&now-lastReminderCheck>=1000){
    lastReminderCheck=now;
    const reminders=dueReminders(state.reminders,now);
    if(reminders.changed){state.reminders=reminders.pending;save();emit();}
    if(reminders.due.length){closeGames();const message=reminders.due.map(r=>r.text).join('\n');cancelTravel();options=false;win.showInactive();act('alert',15000,'🔔 '+phrase('reminder')+'\n'+message);sound('reminder',true);}
   }
   if(now-lastSave>60000){save();lastSave=now;}
   if(social?.isAway()||!win.isVisible())return;
   pushView();
   const c=screen.getCursorScreenPoint(),p=anchor(),hit=nativeAnchor(),s=state.scale;
   scratchUpdate(c,hit,s,now,dt);
   // Head and eyes follow the pointer when it is close enough to the pet.
   {const dx=c.x-hit.x,dy=c.y-(hit.y-20*s),near=state.lookAt&&Math.hypot(dx,dy)<Math.max(260,480*s),look=near?{x:Math.round(Math.max(-1,Math.min(1,dx/110))*20)/20,y:Math.round(Math.max(-1,Math.min(1,dy/110))*20)/20}:null,key=look?look.x+','+look.y:'';
    if(key!==lastLook){lastLook=key;win.webContents.send('pet-look',look);}}
   const bubbleBottom=({miso:21.9,ember:20.1,bumble:20.88,boo:16.2,drowsy:21.24,merlin:10.24,luffy:24}[state.type]-40)*4*s-10;
   if(quickUntil&&now>quickUntil){quickUntil=0;emit();}
   const moreOff=Math.round(60*s+14)+28,moreDir=petOffset.x+moreOff+22<=viewBox.r?1:-1,overMore=quickUntil>0&&!options&&Math.hypot(c.x-(hit.x+moreDir*moreOff),c.y-(hit.y-10))<26;
   const overButton=overMore;
   const overBubble=overButton||now<speechUntil&&Math.abs(c.x-hit.x)<115&&c.y>hit.y+bubbleBottom-100&&c.y<hit.y+bubbleBottom+8;
   const hitWidth=Math.max(38,100*s),hitTop=['jump','flip','pounce','chase','alert','beg'].includes(action)?220*s:135*s;
   if(now-pointerCheck>=50||drag||options||composing){pointerCheck=now;const wb=win.getBounds(),overChat=!!(chatBox&&c.x>=wb.x+chatBox.x&&c.x<=wb.x+chatBox.x+chatBox.w&&c.y>=wb.y+chatBox.y&&c.y<=wb.y+chatBox.y+chatBox.h),overPet=Math.abs(c.x-hit.x)<hitWidth&&c.y>hit.y-hitTop&&c.y<hit.y+115*s;ignoreMouse(!((composing&&(!chatBox||overChat))||options||drag||playing||overBubble||overPet));}
   if(drag){if(!drag.moved&&Math.hypot(c.x-drag.startX,c.y-drag.startY)>5){
    drag.moved=true;
    if(options){const rel={x:drag.x-petOffset.x,y:drag.y-petOffset.y};setOptions(false,true);drag.x=rel.x+petOffset.x;drag.y=rel.y+petOffset.y;} // dragging closes the menu; keep the grab point on the pet
   }win.webContents.send('pet-motion',{x:(c.x-drag.previousX)/Math.max(dt,.001),y:(c.y-drag.previousY)/Math.max(dt,.001)});drag.previousX=c.x;drag.previousY=c.y;move(constrain({x:c.x-drag.x+petOffset.x,y:c.y-drag.y+petOffset.y}));return;}
   // After a trick, every character says something about how it went.
   if(now>until&&action==='ping'){act('idle',3000,undefined,true);return;}
   if(now>until&&action==='scare'){act('idle',3000,state.prompts?phrase('after_scare'):undefined);return;}
   if(now>until&&action==='welcome'){exciteLevel=0;act('idle',3000,undefined,true);return;}
   if(now>until&&action==='drink'){act('idle',3500,state.prompts&&Math.random()<.6?phrase('water_done'):undefined);return;}
   if(now>until&&['jump','flip','dance','dead'].includes(action)){
    const drowsy=state.type==='drowsy',event=drowsy&&action==='jump'?'tired':drowsy&&action==='flip'?'quit':'after_'+action;
    if(drowsy&&(action==='jump'||action==='flip'))state.energy=Math.max(0,state.energy-(action==='flip'?3:6));
    act('idle',4500,state.prompts?phrase(event):undefined);return;
   }
   if(options&&now>until&&action!=='happy'&&!playing)act('happy',30000,undefined,true); // menu still open: settle back to a calm pose
   if(paused||options||playing)return;
   if(travel){
    if(travel.pending)return;
    const progress=(now-travel.start)/(travel.duration||1800);
    if(state.type==='merlin'){
     // The pet slides fully through each portal plane; the renderer hides whatever is past it.
     const m=direction*115*state.scale,out=progress<.5;
     if(out){const f=Math.min(1,progress*2),px=travel.sourcePortal.x+m,x=travel.from.x+(px-travel.from.x)*f;move({x,y:travel.from.y});win.webContents.send('pet-clip',{dx:travel.sourcePortal.x-x,keepLeft:direction>0});}
     else{if(!travel.switched){travel.switched=true;act('portalIn',900);}const f=Math.min(1,(progress-.5)*2),px=travel.destinationPortal.x-m,x=px+(travel.to.x-px)*f;move({x,y:travel.to.y});win.webContents.send('pet-clip',{dx:travel.destinationPortal.x-x,keepLeft:direction<0});}
    }
    else if(state.type==='boo')move(ghostTravelPoint(travel,progress));
    else if(progress>=.5&&!travel.switched){move(travel.to);travel.switched=true;act(state.type==='merlin'?'portalIn':'travel',900);}
    if(progress>=1){move(travel.to);logicalDisplayId=travel.targetId;cancelTravel();act('walk',8000);}return;
   }
   // Boo springs a scare every so often: lurks, pops out with a BOO! and plays its voice.
   if(state.type==='boo'){
    if(!nextScare)nextScare=now+(6+Math.random()*8)*60000;
    else if(now>=nextScare){
     const free=!options&&!needLevel&&!travel&&!hiddenByFull&&!['carried','sleep','dead','alert','beg','drink','scare','scratch'].includes(action);
     if(!free)nextScare=now+30000;
     else{nextScare=now+(8+Math.random()*12)*60000;act('scare',2600,state.prompts?'BOO!':undefined,true);setTimeout(()=>{if(action==='scare')sound('scare',true,true,true);},1250);return;}
    }
   }
   // Water sips: a short drink at slightly random times through the day (average = waterMinutes), never a strict timer.
   if(state.water){
    if(!nextWater)nextWater=now+state.waterMinutes*60000*(.6+Math.random()*.8);
    else if(now>=nextWater){
     const free=!options&&!needLevel&&!travel&&!hiddenByFull&&!['carried','sleep','dead','alert','beg','drink','chase','pounce','scratch'].includes(action);
     if(!free)nextWater=now+30000;
     else{nextWater=now+state.waterMinutes*60000*(.6+Math.random()*.8);act('drink',4600,state.prompts?phrase('water'):undefined,true);sound('water',true);return;}
    }
   }
   if(needLevel&&action!=='alert'){needier(now,!drag&&Math.abs(c.x-hit.x)<Math.max(38,100*s)&&c.y>hit.y-135*s&&c.y<hit.y+115*s);return;}
   if(!needLevel&&now-lastAttention>state.attentionMinutes*60000)attention();
   if(needLevel)return;
   state.energy=Math.max(0,Math.min(100,state.energy+dt*(action==='sleep'?1.2:-.075)));
   if(pendingTurn){
    if(now<until)return;
    const c=pendingTurn.choice,back=pendingTurn.back;pendingTurn=null;
    setHeading(c);act('walk',5000+Math.random()*5000,state.prompts?(back?pick(reverseReasons)+' ':'')+'Going '+c+'!':undefined);lastWalk=started;turnAt=now+4000;return;
   }
    // drowsy is wiped out after every hop
   if(now>until){
    let next=choose(state);
    if(!state.roaming&&next==='walk')next='idle';
    if(next==='trident'){if(now-lastTrident<45000)next='curious';else lastTrident=now;}
    if(next==='idle'&&Math.random()<.75)next=pickHobby();
    const hobby=hobbies.includes(next)||(ownHobbies[state.type]||[]).includes(next);
    act(next,next==='sleep'?20000:next==='trident'?5000:hobby?8000+Math.random()*6000:4000+Math.random()*5000,state.prompts?(next==='curious'?phrase():next==='trident'?phrase('special'):hobby&&Math.random()<.7?phrase(next):undefined):undefined);
    if(next==='spook')sound('spook',true,true,false); // Boo practising its scary voice
   }
   if(action==='walk'&&!state.roaming){act('idle',4000,undefined,true);return;} // wandering was switched off
   if(action==='walk'){
    const display=screen.getAllDisplays().find(d=>d.id===logicalDisplayId)||screen.getDisplayNearestPoint(nativePoint(p)),a=state.zone||display.workArea,k=state.type==='drowsy'?.12:1,step=state.speed*k*dt;
    if(lastWalk!==started){lastWalk=started;turnAt=now+3000+Math.random()*4000;vertical=Math.random()<.35;direction=Math.random()<.5?1:-1;vdir=Math.random()<.5?1:-1;climb=vertical?vdir:0;emit();}
    if(now>turnAt){
     turnAt=now+4000+Math.random()*7000;
     if(Math.random()<.45){const ways=turnWays(p,{left:a.x+65*s,right:a.x+a.width-65*s,top:a.y+100*s,bottom:a.y+a.height-100*s}),c=pick(ways);setHeading(c);emit(state.prompts?pick(c===ways.at(-1)?reverseReasons:sideReasons):undefined);}
    }
    // Move along one axis at a time; at a wall stop, think out loud and pick a new way.
    const left=a.x+65*s,right=a.x+a.width-65*s,top=a.y+100*s,bottom=a.y+a.height-100*s;
    const target=vertical?{x:p.x,y:p.y+vdir*step}:{x:p.x+direction*step,y:p.y};
    if(target.x<left||target.x>right||target.y<top||target.y>bottom){
     const next=!vertical&&state.crossScreens&&!state.zone&&nextDisplay(screen.getAllDisplays(),display.id,direction);
     if(next)travelTo(next);
     else{
      move({x:Math.max(left,Math.min(right,target.x)),y:Math.max(top,Math.min(bottom,target.y))});
      const options=turnWays(p,{left,right,top,bottom});
      const list=options.length>1?options.slice(0,-1).join(', ')+' or '+options.at(-1):options[0];
      climb=0;
      act('curious',2200,state.prompts?['Hmm… '+list+'?','Which way? '+list+'?','Let me think… '+list+'.'][Math.floor(Math.random()*3)]:undefined);
      const choice=pick(options);pendingTurn={choice,back:choice===options.at(-1)};
     }
    }
    else move(target);
   }
  };
  const runTick=()=>{tick();if(alive())timer=setTimeout(runTick,!win.isVisible()?1000:paused?75:1000/30);};runTick();
  applyAwareness();applyNotifications();watchPower();
 });
 app.on('before-quit',()=>{social?.stop();if(awareHandle)awareHandle.stop();if(noticeHandle)noticeHandle.stop();clearInterval(timer);cancelTravel();if(state)save();});
 app.on('window-all-closed',()=>app.quit());
}

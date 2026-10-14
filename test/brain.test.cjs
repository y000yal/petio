const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitize, choose, keepOnScreen, nextDisplay, dueReminders, types } = require('../src/brain.cjs');
test('saved state migrates away from NULL and validates new controls',()=>{
 const state=sanitize({type:'null',energy:-30,bond:900,scale:999,speed:-20,attentionMinutes:0,personality:'broken'});
 assert.equal(state.type,'miso');assert.equal(state.energy,0);assert.equal(state.bond,100);assert.equal(state.scale,.9);assert.equal(state.speed,20);assert.equal(state.attentionMinutes,1);assert.equal(state.personality,'curious');assert.equal(types.length,7);assert(!types.includes('null'));
});
test('low energy forces rest',()=>assert.equal(choose({energy:5,personality:'mischievous'},()=>.8),'sleep'));
test('disabled roaming never selects walking',()=>{for(let i=0;i<100;i++)assert.notEqual(choose({energy:90,roaming:false},()=>i/100),'walk');});
test('negative monitor coordinates and taskbar work areas are respected',()=>assert.deepEqual(keepOnScreen({x:-2200,y:1200},{x:-1920,y:0,width:1920,height:1040},{width:240,height:260}),{x:-1920,y:780}));
test('monitor route supports negative, vertical and wraparound layouts',()=>{
 const d=[{id:1,workArea:{x:0,y:0}},{id:2,workArea:{x:-1920,y:0}},{id:3,workArea:{x:0,y:1080}}];
 assert.equal(nextDisplay(d,2,1).id,1);assert.equal(nextDisplay(d,1,1).id,3);assert.equal(nextDisplay(d,3,1).id,2);assert.equal(nextDisplay(d,1,-1).id,2);assert.equal(nextDisplay([d[0]],1,1),null);
});
test('all overdue reminders are delivered once, future ones remain',()=>{
 const reminders=[{id:'a',due:90},{id:'b',due:100},{id:'c',due:101}];const first=dueReminders(reminders,100);assert.deepEqual(first.due.map(r=>r.id),['a','b']);assert.deepEqual(dueReminders(first.pending,100).due,[]);
});
test('malformed reminders cannot break startup',()=>assert.deepEqual(sanitize({reminders:[null,{id:'a',text:'ok',due:'oops'},{id:'b',text:'Drink water',due:123}]}).reminders,[{id:'b',text:'Drink water',due:123,intervalMs:0,window:null}]));


test('minute and hourly repeats coalesce missed occurrences and retain cadence',()=>{
 for(const intervalMs of [60000,3600000]){
  const reminder={id:'repeat',text:'Stretch',due:1000,intervalMs};
  const now=1000+intervalMs*5+123,result=dueReminders([reminder],now);
  assert.equal(result.due.length,1);assert.equal(result.pending[0].due,1000+intervalMs*6);
  assert.equal(dueReminders(result.pending,now).due.length,0);
  assert.equal(dueReminders(result.pending,result.pending[0].due).due.length,1);
 }
});
test('sizes are clamped at both ends and invalid repeat intervals are disabled',()=>{
 assert.equal(sanitize({scale:.01}).scale,.3);assert.equal(sanitize({scale:4}).scale,.9);
 assert.equal(sanitize({reminders:[{id:'x',text:'Hi',due:10,intervalMs:-1}]}).reminders[0].intervalMs,0);
});
test('drag spring follows direction, stays bounded, and settles after release',()=>{
 const {advanceSwing}=require('../src/physics.js');let s={swing:0,velocity:0};
 for(let i=0;i<30;i++)s=advanceSwing(s.swing,s.velocity,-.6,1/30);
 assert(s.swing<-.4&&s.swing>-.7);
 for(let i=0;i<150;i++)s=advanceSwing(s.swing,s.velocity,0,1/30);
 assert(Math.abs(s.swing)<.001);assert(Math.abs(s.velocity)<.001);
 for(let i=0;i<60;i++)s=advanceSwing(s.swing,s.velocity,i%2?.6:-.6,.1);
 assert(Number.isFinite(s.swing));assert(Math.abs(s.swing)<1);
});
test('jump and flip include crouch, airtime, landing compression and recovery',()=>{
 const {actionPose}=require('../src/poses.js');
 for(const action of ['jump','flip']){
  const crouch=actionPose(action,.15,0,'plain'),air=actionPose(action,.48,0,'plain'),landing=actionPose(action,.82,0,'plain'),rest=actionPose(action,1,0,'plain');
  assert(crouch.bend>0&&crouch.squash<1&&crouch.y===0);
  assert(air.y<-20&&air.leftArm>0&&air.face==='surprised');
  assert(landing.bend>0&&landing.squash<1);assert.equal(rest.squash,1);assert.equal(rest.bend,0);assert.equal(rest.y,0);
 }
 assert.equal(actionPose('flip',1,0,'plain').rotation,Math.PI*2);
 assert.equal(actionPose('flip',.48,0,'miso').size,.5); // miso tucks to half size mid-roll
 assert.equal(actionPose('flip',1,0,'miso').size,1);
 const a=actionPose('dance',.5,.2),b=actionPose('dance',.5,.6);assert.notEqual(a.leftArm,b.leftArm);assert.notEqual(a.leftFoot,b.leftFoot);
});
test('Ember occasionally summons a trident, but rests when exhausted',()=>{
 assert.equal(choose({type:'ember',energy:80},()=>.1),'trident');assert.equal(choose({type:'ember',energy:5},()=>.1),'sleep');
 assert.notEqual(choose({type:'miso',energy:80},()=>.1),'trident');
});
test('native coordinates normalize negative zero and reject invalid values',()=>{
 const {nativePoint}=require('../src/brain.cjs');
 assert.deepEqual(nativePoint({x:-.2,y:-.1}),{x:0,y:0});assert(!Object.is(nativePoint({x:-.2,y:0}).x,-0));
 assert.equal(nativePoint({x:NaN,y:0}),null);assert.equal(nativePoint({x:Infinity,y:0}),null);assert.equal(nativePoint({x:1e20,y:0}),null);
});
test('ghost wrap goes out through one edge and enters the other without sweeping the desktop',()=>{
 const {ghostTravelPoint}=require('../src/brain.cjs');const route={from:{x:5700,y:500},exit:{x:5900,y:500},entry:{x:-2000,y:700},to:{x:-1850,y:700}};
 assert(ghostTravelPoint(route,.25).x>5700);assert(ghostTravelPoint(route,.75).x<-1850);assert.equal(ghostTravelPoint(route,.49).y,500);assert.equal(ghostTravelPoint(route,.51).y,700);assert.deepEqual(ghostTravelPoint(route,1),route.to);
});
test('dialogue has four unique variations per character and activity without immediate repeats',()=>{
 const {characterVoices,characterLine,characterLabels}=require('../src/characters.js');const corpus=new Set();
 assert.deepEqual(Object.keys(characterVoices).sort(),[...types].sort());
 for(const [type,voice]of Object.entries(characterVoices)){
  assert.equal(Object.keys(characterLabels(type)).length,7);
  for(const [event,text]of Object.entries(voice.lines)){const lines=text.split('|');assert.equal(new Set(lines).size,lines.length);assert(lines.length>=4);for(const line of lines){assert(!corpus.has(line),'Repeated character dialogue: '+line);corpus.add(line);}assert.notEqual(characterLine(type,event,()=>0),characterLine(type,event,()=>0));}
 }
 assert(corpus.size>=300);
});
test('sound preferences validate bounds and character dance poses differ',()=>{
 assert.equal(sanitize({volume:5}).volume,.5);assert.equal(sanitize({volume:-1}).volume,0);assert.equal(sanitize({sounds:false}).sounds,false);
 assert.equal(sanitize({}).chatTheme,'system');assert.equal(sanitize({chatTheme:'dark'}).chatTheme,'dark');assert.equal(sanitize({chatTheme:'nope'}).chatTheme,'system');
 const {actionPose}=require('../src/poses.js');const poses=types.map(type=>JSON.stringify(actionPose('dance',.5,.7,type)));assert.equal(new Set(poses).size,types.length);
});

test('app awareness classifies what is in front from the process name and window title only',()=>{
 const {classify}=require('../src/appmood.cjs'),c=(name,title='',extra={})=>classify({name,title,pid:1,fullscreen:false,...extra},999);
 assert.equal(c('claude','claude'),'claude');
 assert.equal(c('cursor','index.js - cursor'),'cursor');
 assert.equal(c('code','app.js - visual studio code'),'editor');
 assert.equal(c('brave','cats - youtube - brave'),'video');
 assert.equal(c('chrome','claude - google chrome'),'claude');
 assert.equal(c('chrome','chatgpt - google chrome'),'agent');
 assert.equal(c('spotify','spotify'),'music');
 assert.equal(c('windowsterminal','claude code'),'claude');
 assert.equal(c('notepad'),null);
 assert.equal(c('somegame','',{fullscreen:true}),'game');
 assert.equal(classify({name:'code',title:'',pid:999},999),null,'its own windows never count');
});

test('notification helper names apps and reads toast text without markup',()=>{
 const {appName,toastText}=require('../src/notifications.cjs');
 assert.equal(appName('Microsoft.YourPhone_8wekyb3d8bbwe!YourPhoneNotifications_com.snapchat.android'),'Snapchat');
 assert.equal(appName('Claude_pzs8sxrjxfjjc!Claude'),'Claude');
 assert.deepEqual(toastText('<toast><visual><binding template="ToastGeneric"><text>Anna</text><text>Lunch &amp; coffee?</text><text placement="attribution">via Teams</text></binding></visual></toast>'),['Anna','Lunch & coffee?']);
});

test('a character zone is validated and must be big enough',()=>{
 assert.deepEqual(sanitize({zone:{x:10.4,y:20,width:400,height:300}}).zone,{x:10,y:20,width:400,height:300});
 assert.equal(sanitize({zone:{x:0,y:0,width:100,height:300}}).zone,null);
 assert.equal(sanitize({zone:{x:'a',y:0,width:400,height:300}}).zone,null);
 assert.equal(sanitize({}).zone,null);
});

test('Luffy jump and barrel roll articulate paws, anticipate and settle without pose discontinuities',()=>{
 const {actionPose}=require('../src/poses.js');
 for(const action of ['jump','flip']){
  const pose=s=>actionPose(action,s,0,'luffy');
  assert(pose(.23).squash<.8);assert(pose(.55).y < -30);assert(pose(.55).dog.tuck>4);
  assert(pose(.83).squash<.8);assert.equal(pose(1).squash,1);assert.equal(pose(1).y,0);assert.equal(pose(1).dog.tuck,0);
  for(let i=1;i<=1000;i++){const a=pose((i-1)/1000),b=pose(i/1000);assert(Math.abs(a.y-b.y)<1);assert(Math.abs(a.rotation-b.rotation)<.1);}
 }
 assert.equal(actionPose('flip',1,0,'luffy').rotation,Math.PI*2);
});

test('reminder windows enforce local daytime and overnight boundaries and persist deferred occurrences',()=>{
 const {nextWindowTime,normalizeWindow,dueReminders}=require('../src/brain.cjs');
 const at=(day,h,m=0)=>new Date(2026,9,8+day,h,m).getTime(),day={start:'09:00',end:'18:00'},night={start:'22:00',end:'06:00'};
 assert.equal(nextWindowTime(at(0,8),day),at(0,9));assert.equal(nextWindowTime(at(0,9),day),at(0,9));assert.equal(nextWindowTime(at(0,18),day),at(1,9));
 assert.equal(nextWindowTime(at(0,23),night),at(0,23));assert.equal(nextWindowTime(at(1,2),night),at(1,2));assert.equal(nextWindowTime(at(1,6),night),at(1,22));
 const r={id:'window',text:'Stretch',due:at(0,17,30),intervalMs:3600000,window:day};
 const outside=dueReminders([r],at(0,20));assert.equal(outside.due.length,0);assert.equal(outside.pending[0].due,at(1,9));assert.equal(outside.changed,true);
 const open=dueReminders(outside.pending,at(1,9));assert.equal(open.due.length,1);assert.equal(open.pending[0].due,at(1,10));
 const boundary=dueReminders([{...r,due:at(0,17)}],at(0,17));assert.equal(boundary.pending[0].due,at(1,9));
 assert.equal(normalizeWindow({start:'24:00',end:'06:00'}),null);assert.equal(normalizeWindow({start:'09:00',end:'09:00'}),null);
});

test('Luffy rubber punch anticipates, strikes, recoils and settles continuously',()=>{const {luffyPunchPose:p}=require('../src/poses.js');assert(p(.27).reach<0);assert(p(.36).reach>=48);assert(p(.36).impact);assert(p(.58).wave>4);assert(p(.66).reach<p(.73).reach);assert.equal(p(1).reach,0);assert.equal(p(1).paw,0);assert.equal(p(1).lean,0);for(let i=1;i<=1000;i++)assert(Math.abs(p(i/1000).reach-p((i-1)/1000).reach)<2);});

const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),speech=document.querySelector('#speech'),ring=document.querySelector('#actions');
let state={type:'miso',action:'idle',scale:.65,direction:1,petX:260,petY:250},time=0,previous=performance.now(),speechTimer,frameTimer=null,menuPage='home';
let swing=0,swingVelocity=0,targetSwing=0,stretch=1,targetStretch=1,hasPainted=false;
let view={l:0,r:520,t:0,b:440,w:520,h:440},unreadChats=0;
let menuRects=[];
function hitsChat(rect){const panel=document.querySelector('#deliver');if(!panel||panel.hidden)return false;const r=panel.getBoundingClientRect();return rect.l<r.right-4&&rect.r>r.left+4&&rect.t<r.bottom-4&&rect.b>r.top+4;}
// Put the bubble on the first side of the pet (top, bottom, left, right) where it fits on screen and never covers a menu icon.
function positionSpeech(){
 const topPixel={miso:21.9,ember:20.1,bumble:20.88,boo:16.2,drowsy:21.24,merlin:10.24,luffy:24}[state.type],s=state.scale,x0=state.petX,y0=state.petY;
 const w=speech.offsetWidth,h=speech.offsetHeight,needy=state.need>0&&!state.options,topY=Math.round(y0+(topPixel-40)*4*s-10)-(needy?40:0),bottomY=Math.round(y0+(62-40)*4*s+8),hw=Math.round(60*s+14),pad=8;
 const clampX=v=>Math.max(view.l+w/2+pad,Math.min(view.r-w/2-pad,v)),clampY=v=>Math.max(view.t+h/2+pad,Math.min(view.b-h/2-pad,v));
 const spots={
  top:(()=>{const x=clampX(x0),top=topY;return{x,top,rect:{l:x-w/2,r:x+w/2,t:top-h,b:top}};})(),
  bottom:(()=>{const x=clampX(x0);return{x,top:bottomY,rect:{l:x-w/2,r:x+w/2,t:bottomY,b:bottomY+h}};})(),
  left:(()=>{const x=x0-hw-10,y=clampY(y0-30);return{x,y,rect:{l:x-w,r:x,t:y-h/2,b:y+h/2}};})(),
  right:(()=>{const x=x0+hw+10,y=clampY(y0-30);return{x,y,rect:{l:x,r:x+w,t:y-h/2,b:y+h/2}};})()
 };
 const fits=q=>q.l>=view.l+pad-1&&q.r<=view.r-pad+1&&q.t>=view.t+pad-1&&q.b<=view.b-pad+1;
 // Prefer a spot that fits on screen and covers no icon; otherwise take the fitting spot that covers the fewest (icons stay on top of the bubble).
 const cover=q=>(state.options?menuRects:[]).filter(m=>q.l<m.r+4&&q.r>m.l-4&&q.t<m.b+4&&q.b>m.t-4).length;
 const order=['top','bottom','left','right'],onScreen=order.filter(k=>fits(spots[k].rect)),fitting=onScreen.filter(k=>!hitsChat(spots[k].rect));
 if(state.options&&menuRects.length){
  // With the menu open the bubble sits above the whole icon cluster (below it if there is no room above), never on top of an icon.
  const cl=Math.min(...menuRects.map(m=>m.l)),cr=Math.max(...menuRects.map(m=>m.r)),ct=Math.min(topY,...menuRects.map(m=>m.t)),cb=Math.max(bottomY,...menuRects.map(m=>m.b)),cx=clampX((cl+cr)/2);
  const above=ct-8>=view.t+pad+h,spot=above?{top:ct-8,rect:{l:cx-w/2,r:cx+w/2,t:ct-8-h,b:ct-8}}:{top:cb+8,rect:{l:cx-w/2,r:cx+w/2,t:cb+8,b:cb+8+h}};
  if(above||spot.rect.b<=view.b-pad+1){
   speech.dataset.side=above?'top':'bottom';speech.style.left=cx+'px';speech.style.top=spot.top+'px';
   speech.style.setProperty('--tail-x',Math.max(10,Math.min(w-18,w/2+x0-cx-5))+'px');
   speech.classList.remove('blocked');
   // continue below to position the other controls only
   return finishControls();
  }
 }
 let side=fitting.length?fitting.reduce((best,k)=>cover(spots[k].rect)<cover(spots[best].rect)?k:best):null;
 speech.classList.remove('blocked');
 {
  if(!side){const free=onScreen.find(k=>!hitsChat(spots[k].rect));if(free)side=free;else{const room={top:topY-view.t,bottom:view.b-bottomY,left:x0-hw-view.l,right:view.r-x0-hw};side=room.top>=room.bottom?'top':'bottom';}}
  const sp=spots[side];speech.dataset.side=side;
  if(side==='top'||side==='bottom'){
   speech.style.left=sp.x+'px';speech.style.top=(side==='top'?Math.max(view.t+h+pad,sp.top):sp.top)+'px';speech.style.setProperty('--tail-x',Math.max(10,Math.min(w-18,w/2+x0-sp.x-5))+'px');
  }else{
   speech.style.top=sp.y+'px';speech.style.left=sp.x+'px';speech.style.setProperty('--tail-y',Math.max(10,Math.min(h-18,h/2+(y0-30)-sp.y-5))+'px');
  }
 }
 finishControls();
 function finishControls(){
 const chat=document.querySelector('#deliver'),chatOpen=!!chat&&!chat.hidden,quick=state.quick&&!state.options&&!chatOpen,off=hw+28,dir=x0+off+22<=view.r?1:-1;
 moreButton.hidden=!quick;moreButton.style.left=(x0+dir*off)+'px';moreButton.style.top=(y0-10)+'px';
 const mail=document.querySelector('#mail');if(mail){mail.hidden=chatOpen||unreadChats<1;const placeRight=view.r-x0>=x0-view.l,x=placeRight?x0+hw+8:x0-hw-8,y=Math.max(view.t+22,Math.min(view.b-22,topY+16));mail.style.left=x+'px';mail.style.top=y+'px';}
 }
}
const specialIcon={miso:'🐭',ember:'🔱',bumble:'🐝',boo:'👻',drowsy:'🥱',merlin:'✨',luffy:'👊'};
function renderMenu(){
 const special=['special',specialIcon[state.type]||'✨','Special'],back=['page:home','↩️','Back'];
 const multi=(state.screens||1)>1&&!state.zone;
 // Each action appears once: signature move on the home page, tricks under Play, calm things under Rest. Screen travel only with 2+ screens.
 const updateItem=state.update?['update',state.update.status==='ready'?'↻':state.update.status==='downloading'?'⬇':'⬆',state.update.status==='ready'?'Restart to update':state.update.status==='downloading'?'Downloading update':'Update available']:null;
 const pages={home:[special,['deliver','📜','Chat'],['page:play','🎮','Play'],['page:rest','🛋️','Rest and explore'],['reminder','🔔','Reminders'],['settings','⚙️','Settings'],...(updateItem?[updateItem]:[]),['close','✖️','Close']],play:[['games','🎲','Play games'],['jump','🦘','Jump'],['flip','🤸','Flip'],['dance','🎵','Dance'],['dead','💀','Play dead'],back],rest:[state.roaming===false?['wander','🧭','Explore']:['idle','📍','Stay here'],['sleep','😴','Take a nap'],...(multi?[['visit','🖥️','Next screen']]:[]),back]};
 const icon={small:34,medium:40,large:48}[state.menuSize]||40;ring.replaceChildren();ring.style.setProperty('--icon',icon+'px');ring.style.setProperty('--glyph',Math.round(icon*.52)+'px');const entries=pages[menuPage],step=icon+8,span=(entries.length-1)*step,side=state.menuSide||'right',x=state.petX,y=state.petY,s0=state.scale,reach=Math.max(95,Math.round(175*state.scale)),gap=Math.max(70,Math.round(110*state.scale))+30;
 ring.dataset.side=side;
 // Fan the icons out in an arc around the pet, then nudge them apart so edges of the screen never make them overlap.
 const n=entries.length,spread=Math.min(150,(n-1)*30)*Math.PI/180,centre={right:0,bottom:Math.PI/2,left:Math.PI,top:-Math.PI/2}[side],radius=Math.max(95,Math.round(110*s0)+icon/2+28),half=icon/2+6,gapMin=icon+10,cy=y-18,keep=62*s0+icon/2+12;
 const fit=p=>{p.x=Math.max(view.l+half,Math.min(view.r-half,p.x));p.y=Math.max(view.t+half,Math.min(view.b-half,p.y));};
 const inside=p=>p.x>=view.l+half&&p.x<=view.r-half&&p.y>=view.t+half&&p.y<=view.b-half;
 const arcAt=(mid,R,from,to)=>{const m=to-from,step=m>1?2*Math.asin(Math.min(1,(icon+10)/(2*R))):0;return entries.slice(from,to).map((_,i)=>({x:x+Math.cos(mid+(i-(m-1)/2)*step)*R,y:cy+Math.sin(mid+(i-(m-1)/2)*step)*R}));};
 // 1, 2 or 3 stacked arcs, so near a corner the icons wrap tightly around the pet instead of drifting far away.
 const layered=(mid,layers,R)=>{const out=[];for(let L=0;L<layers;L++)out.push(...arcAt(mid,R+L*(icon+10),Math.round(n*L/layers),Math.round(n*(L+1)/layers)));return out;};
 let pts=null;
 search:for(const [layers,extra] of [[1,0],[1,16],[2,0],[2,16],[3,0],[3,16]])for(let k=0;k<=24;k++){
  for(const sign of k?[1,-1]:[1]){const cand=layered(centre+sign*k*Math.PI/12,layers,radius+extra);if(cand.every(inside)){pts=cand;break search;}}
 }
 if(!pts){pts=layered(centre,1,radius);pts.forEach(fit);}
 for(let pass=0;pass<60;pass++){
  for(let i=0;i<n;i++){
   for(let j=i+1;j<n;j++){const dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y,d=Math.hypot(dx,dy)||.01;if(d<gapMin){const k=(gapMin-d)/2/d;pts[i].x-=dx*k;pts[i].y-=dy*k;pts[j].x+=dx*k;pts[j].y+=dy*k;}}
   const dx=pts[i].x-x,dy=pts[i].y-cy,d=Math.hypot(dx,dy)||.01;if(d<keep){pts[i].x=x+dx/d*keep;pts[i].y=cy+dy/d*keep;}
   fit(pts[i]);
  }
 }
 menuRects=pts.map(p=>({l:p.x-icon/2,t:p.y-icon/2,r:p.x+icon/2,b:p.y+icon/2}));
 entries.forEach(([action,glyph,label],i)=>{
  const b=document.createElement('button');b.className='action'+(action==='close'||action==='page:home'?' plain':'');b.dataset.action=action;const mark=document.createElement('span');mark.textContent=glyph;if(action==='update')mark.className='jump';b.append(mark);b.setAttribute('aria-label',label);
  {const dx=pts[i].x-x,dy=pts[i].y-cy;b.dataset.tip=Math.abs(dx)>Math.abs(dy)*.8?(dx>0?'right':'left'):(dy>0?'down':'up');}
  b.style.left=pts[i].x+'px';b.style.top=pts[i].y+'px';b.style.right='auto';b.style.setProperty('--dx',Math.round((x-pts[i].x)*.55)+'px');b.style.setProperty('--dy',Math.round((cy-pts[i].y)*.55)+'px');b.style.setProperty('--in',i*50+'ms');b.style.setProperty('--out',(n-1-i)*28+'ms');
  if(action==='deliver'&&unreadChats){const badge=document.createElement('span');badge.className='badge';badge.textContent=unreadChats>9?'9+':String(unreadChats);b.append(badge);}
  ring.append(b);
 });
}
function receive(next){
 if(!state.options&&next.options)menuPage='home';const closing=state.options&&!next.options,rebuild=!closing&&(next.options!==state.options||next.type!==state.type||next.petX!==state.petX||next.petY!==state.petY||next.menuSide!==state.menuSide||next.menuSize!==state.menuSize||next.roaming!==state.roaming||next.screens!==state.screens);
 if(next.type!==state.type){speech.classList.remove('visible');clearTimeout(speechTimer);}
 const prevUpdate=state.update&&state.update.status;state=next;clearTimeout(ringTimer);const deliver=document.querySelector('#deliver');if(deliver)deliver.dataset.mode=next.chatMode==='dark'?'dark':'light';
 if(next.options){ring.classList.remove('closing');ring.hidden=false;}
 else if(closing){menuRects=[];ring.classList.add('closing');ringTimer=setTimeout(()=>{ring.hidden=true;ring.classList.remove('closing');},320);}
 else ring.hidden=true;
 const updateChanged=prevUpdate!==(next.update&&next.update.status);
 if(rebuild||updateChanged)renderMenu();positionSpeech();canvas.setAttribute('aria-label',companions[next.type].name+' companion. Click for actions or drag to move.');
 if(next.action!=='carried'){targetSwing=0;targetStretch=1;}
 const crossing=['portalOut','portalIn','phase','travel'].includes(next.action);
 if(next.message&&!crossing){const fancy=/\p{Extended_Pictographic}/u.test(notePlain(next.message))||/\[\[gif:[a-z0-9]+\]\]/.test(next.message);renderNote(speech,fancy?next.message:next.message+' ✨');speech.classList.toggle('notice',next.message.startsWith('📩'));speech.classList.add('visible');clearTimeout(speechTimer);speechTimer=setTimeout(()=>speech.classList.remove('visible'),['attention','alert'].includes(next.action)?14000:next.message.startsWith('📩')?8000:next.message.length<20?2600:5500);}
 if(crossing||['jump','flip','pounce'].includes(next.action)||(next.action==='carried'&&!speech.textContent.startsWith('🔔')))speech.classList.remove('visible');
 positionDeliver();restart();
}
window.pet.subscribe(receive);window.pet.read().then(receive);window.pet.onCloseComposer(()=>closeDeliver());
let clip=null,lift=0,ringTimer,lookTarget={x:0,y:0},look={x:0,y:0};
window.pet.look(v=>{lookTarget=v||{x:0,y:0};if(!state.paused&&!frameTimer)restart();});
window.pet.view(v=>{view=v;if(Number.isFinite(v.petX)){state.petX=v.petX;state.petY=v.petY;}const w=v.w||520,h=v.h||440;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;restart();}for(const el of [document.documentElement,document.body,canvas,ring]){el.style.width=w+'px';el.style.height=h+'px';}if(state.options&&!ring.hidden&&!ring.classList.contains('closing'))renderMenu();positionDeliver();if(chatReveal&&(view.w||0)>=800){const go=chatReveal;chatReveal=null;go();}});
const moreButton=document.createElement('button');moreButton.id='morebtn';moreButton.textContent='⋯';moreButton.setAttribute('aria-label','More actions');moreButton.hidden=true;document.body.append(moreButton);
moreButton.addEventListener('click',()=>window.pet.command('more'));window.pet.clip(c=>{clip=c;});
window.pet.motion(v=>{targetSwing=Math.max(-.78,Math.min(.78,v.x/1500));targetStretch=1+Math.max(-.06,Math.min(.09,v.y/9000));});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);window.pet.command('down');});
canvas.addEventListener('pointerup',e=>{if(e.button===0)window.pet.command('up');});
canvas.addEventListener('lostpointercapture',()=>window.pet.command('up'));
canvas.addEventListener('pointercancel',()=>window.pet.command('up'));
window.addEventListener('blur',()=>{if(state.action==='carried')window.pet.command('up');});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();window.pet.command('menu');});
canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.pet.command('menu');}});
speech.addEventListener('click',()=>window.pet.command(speech.classList.contains('notice')?'notifications':'menu'));
ring.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const action=b.dataset.action;if(action==='deliver'){openDeliver();window.pet.command('close');return;}if(action.startsWith('page:')){menuPage=action.slice(5);renderMenu();}else window.pet.command(action);});
// Clicking empty space around the pet closes the menu; choosing an option does not.
document.addEventListener('pointerdown',e=>{const deliver=document.querySelector('#deliver');if(deliver&&!deliver.hidden)return;if(!state.playing&&state.options&&e.target!==canvas&&!e.target.closest('.action'))window.pet.command('close');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const deliver=document.querySelector('#deliver');if(deliver&&!deliver.hidden)return;if(menuPage!=='home'){menuPage='home';renderMenu();}else window.pet.command('close');}});
function frame(){
 frameTimer=null;if((document.hidden||state.hidden)&&hasPainted)return;
 const now=performance.now(),dt=Math.min((now-previous)/1000,.1);previous=now;
 if(!state.paused||state.action==='carried')time+=dt;
 const spring=advanceSwing(swing,swingVelocity,targetSwing,dt);swing=spring.swing;swingVelocity=spring.velocity;stretch+=(targetStretch-stretch)*Math.min(1,dt*10);
 lift+=((state.climb||0)-lift)*Math.min(1,dt*4);look.x+=(lookTarget.x-look.x)*Math.min(1,dt*9);look.y+=(lookTarget.y-look.y)*Math.min(1,dt*9);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
 if(clip){const x=state.petX+clip.dx,W=canvas.width,H=canvas.height;clip.keepLeft?ctx.rect(0,0,Math.max(0,x),H):ctx.rect(Math.min(W,x),0,W,H);ctx.clip();}
 drawPet(ctx,{...state,gameHand:window.petGameHand,swing,stretch,climb:lift,look},time,(Date.now()-(state.started||Date.now()))/1000,state.petX,state.petY,state.scale);ctx.restore();

 hasPainted=true;if(document.hidden||state.hidden)return;
 if(!state.paused||state.action==='carried'||Math.abs(swing)+Math.abs(swingVelocity)>.002)frameTimer=setTimeout(frame,1000/((['idle','sleep'].includes(state.action)||(state.action==='dead'&&Date.now()-state.started>1500&&state.until-Date.now()>1500))?15:30));
}
function restart(){clearTimeout(frameTimer);frameTimer=null;previous=performance.now();frame();}
document.addEventListener('visibilitychange',restart);
function positionDeliver(){
 const panel=document.querySelector('#deliver');
 if(panel&&!panel.hidden){
  if(panel.classList.contains('opening')||panel.classList.contains('closing')){window.petChatHit();positionSpeech();return;}
  const w=panel.offsetWidth||520,h=panel.offsetHeight||480,gap=16,body=Math.max(52,84*(state.scale||.65));
  const right=state.petX+body+gap,left=state.petX-body-gap-w;
  const onRight=right+w<=view.r-8||left<view.l+8;
  const x=onRight?Math.min(view.r-w-8,Math.max(view.l+8,right)):Math.max(view.l+8,Math.min(view.r-w-8,left));
  const y=Math.max(view.t+8,Math.min(view.b-h-8,view.t+8));
  panel.style.left=x+'px';panel.style.top=y+'px';
  placeOpenPickers();
  window.petChatHit();
 }
 positionSpeech();
}
window.petChatHit=function(){
 const panel=document.querySelector('#deliver');if(!panel||panel.hidden)return;
 const boxes=[panel,...document.querySelectorAll('.msg-menu,.react-pop,.picker-modal')].filter(el=>!el.hidden&&el.getClientRects().length).map(el=>el.getBoundingClientRect());
 const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),r=Math.max(...boxes.map(b=>b.right)),b=Math.max(...boxes.map(b=>b.bottom));
 window.pet.composerBox({x,y,w:r-x,h:b-y});
};
let chatState=null,chosenGif='',outgoing=[];
function closePickers(){for(const id of ['deliver-emoji-tray','deliver-gif-tray']){const tray=document.getElementById(id);if(tray)tray.hidden=true;}document.querySelector('#deliver-emoji')?.setAttribute('aria-expanded','false');document.querySelector('#deliver-gif')?.setAttribute('aria-expanded','false');document.querySelector('#deliver')?.classList.remove('expanded');}
let chatGen=0,chatReveal=null;
function aimChat(panel){
 const x=Math.max(8,Math.min((panel.offsetWidth||520)-8,state.petX-panel.offsetLeft));
 const y=Math.max(8,Math.min((panel.offsetHeight||480)-8,state.petY-panel.offsetTop));
 panel.style.setProperty('--from-x',x+'px');panel.style.setProperty('--from-y',y+'px');
}
function playChat(panel,opening){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){panel.classList.remove('opening','closing');return;}
 panel.classList.remove(opening?'opening':'closing');
 void panel.offsetWidth;
 panel.classList.add(opening?'opening':'closing');
}
function closeDeliver(){
 const panel=document.querySelector('#deliver');
 if(!panel||panel.hidden){window.pet.composer(false);return;}
 if(panel.classList.contains('closing'))return;
 const gen=++chatGen;chatReveal=null;closePickers();panel.classList.remove('opening');panel.style.visibility='';
 positionDeliver();aimChat(panel);
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){chatView='';panel.classList.remove('talking');panel.hidden=true;window.pet.composer(false);paintInbox(chatState);positionSpeech();return;}
 playChat(panel,false);
 let settled=false;
 const finish=event=>{
  if(gen!==chatGen||settled||(event&&event.animationName&&event.animationName!=='chat-to-pet'))return;
  settled=true;chatView='';panel.classList.remove('closing','opening','talking');panel.hidden=true;window.pet.composer(false);paintInbox(chatState);positionSpeech();
 };
 panel.addEventListener('animationend',finish);setTimeout(finish,280);
}
function threadOf(host,me,chat){return (chat||[]).filter(m=>host==='group'?m.to==='group':(m.from===me&&m.to===host)||(m.from===host&&m.to===me));}
function unreadHosts(s){
 const map=new Map();if(!s?.me)return map;
 for(const m of s.chat||[]){if(m.from===s.me.id||(m.seen||[]).includes(s.me.id))continue;const host=m.to==='group'?'group':m.from;map.set(host,(map.get(host)||0)+1);}
 return map;
}
function paintInbox(s){
 unreadChats=unreadHosts(s).size;
 const mail=document.querySelector('#mail'),open=document.querySelector('#deliver')&&!document.querySelector('#deliver').hidden;
 if(mail){mail.hidden=open||unreadChats<1;mail.querySelector('b').textContent=unreadChats>9?'9+':String(unreadChats);}
 const btn=document.querySelector('#actions [data-action="deliver"]');if(!btn)return;
 let badge=btn.querySelector('.badge');
 if(unreadChats<1){badge?.remove();return;}
 if(!badge){badge=document.createElement('span');badge.className='badge';btn.append(badge);}
 badge.textContent=unreadChats>9?'9+':String(unreadChats);
}
function showTalk(id,item){
 const head=document.querySelector(id);if(!head)return;
 if(!item){head.hidden=true;return;}
 head.hidden=false;
 head.querySelector('strong').textContent=item.name;
 head.querySelector('small').textContent=item.id==='group'?'Everyone in the group':!item.accept?'Visits off':item.online?'Online':'Offline';
}
function paintThreads(s,select){
 const box=document.querySelector('#deliver-threads'),me=s.me.id,unread=unreadHosts(s),scroll=box.scrollTop;
 const items=[{id:'group',name:s.room?.name||'Group',online:false,accept:true},...(s.members||[])];
 box.replaceChildren();
 for(const item of items){
  const rows=threadOf(item.id,me,s.chat),last=rows[rows.length-1],count=unread.get(item.id)||0;
  const b=document.createElement('button');b.type='button';b.className='thread'+(count?' unread':'');b.setAttribute('role','option');
  if(item.id!=='group'&&!item.accept)b.disabled=true;
  const dot=document.createElement('i');dot.className='presence'+(item.id==='group'?' group':item.online?' live':'');  const text=document.createElement('span');const name=document.createElement('strong');name.textContent=item.name+(item.id!=='group'&&!item.accept?' · visits off':'');const preview=document.createElement('small');preview.textContent=last?(notePlain(last.text).slice(0,48)||'GIF'):'No messages yet';text.append(name,preview);
  b.append(dot,text);
  if(count){const em=document.createElement('em');em.textContent=count>9?'9+':String(count);b.append(em);}
  b.onclick=()=>{if(b.disabled)return;select.value=item.id;chatView=item.id;paintChat.stick=true;paintChat.below=0;paintChat(chatState);document.querySelector('#deliver-form textarea')?.focus();};
  box.append(b);
 }
 box.scrollTop=scroll;
 showTalk('#deliver-talk',items.find(item=>item.id===select.value)||items[0]);
}
let chatView='';
function listNote(text){
 const threads=document.querySelector('#deliver-threads');
 threads.hidden=false;threads.replaceChildren();
 const empty=document.createElement('p');empty.className='empty';empty.textContent=text;threads.append(empty);
}
function paintChat(s){
 chatState=s||null;
 const panel=document.querySelector('#deliver'),log=document.querySelector('#deliver-log'),select=document.querySelector('#deliver-host'),form=document.querySelector('#deliver-form'),status=document.querySelector('#deliver-status'),threads=document.querySelector('#deliver-threads'),jump=document.querySelector('#deliver-jump'),back=document.querySelector('#deliver-expand');
 const talking=!!chatView&&!!s?.me;
 panel.classList.toggle('talking',talking);
 if(back)back.hidden=!talking;
 if(!s?.connected||!s.room||!s.me){chatView='';panel.classList.remove('talking');if(back)back.hidden=true;form.hidden=true;jump.hidden=true;showTalk('#deliver-talk',null);listNote('Join a group in Settings first.');paintInbox(s);positionDeliver();return;}
 const members=s.members||[],previous=select.value||'group',signature=members.map(m=>m.id+m.name+m.online+m.accept).join('|');
 if(select.dataset.members!==signature){
  select.replaceChildren();
  const group=document.createElement('option');group.value='group';group.textContent='Group';select.append(group);
  for(const m of members){const o=document.createElement('option');o.value=m.id;o.disabled=!m.accept;o.textContent=m.name;select.append(o);}
  select.dataset.members=signature;
  const keep=[...select.options].find(o=>o.value===previous&&!o.disabled);
  select.value=keep?keep.value:'group';
 }
 if(!members.length){chatView='';panel.classList.remove('talking');if(back)back.hidden=true;form.hidden=true;jump.hidden=true;showTalk('#deliver-talk',null);listNote('Invite a friend with your group code, then chat here.');paintInbox(s);positionDeliver();return;}
 if(chatView){const pick=[...select.options].find(o=>o.value===chatView&&!o.disabled);if(!pick){chatView='';panel.classList.remove('talking');if(back)back.hidden=true;}else select.value=pick.value;}
 paintThreads(s,select);
 if(!chatView){form.hidden=true;jump.hidden=true;showTalk('#deliver-talk',null);paintInbox(s);positionDeliver();return;}
 form.hidden=false;
 const host=select.value||'group',rows=threadOf(host,s.me.id,s.chat),me=s.me.id,used=new Set();
 log.classList.toggle('direct',host!=='group');
 const incoming=rows.filter(m=>m.from!==me),latestIn=incoming[incoming.length-1];
 if(latestIn&&!(latestIn.seen||[]).includes(me)){const key=host+':'+latestIn.id;if(key!==paintChat.seen){paintChat.seen=key;window.pet.socialCommand({command:'seen',host}).catch(()=>{});}}
 for(const m of rows){if(m.from!==me&&!(m.seen||[]).includes(me))m.seen=[...(m.seen||[]),me];}
 outgoing=outgoing.filter(item=>{if(item.failed)return true;const hit=rows.find(m=>!used.has(m.id)&&m.from===me&&(m.to||'group')===item.host&&m.text===item.text&&(m.reply?.id||'')===(item.reply?.id||''));if(!hit)return true;used.add(hit.id);return false;});
 const local=outgoing.filter(item=>item.host===host);
 const known=paintChat.known,fresh=known?rows.filter(m=>m.id&&!known.has(m.id)&&m.from!==me):[];
 paintChat.known=new Set((s.chat||[]).filter(m=>m.id).map(m=>m.id));
 const logKey=JSON.stringify([host,rows.map(m=>[m.id,m.text,!!m.pinned,m.reply||null,m.reactions||null,(m.seen||[]).slice().sort()]),local.map(item=>[item.id,item.text,!!item.failed,item.reason||'',item.reply||null])]);
 if(logKey!==paintChat.logKey){
  paintChat.logKey=logKey;closeBubbleMenus();
  const prev=log.scrollTop,near=log.scrollHeight-prev-log.clientHeight<48||!log.childElementCount;
  log.replaceChildren();
  if(!rows.length&&!local.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No messages yet.';log.append(empty);}
  else {appendPinned(log,rows);for(const m of rows)appendBubble(log,m,me,{reply:setReply,react:(message,emoji)=>messageAction('react',{id:message.id,emoji}),pin:message=>messageAction('pin',{id:message.id}),unsend:message=>unsendMessage(message.id)});}
  const mine=rows.filter(m=>m.from===me),last=mine[mine.length-1];
  if(last){const receipt=document.createElement('p');receipt.className='receipt';const seen=host==='group'?(last.seen||[]).length>0:(last.seen||[]).includes(host);receipt.textContent=seen?'Seen':'Delivered';log.append(receipt);}
  for(const item of local){const line=document.createElement('p');line.className='mine';addQuote(line,item.reply);const who=document.createElement('span');who.className='who';who.textContent='You';const body=document.createElement('span');renderNote(body,item.text);line.append(who,body);log.append(line);if(!item.failed)continue;const fail=document.createElement('p');fail.className='fail';const label=document.createElement('span');label.textContent=item.reason||'Failed to send';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=()=>{item.failed=false;sendOutgoing(item);};fail.append(label,retry);log.append(fail);}
  if(paintChat.stick||!known||near){log.scrollTop=log.scrollHeight;jump.hidden=true;paintChat.below=0;paintChat.stick=false;}
  else{log.scrollTop=prev;if(fresh.length){paintChat.below=(paintChat.below||0)+fresh.length;jump.hidden=false;jump.querySelector('b').textContent=String(paintChat.below);}}
 }
 const typing=(s.typing||[]).filter(t=>t.to===host);
 const typingLine=document.querySelector('#deliver-typing');
 typingLine.hidden=!typing.length;
 typingLine.textContent=typing.length?(typing.map(t=>t.name).join(', ')+(typing.length>1?' are':' is')+' typing…'):'';
 paintInbox(s);positionDeliver();
}
let replyTarget=null;
function setReply(message){replyTarget=message?{id:message.id,name:message.from===chatState?.me?.id?'You':message.name,text:message.text}:null;fillReplyBar(document.querySelector('#deliver-reply'),replyTarget,()=>setReply(null));const field=document.querySelector('#deliver-form textarea');field?.focus();}
async function messageAction(command,extra){
 const status=document.querySelector('#deliver-status');
 try{const result=await window.pet.socialCommand({command,...extra});if(result?.error){status.textContent=result.error;return;}status.textContent='';if(result?.state)paintChat(result.state);}catch{status.textContent='Could not update that message.';}
}
async function unsendMessage(id){
 const status=document.querySelector('#deliver-status');
 try{
  const result=await window.pet.socialCommand({command:'unsend',id});
  if(result?.error){status.textContent=result.error;return;}
  status.textContent='';if(result?.state)paintChat(result.state);
 }catch{status.textContent='Could not unsend that message.';}
}
function markTools(){document.querySelector('#deliver-emoji').classList.toggle('on',!document.querySelector('#deliver-emoji-tray').hidden);document.querySelector('#deliver-gif').classList.toggle('on',!document.querySelector('#deliver-gif-tray').hidden||!!chosenGif);}
function clearChosenGif(){chosenGif='';paintGifs.sent='';for(const b of document.querySelectorAll('#deliver-gif-tray button'))b.classList.remove('on');showGifPreview();markTools();}
async function sendOutgoing(item){
 paintChat(chatState);
 try{
  if(item.ping){const ping=item.ping;item.ping='';fetch(ping).catch(()=>{});}
  const result=await window.pet.socialCommand({command:'send',host:item.host,message:item.text,reply:item.reply?.id||''});
  const next=result?.state||chatState;
  if(result?.error){item.failed=true;item.reason=result.error;paintChat(next);return;}
  const rows=threadOf(item.host,next?.me?.id,next?.chat);
  if(rows.some(m=>m.from===next?.me?.id&&(m.to||'group')===item.host&&m.text===item.text&&(m.reply?.id||'')===(item.reply?.id||'')))outgoing=outgoing.filter(entry=>entry.id!==item.id);
  paintChat(next);
 }catch{item.failed=true;item.reason='';paintChat(chatState);}
}
function showGifPreview(){
 const preview=document.querySelector('#deliver-preview');preview.replaceChildren();
 if(!chosenGif){preview.hidden=true;positionDeliver();return;}
 preview.hidden=false;renderNote(preview,'[[gif:'+chosenGif+']]');
 const clear=document.createElement('button');clear.type='button';clear.className='gif-clear';clear.setAttribute('aria-label','Remove GIF');clear.textContent='✕';clear.onclick=e=>{e.stopPropagation();clearChosenGif();};preview.append(clear);
 positionDeliver();
}
async function openDeliver(){
 const panel=document.querySelector('#deliver');
 if(panel.classList.contains('opening')||(!panel.hidden&&!panel.classList.contains('closing')))return;
 const gen=++chatGen;
 chatView='';panel.classList.remove('closing','opening','talking');panel.style.visibility='hidden';panel.hidden=false;window.pet.composer(true);
 const started=performance.now();
 let ran=false;
 const reveal=()=>{
  if(ran||gen!==chatGen)return;
  if((view.w||0)<640&&performance.now()-started<240){requestAnimationFrame(reveal);return;}
  ran=true;if(chatReveal===reveal)chatReveal=null;
  positionDeliver();aimChat(panel);panel.style.visibility='';playChat(panel,true);
  panel.addEventListener('animationend',e=>{if(e.animationName==='chat-from-pet')panel.classList.remove('opening');},{once:true});
 };
 chatReveal=reveal;if((view.w||0)>=640){chatReveal=null;reveal();}else requestAnimationFrame(reveal);
 let s=chatState;try{s=await window.pet.socialRead();}catch{}
 if(gen!==chatGen)return;
 paintChat(s);positionSpeech();
}
document.querySelector('#deliver-close').onclick=e=>{e.stopPropagation();closeDeliver();};
document.querySelector('#deliver-expand').onclick=e=>{e.stopPropagation();chatView='';closePickers();paintChat(chatState);};
const chatHeader=document.querySelector('#deliver header');
chatHeader.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;chatHeader.setPointerCapture(e.pointerId);window.pet.command('carry');});
chatHeader.addEventListener('pointerup',e=>{if(e.button===0)window.pet.command('up');});
chatHeader.addEventListener('lostpointercapture',()=>window.pet.command('up'));
chatHeader.addEventListener('pointercancel',()=>window.pet.command('up'));
document.querySelector('#deliver-host').onchange=()=>paintChat(chatState);
function placePicker(tray){
 const main=document.querySelector('#deliver .chat-main')||document.querySelector('#deliver');
 const anchor=document.querySelector('#deliver .composer')||main;
 const box=main.getBoundingClientRect(),edge=anchor.getBoundingClientRect(),gap=8,topLimit=12;
 const height=Math.max(240,Math.min(520,edge.top-topLimit-gap));
 tray.style.left=Math.round(box.left)+'px';
 tray.style.width=Math.round(Math.max(220,box.width))+'px';
 tray.style.right='auto';
 tray.style.top='auto';
 tray.style.bottom=Math.round(Math.max(gap,window.innerHeight-edge.top+gap))+'px';
 tray.style.height=Math.round(height)+'px';
}
function placeOpenPickers(){for(const tray of document.querySelectorAll('#deliver-emoji-tray,#deliver-gif-tray'))if(!tray.hidden)placePicker(tray);}
function showPicker(which){const emoji=document.querySelector('#deliver-emoji-tray'),gif=document.querySelector('#deliver-gif-tray'),open=which==='emoji'?emoji:gif,other=which==='emoji'?gif:emoji;open.hidden=!open.hidden;other.hidden=true;document.querySelector('#deliver-emoji').setAttribute('aria-expanded',String(!emoji.hidden));document.querySelector('#deliver-gif').setAttribute('aria-expanded',String(!gif.hidden));if(!open.hidden)placePicker(open);if(!open.hidden&&which==='emoji'){const picker=document.querySelector('#deliver-emoji-picker');if(!picker.dataset.ready&&window.PetioEmoji){picker.dataset.ready='1';PetioEmoji.mount(picker);}picker.querySelector('[frimousse-search]')?.focus();}if(!open.hidden&&which==='gif'){paintGifs();document.querySelector('#deliver-gif-search').focus();}markTools();positionDeliver();}
document.querySelector('#deliver-emoji').onclick=()=>showPicker('emoji');
document.querySelector('#deliver-gif').onclick=()=>showPicker('gif');
for(const button of document.querySelectorAll('#deliver-emoji-tray .picker-close,#deliver-gif-tray .picker-close'))button.onclick=e=>{e.preventDefault();e.stopPropagation();button.closest('.picker-modal').hidden=true;document.querySelector('#deliver-emoji').setAttribute('aria-expanded',String(!document.querySelector('#deliver-emoji-tray').hidden));document.querySelector('#deliver-gif').setAttribute('aria-expanded',String(!document.querySelector('#deliver-gif-tray').hidden));markTools();positionDeliver();};
for(const tray of document.querySelectorAll('#deliver-emoji-tray,#deliver-gif-tray'))tray.addEventListener('wheel',e=>e.stopPropagation());
const GIPHY_KEY='sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';
function drawGifGrid(gifs){
 const box=document.querySelector('#deliver-gif-results');box.replaceChildren();
 if(!gifs.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No GIFs match that.';box.append(empty);return;}
 for(const gif of gifs){const b=document.createElement('button');b.type='button';b.dataset.id=gif.id;b.title=gif.title||'GIF';b.setAttribute('aria-label',gif.title||'GIF');b.classList.toggle('on',chosenGif===gif.id);const img=document.createElement('img');img.className='note-gif';img.alt='';img.src=(gif.images?.preview_gif||gif.images?.fixed_width_small||{}).url||'';b.append(img);b.onclick=()=>{chosenGif=chosenGif===gif.id?'':gif.id;paintGifs.sent=chosenGif===gif.id?(gif.analytics?.onsent?.url||''):'';for(const button of box.querySelectorAll('button'))button.classList.toggle('on',button.dataset.id===chosenGif);if(chosenGif){document.querySelector('#deliver-gif-tray').hidden=true;document.querySelector('#deliver-gif').setAttribute('aria-expanded','false');}markTools();showGifPreview();};box.append(b);}
}
function paintGifs(){
 const box=document.querySelector('#deliver-gif-results'),q=document.querySelector('#deliver-gif-search').value.trim().slice(0,50),seq=++paintGifs.seq;
 box.replaceChildren();const loading=document.createElement('p');loading.className='empty';loading.textContent='Loading GIFs…';box.append(loading);
 const url=new URL(q?'https://api.giphy.com/v1/gifs/search':'https://api.giphy.com/v1/gifs/trending');
 url.searchParams.set('api_key',GIPHY_KEY);url.searchParams.set('limit','24');url.searchParams.set('rating','pg-13');if(q)url.searchParams.set('q',q);
 fetch(url).then(r=>r.json()).then(data=>{if(seq!==paintGifs.seq)return;drawGifGrid(Array.isArray(data.data)?data.data:[]);}).catch(()=>{if(seq!==paintGifs.seq)return;box.replaceChildren();const empty=document.createElement('p');empty.className='empty';empty.textContent='Could not load GIFs.';box.append(empty);});
}
paintGifs.seq=0;paintGifs.sent='';
let gifTimer=0;
document.querySelector('#deliver-gif-search').addEventListener('input',()=>{clearTimeout(gifTimer);gifTimer=setTimeout(paintGifs,280);});
document.querySelector('#deliver-gif-search').addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});
let typingTimer=0,typingOn=false;
function fitField(field,limit){if(!field)return;field.style.height='0px';field.style.height=Math.min(field.scrollHeight,limit)+'px';}
function queueTyping(){
 const field=document.querySelector('#deliver-form textarea');
 fitField(field,88);
 clearTimeout(typingTimer);
 typingTimer=setTimeout(()=>{
  const active=field.value.trim().length>=3;
  if(active===typingOn)return;
  typingOn=active;
  window.pet.socialCommand({command:'typing',host:document.querySelector('#deliver-host').value||'group',active}).catch(()=>{});
 },420);
}
function stopTyping(){
 clearTimeout(typingTimer);
 if(!typingOn)return;
 typingOn=false;
 window.pet.socialCommand({command:'typing',host:document.querySelector('#deliver-host').value||'group',active:false}).catch(()=>{});
}
document.querySelector('#deliver-form textarea').addEventListener('input',queueTyping);
document.querySelector('#deliver-form textarea').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.currentTarget.form.requestSubmit();}});
document.querySelector('#deliver-form').addEventListener('submit',async e=>{
 e.preventDefault();
 if(document.activeElement?.closest?.('#deliver-emoji-tray, #deliver-gif-search'))return;
 const form=e.target,status=document.querySelector('#deliver-status'),typed=form.elements.message.value.trim();
 const hostEl=document.querySelector('#deliver-host'),host=hostEl.value||'group';
 if(hostEl.selectedOptions[0]?.disabled){status.textContent='That friend has visits turned off.';return;}
 const message=[typed,chosenGif?'[[gif:'+chosenGif+']]':''].filter(Boolean).join(' ').slice(0,280);
 if(!message)return;
 const reply=replyTarget?{id:replyTarget.id,name:replyTarget.name,text:replyTarget.text}:null;
 const item={id:Date.now()+':'+Math.random(),host,text:message,failed:false,ping:chosenGif?paintGifs.sent:'',reply};
 form.elements.message.value='';fitField(form.elements.message,88);setReply(null);stopTyping();status.textContent='';clearChosenGif();outgoing.push(item);sendOutgoing(item);
});
document.querySelector('#deliver-jump').onclick=()=>{const log=document.querySelector('#deliver-log');log.scrollTop=log.scrollHeight;document.querySelector('#deliver-jump').hidden=true;paintChat.below=0;};
document.querySelector('#deliver-log').addEventListener('scroll',()=>{const log=document.querySelector('#deliver-log');if(log.scrollHeight-log.scrollTop-log.clientHeight<48){document.querySelector('#deliver-jump').hidden=true;paintChat.below=0;}});
document.querySelector('#mail').onclick=()=>openDeliver();
window.pet.socialSubscribe(s=>{chatState=s;if(document.querySelector('#deliver').hidden)paintInbox(s);else paintChat(s);});

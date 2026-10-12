const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),speech=document.querySelector('#speech'),ring=document.querySelector('#actions');
let state={type:'miso',action:'idle',scale:.65,direction:1,petX:260,petY:250},time=0,previous=performance.now(),speechTimer,frameTimer=null,menuPage='home';
let swing=0,swingVelocity=0,targetSwing=0,stretch=1,targetStretch=1,hasPainted=false;
let view={l:0,r:520,t:0,b:440};
let menuRects=[];
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
 const order=['top','bottom','left','right'],fitting=order.filter(k=>fits(spots[k].rect));
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
  if(!side){const room={top:topY-view.t,bottom:view.b-bottomY,left:x0-hw-view.l,right:view.r-x0-hw};side=room.top>=room.bottom?'top':'bottom';}
  const sp=spots[side];speech.dataset.side=side;
  if(side==='top'||side==='bottom'){
   speech.style.left=sp.x+'px';speech.style.top=(side==='top'?Math.max(view.t+h+pad,sp.top):sp.top)+'px';speech.style.setProperty('--tail-x',Math.max(10,Math.min(w-18,w/2+x0-sp.x-5))+'px');
  }else{
   speech.style.top=sp.y+'px';speech.style.left=sp.x+'px';speech.style.setProperty('--tail-y',Math.max(10,Math.min(h-18,h/2+(y0-30)-sp.y-5))+'px');
  }
 }
 finishControls();
 function finishControls(){
 const quick=state.quick&&!state.options,off=hw+28,dir=x0+off+22<=view.r?1:-1;
 moreButton.hidden=!quick;moreButton.style.left=(x0+dir*off)+'px';moreButton.style.top=(y0-10)+'px';
 }
}
const specialIcon={miso:'🐭',ember:'🔱',bumble:'🐝',boo:'👻',drowsy:'🥱',merlin:'✨',luffy:'👊'};
function renderMenu(){
 const special=['special',specialIcon[state.type]||'✨','Special'],back=['page:home','↩️','Back'];
 const multi=(state.screens||1)>1&&!state.zone;
 // Each action appears once: signature move on the home page, tricks under Play, calm things under Rest. Screen travel only with 2+ screens.
 const pages={home:[special,['page:play','🎮','Play'],['page:rest','🛋️','Rest and explore'],['reminder','🔔','Reminders'],['settings','⚙️','Settings'],['close','✖️','Close']],play:[['games','🎲','Play games'],['jump','🦘','Jump'],['flip','🤸','Flip'],['dance','🎵','Dance'],['dead','💀','Play dead'],back],rest:[state.roaming===false?['wander','🧭','Explore']:['idle','📍','Stay here'],['sleep','😴','Take a nap'],...(multi?[['visit','🖥️','Next screen']]:[]),back]};
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
  const b=document.createElement('button');b.className='action'+(action==='close'||action==='page:home'?' plain':'');b.dataset.action=action;b.textContent=glyph;b.setAttribute('aria-label',label);
  {const dx=pts[i].x-x,dy=pts[i].y-cy;b.dataset.tip=Math.abs(dx)>Math.abs(dy)*.8?(dx>0?'right':'left'):(dy>0?'down':'up');}
  b.style.left=pts[i].x+'px';b.style.top=pts[i].y+'px';b.style.right='auto';b.style.setProperty('--dx',Math.round((x-pts[i].x)*.55)+'px');b.style.setProperty('--dy',Math.round((cy-pts[i].y)*.55)+'px');b.style.setProperty('--in',i*50+'ms');b.style.setProperty('--out',(n-1-i)*28+'ms');
  ring.append(b);
 });
}
function receive(next){
 if(!state.options&&next.options)menuPage='home';const closing=state.options&&!next.options,rebuild=!closing&&(next.options!==state.options||next.type!==state.type||next.petX!==state.petX||next.petY!==state.petY||next.menuSide!==state.menuSide||next.menuSize!==state.menuSize||next.roaming!==state.roaming||next.screens!==state.screens);
 if(next.type!==state.type){speech.classList.remove('visible');clearTimeout(speechTimer);}
 state=next;clearTimeout(ringTimer);
 if(next.options){ring.classList.remove('closing');ring.hidden=false;}
 else if(closing){menuRects=[];ring.classList.add('closing');ringTimer=setTimeout(()=>{ring.hidden=true;ring.classList.remove('closing');},320);}
 else ring.hidden=true;
 if(rebuild)renderMenu();positionSpeech();canvas.setAttribute('aria-label',companions[next.type].name+' companion. Click for actions or drag to move.');
 if(next.action!=='carried'){targetSwing=0;targetStretch=1;}
 const crossing=['portalOut','portalIn','phase','travel'].includes(next.action);
 if(next.message&&!crossing){speech.textContent=/\p{Extended_Pictographic}/u.test(next.message)?next.message:next.message+' ✨';speech.classList.toggle('notice',next.message.startsWith('📩'));speech.classList.add('visible');clearTimeout(speechTimer);speechTimer=setTimeout(()=>speech.classList.remove('visible'),['attention','alert'].includes(next.action)?14000:next.message.startsWith('📩')?8000:next.message.length<20?2600:5500);}
 if(crossing||['jump','flip','pounce'].includes(next.action)||(next.action==='carried'&&!speech.textContent.startsWith('🔔')))speech.classList.remove('visible');
 positionSpeech();restart();
}
window.pet.subscribe(receive);window.pet.read().then(receive);
let clip=null,lift=0,ringTimer,lookTarget={x:0,y:0},look={x:0,y:0};
window.pet.look(v=>{lookTarget=v||{x:0,y:0};if(!state.paused&&!frameTimer)restart();});
window.pet.view(v=>{view=v;if(state.options&&!ring.hidden&&!ring.classList.contains('closing'))renderMenu();positionSpeech();});
const moreButton=document.createElement('button');moreButton.id='morebtn';moreButton.textContent='⋯';moreButton.setAttribute('aria-label','More actions');moreButton.hidden=true;document.body.append(moreButton);
moreButton.addEventListener('click',()=>window.pet.command('more'));window.pet.clip(c=>{clip=c;});
window.pet.motion(v=>{targetSwing=Math.max(-.78,Math.min(.78,v.x/1500));targetStretch=1+Math.max(-.06,Math.min(.09,v.y/9000));});
canvas.addEventListener('pointerdown',e=>{if(e.button===0){canvas.setPointerCapture(e.pointerId);window.pet.command('down');}});
canvas.addEventListener('pointerup',e=>{if(e.button===0)window.pet.command('up');});
canvas.addEventListener('lostpointercapture',()=>window.pet.command('up'));
canvas.addEventListener('pointercancel',()=>window.pet.command('up'));
window.addEventListener('blur',()=>{if(state.action==='carried')window.pet.command('up');});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();window.pet.command('menu');});
canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.pet.command('menu');}});
speech.addEventListener('click',()=>window.pet.command(speech.classList.contains('notice')?'notifications':'menu'));
ring.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const action=b.dataset.action;if(action.startsWith('page:')){menuPage=action.slice(5);renderMenu();}else window.pet.command(action);});
// Clicking empty space around the pet closes the menu; choosing an option does not.
document.addEventListener('pointerdown',e=>{if(!state.playing&&state.options&&e.target!==canvas&&!e.target.closest('.action'))window.pet.command('close');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menuPage!=='home'){menuPage='home';renderMenu();}else window.pet.command('close');}});
function frame(){
 frameTimer=null;if((document.hidden||state.hidden)&&hasPainted)return;
 const now=performance.now(),dt=Math.min((now-previous)/1000,.1);previous=now;
 if(!state.paused||state.action==='carried')time+=dt;
 const spring=advanceSwing(swing,swingVelocity,targetSwing,dt);swing=spring.swing;swingVelocity=spring.velocity;stretch+=(targetStretch-stretch)*Math.min(1,dt*10);
 lift+=((state.climb||0)-lift)*Math.min(1,dt*4);look.x+=(lookTarget.x-look.x)*Math.min(1,dt*9);look.y+=(lookTarget.y-look.y)*Math.min(1,dt*9);ctx.clearRect(0,0,520,440);ctx.save();
 if(clip){const x=state.petX+clip.dx;clip.keepLeft?ctx.rect(0,0,Math.max(0,x),440):ctx.rect(Math.min(520,x),0,520,440);ctx.clip();}
 drawPet(ctx,{...state,gameHand:window.petGameHand,swing,stretch,climb:lift,look},time,(Date.now()-(state.started||Date.now()))/1000,state.petX,state.petY,state.scale);ctx.restore();

 hasPainted=true;if(document.hidden||state.hidden)return;
 if(!state.paused||state.action==='carried'||Math.abs(swing)+Math.abs(swingVelocity)>.002)frameTimer=setTimeout(frame,1000/((['idle','sleep'].includes(state.action)||(state.action==='dead'&&Date.now()-state.started>1500&&state.until-Date.now()>1500))?15:30));
}
function restart(){clearTimeout(frameTimer);frameTimer=null;previous=performance.now();frame();}
document.addEventListener('visibilitychange',restart);

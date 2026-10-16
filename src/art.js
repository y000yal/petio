// Shared pixel artwork for the desktop pet and live wardrobe previews.
const companions = {
 miso: { name:'Miso', label:'Curious cat, tiny troublemaker', color:'#ffa63f', shade:'#bf6325', glow:'#ffd276', detail:'Twitchy ears, a swishing tail, and a love of exploring.' },
 drowsy: { name:'Drowsy', label:'Professional nap enthusiast', color:'#419def', shade:'#235492', glow:'#76d6ff', detail:'Sleepy eyes and the coziest little yawn.' },
 ember: { name:'Ember', label:'Small horns, big feelings', color:'#e95159', shade:'#8e293a', glow:'#ff797a', detail:'A mischievous spark with a dancing devil tail.' },
 bumble: { name:'Bumble', label:'Your busiest little cheerleader', color:'#ffd557', shade:'#b88526', glow:'#ffe590', detail:'Fluttering wings and a bouncy flight between screens.' },
 boo: { name:'Boo', label:'A very friendly haunting', color:'#ffffff', shade:'#c9cde0', glow:'#f6f5ff', detail:'Floats, drifts, and passes straight through screen edges.' },
 merlin: { name:'Merlin', label:'A pocket-sized witch', color:'#9660de', shade:'#4d2d8b', glow:'#c38aff', detail:'Conjures a portal to travel to another monitor.' },
 luffy: { name:'Luffy', label:'A rubbery robot pup', color:'#c47a3c', shade:'#9c5226', glow:'#ffc531', detail:'Loyal, bouncy and very stretchy. Dreams of being king of the desktop.' },
};
const signatureActions={miso:'⌁ Pounce',ember:'♆ Summon',bumble:'〰 Happy buzz',boo:'◌ Vanish',drowsy:'☾ Big yawn',merlin:'✧ Cast a spell',luffy:'👊 Rubber punch'};
function drawPet(ctx, state, t, age, x, y, scale = 1) {
 const type=companions[state.type]?state.type:'miso', p=companions[type];
 const a=state.action||'idle', moving=['walk','travel','phase','portalOut','portalIn'].includes(a), vertical=moving&&Math.abs(state.climb||0)>.3, goingUp=vertical&&state.climb<0, walking=moving&&!vertical, happy=['happy','pet','scratch','expect','alert','dance','attention','hug','grow','hover','pose','nuzzle','greet','play','spark','circle'].includes(a), sleeping=a==='sleep'||a==='yawn';
 const s=Math.min(1, age/Math.max(.1,((state.until||0)-(state.started||0))/1000||1));
 const pose=actionPose(a,a==='pounce'?(age%1.4)/1.4:s,t,type,a==='welcome'?(state.excite||1):(state.need||0));
 const broom=type==='merlin'&&moving,weary=moving&&type==='drowsy',gait=broom?0:weary?t*3.6:t*10;
 const follow=Math.max(-4,Math.min(4,-(state.swing||0)*7+(broom?0:moving?Math.sin(gait-1)*(weary?.35:1.2):Math.sin(t*2-1)*.45)+pose.bend*.5-pose.y*.035));
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
 ctx.save(); ctx.translate(x,y); ctx.scale(4*scale,4*scale); ctx.translate(-30,-40);ctx.imageSmoothingEnabled=false;
 r(20,61,20,1,'#05091335');r(23,62,14,1,'#05091318');
 if(state.swing){ctx.translate(30,12);ctx.rotate(state.swing);ctx.scale(1,state.stretch||1);ctx.translate(-30,-12);}
 if(a==='scare'&&type==='boo')ctx.globalAlpha*=s<.5?.2:1;
 if(a==='vanish')ctx.globalAlpha=Math.max(.08,Math.abs(Math.cos(s*Math.PI)));
 if(type==='boo'){
  const split=state.travelSplit||.5,fade=s<split?1-s/split:(s-split)/(1-split);
  ctx.globalAlpha*=a==='phase'&&!state.travelContinuous?(fade*fade*(3-2*fade))*.91:.91;
 }
 const flying=type==='bumble'||type==='boo';
 let bounce=flying||broom?Math.sin(t*2.4)*1.5-2:moving?(weary?1.8+Math.sin(gait)*.2:Math.abs(Math.sin(t*9))*1.2):Math.sin(t*2)*.45;
 if(a==='hover')bounce-=Math.sin(age*5)*4+4;
 if(a==='travel'&&!weary)bounce-=Math.abs(Math.sin(age*Math.PI/.9))*9;
 ctx.translate(pose.dx||0,bounce+pose.y);
 ctx.translate(30,60);ctx.scale((1+(1-pose.squash)*.35)*pose.xscale,pose.squash);ctx.translate(-30,-60);if(pose.size!==1){ctx.translate(30,60);ctx.scale(pose.size,pose.size);ctx.translate(-30,-60);}
 if(pose.rotation){ctx.translate(30,43);ctx.rotate(pose.rotation);ctx.translate(-30,-43);}
 if(a==='dead'){
  if(type==='boo')ctx.globalAlpha*=.18+.08*Math.sin(t*2);
  else if(type==='bumble'){ctx.translate(0,4);ctx.translate(30,45);ctx.rotate(Math.min(1,age*2)*Math.PI);ctx.translate(-30,-45);}
  else if(type==='merlin'){ctx.globalAlpha*=.72;}
  else if(type!=='luffy'){ctx.translate(30,53);ctx.rotate(Math.min(1,age*(type==='drowsy'?1.5:4))*Math.PI/2);ctx.translate(-30,-53);}
 }
 if(pose.lean){ctx.translate(30,49);ctx.rotate(pose.lean);ctx.translate(-30,-49);}
 // Drowsy sleeps lying on his side, easing down from upright.
 const lying=type==='drowsy'&&a==='sleep',sm=x=>x*x*(3-2*x),cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));let lyingBase=null;
 // Bedtime: the bed pops in, he strolls over, hops on, lies down, then pulls the blanket up in three tugs (timings in seconds since the nap began).
 const bedIn=sm(cl(age/.6,0,1)),walkTo=sm(cl((age-.6)/.9,0,1)),hopT=cl((age-1.5)/.4,0,1),lieT=sm(cl((age-1.9)/1,0,1)),pullT=cl((age-3)/.55,0,3);
 const pull=pullT>=3?1:(Math.min(2,Math.floor(pullT))+sm(pullT-Math.floor(pullT)))/3;
 if(lying){
  lyingBase=ctx.getTransform();
  ctx.translate(-24*(1-walkTo),-6*sm(hopT)-(age>1.5&&age<1.9?7*Math.sin(Math.PI*hopT):0)-(age<1.5&&walkTo>0&&walkTo<1?Math.abs(Math.sin(age*13))*1.5:0));
  ctx.translate(30+17*lieT,58-10*lieT);ctx.rotate(-Math.PI/2*lieT);ctx.translate(-30,-58);
  if(lieT>0){ctx.save();ctx.setTransform(lyingBase);r(10,61,44,1,'#05091340');r(13,62,38,1,'#05091320');ctx.restore();}
 }
 if((walking||state.meet||(type==='luffy'&&a==='gomu'))&&state.direction<0){ctx.translate(60,0);ctx.scale(-1,1);}
 if(broom){ctx.translate(30,53);ctx.rotate((vertical?0:(state.climb||0)*.5)+Math.sin(t*3)*.03);ctx.translate(-30,-53);}
 if(walking&&flying){ctx.translate(30,39);ctx.rotate((type==='boo'?.14:.48)+Math.sin(t*4)*.04);ctx.translate(-30,-39);}
 const gameHand=(x,y,color)=>{if(!state.playing)return;const hand=state.gameHand;r(x-1,y-1,7,6,'#10111b');r(x,y,5,4,color);if(hand===1){for(let i=0;i<4;i++){r(x+i*2-1,y-6,2,7,'#10111b');r(x+i*2,y-5,1,6,color);}}else if(hand===2){r(x,y-6,2,7,'#10111b');r(x+4,y-6,2,7,'#10111b');r(x,y-5,1,6,color);r(x+4,y-5,1,6,color);}else if(hand!==0){r(x+1,y-4,2,5,color);}};
 const out='#10111b', dark='#191e2b', white='#fff4ed', step=moving||a==='carried'?Math.round(Math.sin(gait)*(weary?.35:2)):0;
 if(lying&&bedIn>0){ // the bed, drawn in the unrotated frame behind him
  ctx.save();ctx.setTransform(lyingBase);ctx.translate(30,65);ctx.scale(bedIn,bedIn);ctx.translate(-30,-65);ctx.globalAlpha*=bedIn;
  r(7,62,3,3,'#6b4429');r(50,62,3,3,'#6b4429');r(6,59,48,3,'#8a5a3c');r(8,53,44,6,'#cdd8f5');r(8,53,44,1,'#eef2ff');r(3,43,4,22,'#6b4429');r(53,49,3,16,'#8a5a3c');r(4,44,2,1,'#a8734f');
  r(8,50,15,4,'#ffffff');r(8,50,15,1,'#ffffff');r(8,53,15,1,'#b9c4e6');
  ctx.restore();
 }
 if(type==='miso'&&pose.ball){
  // Rolling-ball sprite: a curled-up cat (screen patch, ears, striped fur, tail tip) that spins as it travels sideways.
  const cx=30+pose.ball.dx,cy=49;ctx.save();ctx.translate(cx,cy);ctx.rotate(pose.ball.rot);
  const disc=(rad,col)=>{ctx.fillStyle=col;ctx.beginPath();for(let y=-rad;y<=rad;y++){const w=Math.round(2*Math.sqrt(Math.max(0,rad*rad-y*y)));ctx.rect(-w/2,y,w,1);}ctx.fill();};
  disc(12,out);disc(11,p.color);
  ctx.fillStyle=p.shade;ctx.fillRect(-9,3,18,2);ctx.fillRect(-7,7,14,2);ctx.fillRect(-4,-1,10,1);
  r(-10,-9,10,8,out);r(-9,-8,8,6,dark);r(-8,-7,2,3,p.glow);r(-4,-7,2,3,p.glow);
  r(-11,-12,3,4,out);r(-10,-11,1,2,white);r(-3,-13,3,4,out);r(-2,-12,1,2,white);
  r(7,5,6,3,white);r(11,4,2,2,out);
  r(-2,9,3,3,p.shade);
  ctx.restore();ctx.restore();return;
 }
 if(type==='luffy'){
  // Luffy: a robot pup (screen face, floppy ears, cream body with tan joint rings, red collar and bell).
  // Its own sprite set: side walk/run, front sit, back view (going up), front run (going down), sleep, play dead, jump, petting,
  // dog hobbies, and the special: straw hat on, then a stretchy rubber punch.
  const L={o:'#2b1810',B:'#9c5226',b:'#c47a3c',T:'#e2a064',C:'#f6e2c8',c:'#d9bb98',J:'#d48a52',w:'#fffaf0',S:'#141418',W:'#efe7da',Y:'#ffc531',R:'#cf3b2c',G:'#f4b31f',P:'#ff8fa3'};
  const span=(cx,cy,rx,ry,col)=>{ctx.fillStyle=col;ctx.beginPath();const n=Math.ceil(ry);for(let y=-n;y<=n;y++){const k=1-(y*y)/(ry*ry);if(k<0)continue;const hw=rx*Math.sqrt(k);ctx.rect(Math.round(cx-hw),Math.round(cy+y),Math.max(1,Math.round(hw*2)),1);}ctx.fill();};
  const ell=(cx,cy,rx,ry,col,ol=1)=>{if(ol)span(cx,cy,rx+1,ry+1,L.o);span(cx,cy,rx,ry,col);};
  const ring=(cx,cy,R)=>{span(cx,cy,R,R,L.J);span(cx,cy,R-.9,R-.9,L.C);r(cx,cy,1,1,L.J);};
  const blink=t%5<.12;
  const tracking=state.lookAt!==false&&!sleeping&&!['dead','carried','jump','flip','pounce','gomu','sniff','drink'].includes(a);
  const gaze=tracking&&state.look?{x:cl(state.look.x||0,-1,1),y:cl(state.look.y||0,-1,1)}:{x:0,y:0};
  const eye=(x,y,kind,flip)=>{x+=gaze.x*1.3;y+=gaze.y;const c=L.Y;
   if(kind==='happy'){r(x,y+1,1,1,c);r(x+1,y,2,1,c);r(x+3,y+1,1,1,c);}
   else if(kind==='closed'){r(x,y+1,4,1,c);}
   else if(kind==='x'){r(x,y,1,1,c);r(x+2,y,1,1,c);r(x+1,y+1,1,1,c);r(x,y+2,1,1,c);r(x+2,y+2,1,1,c);}
   else if(kind==='angry'){if(!flip){r(x,y,1,1,c);r(x+1,y+1,2,1,c);r(x+1,y+2,2,1,c);}else{r(x+2,y,1,1,c);r(x,y+1,2,1,c);r(x,y+2,2,1,c);}}
   else if(kind==='wide'){r(x,y-1,3,3,c);}
   else{r(x+1,y,2,2,c);}};
  const seye=(x,y,kind)=>{x+=gaze.x*.6;y+=gaze.y*.8;const c=L.Y; // small eye for the side-view screen
   if(kind==='happy'){r(x,y+1,1,1,c);r(x+1,y,1,1,c);r(x+2,y+1,1,1,c);}
   else if(kind==='closed'){r(x,y+1,3,1,c);}
   else if(kind==='x'){r(x,y,1,1,c);r(x+2,y,1,1,c);r(x+1,y+1,1,1,c);r(x,y+2,1,1,c);r(x+2,y+2,1,1,c);}
   else if(kind==='angry'){r(x,y,1,1,c);r(x+1,y+1,2,1,c);}
   else{r(x,y,2,2,c);}};
  const heart=(x,y,c)=>{r(x,y,2,1,c);r(x+3,y,2,1,c);r(x,y+1,5,1,c);r(x+1,y+2,3,1,c);r(x+2,y+3,1,1,c);};
  const hearts=n=>{for(let i=0;i<n;i++){const u=((t*.9+i/n)%1);ctx.globalAlpha=Math.min(1,(1-u)*1.6);heart(20+((i*37)%28)+Math.sin(t*3+i*2)*2,24-u*22,i%2?'#ff7aa8':'#ff9fc4');}ctx.globalAlpha=1;};
  const zzz=()=>{ctx.fillStyle='#9fb3ff';for(let i=0;i<3;i++){const u=(t*.5+i/3)%1;ctx.globalAlpha=1-u;ctx.font=Math.round(4+u*3)+'px monospace';ctx.fillText('z',44+u*8+i*2,44-u*16);}ctx.globalAlpha=1;};
  const hat=(cx,cy)=>{span(cx,cy+3,12,2.6,L.o);span(cx,cy+3,11,1.9,'#d99a2e');span(cx,cy+2.4,10.2,1.1,'#f0c25a');ell(cx,cy-1.2,6,4.2,'#f0c25a');
   r(cx-6,cy,12,2,L.R);for(let i=0;i<6;i++)r(cx-5+((i*5)%11),cy-4+((i*3)%4),1,1,'#c98f2a');r(cx-9,cy+3,2,1,'#c98f2a');r(cx+6,cy+3,2,1,'#c98f2a');};
  const faceKind=a==='dead'?'x':sleeping||blink?'closed':['scratch','pet','relax','happy','dance','welcome','attention','hug'].includes(a)?'happy':a==='beg'||a==='alert'||a==='ping'?'wide':a==='gomu'?'angry':'happy';

  // ---------- side view (facing right) ----------
  const leg=(x,ph,amp,col,air,lie=0,rest=false)=>{
   // Planted paws travel backward relative to the body; lifted paws swing forward.
   const tuck=pose.dog?.tuck||0,sw=air?air:-Math.sin(ph)*amp,lift=Math.max(0,(air?1.5:Math.max(0,-Math.cos(ph))*amp*.7)+tuck);
   const px=x+sw*(1-lie)+(x<28?1:-1)*Math.max(0,tuck)*.5,py=(58-lift)*(1-lie)+(rest?59:45)*lie;
   const hipY=51+3*lie,kx=(x+px)/2+(x<28?-1:1)*(tuck*.4+lie*2),ky=(hipY+py)/2;
   // Two jointed segments make the legs fold instead of shrinking straight rods.
   for(const [ax,ay,bx,by] of [[x,hipY,kx,ky],[kx,ky,px,py]]){const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)));for(let i=0;i<=n;i++){const u=i/n;r(ax+(bx-ax)*u-1,ay+(by-ay)*u,3,3,L.o);r(ax+(bx-ax)*u,ay+(by-ay)*u,1,2,col);}}
   r(px-2,py,5,3,L.o);r(px-1,py,4,2,L.w);
  };
  const side=o=>{
   const lie=o.lie||0,curl=pose.dog?.curl||0;const ph=o.phase||0,run=!!o.run,amp=run?3:1.8,tw=Math.sin(t*(o.wag||6))*(o.wagAmp||1.2),down=o.headDown||0,flap=o.earFlap||0;
   // tail curls up behind
   ell(14+tw*.3,45,2,2,L.b);ell(12+tw*.6,41.5,1.8,1.8,L.b);ell(11.5+tw,38,1.8,1.8,L.C);
   // far legs, a shade darker
   if(o.air){leg(21,0,0,L.c,-3,lie,o.rest);leg(37,0,0,L.c,3,lie,o.rest);}else{leg(21,ph+Math.PI,amp,L.c,0,lie,o.rest);leg(37,ph+(run?Math.PI*1.5:0),amp,L.c,0,lie,o.rest);}
   // body with brown saddle and joint rings
   ell(27,48+6*lie,(run?12:10.5)-3*curl,(run?5:5.5)+2*curl,L.C);span(25,44.6+7*lie,7-2*curl,2.4,L.b);ring(19+2*curl,49+5*lie,2.6);ring(34-2*curl,49+5*lie,2.6);
   // near legs
   if(o.air){leg(18,0,0,L.C,-3.5,lie,o.rest);leg(34,0,0,L.C,3.5,lie,o.rest);}else{leg(18,ph,amp,L.C,0,lie,o.rest);if(!o.punch)leg(34,ph+(run?Math.PI*.5:Math.PI),amp,L.C,0,lie,o.rest);}
   // collar + bell
   r(35,41+down*.4+12*lie,4,8,L.o);r(36,42+down*.4+12*lie,2,6,L.R);ell(38.5,49.5+down*.3+7*lie,1.4,1.4,L.G);
   // head: brown, screen face on the right, floppy ear
   const hx=38+down*.25-6*curl,hy=35+down+18*lie;ctx.save();ctx.translate(hx+(moving?0:gaze.x),hy+gaze.y*.7);ctx.rotate((moving?0:gaze.x)*.06);ctx.scale(1.3,1.25);ctx.translate(-hx,-hy);
   ell(hx,hy,9,8,L.b);ell(hx+2,hy+.5,6.6,6.6,L.W,0);span(hx+2.4,hy+.5,5.3,5.4,L.S);r(hx-1,hy-4,3,1,'#77777d');
   const k=o.face||faceKind;if(o.punch){span(hx+2.4,hy+.5,5.3,5.4,L.W);span(hx+4,hy+.5,3.7,5.4,L.S);seye(hx+4,hy-1.2,k);}else{seye(hx+.8,hy-1.2,k);seye(hx+4.3,hy-1.2,k);}
   if(o.tongue)r(hx+6,hy+4,2,2+Math.round(Math.abs(Math.sin(t*10))),L.P);
   ell(hx-6.2,hy+2.2+flap,3.5,5.8,L.B);span(hx-5.8,hy+2+flap,2.4,4.6,L.b);hat(hx-1,hy-10+flap*.2);ctx.restore();
  };
  // ---------- front sitting ----------
  const frontSit=o=>{
   const tw=Math.sin(t*(o.wag||5))*(o.wagAmp||1.5),fl=o.earFlap||0;
   ell(41+tw*.4,52,2,2,L.b);ell(43+tw,48.5,1.8,1.8,L.C);
   ell(30,55,9,5.5,L.C);ring(22.5,55,2.5);ring(37.5,55,2.5);
   ell(30,49,6.5,6,L.C);r(26,49,8,1,L.T);r(27,52,6,1,L.T);
   for(const [x,up] of [[26.5,o.pawL||0],[33.5,o.pawR||0]]){r(x-2,50-up,5,10,L.o);r(x-1,50-up,3,9,L.C);ring(x,51-up,1.8);r(x-2,58-up,5,3,L.o);r(x-1,58-up,4,2,L.w);}
   r(23,42,14,3,L.o);r(24,43,12,1,L.R);ell(30,46.4,1.6,1.6,L.G);
   ctx.save();ctx.translate(30+gaze.x,35+gaze.y*.7);ctx.rotate(gaze.x*.075);ctx.scale(1.3,1.2);ctx.translate(-30,-35);ell(20.2,38+fl,2.4,6.4,L.B);ell(39.8,38-fl,2.4,6.4,L.B);span(20.2,39+fl,1.1,4.4,L.b);span(39.8,39-fl,1.1,4.4,L.b);
   ell(30,28.6,7.6,4.2,L.b);ell(30,34.5,8.4,7.3,L.W);span(30,35,6.9,5.8,L.S);
   const k=o.face||faceKind;eye(25,33,k);eye(32,33,k,true);
   if(o.tongue)r(29,38,2,2,L.P);hat(30,23+fl*.15);ctx.restore();
  };
  // ---------- front run (going down) and back view (going up) ----------
  const frontRun=()=>{const ph=t*10,st=Math.round(Math.sin(ph)*1.5);
   ell(30,52,6.5,5,L.C);ring(26,52,1.8);ring(34,52,1.8);
   for(const [x,o2] of [[26,st],[34,-st]]){r(x-2,53,5,7-Math.max(0,o2),L.o);r(x-1,53,3,6-Math.max(0,o2),L.C);r(x-2,58-Math.max(0,o2),5,3,L.o);r(x-1,58-Math.max(0,o2),4,2,L.w);}
   r(23,42,14,3,L.o);r(24,43,12,1,L.R);ell(30,46.4,1.6,1.6,L.G);
   ell(20.2,38+Math.sin(t*10)*.6,2.4,6.4,L.B);ell(39.8,38-Math.sin(t*10)*.6,2.4,6.4,L.B);ell(30,28.6,7.6,4.2,L.b);ell(30,34.5,8.4,7.3,L.W);span(30,35,6.9,5.8,L.S);
   eye(25,33,blink?'closed':'dot');eye(32,33,blink?'closed':'dot');};
  const back=()=>{const ph=t*10,st=Math.round(Math.sin(ph)*1.5),tw=Math.sin(t*7)*1.5;
   for(const [x,o2] of [[25,st],[35,-st]]){r(x-2,52,5,8-Math.max(0,o2),L.o);r(x-1,52,3,7-Math.max(0,o2),L.C);r(x-2,58-Math.max(0,o2),5,3,L.o);r(x-1,58-Math.max(0,o2),4,2,L.w);}
   ell(30,51,8,6,L.C);span(30,47.5,6,2.6,L.b);ring(23.5,52,2.2);ring(36.5,52,2.2);
   ell(30+tw*.5,44,1.8,3.2,L.b);ell(30+tw,40.5,1.6,1.6,L.C);
   r(24,40,12,2,L.o);r(25,40,10,1,L.R);
   ell(30,33.5,8,7.2,L.b);span(30,29.5,5.6,2,'#d48d4c');r(29,31,2,6,L.B);ell(21.4,38+Math.sin(t*10)*.6,2.3,6,L.B);ell(38.6,38-Math.sin(t*10)*.6,2.3,6,L.B);};

  // ---------- pick the sprite for what the pup is doing ----------
  if(a==='gomu'){
   const q=pose.punch||luffyPunchPose(s);
   // Side profile: three paws brace the body while the near forepaw punches.
   side({punch:true,face:s<.12||s>.8?'happy':q.impact?'wide':'angry',earFlap:q.wave*.3-q.lean*8,wag:s>.8?12:4});
   if(q.paw>.05){
    const x0=36,y0=49-q.paw*.35,fx=x0+q.reach,fy=y0-4*Math.min(1,Math.max(0,q.reach)/48);
    // Pixel-built curved limb: bends under tension and ripples on recoil.
    const n=Math.max(8,Math.ceil(Math.abs(q.reach)*1.5)),width=3.5-Math.max(0,q.reach)/70;
    for(let pass=0;pass<2;pass++)for(let i=0;i<=n;i++){
     const f=i/n,x=x0+(fx-x0)*f,y=y0+(fy-y0)*f+Math.sin(f*Math.PI)*q.wave;
     const w=width+(pass===0?2:0);r(x-w/2,y-w/2,w,w,pass===0?L.o:f<.3||f>.75?L.C:L.T);
    }
    const radius=2.5+Math.max(0,q.reach)/20;ell(fx,fy,radius,radius,L.C);
    r(fx-radius+1,fy-radius+1,Math.max(2,radius),1,L.w);
    for(let i=0;i<3;i++)r(fx-1+i*1.6,fy-1,1,3,L.c);
    ring(x0,y0,1.8);
    if(s>.32&&s<.48){for(let i=0;i<3;i++)r(fx-12-i*4,fy-7+i*6,7+i*2,1,i%2?L.Y:L.w);}
    if(q.impact){const burst=(s-.36)/.08;ctx.save();ctx.globalAlpha=1-burst;
     for(let i=0;i<7;i++){const angle=-1.2+i*.4,d=7+burst*8;r(fx+Math.cos(angle)*d,fy+Math.sin(angle)*d,2,2,i%2?L.Y:L.w);}ctx.restore();}
   }
  }
  else if(a==='dead'){
   const duration=Math.max(2,((state.until||12000)-(state.started||0))/1000),remaining=duration-age;
   const recover=sm(cl((1.4-remaining)/1.4,0,1)),collapse=sm(cl((age-.3)/.9,0,1))*(1-recover);
   const settle=age>1.2?Math.sin((age-1.2)*18)*Math.exp(-(age-1.2)*7):0;
   ctx.save();ctx.translate(0,settle*(1-recover));
   side({lie:collapse,face:age<.3?'wide':recover>.6?'closed':'x',headDown:recover>0?-2*Math.sin(recover*Math.PI):0,earFlap:collapse*2,tongue:collapse>.9,wag:1,wagAmp:.15});
   ctx.restore();if(age<.3){r(49,22,1,3,L.Y);r(51,23,1,2,L.Y);}
  }
  else if(a==='sleep'){
   const settle=sm(cl(age/1.2,0,1)),breath=Math.sin(t*1.6)*.22;
   ctx.save();ctx.translate(0,breath*settle);
   side({lie:.83*settle,rest:true,face:'closed',headDown:settle,earFlap:1.5*settle,wag:1,wagAmp:.15});ctx.restore();zzz();
  }
  else if(vertical&&goingUp){back();hat(30,23);}
  else if(vertical){frontRun();hat(30,23);}
  else if(moving){const fast=a==='travel'||a==='phase'||state.speed>80;side({phase:t*(fast?14:9),run:fast,tongue:fast,earFlap:Math.sin(t*12)*(fast?1.2:.5),wag:9});}
  else if(a==='welcome'){side({phase:t*14,run:true,tongue:true,face:'happy',earFlap:Math.sin(t*12),wag:14,wagAmp:2});}
  else if(['jump','flip','ping','pounce'].includes(a)){const q=pose.dog||{};side({air:pose.y<-3,face:pose.face==='focused'?'angry':pose.face,headDown:q.headDip||0,earFlap:q.ears||0,wag:8});}
  else if(['scratch','pet','relax'].includes(a)){side({face:'happy',wag:16,wagAmp:2.2,earFlap:Math.sin(t*5)*.8,tongue:a!=='relax'});hearts(a==='scratch'?5:3);}
  else if(a==='sniff'){side({phase:Math.sin(t*2)*.4,headDown:6,wag:8,face:'happy'});for(let i=0;i<2;i++)r(50+i*3,56-((t*6+i*2)%4),1,1,'#ffffffb0');}
  else if(a==='drink'){side({headDown:6,wag:6,face:'closed',tongue:Math.sin(t*9)>0});r(46,57,10,4,L.o);r(47,57,8,3,'#3b7fd1');r(47,57,8,1,'#8fd3ff');}
  else if(a==='tailchase'){const dir=Math.cos(t*5)>=0?1:-1;ctx.save();ctx.translate(30,0);ctx.scale(dir,1);ctx.translate(-30,0);side({phase:t*14,run:true,face:'happy',wag:16,wagAmp:2.5,tongue:true});ctx.restore();for(let i=0;i<3;i++)r(14+i*12+Math.sin(t*9+i)*2,60,3,1,'#c9b49a');}
  else if(a==='earscratch'){frontSit({face:'closed',earFlap:Math.sin(t*22)*1.2,wag:8});const k=Math.round(Math.sin(t*24));r(37,40+k,5,4,L.o);r(38,41+k,3,2,L.C);r(43,38,1,2,'#ffffff');r(44,41,2,1,'#ffffff');}
  else if(a==='dance'){const b=Math.sin(t*8);frontSit({pawL:b>0?4:0,pawR:b<0?4:0,wag:12,wagAmp:2,tongue:true});}
  else if(a==='expect'){frontSit({face:'happy',wag:18,wagAmp:2.6,tongue:true,earFlap:Math.sin(t*9)*.6});}
  else if(a==='beg'||a==='alert'){frontSit({pawL:4+Math.round(Math.sin(t*12)),pawR:4-Math.round(Math.sin(t*12)),wag:14,wagAmp:2.2,tongue:true});}
  else if(a.startsWith('game')||['socialTalk','socialListen','greet'].includes(a)){frontSit({pawL:Math.max(0,pose.leftArm*.5),pawR:Math.max(0,pose.rightArm*.6),face:pose.face==='focused'?'angry':pose.face,wag:8,earFlap:Math.sin(t*6)*.5});r(38,47-pose.rightArm/2,5,3,L.C);gameHand(42,51-pose.rightArm,L.C);}
  else frontSit({wag:a==='happy'||a==='curious'?8:4,tongue:a==='happy'});
  if(['welcome'].includes(a))for(let i=0;i<8;i++){const u=(t*1.2+i*.37)%1;r(8+((i*53)%46),14+u*44,2,2,['#ffc531','#cf3b2c','#f6e2c8','#c47a3c'][i%4]);}
  ctx.restore();return;
 }
 if(type==='boo'){
  // Classic bedsheet ghost, same in every pose: plain white sheet, two black oval eyes, no mouth, no arms.
  const sway=Math.sin(t*5),W=y=>y<30?[9,13,17,19,21,22][y-24]:22+Math.round((y-30)*.24),line='#c9cde0';
  const body=(g,col)=>{ctx.fillStyle=col;ctx.beginPath(); // one path per fill so scaled rows never show hairline seams
   for(let y=24-(g?1:0);y<=55+(g?1:0);y++){const w=W(Math.max(24,Math.min(55,y)));ctx.rect(Math.round(30.5-w/2)-g,y,w+g*2,1);}
   const w0=W(55),x0=Math.round(30.5-w0/2);
   for(let k=0;k<4;k++){const len=3+Math.round(Math.sin(t*(moving?6:2.5)+k*1.4)*1.2)+(k%2?1:0);ctx.rect(x0+Math.round(k*w0/4)-g,56,Math.round(w0/4)+g*2-(k<3?1:0),len+(g?1:0));}
   ctx.fill();
  };
  ctx.save();ctx.translate(0,sway*.5);
  body(1,line);body(0,'#ffffff');
  if(state.playing||['socialTalk','greet'].includes(a)){r(41,44-pose.rightArm/2,5,3,line);r(42,44-pose.rightArm/2,4,2,'#ffffff');gameHand(46,49-pose.rightArm,'#ffffff');}
  r(46-3,34,2,20,'#eef0f8');r(25,44,1,11,'#e6e9f4');r(35,46,1,9,'#e6e9f4'); // soft folds in the sheet
  const face=a==='dead'?'dead':sleeping||t%6<.14?'closed':['scratch','pet','hug'].includes(a)?'happy':pose.face,eye=(x,kind)=>{
   if(kind==='dead'){for(let k=0;k<4;k++){r(x+k,34+k,1,1,dark);r(x+3-k,34+k,1,1,dark);}}
   else if(kind==='closed'||kind==='squeezed'||kind==='focused'){r(x,37,4,1,dark);r(x+1,38,2,1,dark);}
   else if(kind==='happy'){r(x,38,1,1,dark);r(x+1,37,2,1,dark);r(x+3,38,1,1,dark);}
   else if(kind==='surprised'){r(x,32,4,8,dark);r(x+1,31,2,1,dark);r(x+1,40,2,1,dark);}
   else{r(x+1,32,2,1,dark);r(x,33,4,4,dark);r(x+1,37,2,1,dark);}
  };
  const gx=state.look&&face==='normal'?Math.round(state.look.x*2.5):0,gy=(state.look&&face==='normal'?Math.round(state.look.y):0)+(vertical&&!goingUp?2:0);ctx.save();ctx.translate(gx,gy);
  if(!goingUp){eye(24,face==='wink'?'normal':face);eye(34,face);} // seen from behind there is no face
  ctx.restore();
  const wv=Math.sin(t*3);
  if(a==='scratch'||a==='pet'||a==='relax'){ // hearts and rosy cheeks for a happy ghost
   const heart=(x,y,c)=>{r(x,y,2,1,c);r(x+3,y,2,1,c);r(x,y+1,5,1,c);r(x+1,y+2,3,1,c);r(x+2,y+3,1,1,c);},n=a==='scratch'?5:3;
   for(let i=0;i<n;i++){const u=((t*(a==='scratch'?.9:.6)+i/n)%1);ctx.globalAlpha=Math.min(1,(1-u)*1.6);heart(17+((i*37)%30)+Math.sin(t*3+i*2)*2,26-u*24,i%2?'#ff7aa8':'#ff9fc4');}
   ctx.globalAlpha=1;r(22,40,3,1,'#f7a4c7');r(37,40,3,1,'#f7a4c7');
  }
  if(a==='drink'){const c=(t%3)/3,sipK=c>.25&&c<.75?Math.sin((c-.25)/.5*Math.PI):0,lift=Math.round(sipK*-4);
   r(40,41,7,4,line);r(41,42,5,2,'#ffffff');r(43,38+lift,7,10,'#10111b');r(44,39+lift,5,8,'#d9efff');r(44,43+lift,5,4,'#6fc8ff');r(46,34+lift,1,5,'#ff7866');
   r(24,46,13,Math.round(2+sipK*6),'#8fd3ff66'); // the water visibly passes right through
   r(49,9+Math.round(wv),1,1,'#6fc8ff');r(48,10+Math.round(wv),3,1,'#6fc8ff');r(47,11+Math.round(wv),5,3,'#6fc8ff');r(48,14+Math.round(wv),3,1,'#6fc8ff');}
  if(a==='peekaboo'&&pose.leftArm>0){r(21,32,8,7,line);r(22,33,6,5,'#ffffff');r(33,32,8,7,line);r(34,33,6,5,'#ffffff');}
  if(a==='lantern'){const by=Math.round(wv);r(40,41,7,4,line);r(41,42,5,2,'#ffffff');r(45,37+by,1,5,'#8a5a3c');r(43,43+by,7,9,'#10111b');r(44,44+by,5,7,'#ffe9a0');r(46,46+by+(Math.sin(t*14)>0?0:1),1,3,'#ff9f3d');r(41,41+by,11,13,'#ffe9a01c');}
  if(a==='spook'){const w2=Math.round(Math.sin(t*6)*2);r(14,31+w2,6,4,line);r(15,32+w2,4,2,'#ffffff');r(42,31-w2,6,4,line);r(43,32-w2,4,2,'#ffffff');for(let i=0;i<3;i++){const y=14-((t*5+i*2)%9);r(26+i*5,y,3,3,'#9fb0ff');r(27+i*5,y+1,1,1,'#2a3558');}}
  ctx.restore();ctx.restore();return;
 }
 ctx.save();
 if(walking){ctx.translate(30,47);ctx.scale(flying?.88:.68,1);ctx.rotate(flying?Math.sin(t*4-1)*.08:weary?.18:.06);ctx.translate(-30-(flying?2:0),-47);}
 // Distinct silhouettes: tail, wings, sprout, hat and ghost hem.
 if(type==='miso'||type==='ember'){
  const swish=a==='expect'?Math.sin(t*16)*3:Math.sin(t*4)*2; // tail wags hard while waiting for a pet
  r(37,50,7,3,p.shade);r(42,46+swish,3,7,p.color);r(44,43+swish,3,4,type==='miso'?white:p.color);
  if(type==='ember'){r(43,42+swish,5,2,p.color);r(46,40+swish,2,4,p.color);}
 }
 if(type==='bumble'){
  const flap=Math.round(Math.sin(t*(pose.y<0?35:20))*(pose.y<0?4:2));r(17,46+flap,6,6,'#c9e8fa');r(15,45+flap,5,4,white);r(38,46-flap,6,6,'#c9e8fa');r(42,44-flap,4,4,white);
 }
 if(type==='boo'){
  r(22,43,17,9,p.color);
  if(walking){
   const wave=Math.sin(t*2.4-1)*1.2;r(18,49,16,5,p.color);r(13,52+wave,14,4,p.color);r(8,54+wave,12,3,p.color);r(5,55+wave,7,2,p.color);
   r(18,52,7,2,p.shade);r(11,55+wave,7,1,p.shade);
  }else{r(24,51,13,5,p.color);r(27,56,10,3,p.color);r(31,59,8,2,p.color);r(22,48,3,5,p.shade);r(25,52,3,4,p.shade);r(30,56,3,3,p.shade);}
 } else {
  r(24,45,13,11,out);r(25,45,11,10,p.shade);r(27,46,8,8,p.color);
  if(type==='bumble'){r(25,48,11,2,dark);r(25,53,11,2,dark);}
  else if(goingUp){r(30,46,1,8,p.shade);r(27,48,7,1,p.shade);r(27,51,7,1,p.shade);r(28,53,5,1,p.shade);}else {r(29,49,4,4,dark);r(30,49,2,2,type==='merlin'?'#ffcf66':p.glow);}
  if(type==='merlin'){r(23,51,15,5,p.shade);r(22,55,17,2,p.color);}
  if(type!=='bumble'&&!broom){
   if(weary){const shuffle=Math.sin(gait)*1.8;r(25,55,4,4,out);r(32,55,4,4,out);r(23+shuffle,59,6,2,p.shade);r(32-shuffle,59,6,2,p.shade);}
   else if(pose.bend>.4){const k=Math.round(pose.bend);r(24-k/2,54,5,3,out);r(23-k/2,56-k/2,3,3,p.shade);r(23-k/2,58-k-pose.leftFoot,5,2,p.color);r(32+k/2,54,5,3,out);r(35+k/2,56-k/2,3,3,p.shade);r(33+k/2,58-k-pose.rightFoot,5,2,p.color);}
   else{r(25,55,4,4+step,out);r(32,55,4,4-step,out);r(24,58+step-pose.leftFoot,5,2,p.shade);r(32,58-step-pose.rightFoot,5,2,p.shade);}
  }
 }
 const arm=a==='hug'?-3:a==='carried'?-4:a==='dance'||a==='attention'?Math.round(Math.sin(t*8)*3):step;
 if(type==='boo'){r(20,45-pose.leftArm/2,4,4,p.color);r(38,45-pose.rightArm/2,4,4,p.color);}
 else if(type!=='bumble'){
  if(pose.leftArm||pose.rightArm){
   for(const [side,lift]of [[-1,pose.leftArm],[1,pose.rightArm]]){const sx=side<0?22:38,hx=sx+side*Math.min(4,Math.abs(lift)),hy=51-lift;r(sx,46,3,4,out);r(sx+side*2,47-lift/2,3,4,p.shade);r(hx,hy,4,3,p.color);}
  }else{
   r(21,46+arm,3,7,out);r(21,47+arm,2,4,p.shade);r(20,52+arm,4,3,p.color);
   r(37,46-arm,3,7,out);r(38,47-arm,2,4,p.shade);r(38,52-arm,3,3,p.color);
  }
 }
 if(type==='merlin'){r(42,40-arm,1,14,'#9d784f');r(40,39-arm,5,2,'#ffcc63');r(42,37-arm,1,6,'#ffe5a0');}
 if(type==='ember'&&a==='trident'){
  const reveal=Math.min(1,age*2.5,Math.max(0,(1-s)*8));ctx.save();ctx.globalAlpha*=reveal;
  r(44,32+(1-reveal)*20,2,25*reveal,'#ffb269');r(40,32,10,2,'#ff7866');r(40,26,2,8,'#ff7866');r(44,24,2,10,'#ffd07c');r(48,26,2,8,'#ff7866');r(38,26,2,2,'#ffcc83');r(50,26,2,2,'#ffcc83');r(39,47,6,3,p.color);
  for(let i=0;i<4;i++)r(43+Math.sin(age*5+i)*7,54-(age*14+i*7)%27,1,2,'#ffcb7d');ctx.restore();
 }
 ctx.restore();
 if(broom){for(let i=0;i<6;i++){const life=(t*14+i*5)%30;ctx.globalAlpha*=1;r(4-life*.9,52+Math.sin(t*8+i*2)*2.5+(i%2?2:0),1,1,i%2?'#ffe08a':'#c38aff');}const wob=Math.sin(t*6)*.6;r(28,55,4,5,out);r(35,55,4,4,out);r(34,59,5,2,p.shade);r(5,50+wob,9,6,'#d9a441');r(3,51+wob,3,4,'#b07a2a');r(13,50+wob,2,6,'#6b4a2a');r(14,52+wob,36,2,'#9d784f');r(50,51+wob,2,4,'#6b4a2a');}
 // Each head keeps a different silhouette even with its accessories hidden.
 ctx.save();
 if(weary){ctx.translate(32,42);ctx.rotate(.16+Math.sin(gait-1)*.025);ctx.translate(-30,-40);}
 const lk=state.look&&!sleeping&&a!=='dead'&&a!=='carried'&&!lying?state.look:{x:0,y:0},lx=moving?0:lk.x,ly=walking?lk.y*.5:vertical?0:lk.y;
 ctx.translate(lx*3.8,ly*2.4+(vertical?(goingUp?-2:2):0)); // moving up/down: chin raised going up, lowered going down
 ctx.translate(30,40);ctx.rotate(lx*.11);ctx.translate(-30,-40);
 const shape={miso:[1.08,.94],ember:[.94,1.06],bumble:[1.08,.84],boo:[.94,1.1],drowsy:[1.16,.82],merlin:[.88,1.12]}[type];
 ctx.translate(30,36);ctx.scale(...shape);ctx.translate(-30,-36);
 if(walking){
  // A real side profile: narrow screen on the leading edge, rear shell and one eye.
  r(23,27,17,18,out);r(24,28,14,16,p.shade);r(24,29,6,13,p.color);r(31,29,9,14,p.color);r(34,31,7,10,dark);if(weary){r(36,36,4,1,p.glow);r(37,37,2,1,p.glow);}else r(37,33,2,5,p.glow);r(26,32,2,7,p.shade);
  if(type!=='boo'&&type!=='bumble'){r(29,47,4,7,p.color);r(30,52+step,3,3,p.shade);}
 }else{
  if(type==='boo'||type==='bumble'){
   // Stepped rounded dome: ghost hood and bee's oval casing.
   r(24,25,13,2,out);r(21,27,19,2,out);r(19,29,23,13,out);r(21,42,19,3,out);
   r(24,26,13,2,p.color);r(21,28,19,4,p.color);r(20,31,21,10,p.color);r(22,41,17,3,p.shade);
   r(23,30,15,2,dark);r(21,32,19,8,dark);r(23,40,15,2,dark);
  }else{
   r(20,26,21,20,out);r(18,28,25,16,out);r(20,27,21,18,p.shade);r(19,29,23,14,p.color);r(21,28,19,1,white);r(21,30,19,12,dark);r(22,31,17,1,'#28303d');
  }
  if(goingUp){ // back of the head: a solid shell in the body colour with seams, vents and bolts (no display)
   if(type==='bumble'){r(21,32,19,8,p.color);r(21,34,19,2,dark);r(21,38,19,2,dark);r(30,32,1,8,p.shade);r(22,33,1,1,white);r(38,33,1,1,white);}
   else{
    r(21,30,19,12,p.color);r(21,30,19,1,p.shade);r(21,41,19,1,p.shade);r(30,31,1,10,p.shade);
    for(let i=0;i<3;i++){r(24,33+i*2,5,1,p.shade);r(32,33+i*2,5,1,p.shade);}
    r(22,31,1,1,white);r(38,31,1,1,white);r(22,40,1,1,white);r(38,40,1,1,white);r(29,38,3,2,p.glow);
   }
  }
  else if(a==='dead'){
   for(const ex of [25,34]){r(ex,34,1,1,p.glow);r(ex+2,34,1,1,p.glow);r(ex+1,35,1,1,p.glow);r(ex,36,1,1,p.glow);r(ex+2,36,1,1,p.glow);}
  }else if(pose.face==='surprised'){r(24,32,3,6,p.glow);r(34,32,3,6,p.glow);r(29,38,3,3,p.glow);r(30,39,1,1,dark);}
  else if(pose.face==='focused'||pose.face==='squeezed'){r(24,35,4,1,p.glow);r(33,35,4,1,p.glow);r(25,34,2,1,p.glow);r(34,34,2,1,p.glow);}
  else if(pose.face==='wink'){r(24,35,4,1,p.glow);r(34,33,2,4,p.glow);}
  else if(sleeping||type==='drowsy'||t%6<.14){r(24,36,4,1,p.glow);r(33,36,4,1,p.glow);r(25,37,2,1,p.glow);r(34,37,2,1,p.glow);}
  else if(type==='byte'){r(23,33,6,4,'#0a101b');r(32,33,6,4,'#0a101b');r(29,34,3,1,p.glow);r(24,33,3,1,p.glow);r(33,33,3,1,p.glow);r(25,34,2,1,'#99efff');r(34,34,2,1,'#99efff');}
  else if(happy){for(const ex of [24,33]){r(ex,34,4,1,p.glow);r(ex-1,35,1,2,p.glow);r(ex+4,35,1,2,p.glow);}}
  else{const ex=Math.round(lx*2.2),ey=Math.round(ly*1.6)+(vertical?2:0);r(24+ex,33+ey,2,5,p.glow);r(35+ex,33+ey,2,5,p.glow);}
  if(a!=='dead'&&!goingUp){r(29,38,3,1,p.glow);if(type==='miso'){r(28,37,1,1,p.glow);r(32,37,1,1,p.glow);}if(type==='mochi'||happy){r(23,39,3,1,'#f58b9e');r(35,39,3,1,'#f58b9e');}}
  r(21,43,3,1,p.color);r(37,43,3,1,p.color);
 }
 if(type==='miso'||type==='ember'){
  const ear=type==='miso'?(pose.face==='focused'?2:Math.round(follow*.4)):0;
  r(20-ear,21+Math.abs(ear),3,7-Math.abs(ear),out);r(21-ear,23+Math.abs(ear),4,5-Math.abs(ear),p.color);r(21-ear,22+Math.abs(ear),2,3,type==='miso'?white:p.shade);
  r(37+ear,21+Math.abs(ear),3,7-Math.abs(ear),out);r(36+ear,23+Math.abs(ear),4,5-Math.abs(ear),p.color);r(38+ear,22+Math.abs(ear),2,3,type==='miso'?white:p.shade);
  if(type==='miso'){r(18,35,3,1,white);r(18,38,3,1,white);r(40,35,3,1,white);r(40,38,3,1,white);r(27,27,2,2,p.shade);r(32,27,2,2,p.shade);}
 }else if(type==='boo'){ // a plain ghost hood: no antenna
 }else if(type==='sprig'){
  r(29,20,2,7,p.shade);r(25,17,5,5,p.shade);r(24,16,4,4,p.color);r(31,19,5,4,p.shade);r(33,17,4,4,p.color);r(25,17,2,1,'#b9ee7f');
 }else if(type==='merlin'){
  r(15,25,30,3,out);r(16,25,28,2,'#2b1a45');r(24,19,14,6,'#2b1a45');r(26,15,10,5,'#3a2559');r(28+follow*.4,11,7,5,'#3a2559');r(31+follow,8,6,4,'#3a2559');r(24,22,14,2,'#ff9f3d');r(30,22,3,2,'#ffe08a');
 }else{
  const points=[[30,26],[29,22],[30+follow*.5,19],[34+follow,20],[35+follow,23+Math.abs(follow)*.25]];
  for(let i=1;i<points.length;i++){
   const [ax,ay]=points[i-1],[bx,by]=points[i],steps=Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay)));
   for(let j=0;j<=steps;j++)r(ax+(bx-ax)*j/steps,ay+(by-ay)*j/steps,2,2,i===2?p.color:p.shade);
  }
  r(points[4][0],points[4][1],3,2,p.glow);
 }
 ctx.restore();
 // Hobby props, drawn over the body so each action reads at a glance.
 const hy=51-pose.rightArm;
 if(a==='chase'&&type==='miso'){ // yarn ball dangling on a string in front, swinging; it is lifted away when Miso settles down to lick its paws
  const lift=s<.06?(1-s/.06)*30:s>.6?Math.min(1,(s-.6)/.1)*40:0,th=Math.sin(t*2.4)*.55,L=34,bx=30+Math.sin(th)*L,by=2+Math.cos(th)*L-lift;
  if(lift<38){
   ctx.strokeStyle='#ffd1da';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(30,-8-lift);ctx.lineTo(bx,by-3);ctx.stroke(); // the string
   ctx.save();ctx.translate(bx,by);ctx.rotate(th*2+t*2);
   ctx.fillStyle='#10111b';ctx.beginPath();for(let y=-6;y<=6;y++){const w=Math.round(2*Math.sqrt(Math.max(0,36-y*y)));ctx.rect(-w/2,y,w,1);}ctx.fill();
   ctx.fillStyle='#ff6b81';ctx.beginPath();for(let y=-5;y<=5;y++){const w=Math.round(2*Math.sqrt(Math.max(0,25-y*y)));ctx.rect(-w/2,y,w,1);}ctx.fill();
   r(-4,-2,8,1,'#d94a63');r(-3,1,6,1,'#d94a63');r(-1,-4,1,8,'#ff9fb0');r(-3,-3,2,1,'#ffd1da');ctx.restore();
   for(let k=1;k<=3;k++)r(bx+Math.sin(t*3+k)*2-1,by+5+k*2,1,2,'#ff9fb0'); // loose end of the thread
  }
  if(s>=.62&&Math.sin(t*9)>0)r(35,38,2,2,'#ff8fa8'); // tongue flick while licking
  if(s>=.62)for(let k=0;k<3;k++)r(38+k*2,31+((t*5+k*2)%6),1,1,'#ffffff');
 }
 // Character-specific idle hobbies.
 const hxR=38+Math.min(4,pose.rightArm),hyR=51-pose.rightArm;
 if(a==='welcome'){ // confetti in each character's own colours, plus a signature burst
  const pal={miso:['#ffa63f','#ffd276','#ff9fb0','#fff4ed'],ember:['#ff7a2f','#ffcf4a','#ff6b6b','#ffe9a0'],bumble:['#f2b632','#ffd777','#4fbf5f','#ff8fb8'],boo:['#ffffff','#cfe6ff','#9fb0ff','#e8edfb'],drowsy:['#8fb8ff','#9fb3ff','#cfe6ff','#ffffff'],merlin:['#c38aff','#ffe08a','#7d4fe0','#8fe3ff']}[type]||['#ff6b81','#ffd166','#6ee7b7','#8fb8ff'];
  const lvl=Math.max(1,Math.min(3,state.excite||1)),count=6+lvl*4;
  for(let i=0;i<count;i++){const u=(t*(type==='drowsy'?.7:1.4)+i*.37)%1,x=8+((i*53)%46)+Math.sin(t*3+i)*2;r(x,(type==='ember'?56-u*44:14+u*44),2,2,pal[i%4]);}
  if(type==='merlin')for(let i=0;i<6;i++){const q=t*2+i*1.05,rad=12+((t*10+i*3)%10);r(30+Math.cos(q)*rad,28+Math.sin(q)*rad*.8,1,1,i%2?'#ffe08a':'#ffffff');}
 }
 if(a==='scratch'||a==='pet'||a==='relax'){ // pink hearts drifting up from the head
  const heart=(x,y,c)=>{r(x,y,2,1,c);r(x+3,y,2,1,c);r(x,y+1,5,1,c);r(x+1,y+2,3,1,c);r(x+2,y+3,1,1,c);};
  const n=a==='scratch'?5:3;
  for(let i=0;i<n;i++){const u=((t*(a==='scratch'?.9:.6)+i/n)%1);ctx.globalAlpha=Math.min(1,(1-u)*1.6);heart(17+((i*37)%30)+Math.sin(t*3+i*2)*2,26-u*24,i%2?'#ff7aa8':'#ff9fc4');}
  ctx.globalAlpha=1;
 }
 if(a==='pollinate'&&type==='bumble'){
  const dxp=pose.dx||0,sm2=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},grow=sm2((s-.02)/.26),fx=59-dxp,jx=-8-dxp;
  // flower grows from the ground on the right
  if(grow>0){const h=Math.round(14*grow);r(fx,60-h,1,h,'#4fbf5f');if(grow>.4)r(fx-3,56,3,2,'#4fbf5f');if(grow>.6)r(fx+1,53,3,2,'#4fbf5f');
   if(grow>.85){r(fx-2,44,5,5,'#ff8fb8');r(fx-1,43,3,1,'#ff8fb8');r(fx-1,49,3,1,'#ff8fb8');r(fx,45,1,3,'#ffe08a');}
   else if(grow>.5){r(fx-1,60-h-2,3,3,'#ff8fb8');}}
  // pollen puffs while it sips
  if(s>.42&&s<.62)for(let i=0;i<6;i++){const u=((t*3+i/6)%1);r(fx-2+Math.sin(i*2+t*6)*7,48-u*10,1,1,'#ffe08a');}
  if(s>.5&&s<.72)r(24,50,2,2,'#ffe08a'),r(34,50,2,2,'#ffe08a'); // pollen on its wings
  // honey jar appears on the left and fills up
  if(s>.66){const k=Math.min(1,(s-.66)/.06),fill=Math.round(sm2((s-.74)/.22)*8);ctx.globalAlpha=k;
   r(jx,50,12,12,'#10111b');r(jx+1,51,10,10,'#d9efff');r(jx-1,49,14,2,'#8a5a3c');
   if(fill>0)r(jx+1,61-fill,10,fill,'#f2b632');if(fill>2)r(jx+2,61-fill,3,1,'#ffe08a');
   ctx.globalAlpha=1;
   if(s>.95){const hb=(x,y)=>{r(x,y,2,1,'#ff7aa8');r(x+3,y,2,1,'#ff7aa8');r(x,y+1,5,1,'#ff7aa8');r(x+1,y+2,3,1,'#ff7aa8');r(x+2,y+3,1,1,'#ff7aa8');};hb(jx+3,40+Math.sin(t*4)*1.5);}
  }
 }
 if(a==='micdrop'&&type==='ember'){
  const dxp=pose.dx||0;
  // sunglasses slide on and stay on
  if(s>.1){const drop=Math.min(1,(s-.1)/.06)*1,gy=30-6*(1-drop);r(21,gy+2,19,1,'#0a0a10');r(21,gy+3,8,4,'#0a0a10');r(32,gy+3,8,4,'#0a0a10');r(22,gy+4,2,1,'#6a6f8a');r(33,gy+4,2,1,'#6a6f8a');}
  // microphone in hand, then dropped: falls, bounces once, lies on the floor
  const holdEnd=.64;
  if(s<holdEnd){r(hxR+1,hyR-8,2,8,'#3a3a46');r(hxR,hyR-11,4,4,'#c9ccd8');r(hxR+1,hyR-10,2,1,'#ffffff');}
  else{const f=Math.min(1,(s-holdEnd)/.07),y=hyR-6+Math.min(1,f)*Math.max(0,60-(hyR-6))*(f*f),b=s>holdEnd+.07?Math.abs(Math.sin((s-holdEnd-.07)*30))*Math.max(0,1-(s-holdEnd-.07)*6)*4:0;
   ctx.save();ctx.translate(hxR+2-dxp*0,Math.min(58,y)-b);ctx.rotate(f<1?f*2:1.6);r(-1,-4,2,8,'#3a3a46');r(-2,-6,4,3,'#c9ccd8');ctx.restore();}
  // fire burst + BOOM when it lands
  if(s>holdEnd+.06&&s<.9){const u=(s-holdEnd-.06)/.26;ctx.globalAlpha=Math.max(0,1-u*.8);for(let i=0;i<7;i++){const h=Math.round((6+Math.sin(t*14+i*1.7)*3)*(1-Math.abs(i-3)/5)*Math.min(1,u*3));r(14+i*5-dxp,60-h,3,h,i%2?'#ffcf4a':'#ff7a2f');}ctx.globalAlpha=1;
   if(u<.8){ctx.fillStyle='#ffe08a';ctx.font='bold 8px monospace';ctx.fillText('BOOM',10-dxp,34-u*8);}}
  if(s<.2)for(let i=0;i<5;i++)r(8+i*11,58-((t*14+i*5)%16),2,3,i%2?'#ffcf4a':'#ff7a2f'); // opening flames
 }
 if(a==='cauldron'){
  r(24,61,12,2,'#00000030');
  for(let i=0;i<4;i++)r(21+i*5,61-(Math.sin(t*12+i)>0?1:0),3,3,i%2?'#ffcf4a':'#ff7a2f');
  r(15,52,30,3,'#3b3f52');r(17,55,26,6,'#23252f');r(16,52,28,1,'#5a5f78');r(19,61,3,2,'#1a1b22');r(38,61,3,2,'#1a1b22');
  r(17,50,26,3,'#6cf08a');r(18,50,24,1,'#b9ffc9');
  for(let i=0;i<4;i++){const b=(t*5+i*2.3)%6;r(20+i*6+(i%2),49-b*2.2,2,2,i%2?'#b9ffc9':'#6cf08a');}
  const sx=30+Math.sin(t*4)*6;ctx.strokeStyle='#9d784f';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(hxR+1,hyR+1);ctx.lineTo(sx,52);ctx.stroke();r(sx-1,52,3,2,'#c9a063');
  for(let i=0;i<3;i++)r(26+i*5+Math.sin(t*3+i)*1.5,42-((t*6+i*3)%10),2,2,'#8cf5a899');
 }
 if(a==='spellpractice'){
  const w=Math.sin(t*5),tipX=hxR+3+w*3,tipY=hyR-9;ctx.strokeStyle='#9d784f';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(hxR+1,hyR+1);ctx.lineTo(tipX,tipY);ctx.stroke();r(tipX-1,tipY-1,3,3,'#ffe08a');
  for(let i=0;i<6;i++){const q=t*3+i*1.05;r(tipX+Math.cos(q)*(4+i%3),tipY+Math.sin(q)*(4+i%3),1,1,i%2?'#c38aff':'#ffe08a');}
  for(let i=0;i<12;i++){const q=t*1.2+i*Math.PI/6;r(30+Math.cos(q)*15,60+Math.sin(q)*2.2,2,1,i%3?'#7d4fe0':'#c38aff');}
 }
 if(a==='crystalball'){
  r(25,60,10,2,'#6b4429');r(27,58,6,3,'#8a5a3c');
  ctx.fillStyle='#0a0614';ctx.beginPath();ctx.arc(30,53,6.5,0,7);ctx.fill();ctx.fillStyle=Math.sin(t*3)>0?'#b58cff':'#8f6af0';ctx.beginPath();ctx.arc(30,53,5.5,0,7);ctx.fill();
  for(let i=0;i<5;i++){const q=t*2+i*1.3;r(30+Math.cos(q)*3,53+Math.sin(q*1.3)*3,1,1,'#fff6c8');}r(27,50,2,1,'#ffffff90');
 }
 if(a==='groom'){for(let i=0;i<3;i++)r(38+i*2,31+((t*5+i*2)%6),1,1,'#ffffff');}
 if(a==='yarnplay'){
  const bx=30+Math.sin(t*2.5)*15,by=58-Math.abs(Math.sin(t*5))*3,dir=Math.sign(Math.cos(t*2.5))||1;
  for(let i=1;i<=4;i++)r(bx-dir*i*3-1,by+2,3,1,'#ff9fb0');
  ctx.save();ctx.translate(bx,by);ctx.rotate(t*6);ctx.fillStyle='#10111b';ctx.beginPath();ctx.arc(0,0,4.5,0,7);ctx.fill();ctx.fillStyle='#ff6b81';ctx.beginPath();ctx.arc(0,0,3.6,0,7);ctx.fill();r(-3,-1,6,1,'#d94a63');r(-1,-3,1,6,'#ff9fb0');ctx.restore();
 }
 if(a==='loaf'){r(14,51,32,11,'#10111b');r(15,52,30,9,'#c8924f');r(15,52,30,2,'#dba865');r(28,52,4,9,'#e0b878');r(15,59,30,2,'#a87636');r(14,50,6,3,'#c8924f');r(40,50,6,3,'#c8924f');}
 if(a==='marshmallow'){
  for(let i=0;i<5;i++){const f=Math.sin(t*11+i*1.7);r(41+i*2,58-(f>0?2:1)-i%2,2,3+(f>0?1:0),i%2?'#ffcf4a':'#ff7a2f');}
  r(40,61,12,2,'#6b4429');r(41,60,10,1,'#8a5a3c');
  const roast=(t*.25)%1;ctx.strokeStyle='#9d784f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hxR+1,hyR+1);ctx.lineTo(46,57);ctx.stroke();r(45,55,4,4,roast<.4?'#fff4ed':roast<.75?'#d9a066':'#4a2f1c');
  if(roast>.8)r(45,52-((t*8)%3),1,1,'#888');
 }
 if(a==='tridentspin'){ctx.save();ctx.translate(hxR+1,hyR);ctx.rotate(t*9);r(-1,-9,2,18,'#ffb269');r(-4,-11,8,2,'#ff7866');r(-4,-14,2,4,'#ff7866');r(-1,-15,2,5,'#ffd07c');r(2,-14,2,4,'#ff7866');ctx.restore();}
 if(a==='flamejuggle'){for(let i=0;i<3;i++){const n=t*1.5+i/3,u=n%1,rw=Math.floor(n)%2===0,x=rw?18+24*u:42-24*u,y=43-88*u*(1-u);r(x,y,3,3,'#ff7a2f');r(x+1,y-1+(Math.sin(t*20+i)>0?0:1),1,2,'#ffcf4a');}}
 if(a==='flower'){const sn=Math.sin(t*2)>.3?-2:0;r(hxR+3,hyR-8+sn,1,8,'#4fbf5f');r(hxR+2,hyR-11+sn,3,3,'#ff8fb8');r(hxR+3,hyR-12+sn,1,1,'#ff8fb8');r(hxR+1,hyR-10+sn,1,1,'#ff8fb8');r(hxR+5,hyR-10+sn,1,1,'#ff8fb8');r(hxR+3,hyR-10+sn,1,1,'#ffe08a');for(let i=0;i<3;i++)r(hxR+4+Math.sin(t*3+i)*3,hyR-14-((t*4+i*2)%6),1,1,'#ffe08a');}
 if(a==='honey'){
  r(12,52,12,10,'#f2b632');r(12,52,12,2,'#d99a1f');r(11,51,14,2,'#8a5a3c');r(14,56,8,3,'#ffd777');r(15,57,2,1,'#fff1b8');
  ctx.strokeStyle='#9d784f';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(hxR+1,hyR+1);ctx.lineTo(hxR+2,hyR-6);ctx.stroke();r(hxR,hyR-8,5,3,'#ffd777');r(hxR+2,hyR-5+((t*5)%4),1,2,'#f2b632');
 }
 if(a==='waggle'){for(let i=0;i<14;i++){const q=t*2-i*.18;ctx.globalAlpha=1-i/16;r(30+Math.sin(q)*14,16+Math.sin(q*2)*5,2,2,'#f2b632');}ctx.globalAlpha=1;}
 if(a==='nodoff'){for(let i=0;i<3;i++)r(40+i*3,24-i*4-((t*2)%4),3,1,'#9fb3ff');if(t%4>1.5&&t%4<3.3)r(37,43,2,2,'#cfe6ff');}
 if(a==='sheep'){r(33,19,18,1,'#8a5a3c');r(35,15,1,5,'#8a5a3c');r(48,15,1,5,'#8a5a3c');for(let i=0;i<2;i++){const u=(t*.5+i*.5)%1,x=24+u*30,y=12-Math.sin(u*Math.PI)*8;r(x,y,6,4,'#ffffff');r(x+5,y+1,2,2,'#555');r(x+1,y+4,1,2,'#555');r(x+4,y+4,1,2,'#555');}}
 if(a==='cocoa'){r(21,45,19,3,'#5b6fc4');r(21,45,19,1,'#8ea2ee');r(44,hyR-3,5,6,'#8a5a3c');r(48,hyR-1,2,3,'#8a5a3c');r(45,hyR-3,3,1,'#f4e9df');r(45,hyR-3,2,1,'#ffffff');for(let i=0;i<3;i++)r(46+Math.sin(t*3+i*2),hyR-5-((t*4+i*2)%7),1,1,'#ffb3c8');}
 if(a==='drink'&&type!=='boo'){
  const c=(t%3)/3,sipK=c>.25&&c<.75?Math.sin((c-.25)/.5*Math.PI):0,bob=Math.round(Math.sin(t*3));
  // floating water drop
  r(49,9+bob,1,1,'#6fc8ff');r(48,10+bob,3,1,'#6fc8ff');r(47,11+bob,5,3,'#6fc8ff');r(48,14+bob,3,1,'#6fc8ff');r(48,11+bob,1,2,'#d9f3ff');
  if(type==='miso'){ // laps from a bowl on the floor
   r(15,57,18,5,'#10111b');r(16,56,16,5,'#3b7fd1');r(17,56,14,2,'#8fd3ff');r(16,60,16,1,'#2a5fa5');
   if(sipK>.2){r(24,55,2,2,'#ff8fa8');r(22+((t*8)%2)*4,57,1,1,'#ffffff');}
  }
  if(type==='ember'){ // gulps through a straw; the water sizzles to steam
   r(hxR+2,hyR-6,6,9,'#10111b');r(hxR+3,hyR-5,4,7,'#bfe6ff');r(hxR+3,hyR-1,4,3,'#6fc8ff');r(hxR+5,hyR-9,1,5,'#ff7866');
   if(sipK>.3)for(let i=0;i<3;i++)r(37+i*2+Math.sin(t*6+i),30-((t*8+i*2)%8),1,1,'#ffffffb0');
  }
  if(type==='bumble'){ // sips dew from a little tulip cup
   r(hxR+1,hyR-4,7,6,'#10111b');r(hxR+2,hyR-3,5,4,'#ff8fb8');r(hxR+2,hyR-3,5,1,'#8fd3ff');r(hxR+4,hyR-9,1,6,'#4fbf5f');
   for(let i=0;i<2;i++)r(hxR+6+Math.sin(t*4+i)*2,hyR-8-((t*5+i*3)%6),1,1,'#b9e8ff');
  }
  if(type==='drowsy'){ // bendy straw, big mug, drowsy sips
   r(hxR+1,hyR-6,7,10,'#10111b');r(hxR+2,hyR-5,5,8,'#d9efff');r(hxR+2,hyR-2,5,5,'#6fc8ff');
   r(hxR+4,hyR-9,1,4,'#ff7866');r(hxR+3,hyR-10,2,1,'#ff7866');r(hxR+1,hyR-9,2,1,'#ff7866');
   if(sipK>.5)for(let i=0;i<2;i++)r(39+i*3,25-i*3-((t*2)%3),2,1,'#9fb3ff');
  }
  if(type==='merlin'){ // conjures water into a goblet, then sips
   r(hxR+1,hyR-4,6,5,'#10111b');r(hxR+2,hyR-3,4,3,'#d9a441');r(hxR+2,hyR-3,4,1,'#8fd3ff');r(hxR+3,hyR+1,2,2,'#d9a441');
   if(c<.35){for(let i=0;i<3;i++)r(hxR+3+Math.sin(i*2)*1.2,hyR-16+((t*14+i*4)%12),1,2,'#8fd3ff');for(let i=0;i<5;i++){const q=t*6+i*1.3;r(hxR+3+Math.cos(q)*5,hyR-9+Math.sin(q)*4,1,1,'#ffe08a');}}
  }
 }
 if(a==='coffee'){r(44,hy-3,5,6,'#f4f0e8');r(48,hy-1,2,3,'#f4f0e8');r(45,hy-3,3,1,'#6b3f26');for(let i=0;i<3;i++)r(46+Math.sin(t*4+i*2),hy-5-((t*6+i*2)%7),1,1,'#ffffffa0');}
 if(a==='phone'){r(41,hy-9,6,10,'#2a2f3d');r(42,hy-8,4,8,Math.sin(t*3)>0?'#8fe3ff':'#b9a6ff');r(43,hy-7+((t*8)%6),2,1,'#ffffff');}
 if(a==='laptop'){r(16,47,29,11,'#b4bccd');r(17,48,27,9,'#aab3c6');r(29,51,3,3,'#eef1f7');r(13,58,35,2,'#8a93a8');r(13,60,35,1,'#6d7589');if(t*6%2<1)r(44,45,1,1,'#7fd7ff');}
 if(a==='book'){r(20,55,22,1,'#7a4b2f');r(21,46,9,9,'#f6f0e2');r(32,46,9,9,'#ede5d0');r(30,45,2,10,'#7a4b2f');for(let i=0;i<3;i++){r(22,48+i*2,7,1,'#c9bfa5');r(33,48+i*2,7,1,'#c9bfa5');}if(t%4<.25)r(31,45,6,10,'#fffaf0');}
 if(a==='snack'){const bite=(t*.35)%1,size=Math.max(1,Math.round(5*(1-bite)));r(44,hy-2,size,size,'#d9a066');if(size>2)r(45,hy-1,1,1,'#6b4226');if(bite<.12)for(let i=0;i<3;i++)r(40+i*3,50+((t*10+i*3)%8),1,1,'#d9a066');}
 if(a==='juggle'){const cols=['#ff6b81','#ffd166','#6ee7b7'];for(let i=0;i<3;i++){const n=t*1.5+i/3,u=n%1,rightward=Math.floor(n)%2===0;r(rightward?18+24*u:42-24*u,43-88*u*(1-u),3,3,cols[i]);}}
 if(a==='beg'&&(state.need||0)>=2){r(49,5,2,6,'#ff6b6b');r(49,12,2,2,'#ff6b6b');if(state.need>=4){r(9,7,2,6,'#ff6b6b');r(9,14,2,2,'#ff6b6b');}}
 if(a==='relax'){for(let i=0;i<3;i++){const rise=(t*7+i*3)%12;r(26+i*5+Math.sin(t*3+i),30-rise,2,2,'#f7a4c7');}}
 if(lying&&lieT>=1){
  // Blanket starts folded at his feet and gets tugged up in three steps; once tucked in it rises and falls with each breath.
  const rise=pull>=1&&Math.sin(t*1.6)>.2?1:0,top=Math.round(56-12*pull)-rise;
  r(16,top,28,60-top,'#5b6fc4');r(15,top-1,30,3,'#8ea2ee');r(15,top-1,30,1,'#b4c2f7');
  if(top<50)r(16,50,28,1,'#7d92e0');if(top<54)r(16,54,28,1,'#7d92e0');
  if(top<52)r(22,52,1,1,'#fff6b0');r(34,57,1,1,'#fff6b0');if(top<48)r(28,48,1,1,'#fff6b0');if(top<53)r(38,53,1,1,'#fff6b0');
  for(let i=0;i<7;i++)r(16+i*4,60,3,1,'#3f4f98');
  if(pull>0&&pull<1)r(44,top-2,4,3,p.color); // hand tugging the edge
  if(pull>=1){const ph=(t%3.4)/3.4;if(ph<.9){const rad=1+ph*5,cx=40+ph*6,cy=38;for(let i=0;i<10;i++){const q=i*Math.PI/5;r(cx+Math.cos(q)*rad,cy+Math.sin(q)*rad,1,1,'#cfe6ff');}}} // snore bubble
 }
 if(lying&&pull>=1){ctx.save();ctx.setTransform(lyingBase);ctx.fillStyle=p.glow;for(let i=0;i<3;i++){const ph=(t*.55+i/3)%1;ctx.globalAlpha=1-ph;ctx.font=Math.round(4+ph*4)+'px monospace';ctx.fillText('z',30+ph*10+i*2,40-ph*18);}ctx.restore();}
 else if(!lying&&(sleeping||type==='drowsy')){ctx.fillStyle=p.glow;ctx.font='5px monospace';ctx.fillText('z',44,26-(t*2%8));ctx.fillText('z',48,20-(t*2%8));}
 if(happy){const rise=t*6%8;r(44,32-rise,1,3,p.glow);r(43,33-rise,3,1,p.glow);r(15,39-rise,2,2,'#f7a4c7');}
 if(a==='alert'){ctx.save();ctx.translate(49,8-Math.abs(Math.sin(t*9))*2);ctx.rotate(Math.sin(t*18)*.45);r(-3,-3,6,5,'#ffcf4a');r(-4,2,8,2,'#ffcf4a');r(-1,-5,2,2,'#e0a82e');r(-1,4,2,2,'#c98a1f');r(-2,-2,1,3,'#fff1a8');ctx.restore();if(t*6%2<1){r(40,3,1,3,'#ffe08a');r(58,3,1,3,'#ffe08a');r(38,6,2,1,'#ffe08a');r(59,6,2,1,'#ffe08a');}}
 if(['grow','spell','spark','pose','hug'].includes(a)){
  for(let i=0;i<7;i++){const angle=i*Math.PI*2/7+age*2,rad=12+Math.sin(age*3)*4;r(30+Math.cos(angle)*rad,37+Math.sin(angle)*rad,2,2,a==='hug'?'#ffacd4':a==='grow'?'#b0f387':p.glow);}
 }
 if(state.playing)gameHand(44,51-pose.rightArm,p.color);
 ctx.restore();
}

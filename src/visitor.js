let visits=[],selected=null,timer,hit=false,pending=false,last=performance.now(),host={x:240,y:240,type:'miso',scale:.65,busy:false};
const born=new Map(),petted=new Map(),drafts=new Map(),bodies=new Map();
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),bubble=document.querySelector('.bubble');
let spots=[];
function fill(id){
 const v=visits.find(item=>item.id===id);if(!v)return;
 document.querySelector('#owner').textContent=v.ownerName+"’s "+companions[v.type].name+' ✨';
 renderNote(document.querySelector('#message'),v.message);
 document.querySelector('#reply').value=drafts.get(id)||'';
 for(const b of document.querySelectorAll('#visitor-list button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));
 bubble.hidden=false;placeBubble();
}
function placeBubble(){
 if(bubble.hidden||!selected)return;
 const body=bodies.get(selected);if(!body)return;
 const width=280,height=Math.min(320,bubble.offsetHeight||220);
 bubble.style.left=Math.max(8,Math.min(innerWidth-width-8,body.x-width/2))+'px';
 bubble.style.top=Math.max(8,Math.min(innerHeight-height-8,body.y-height-36))+'px';
}
function choose(id){if(selected)drafts.set(selected,document.querySelector('#reply').value);selected=id;fill(id);}
window.visitor.onState(payload=>{
 visits=payload.visits||[payload];const now=performance.now();
 for(const map of [born,petted,drafts,bodies])for(const id of map.keys())if(!visits.some(v=>v.id===id))map.delete(id);
 for(const v of visits)if(!born.has(v.id))born.set(v.id,now);
 document.querySelector('#visitor-count').textContent=visits.length>1?visits.length+' visitors · choose one to read the note':'A note from your friend';
 const nav=document.querySelector('#visitor-list');nav.hidden=visits.length<2;nav.replaceChildren();
 for(const v of visits){const b=document.createElement('button');b.dataset.id=v.id;b.textContent=v.ownerName+"’s "+companions[v.type].name;b.onclick=()=>choose(v.id);nav.append(b);}
 if(selected&&!visits.some(v=>v.id===selected)){selected=null;bubble.hidden=true;}
 else if(selected&&!bubble.hidden){drafts.set(selected,document.querySelector('#reply').value);fill(selected);}
});
function area(){
 const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 return {width,height};
}
function bodyFor(v,width,height){
 let b=bodies.get(v.id);
 if(!b){
  b={x:80+Math.random()*Math.max(40,width-160),y:height*0.62+Math.random()*Math.max(20,height*0.2),tx:0,ty:0,face:1,mode:'roam',until:0,cool:0,nextSeek:0,act:'idle',actAt:0};
  b.tx=b.x;b.ty=b.y;bodies.set(v.id,b);
 }
 return b;
}
function wander(b,width,height){
 b.tx=70+Math.random()*Math.max(20,width-140);
 b.ty=Math.max(90,height*0.42)+Math.random()*Math.max(20,height*0.48-90);
}
function drawScroll(x,y){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));
 ctx.fillStyle='#f4e7c8';ctx.fillRect(-8,-18,16,13);
 ctx.fillStyle='#e4cfa3';ctx.fillRect(-9,-18,3,13);ctx.fillRect(6,-18,3,13);
 ctx.fillStyle='#8d6a3a';ctx.fillRect(-5,-14,10,1);ctx.fillRect(-5,-11,10,1);ctx.fillRect(-5,-8,7,1);
 ctx.restore();
}
function frame(){
 const now=performance.now(),dt=Math.min(.08,(now-last)/1000);last=now;
 const {width,height}=area();ctx.clearRect(0,0,width,height);spots=[];
 const playing=()=>[...bodies.values()].some(item=>item.mode==='play');
 let active=false;
 for(const v of visits){
  const b=bodyFor(v,width,height),scale=Math.min(.7,host.scale||.65);
  if(b.mode==='play'){
   if(now>b.until){b.mode='roam';b.cool=now+7000;wander(b,width,height);}
   else b.face=b.x<host.x?1:-1;
  }else{
   const dx=b.tx-b.x,dy=b.ty-b.y,dist=Math.hypot(dx,dy)||.01;
   if(dist<14)wander(b,width,height);
   else{const step=Math.min(dist,92*dt);b.x+=dx/dist*step;b.y+=dy/dist*step;b.face=dx>=0?1:-1;}
   const near=Math.hypot(b.x-host.x,b.y-host.y);
   if(!host.busy&&!playing()&&now>b.cool&&near<128){
    b.mode='play';b.until=now+3400;b.actAt=now;b.act=pairPlay(host.type,v.type).guest;active=true;
    window.visitor.play({guest:v.type,side:b.x>=host.x?1:-1});
   }else if(now>b.nextSeek){
    b.nextSeek=now+4500+Math.random()*5000;
    if(!host.busy&&Math.random()<0.7){b.tx=Math.max(60,Math.min(width-60,host.x+(Math.random()*180-90)));b.ty=Math.max(80,Math.min(height-50,host.y+(Math.random()*50-16)));}
    else wander(b,width,height);
   }
  }
  const arriving=(now-born.get(v.id))/1000<1.2,pet=now<(petted.get(v.id)||0),acting=b.mode==='play';
  active||=arriving||pet||acting||Math.hypot(b.tx-b.x,b.ty-b.y)>16;
  const action=pet?'scratch':acting?b.act:Math.hypot(b.tx-b.x,b.ty-b.y)>16?'walk':'idle';
  const age=acting?(now-b.actAt)/1000:(now-born.get(v.id))/1000;
  ctx.save();
  if(arriving)ctx.globalAlpha=Math.min(1,(now-born.get(v.id))/900);
  drawPet(ctx,{type:v.type,action,direction:b.face,meet:acting,started:acting?b.actAt:born.get(v.id),until:acting?b.actAt+3400:born.get(v.id)+800},now/1000,age,b.x,b.y,scale);
  ctx.restore();
  drawScroll(b.x,b.y-78*scale);
  spots.push({id:v.id,l:b.x-54,r:b.x+54,t:b.y-108*scale,b:b.y+24});
 }
 placeBubble();
 timer=setTimeout(frame,document.hidden?1000:1000/(active?24:12));
}
frame();
setInterval(()=>window.visitor.host().then(next=>{if(next)host=next;}).catch(()=>{}),400);
canvas.addEventListener('click',e=>{
 const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const spot=spots.find(p=>x>=p.l&&x<=p.r&&y>=p.t&&y<=p.b);
 if(spot)choose(spot.id);else bubble.hidden=true;
});
document.addEventListener('mousemove',e=>{
 const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 const next=!bubble.hidden&&!!e.target.closest('.bubble')||spots.some(p=>x>=p.l&&x<=p.r&&y>=p.t&&y<=p.b);
 if(next!==hit){hit=next;window.visitor.hit(hit);}
});
async function home(reply){
 if(pending||!selected)return;pending=true;
 const buttons=[...document.querySelectorAll('button')];for(const b of buttons)b.disabled=true;
 try{const r=await window.visitor.sendHome(reply,selected);document.querySelector('#error').textContent=r?.error||'';}
 catch{document.querySelector('#error').textContent='Could not send this pet home. Try again.';}
 finally{pending=false;for(const b of buttons)b.disabled=false;}
}
document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const text=document.querySelector('#reply').value.trim();if(text)home(text);});
document.querySelector('#return').onclick=()=>home();
document.querySelector('#pet').onclick=()=>{if(selected)petted.set(selected,performance.now()+3000);};
window.addEventListener('unload',()=>clearTimeout(timer));

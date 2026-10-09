let visits=[],selected=null,timer,hit=true,pending=false;const born=new Map(),petted=new Map(),drafts=new Map(),colors=new Map(),palette=['#c4a7ff','#79d5ff','#ffb783','#91e2b4','#ff9bca'];
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),bubble=document.querySelector('.bubble');let spots=[];
function choose(id){if(selected)drafts.set(selected,document.querySelector('#reply').value);selected=id;const v=visits.find(v=>v.id===id);if(!v)return;document.querySelector('#owner').textContent=v.ownerName+"’s "+companions[v.type].name+' ✨';document.querySelector('#message').textContent=v.message;document.querySelector('#reply').value=drafts.get(id)||'';bubble.style.borderColor=colors.get(v.owner);for(const b of document.querySelectorAll('#visitor-list button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));}
window.visitor.onState(payload=>{
 visits=payload.visits||[payload];const now=performance.now();for(const owner of colors.keys())if(!visits.some(v=>v.owner===owner))colors.delete(owner);
 for(const v of visits){if(!born.has(v.id))born.set(v.id,now);if(!colors.has(v.owner))colors.set(v.owner,palette.find(c=>![...colors.values()].includes(c)));}
 for(const map of [born,petted,drafts])for(const id of map.keys())if(!visits.some(v=>v.id===id))map.delete(id);
 document.body.classList.toggle('multiple',visits.length>1);document.querySelector('#visitor-count').textContent=visits.length>1?visits.length+' visitors · choose a pet to read and reply':'A little visit from your friend';
 const nav=document.querySelector('#visitor-list');nav.replaceChildren();for(const v of visits){const b=document.createElement('button');b.dataset.id=v.id;b.textContent=v.ownerName+"’s "+companions[v.type].name;b.style.borderColor=colors.get(v.owner);b.onclick=()=>choose(v.id);nav.append(b);}
 if(!visits.some(v=>v.id===selected))choose(visits[0]?.id);else{const v=visits.find(v=>v.id===selected);bubble.style.borderColor=colors.get(v.owner);for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.id===selected));}
});
function frame(){
 const multiple=visits.length>1,width=multiple?Math.max(200,innerWidth-340):innerWidth,height=multiple?innerHeight:200;if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 ctx.clearRect(0,0,width,height);spots=[];const now=performance.now(),cols=multiple?Math.max(1,Math.min(3,Math.floor(width/150))):1,rows=Math.ceil(visits.length/cols)||1,cellW=width/cols,cellH=height/rows,scale=Math.min(.65,(cellW-14)/240,(cellH-42)/250);let active=false;
 visits.forEach((v,i)=>{const x=(i%cols+.5)*cellW,y=(Math.floor(i/cols)+.52)*cellH,t=(now-born.get(v.id))/1000,arriving=t<1.4,pet=now<(petted.get(v.id)||0);active||=arriving||pet;
  if(arriving){ctx.save();ctx.strokeStyle=colors.get(v.owner);ctx.lineWidth=4;ctx.globalAlpha=1-t/1.4;ctx.beginPath();ctx.ellipse(x,y,25+8*Math.sin(t*8),Math.min(70,cellH/3),0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  ctx.save();if(arriving)ctx.globalAlpha=Math.min(1,t);drawPet(ctx,{type:v.type,action:arriving?'happy':pet?'scratch':'idle',direction:1},now/1000,t,x,y,scale);ctx.restore();
  const labelY=Math.min(height-12,y+92*scale);ctx.fillStyle=colors.get(v.owner);ctx.font=(selected===v.id?'600 ':'')+'12px Segoe UI';ctx.textAlign='center';let label=v.ownerName+"’s "+companions[v.type].name;while(ctx.measureText(label).width>cellW-12&&label.length>5)label=label.slice(0,-2)+'…';ctx.fillText(label,x,labelY);
  ctx.strokeStyle=colors.get(v.owner);ctx.lineWidth=selected===v.id?3:1;ctx.beginPath();ctx.ellipse(x,labelY-18,40*scale,4,0,0,Math.PI*2);ctx.stroke();spots.push({id:v.id,l:x-90*scale,r:x+90*scale,t:y-110*scale,b:labelY+10});
 });
 timer=setTimeout(frame,document.hidden?1000:1000/(active?24:12));
}frame();
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,spot=spots.find(p=>x>=p.l&&x<=p.r&&y>=p.t&&y<=p.b);if(spot)choose(spot.id);});
document.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,next=!!e.target.closest('.bubble')||spots.some(p=>x>=p.l&&x<=p.r&&y>=p.t&&y<=p.b);if(next!==hit){hit=next;window.visitor.hit(hit);}});
async function home(reply){if(pending||!selected)return;pending=true;const buttons=[...document.querySelectorAll('button')];for(const b of buttons)b.disabled=true;try{const r=await window.visitor.sendHome(reply,selected);document.querySelector('#error').textContent=r?.error||'';}catch{document.querySelector('#error').textContent='Could not send this pet home. Try again.';}finally{pending=false;for(const b of buttons)b.disabled=false;}}
document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const text=document.querySelector('#reply').value.trim();if(text)home(text);});document.querySelector('#return').onclick=()=>home();document.querySelector('#pet').onclick=()=>{if(selected)petted.set(selected,performance.now()+3000);};window.addEventListener('unload',()=>clearTimeout(timer));

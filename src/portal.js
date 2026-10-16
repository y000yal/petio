const portalCanvas=document.querySelector('canvas'),portalContext=portalCanvas.getContext('2d'),portalQuery=new URLSearchParams(location.search);
const openingHeight=Number(portalQuery.get('height'))||240,portalLife=Number(portalQuery.get('life'))||2100,portalStart=performance.now();portalCanvas.width=innerWidth;portalCanvas.height=innerHeight;
// Small transient canvases keep the effect local to each monitor edge.
function drawPortal(){
 const c=portalContext,t=Date.now()/1000,opening=Math.max(0,Math.min(1,(performance.now()-portalStart)/220,(portalLife-(performance.now()-portalStart))/180));
 c.clearRect(0,0,portalCanvas.width,portalCanvas.height);c.save();c.translate(portalCanvas.width/2,portalCanvas.height/2);const sy=openingHeight/156;c.scale(sy*.65*opening,sy*opening);
 const core=c.createRadialGradient(-4,0,2,0,0,88);core.addColorStop(0,'#100b22f5');core.addColorStop(.65,'#19102aee');core.addColorStop(1,'#482268aa');
 c.fillStyle=core;c.beginPath();c.ellipse(0,0,22,78,0,0,Math.PI*2);c.fill();
 c.globalCompositeOperation='screen';
 // Broad halo beneath tightly wound, tapered flame ribbons.
 for(const [rx,ry,width,color] of [[25,83,12,'#7537db24'],[24,81,7,'#a84fff48'],[23,79,3,'#db9affb0']]){
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.stroke();
 }
 const palette=['#813aff','#be62ff','#51dfff','#edbaff','#fff5ff'];
 for(let layer=0;layer<5;layer++)for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7+t*(layer%2?-1.5:1.8)+layer*.71,len=.38+(i%3)*.14;
  const rx=23+(layer%3)*1.8,ry=78+(layer%3)*3;
  c.fillStyle=palette[layer];c.beginPath();
  for(let k=0;k<=12;k++){const f=k/12,q=a+f*len,flare=Math.sin(f*Math.PI)*(layer===4?1.5:4);c.lineTo(Math.cos(q)*(rx+flare),Math.sin(q)*(ry+flare*1.8));}
  for(let k=12;k>=0;k--){const f=k/12,q=a+f*len;c.lineTo(Math.cos(q)*(rx-.8),Math.sin(q)*(ry-1.6));}
  c.closePath();c.fill();
 }
 // Short electric sparks orbit outside the rim, without a large blur surface.
 for(let i=0;i<12;i++){
  const a=i*2.399+t*.7,pulse=(Math.sin(t*4+i)+1)/2,rx=29+pulse*4,ry=87+pulse*5;
  c.globalAlpha=.25+pulse*.65;c.strokeStyle=i%2?'#ca8bff':'#81e9ff';c.lineWidth=.8;c.beginPath();
  c.moveTo(Math.cos(a)*rx,Math.sin(a)*ry);c.lineTo(Math.cos(a+.05)*(rx+2),Math.sin(a+.05)*(ry+2));c.lineTo(Math.cos(a+.1)*rx,Math.sin(a+.1)*ry);c.stroke();
 }
 c.restore();setTimeout(drawPortal,1000/24);
}drawPortal();

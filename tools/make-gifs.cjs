// Builds the tiny looping reaction GIFs shipped in src/gifs.
const fs=require('node:fs'),path=require('node:path');
const W=24,H=24;
const colors=[[0,0,0],[16,16,20],[255,255,255],[230,64,84],[255,170,190],[255,214,80],[255,176,60],[90,170,255],[90,200,120],[170,120,255],[255,150,70],[150,100,60],[255,214,170],[180,180,190]];
function lzw(minSize,data){
 const clear=1<<minSize,eoi=clear+1;
 let size=minSize+1,next=eoi+1,dict=new Map();
 const bytes=[],reset=()=>{dict=new Map();size=minSize+1;next=eoi+1;};
 let acc=0,bits=0;
 const write=code=>{acc|=code<<bits;bits+=size;while(bits>=8){bytes.push(acc&255);acc>>=8;bits-=8;}};
 reset();write(clear);
 let w=String(data[0]);
 for(let i=1;i<data.length;i++){
  const wk=w+','+data[i],known=wk.indexOf(',')<0||dict.has(wk);
  if(known)w=wk;
  else{
   write(w.indexOf(',')<0?Number(w):dict.get(w));
   if(next===4096){write(clear);reset();}
   else{dict.set(wk,next++);if(next===(1<<size)&&size<12)size++;}
   w=String(data[i]);
  }
 }
 if(w)write(w.indexOf(',')<0?Number(w):dict.get(w));
 write(eoi);if(bits)bytes.push(acc&255);return bytes;
}
function gif(frames){
 const bits=4,table=colors.concat(Array.from({length:16-colors.length},()=>[0,0,0]));
 const out=[...'GIF89a'].map(c=>c.charCodeAt(0));
 const u16=(n,a)=>{a.push(n&255,(n>>8)&255);};
 u16(W,out);u16(H,out);out.push(0x80|((bits-1)<<4)|(bits-1),0,0);
 for(const [r,g,b] of table)out.push(r,g,b);
 out.push(0x21,0xff,0x0b,...Buffer.from('NETSCAPE2.0'),0x03,0x01,0x00,0x00,0x00);
 for(const frame of frames){
  out.push(0x21,0xf9,0x04,0x09,10,0,0,0);
  out.push(0x2c,0,0,0,0);u16(W,out);u16(H,out);out.push(0);
  const packed=lzw(bits,frame);
  out.push(bits);
  for(let i=0;i<packed.length;i+=255){const n=Math.min(255,packed.length-i);out.push(n,...packed.slice(i,i+n));}
  out.push(0);
 }
 out.push(0x3b);
 return Buffer.from(out);
}
function blank(){return new Uint8Array(W*H);}
function dot(frame,x,y,c){if(x>=0&&y>=0&&x<W&&y<H)frame[y*W+x]=c;}
function disc(frame,cx,cy,r,c){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)dot(frame,cx+x,cy+y,c);}
function heart(frame,s){
 const o=blank();
 disc(o,9,10,3+s,3);disc(o,14,10,3+s,3);
 for(let y=10;y<18+s;y++){const w=Math.max(0,6+s-Math.floor((y-10)/1.3));for(let x=-w;x<=w;x++)dot(o,12+x,y,3);}
 frame.push(o);
}
function wave(frame,t){
 const o=blank();disc(o,12,16,5,12);disc(o,12,15,4,12);
 dot(o,10,14,1);dot(o,14,14,1);dot(o,12,16,3);
 const x=8+Math.round(Math.sin(t)*4);
 disc(o,x,8,2,12);for(let i=0;i<4;i++)dot(o,12+(x-12)*i/4,14-i*1.5,12);
 frame.push(o);
}
function spark(frame,t){
 const o=blank();
 for(const [x,y,p] of [[6,6,0],[16,8,1],[8,16,2],[17,16,3]]){
  const on=(t+p)%2===0;if(!on)continue;
  dot(o,x,y,5);dot(o,x-1,y,6);dot(o,x+1,y,6);dot(o,x,y-1,6);dot(o,x,y+1,6);
 }
 frame.push(o);
}
function laugh(frame,t){
 const o=blank();disc(o,12,12,7,5);disc(o,12,12,6,6);
 dot(o,9,10,1);dot(o,15,10,1);
 const m=4+ (t%2);
 for(let x=-m;x<=m;x++)dot(o,12+x,15,1);
 disc(o,12,16,2,2);
 frame.push(o);
}
function paw(frame,t){
 const o=blank();
 disc(o,12,15,4,11);disc(o,7,10,2,11);disc(o,11,8,2,11);disc(o,16,9,2,11);disc(o,18,13,2,11);
 if(t%2)disc(o,12,15,2,12);
 frame.push(o);
}
function party(frame,t){
 const o=blank();
 const cols=[3,5,7,8,9];
 for(let i=0;i<8;i++)dot(o,(i*5+t*3)%24,(i*3+t*4)%24,cols[i%cols.length]);
 disc(o,12,18,2,6);
 frame.push(o);
}
function sleep(frame,t){
 const o=blank();
 const z=[[8,14,3],[12,10,4],[16,6,5]][t%3];
 for(let i=0;i<z[2];i++){dot(o,z[0]+i,z[1],7);dot(o,z[0]+z[2]-1-i,z[1]+z[2]-1,7);dot(o,z[0]+i,z[1]+z[2]-1-i,7);}
 frame.push(o);
}
function ghost(frame,t){
 const o=blank();
 disc(o,12,10,5,2);for(let y=10;y<18;y++)for(let x=7;x<18;x++)dot(o,x,y,2);
 for(let x=7;x<18;x++)if(((x+t)%3)===0)dot(o,x,18,0);
 dot(o,10,10,1);dot(o,14,10,1);dot(o,12,13,9);
 frame.push(o);
}
const makers={wave,heart,spark,laugh,paw,party,sleep,ghost};
const dir=path.join(__dirname,'../src/gifs');
fs.mkdirSync(dir,{recursive:true});
for(const [name,draw] of Object.entries(makers)){
 const frames=[];
 const count=name==='heart'?4:name==='wave'?6:4;
 for(let t=0;t<count;t++)draw(frames,name==='heart'?[0,1,2,1][t]:t);
 fs.writeFileSync(path.join(dir,name+'.gif'),gif(frames));
}
console.log('wrote',Object.keys(makers).length,'gifs');

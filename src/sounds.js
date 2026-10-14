// One recognisable voice per companion. Each note: start offset (s), duration (s), frequency path (Hz), wave, gain, optional tremolo/vibrato rate.
const soundProfiles={
 miso:[{t:0,d:.34,f:[620,980,760],w:'triangle',g:1,vib:7},{t:.4,d:.16,f:[700,620],w:'triangle',g:.7}], // soft meow
 ember:[{t:0,d:.09,f:[330,250],w:'square',g:.7},{t:.14,d:.09,f:[330,250],w:'square',g:.7},{t:.28,d:.09,f:[330,250],w:'square',g:.7},{t:.42,d:.22,f:[300,190],w:'sawtooth',g:.6}], // cheeky snicker
 bumble:[{t:0,d:.4,f:[210,235,210],w:'sawtooth',g:.55,trem:34},{t:.45,d:.2,f:[260,300],w:'sawtooth',g:.5,trem:34}], // buzz
 boo:[{t:0,d:.16,f:[780,1040,860],w:'sine',g:.7,vib:6},{t:.14,d:.18,f:[1100,820],w:'sine',g:.5,vib:7}], // tiny soft boo-oo
 drowsy:[{t:0,d:.65,f:[420,330,180],w:'triangle',g:.9,vib:3},{t:.7,d:.3,f:[160,120],w:'sine',g:.6}], // sleepy yawn-sigh
 luffy:[{t:0,d:.11,f:[560,330],w:'square',g:.55},{t:.17,d:.13,f:[600,340],w:'square',g:.55}], // two quick woofs
 merlin:[{t:0,d:.5,f:[784],w:'sine',g:.8,bell:1},{t:.09,d:.5,f:[988],w:'sine',g:.8,bell:1},{t:.18,d:.5,f:[1175],w:'sine',g:.8,bell:1},{t:.27,d:.7,f:[1568],w:'sine',g:.8,bell:1}] // magic chime
};
let petAudio,lastSoundAt=0,audioSuspendTimer;
// Bundled CC0 clips (see sounds/CREDITS.txt). The synthesized profiles above remain as a fallback if a clip cannot load.
// Luffy's puppy barks are cut into clips, one per kind of moment.
function luffyClip(action){
 if(['jump','flip','ping','land','pounce'].includes(action))return 'luffy_bark';
 if(['welcome','dance','beg','attention','alert','scare'].includes(action))return 'luffy_yips';
 if(action==='gomu')return 'luffy_long';
 if(action==='gomu_hit')return 'luffy_hit';
 return 'luffy_happy';
}
const clipCache=new Map(),clipTypes=new Set(['miso','boo','bell','luffy_bark','luffy_happy','luffy_yips','luffy_long','luffy_hit']); // the other voices use the synthesized profiles
function getClip(name){
 if(!clipCache.has(name)){const el=new Audio('sounds/'+name+'.ogg');el.preload='auto';const node=petAudio.createMediaElementSource(el);const gain=petAudio.createGain();node.connect(gain);gain.connect(petAudio.destination);clipCache.set(name,{el,gain});}
 return clipCache.get(name);
}
async function playClip(name,volume,{rate=1,repeat=1,gap=1300}={}){
 const c=getClip(name);if(c.el.error)return 0;
 c.gain.gain.value=Math.min(1,volume*1.6);c.el.playbackRate=rate;
 for(let i=0;i<repeat;i++)setTimeout(()=>{c.el.currentTime=0;c.el.play().catch(()=>{});},i*gap);
 await new Promise(done=>{if(c.el.readyState>=1)done();else{c.el.addEventListener('loadedmetadata',done,{once:true});c.el.addEventListener('error',done,{once:true});}});
 return c.el.error?0:((c.el.duration||1)/rate+(repeat-1)*gap/1000)*1000;
}
async function playPetSound(event){
 if(!event.sounds||event.volume<=0)return false;
 const now=performance.now();if(now-lastSoundAt<900&&!event.preview)return false;lastSoundAt=now;
 try{
  petAudio ||= new AudioContext();await petAudio.resume();clearTimeout(audioSuspendTimer);
  const rate=event.action==='jump'?1.12:event.action==='sleep'?.88:1,file=event.action==='reminder'||event.action==='water'?'bell':event.type==='luffy'?luffyClip(event.action):event.type;
  const ms=!clipTypes.has(file)?0:await playClip(file,Math.min(.5,event.volume),event.action==='reminder'?{repeat:3,gap:1400}:event.action==='water'?{repeat:1}:{rate});
  if(ms){clearTimeout(audioSuspendTimer);audioSuspendTimer=setTimeout(()=>petAudio?.suspend(),ms+250);return true;}
  if(event.action==='reminder'){
   const b=petAudio.currentTime,vol=Math.min(.5,event.volume)*.22;
   for(let ring=0;ring<3;ring++)for(const [i,freq] of [[0,1319],[.22,1047]].map(([d,f])=>[d,f])){
    const start=b+ring*1.3+i;
    for(const [mult,amp,decay] of [[1,1,1.1],[2.76,.5,.6],[5.4,.25,.3]]){
     const o=petAudio.createOscillator(),g=petAudio.createGain();o.type='sine';o.frequency.value=freq*mult;
     g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(vol*amp,start+.01);g.gain.exponentialRampToValueAtTime(.0001,start+decay);
     o.connect(g);g.connect(petAudio.destination);o.start(start);o.stop(start+decay+.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
   }
   clearTimeout(audioSuspendTimer);audioSuspendTimer=setTimeout(()=>petAudio?.suspend(),4600);return true;
  }
  const profile=soundProfiles[event.type]||soundProfiles.miso,base=petAudio.currentTime,multiplier=event.action==='jump'?1.25:event.action==='sleep'?.8:1,vol=Math.min(.5,event.volume)*.14;
  for(const n of profile){
   const start=base+n.t,end=start+n.d;
   for(const [mult,amp] of n.bell?[[1,1],[2.76,.4],[5.4,.18]]:[[1,1]]){
    const o=petAudio.createOscillator(),g=petAudio.createGain();o.type=n.w;
    n.f.forEach((f,i)=>{const at=start+(n.f.length<2?0:n.d*i/(n.f.length-1)),hz=f*multiplier*mult;i?o.frequency.linearRampToValueAtTime(hz,at):o.frequency.setValueAtTime(hz,at);});
    g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(vol*n.g*amp,start+.02);g.gain.exponentialRampToValueAtTime(.0001,end);
    const extra=[];
    if(n.trem){const lfo=petAudio.createOscillator(),depth=petAudio.createGain(),bias=petAudio.createGain();lfo.frequency.value=n.trem;depth.gain.value=.5;lfo.connect(depth);depth.connect(bias.gain);bias.gain.value=.5;o.connect(bias);bias.connect(g);lfo.start(start);lfo.stop(end+.02);extra.push(lfo,depth,bias);}
    else o.connect(g);
    if(n.vib){const lfo=petAudio.createOscillator(),depth=petAudio.createGain();lfo.frequency.value=n.vib;depth.gain.value=n.f[0]*.03;lfo.connect(depth);depth.connect(o.frequency);lfo.start(start);lfo.stop(end+.02);extra.push(lfo,depth);}
    g.connect(petAudio.destination);o.start(start);o.stop(end+.02);o.onended=()=>{for(const x of [o,g,...extra])x.disconnect();};
   }
  }
  audioSuspendTimer=setTimeout(()=>petAudio?.suspend(),Math.max(...profile.map(n=>n.t+n.d))*1000+150);return true;
 }catch(error){console.warn('Petio sound unavailable:',error.message);return false;}
}
window.pet.onSound(playPetSound);

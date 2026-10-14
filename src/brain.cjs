const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const types = ['miso', 'ember', 'bumble', 'boo', 'drowsy', 'merlin', 'luffy'];
function validZone(z) {
  return z && [z.x, z.y, z.width, z.height].every(Number.isFinite) && z.width >= 260 && z.height >= 220 ? { x: Math.round(z.x), y: Math.round(z.y), width: Math.round(z.width), height: Math.round(z.height) } : null;
}
function sanitize(raw = {}) {
  return {
    energy: Number.isFinite(raw.energy) ? clamp(raw.energy, 0, 100) : 80,
    bond: Number.isFinite(raw.bond) ? clamp(raw.bond, 0, 100) : 0,
    personality: ['curious', 'sleepy', 'mischievous'].includes(raw.personality) ? raw.personality : 'curious',
    roaming: raw.roaming !== false,
    alwaysOnTop: raw.alwaysOnTop !== false,
    type: types.includes(raw.type) ? raw.type : 'miso',
    scale: Number.isFinite(raw.scale) ? clamp(raw.scale, .3, .9) : .65,
    speed: Number.isFinite(raw.speed) ? clamp(raw.speed, 20, 120) : 45,
    attention: raw.attention !== false,
    attentionMinutes: Number.isFinite(raw.attentionMinutes) ? clamp(raw.attentionMinutes, 1, 120) : 15,
    menuSize: ['small','medium','large'].includes(raw.menuSize) ? raw.menuSize : 'medium',
    lookAt: raw.lookAt !== false,
    aware: raw.aware !== false,
    zone: validZone(raw.zone),
    notify: raw.notify === true,
    water: raw.water === true,
    waterMinutes: Number.isFinite(raw.waterMinutes) ? clamp(Math.round(raw.waterMinutes), 5, 180) : 25,
    prompts: raw.prompts !== false,
    sounds: raw.sounds !== false,
    volume: Number.isFinite(raw.volume) ? (raw.volume === .18 ? .07 : clamp(raw.volume,0,.5)) : .07, // .18 was the old default; move it to the new quieter one
    crossScreens: raw.crossScreens === true,
    autoUpdate: raw.autoUpdate === true,
    chatTheme: ['system','light','dark'].includes(raw.chatTheme) ? raw.chatTheme : 'system',
    reminders: Array.isArray(raw.reminders) ? raw.reminders.filter(r => r && typeof r.id === 'string' && typeof r.text === 'string' && r.text.length <= 140 && Number.isFinite(r.due)).slice(0, 50).map(r=>({...r, window:normalizeWindow(r.window), ...(Number.isFinite(r.intervalMs)&&r.intervalMs>=60000&&r.intervalMs<=604800000?{intervalMs:r.intervalMs}:{intervalMs:0})})) : []
  };
}
function choose(state, random = Math.random) {
  if (state.energy < 20) return 'sleep';
  const r = random();
  if (state.type === 'ember' && r < .14) return 'trident';
  if (state.personality === 'sleepy' && r < .45) return 'sleep';
  if (state.personality === 'mischievous' && r < .3) return 'dance';
  if (r < .18) return 'curious';
  if (r < .38) return 'idle';
  return state.roaming ? 'walk' : 'curious';
}
function keepOnScreen(point, area, size) {
  return { x: Math.round(clamp(point.x, area.x, area.x + area.width - size.width)),
    y: Math.round(clamp(point.y, area.y, area.y + area.height - size.height)) };
}
function nextDisplay(displays, currentId, direction) {
  const ordered = [...displays].sort((a, b) => a.workArea.x - b.workArea.x || a.workArea.y - b.workArea.y);
  const index = ordered.findIndex(d => d.id === currentId);
  return ordered.length < 2 ? null : ordered[(index + direction + ordered.length) % ordered.length];
}
function nativePoint(point) {
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 const x=Math.round(point.x),y=Math.round(point.y);
 if(Math.abs(x)>2147483647||Math.abs(y)>2147483647)return null;
 return {x:x===0?0:x,y:y===0?0:y};
}
function ghostTravelPoint(route, progress) {
 const t=clamp(progress,0,1),split=route.split||.5;
 if(route.continuous)return {x:route.from.x+(route.to.x-route.from.x)*t,y:route.from.y+(route.to.y-route.from.y)*t};
 const start=t<split?route.from:route.entry,end=t<split?route.exit:route.to,f=t<split?t/split:(t-split)/(1-split);
 return {x:start.x+(end.x-start.x)*f,y:start.y+(end.y-start.y)*f};
}
function normalizeWindow(value){
 const valid=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
 return value&&valid(value.start)&&valid(value.end)&&value.start!==value.end?{start:value.start,end:value.end}:null;
}
// Local calendar days, rather than fixed 24-hour offsets, respect clock changes.
function nextWindowTime(timestamp,window){
 const w=normalizeWindow(window);if(!w)return timestamp;
 const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3)),start=minutes(w.start),end=minutes(w.end);
 const d=new Date(timestamp),m=d.getHours()*60+d.getMinutes();
 if(start<end?(m>=start&&m<end):(m>=start||m<end))return timestamp;
 if(start<end&&m>=end)d.setDate(d.getDate()+1);
 d.setHours(Math.floor(start/60),start%60,0,0);return d.getTime();
}
function dueReminders(reminders, now) {
 const due=[],pending=[];
 for(const r of reminders){
  if(r.due>now){pending.push(r);continue;}
  const allowed=nextWindowTime(now,r.intervalMs?r.window:null);
  if(allowed>now){pending.push({...r,due:allowed});continue;}
  due.push(r);
  if(Number.isFinite(r.intervalMs)&&r.intervalMs>=60000)pending.push({...r,due:nextWindowTime(r.due+(Math.floor((now-r.due)/r.intervalMs)+1)*r.intervalMs,r.window)});
 }
 return {due,pending,changed:due.length>0||pending.some((r,i)=>r!==reminders[i])};
}
module.exports = { normalizeWindow, nextWindowTime, sanitize, choose, keepOnScreen, nextDisplay, dueReminders, types, nativePoint, ghostTravelPoint };

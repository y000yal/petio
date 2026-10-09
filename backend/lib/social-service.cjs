const fs=require('node:fs');
const path=require('node:path');
const {randomBytes,randomUUID,createHash}=require('node:crypto');
const types=['miso','ember','bumble','boo','drowsy','merlin','luffy'];
const secret=()=>randomBytes(24).toString('hex');
const hash=value=>createHash('sha256').update(String(value)).digest('hex');
function createService({ state, file, now = Date.now, leaseMs = 15000 } = {}) {
  let db = state || { users: {}, rooms: {}, visits: {} };
  if (file && fs.existsSync(file)) db = JSON.parse(fs.readFileSync(file, 'utf8'));
  const presence = new Map(Object.values(db.users).filter(u=>u.lastSeen).map(u=>[u.id,u.lastSeen]));
  const save = () => { if(file){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(db));fs.renameSync(file+'.tmp',file);} };
  const fail = message => { throw new Error(message); };
  const text = (value,max) => typeof value === 'string' && value.trim().length <= max && value.trim() ? value.trim() : fail('Invalid or empty text.');
  const online = id => presence.has(id) && now()-presence.get(id)<leaseMs;
  function expire() {
    let changed=false;
    for(const v of Object.values(db.visits)) if(v.phase!=='returned' && (v.expires<=now() || !online(v.owner) || !online(v.host))){v.phase='returned';v.reason='Visit ended or connection lost';v.returnedAt=now();changed=true;}
    const recent=Object.values(db.visits).filter(v=>v.phase==='returned').sort((a,b)=>(b.returnedAt||b.expires)-(a.returnedAt||a.expires));
    for(const v of recent.slice(200))delete db.visits[v.id];
    if(changed)save();
  }
  function handle(route, data={}, token) {
    if(!data||typeof data!=='object'||Array.isArray(data))fail('Invalid request.');
    if(route==='/register'){
      if(Object.keys(db.users).length>=100)fail('Prototype user limit reached.');
      const id=randomUUID(), credential=secret();db.users[id]={id,name:text(data.name,30),tokenHash:hash(credential),room:null,accept:false};save();return {id,token:credential};
    }
    const user=Object.values(db.users).find(u=>token && (u.tokenHash===hash(token)||u.token===token));if(!user)fail('Please create your profile first.');
    presence.set(user.id,now());user.lastSeen=now();if(route==='/state'&&Number.isInteger(data.capacity)&&data.capacity>=1&&data.capacity<=5)user.capacity=data.capacity;expire();
    if(route==='/identity')return {id:user.id};
    const own=()=>Object.values(db.visits).find(v=>v.owner===user.id&&v.phase!=='returned');
    const incoming=()=>Object.values(db.visits).filter(v=>v.host===user.id&&v.phase!=='returned').sort((a,b)=>(a.createdAt||a.expires)-(b.createdAt||b.expires)||a.id.localeCompare(b.id));
    const capacity=host=>Math.min(host.capacity||1,host.visitorLimit||5);
    if(route==='/room/create'){
      if(user.room)fail('You already belong to a group.');
      const id=randomUUID(),code=secret();db.rooms[id]={id,code,name:text(data.name,40)};user.room=id;save();return {ok:true};
    }
    if(route==='/room/join'){
      if(user.room)fail('You already belong to a group.');
      const room=Object.values(db.rooms).find(r=>r.code===data.code);if(!room)fail('Invite code was not found.');
      if(Object.values(db.users).filter(u=>u.room===room.id).length>=12)fail('Group is full.');user.room=room.id;save();return {ok:true};
    }
    if(route==='/preferences'){if(data.visitorLimit!==undefined&&(!Number.isInteger(data.visitorLimit)||data.visitorLimit<1||data.visitorLimit>5))fail('Choose one to five visitors.');if(typeof data.accept==='boolean')user.accept=data.accept;if(data.visitorLimit!==undefined)user.visitorLimit=data.visitorLimit;for(const visit of incoming().slice(user.accept?capacity(user):0)){visit.phase='returned';visit.reason=user.accept?'Host reduced the visitor limit':'Host ended visits';visit.returnedAt=now();}save();return {ok:true};}
    if(route==='/visit/send'){
      const host=db.users[data.host];
      if(!host||host.id===user.id||!user.room||host.room!==user.room||!online(host.id)||!host.accept)fail('Choose an online group member who accepts visits.');
      if(own())fail('Your pet is already travelling or visiting.');
      if(Object.values(db.visits).filter(v=>v.host===host.id&&v.phase!=='returned').length>=capacity(host))fail('This desktop has reached its visitor limit.');
      if(!types.includes(data.type))fail('Unknown companion.');
      const id=randomUUID();db.visits[id]={id,owner:user.id,host:host.id,type:data.type,message:text(data.message,280),phase:'departing',createdAt:now(),expires:now()+5*60000,reply:'',reason:''};save();return {ok:true};
    }
    if(route==='/visit/depart'){
      const v=db.visits[data.id];if(!v||v.owner!==user.id||v.phase!=='departing')fail('Departure no longer available.');v.phase='arriving';save();return {ok:true};
    }
    if(route==='/visit/arrive'){
      const v=db.visits[data.id];if(!v||v.host!==user.id||v.phase!=='arriving')fail('Arrival no longer available.');v.phase='active';save();return {ok:true};
    }
    if(route==='/visit/return'){
      const v=db.visits[data.id];if(!v||![v.owner,v.host].includes(user.id)||v.phase==='returned')fail('Visit has already ended.');
      if(data.reply!==undefined){if(v.host!==user.id)fail('Only the host can reply.');v.reply=text(data.reply,280);}
      v.phase='returned';v.returnedAt=now();v.reason=user.id===v.owner?'Recalled by owner':'Sent home by friend';save();return {ok:true};
    }
    if(route==='/state'){
      const room=db.rooms[user.room];
      const decorate=v=>v?{...v,ownerName:db.users[v.owner].name,hostName:db.users[v.host].name}:null;
      const recent=Object.values(db.visits).filter(v=>v.owner===user.id&&v.phase==='returned').sort((a,b)=>(a.returnedAt||a.expires)-(b.returnedAt||b.expires)).slice(-10).map(decorate);
      return {me:{id:user.id,name:user.name,accept:user.accept,visitorLimit:user.visitorLimit||5,capacity:capacity(user)},room:room||null,members:room?Object.values(db.users).filter(u=>u.room===room.id&&u.id!==user.id).map(u=>({id:u.id,name:u.name,online:online(u.id),accept:u.accept,visitorCount:Object.values(db.visits).filter(v=>v.host===u.id&&v.phase!=='returned').length,capacity:capacity(u)})):[],outgoing:decorate(own()),incoming:decorate(incoming()[0]),incomingVisits:incoming().map(decorate),recent};
    }
    fail('Unknown request.');
  }
  return {handle,db};
}
module.exports={createService};

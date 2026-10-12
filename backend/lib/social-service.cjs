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
  const seenAt = id => presence.has(id) ? presence.get(id) : (db.users[id]?.lastSeen || 0);
  const online = id => { const seen = seenAt(id); return !!seen && now()-seen<leaseMs; };
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
      if(Object.values(db.users).filter(u=>u.room===room.id).length>=12)fail('Group is full.');user.room=room.id;room.notices=(room.notices||[]).concat([{id:randomUUID(),kind:'join',name:user.name,user:user.id,at:now()}]).slice(-24);save();return {ok:true};
    }
    if(route==='/preferences'){if(data.visitorLimit!==undefined&&(!Number.isInteger(data.visitorLimit)||data.visitorLimit<1||data.visitorLimit>5))fail('Choose one to five visitors.');if(typeof data.accept==='boolean')user.accept=data.accept;if(data.visitorLimit!==undefined)user.visitorLimit=data.visitorLimit;for(const visit of incoming().slice(user.accept?capacity(user):0)){visit.phase='returned';visit.reason=user.accept?'Host reduced the visitor limit':'Host ended visits';visit.returnedAt=now();}save();return {ok:true};}
    const ensureChat=room=>{if(!Array.isArray(room.chat))room.chat=(room.notices||[]).filter(n=>n.kind==='message'&&typeof n.text==='string').map(n=>({id:n.id,from:n.user,to:n.to||'group',name:n.name,text:n.text,at:n.at}));return room.chat;};
    if(route==='/message'){
      if(!user.room)fail('Join a group before sending a note.');
      const room=db.rooms[user.room];
      const members=Object.values(db.users).filter(u=>u.room===room.id&&u.id!==user.id);
      if(!members.length)fail('Invite a friend before sending to the group.');
      const to=data.host&&data.host!=='group'?String(data.host):'group';
      const person=to==='group'?null:members.find(u=>u.id===to);
      if(to!=='group'&&!person)fail('Choose someone in your group.');
      if(person&&!person.accept)fail('This friend has visits turned off.');
      const message=text(data.message,280);
      const sameThread=(m,host)=>host==='group'?m.to==='group':(m.from===user.id&&m.to===host)||(m.from===host&&m.to===user.id);
      let reply;
      if(data.reply){
        const source=ensureChat(room).find(m=>m.id===data.reply);
        if(!source||!sameThread(source,to))fail('Reply inside the same chat.');
        reply={id:source.id,name:source.name,text:String(source.text||'').slice(0,140)};
      }
      const entry={id:randomUUID(),from:user.id,to,name:user.name,text:message,at:now(),seen:[],...(reply?{reply}:{})};
      room.chat=ensureChat(room).concat(entry).slice(-120);
      room.notices=(room.notices||[]).concat([{id:entry.id,kind:'message',name:user.name,user:user.id,to,text:message,at:entry.at}]).slice(-24);
      save();return {ok:true};
    }
    if(route==='/unsend'){
      if(!user.room)fail('Join a group first.');
      const room=db.rooms[user.room],chat=ensureChat(room),entry=chat.find(m=>m.id===data.id);
      if(!entry||entry.from!==user.id)fail('That message cannot be unsent.');
      if(now()-(entry.at||0)>30*60*1000)fail('Messages can only be unsent for 30 minutes.');
      room.chat=chat.filter(m=>m.id!==entry.id);
      room.notices=(room.notices||[]).filter(n=>n.id!==entry.id);
      save();return {ok:true};
    }
    if(route==='/react'||route==='/pin'){
      if(!user.room)fail('Join a group first.');
      const room=db.rooms[user.room],entry=ensureChat(room).find(m=>m.id===data.id&&(m.to==='group'||m.from===user.id||m.to===user.id));
      if(!entry)fail('That message is no longer there.');
      if(route==='/pin'){entry.pinned=!entry.pinned;if(!entry.pinned)delete entry.pinnedBy;else entry.pinnedBy=user.id;save();return {ok:true};}
      const emoji=typeof data.emoji==='string'?data.emoji.trim():'';
      if(!emoji||emoji.length>16||/[\u0000-\u001f]/.test(emoji))fail('Pick an emoji.');
      entry.reactions=Array.isArray(entry.reactions)?entry.reactions:[];
      let row=entry.reactions.find(r=>r&&r.emoji===emoji);
      if(!row){row={emoji,by:[]};entry.reactions.push(row);}
      row.by=Array.isArray(row.by)?row.by:[];
      row.by=row.by.includes(user.id)?row.by.filter(id=>id!==user.id):row.by.concat(user.id);
      entry.reactions=entry.reactions.filter(r=>r.by.length);
      if(!entry.reactions.length)delete entry.reactions;
      save();return {ok:true};
    }
    if(route==='/typing'||route==='/seen'){
      if(!user.room)fail('Join a group first.');
      const room=db.rooms[user.room];
      const members=Object.values(db.users).filter(u=>u.room===room.id&&u.id!==user.id);
      const to=data.host&&data.host!=='group'?String(data.host):'group';
      if(to!=='group'&&!members.some(u=>u.id===to))fail('Choose someone in your group.');
      if(route==='/typing'){user.typing=data.active===false?null:{to,at:now()};save();return {ok:true};}
      for(const m of ensureChat(room)){
        const inThread=to==='group'?m.to==='group':(m.from===user.id&&m.to===to)||(m.from===to&&m.to===user.id);
        if(!inThread||m.from===user.id)continue;
        m.seen=Array.isArray(m.seen)?m.seen:[];
        if(!m.seen.includes(user.id))m.seen.push(user.id);
      }
      save();return {ok:true};
    }
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
      const notices=room?(room.notices||[]).filter(n=>n.user!==user.id&&!(user.seenNotices||[]).includes(n.id)&&!(n.kind==='message'&&n.to&&n.to!=='group'&&n.to!==user.id)).slice(0,8):[];
      if(notices.length){user.seenNotices=[...(user.seenNotices||[]),...notices.map(n=>n.id)].slice(-40);save();}
      const members=room?Object.values(db.users).filter(u=>u.room===room.id&&u.id!==user.id).map(u=>({id:u.id,name:u.name,online:online(u.id),accept:!!u.accept,visitorCount:Object.values(db.visits).filter(v=>v.host===u.id&&v.phase!=='returned').length,capacity:capacity(u)})).sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name)):[];
      const chat=room?ensureChat(room).filter(m=>m.to==='group'||m.from===user.id||m.to===user.id).slice(-80):[];
      const typing=room?Object.values(db.users).filter(u=>u.id!==user.id&&u.room===room.id&&u.typing&&now()-u.typing.at<4000&&(u.typing.to==='group'||u.typing.to===user.id)).map(u=>({id:u.id,name:u.name,to:u.typing.to})):[]
      return {me:{id:user.id,name:user.name,accept:user.accept,visitorLimit:user.visitorLimit||5,capacity:capacity(user)},room:room?{id:room.id,code:room.code,name:room.name}:null,members,notices,chat,typing,outgoing:decorate(own()),incoming:decorate(incoming()[0]),incomingVisits:incoming().map(decorate),recent};
    }
    fail('Unknown request.');
  }
  return {handle,db};
}
module.exports={createService};

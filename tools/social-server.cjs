// Local prototype: private rooms, bearer identities, and expiring pet visits.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { types } = require('../src/brain.cjs');
const secret = () => randomBytes(24).toString('hex');
function createService({ file, now = Date.now } = {}) {
  let db = { users: {}, rooms: {}, visits: {} };
  if (file && fs.existsSync(file)) db = JSON.parse(fs.readFileSync(file, 'utf8'));
  const presence = new Map();
  const save = () => { if(file){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(db));fs.renameSync(file+'.tmp',file);} };
  const fail = message => { throw new Error(message); };
  const text = (value,max) => typeof value === 'string' && value.trim().length <= max && value.trim() ? value.trim() : fail('Invalid or empty text.');
  const online = id => presence.has(id) && now()-presence.get(id)<15000;
  function expire() {
    let changed=false;
    for(const v of Object.values(db.visits)) if(v.phase!=='returned' && (v.expires<=now() || !online(v.owner) || !online(v.host))){v.phase='returned';v.reason='Visit ended or connection lost';changed=true;}
    if(changed)save();
  }
  function handle(route, data={}, token) {
    if(route==='/register'){
      if(Object.keys(db.users).length>=100)fail('Prototype user limit reached.');
      const id=randomUUID(), credential=secret();db.users[id]={id,name:text(data.name,30),token:credential,room:null,accept:false};save();return {id,token:credential};
    }
    const user=Object.values(db.users).find(u=>u.token===token);if(!user)fail('Please create your profile first.');
    presence.set(user.id,now());expire();
    const own=()=>Object.values(db.visits).find(v=>v.owner===user.id&&v.phase!=='returned');
    const incoming=()=>Object.values(db.visits).find(v=>v.host===user.id&&v.phase!=='returned');
    if(route==='/room/create'){
      if(user.room)fail('You already belong to a group.');
      const id=randomUUID(),code=secret();db.rooms[id]={id,code,name:text(data.name,40)};user.room=id;save();return {ok:true};
    }
    if(route==='/room/join'){
      if(user.room)fail('You already belong to a group.');
      const room=Object.values(db.rooms).find(r=>r.code===data.code);if(!room)fail('Invite code was not found.');
      if(Object.values(db.users).filter(u=>u.room===room.id).length>=12)fail('Group is full.');user.room=room.id;save();return {ok:true};
    }
    if(route==='/preferences'){user.accept=data.accept===true;const visit=incoming();if(!user.accept&&visit){visit.phase='returned';visit.reason='Host ended visits';}save();return {ok:true};}
    if(route==='/visit/send'){
      const host=db.users[data.host];
      if(!host||host.id===user.id||!user.room||host.room!==user.room||!online(host.id)||!host.accept)fail('Choose an online group member who accepts visits.');
      if(own()||Object.values(db.visits).some(v=>v.host===host.id&&v.phase!=='returned'))fail('A pet is already travelling or visiting.');
      if(!types.includes(data.type))fail('Unknown companion.');
      const id=randomUUID();db.visits[id]={id,owner:user.id,host:host.id,type:data.type,message:text(data.message,280),phase:'departing',expires:now()+5*60000,reply:'',reason:''};save();return {ok:true};
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
      v.phase='returned';v.reason=user.id===v.owner?'Recalled by owner':'Sent home by friend';save();return {ok:true};
    }
    if(route==='/state'){
      const room=db.rooms[user.room];
      const decorate=v=>v?{...v,ownerName:db.users[v.owner].name,hostName:db.users[v.host].name}:null;
      const recent=Object.values(db.visits).filter(v=>v.owner===user.id&&v.phase==='returned').slice(-10).map(decorate);
      return {me:{id:user.id,name:user.name,accept:user.accept},room:room||null,members:room?Object.values(db.users).filter(u=>u.room===room.id&&u.id!==user.id).map(u=>({id:u.id,name:u.name,online:online(u.id),accept:u.accept})):[],outgoing:decorate(own()),incoming:decorate(incoming()),recent};
    }
    fail('Unknown request.');
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try {
      if(req.method!=='POST'||req.headers.origin)throw new Error('Use the Petio desktop client.');
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('Request too large.');}
      const result=handle(req.url,JSON.parse(body||'{}'),req.headers.authorization?.replace(/^Bearer /,''));res.end(JSON.stringify(result));
    }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}
  });
  server.requestTimeout=5000;server.headersTimeout=6000;
  return {server,handle};
}
if(require.main===module){const {server}=createService({file:path.join(__dirname,'../.social/server.json')});server.listen(4319,'127.0.0.1',()=>console.log('Petio local group server: http://127.0.0.1:4319'));}
module.exports={createService};

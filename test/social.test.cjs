const test=require('node:test');
const assert=require('node:assert/strict');
const {createService}=require('../tools/social-server.cjs');
test('private groups transfer one pet through departure, arrival, reply and recall',()=>{
 let time=1000;const {handle:h}=createService({now:()=>time});
 const a=h('/register',{name:'Alice'}),b=h('/register',{name:'Bob'}),c=h('/register',{name:'Outsider'});
 const call=(u,r,d)=>h(r,d,u.token);
 call(a,'/room/create',{name:'Friends'});const code=call(a,'/state').room.code;
 call(b,'/room/join',{code});call(b,'/preferences',{accept:true});
 assert.throws(()=>call(c,'/visit/send',{host:b.id,type:'boo',message:'Hi'}));
 assert.throws(()=>call(a,'/visit/send',{host:b.id,type:'null',message:'Hi'}));
 call(a,'/visit/send',{host:b.id,type:'boo',message:'Lunch? 👻'});
 let v=call(a,'/state').outgoing;assert.equal(v.phase,'departing');
 assert.throws(()=>call(b,'/visit/arrive',{id:v.id}));
 call(a,'/visit/depart',{id:v.id});assert.equal(call(b,'/state').incoming.phase,'arriving');
 call(b,'/visit/arrive',{id:v.id});assert.equal(call(a,'/state').outgoing.phase,'active');
 assert.throws(()=>call(a,'/visit/send',{host:b.id,type:'boo',message:'Duplicate'}));
 assert.throws(()=>call(c,'/visit/return',{id:v.id,reply:'Injected'}));
 call(b,'/visit/return',{id:v.id,reply:'Yes!'});assert.equal(call(a,'/state').outgoing,null);assert.equal(call(a,'/state').recent[0].reply,'Yes!');
 call(a,'/visit/send',{host:b.id,type:'luffy',message:'Woof'});v=call(a,'/state').outgoing;call(a,'/visit/return',{id:v.id});assert.equal(call(b,'/state').incoming,null);
 assert.throws(()=>h('/state',{},'incorrect-token'));
});
test('visits expire on disconnect, host opt-out, and maximum duration',()=>{
 let time=1000;const {handle:h}=createService({now:()=>time}),a=h('/register',{name:'A'}),b=h('/register',{name:'B'});
 const call=(u,r,d)=>h(r,d,u.token);call(a,'/room/create',{name:'Room'});call(b,'/room/join',{code:call(a,'/state').room.code});call(b,'/preferences',{accept:true});
 const send=()=>call(a,'/visit/send',{host:b.id,type:'merlin',message:'Hello'});
 send();time+=16000;assert.equal(call(a,'/state').outgoing,null);
 call(b,'/state');send();call(b,'/preferences',{accept:false});assert.equal(call(a,'/state').outgoing,null);
 call(b,'/preferences',{accept:true});send();for(let i=0;i<31;i++){time+=10000;call(a,'/state');call(b,'/state');}assert.equal(call(a,'/state').outgoing,null);
});
test('HTTP clients can exchange a pet and cannot bypass authentication',async()=>{
 const {server}=createService();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const req=async(route,data={},token='')=>{const r=await fetch(url+route,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(data)});return {status:r.status,body:await r.json()};};
 try{
  const a=(await req('/register',{name:'One'})).body,b=(await req('/register',{name:'Two'})).body;
  await req('/room/create',{name:'Test'},a.token);const code=(await req('/state',{},a.token)).body.room.code;
  await req('/room/join',{code},b.token);await req('/preferences',{accept:true},b.token);
  assert.equal((await req('/state')).status,400);assert.equal((await req('/visit/send',{host:b.id,type:'miso',message:'Hello'},a.token)).status,200);
  const v=(await req('/state',{},a.token)).body.outgoing;await req('/visit/depart',{id:v.id},a.token);await req('/visit/arrive',{id:v.id},b.token);
  await req('/visit/return',{id:v.id,reply:'Hi back'},b.token);assert.equal((await req('/state',{},a.token)).body.recent[0].reply,'Hi back');
 }finally{await new Promise(r=>server.close(r));}
});

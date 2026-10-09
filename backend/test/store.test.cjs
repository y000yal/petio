const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {createStore}=require('../lib/store.cjs');
// An embedded real PostgreSQL engine executes the schema and transaction SQL.
async function fixture(){
 const db=new PGlite();await db.exec(fs.readFileSync(path.join(__dirname,'../schema.sql'),'utf8'));
 const pool={connect:async()=>({query:(...args)=>db.query(...args),release(){}})};
 let now=1000;const options={now:()=>now,registrationCode:'friends-only'};
 return {db,pool,options,tick:ms=>{now+=ms;},call:async(route,data={},token='',ip='one')=>createStore(pool,options).execute(route,data,token,ip)};
}
test('Neon schema and transactions persist identities, groups and visits across service instances',async()=>{
 const f=await fixture();try{
  await assert.rejects(f.call('/register',{name:'No access'}),/registration code/);
  const a=await f.call('/register',{name:'Alice',accessCode:'friends-only'}),b=await f.call('/register',{name:'Bob',accessCode:'friends-only'});
  const stored=(await f.db.query('SELECT data FROM petio_state WHERE id=1')).rows[0].data;
  assert.equal(stored.users[a.id].token,undefined);assert.equal(stored.users[a.id].tokenHash.length,64);assert(!JSON.stringify(stored).includes(a.token));
  assert.equal((await f.call('/identity',{},a.token)).id,a.id);
  await f.call('/room/create',{name:'Friends'},a.token);const code=(await f.call('/state',{},a.token)).room.code;
  await f.call('/room/join',{code},b.token);await f.call('/preferences',{accept:true},b.token);
  await f.call('/visit/send',{host:b.id,type:'boo',message:'Hi 👻'},a.token);
  const v=(await f.call('/state',{},a.token)).outgoing;await f.call('/visit/depart',{id:v.id},a.token);
  await f.call('/visit/arrive',{id:v.id},b.token);
  await assert.rejects(f.call('/visit/send',{host:b.id,type:'luffy',message:'Duplicate'},a.token),/already/);
  await assert.rejects(f.call('/visit/return',{id:v.id,reply:'Injected'},a.token),/Only the host/);
  await f.call('/visit/return',{id:v.id,reply:'Hi back'},b.token);
  assert.equal((await f.call('/state',{},a.token)).recent[0].reply,'Hi back');
  await f.call('/visit/send',{host:b.id,type:'merlin',message:'Later'},a.token);f.tick(31000);
  assert.equal((await f.call('/state',{},a.token)).outgoing,null);
  // JSONB reorders object keys; history must follow return time, not UUID order.
  const history=(await f.db.query('SELECT data FROM petio_state WHERE id=1')).rows[0].data;
  const base={owner:a.id,host:b.id,type:'boo',phase:'returned',expires:90000,message:'Hello'};
  history.visits={aaaa:{...base,id:'aaaa',returnedAt:200,reply:'Latest'},zzzz:{...base,id:'zzzz',returnedAt:100,reply:'Earlier'}};
  await f.db.query('UPDATE petio_state SET data=$1::jsonb WHERE id=1',[JSON.stringify(history)]);
  assert.equal((await f.call('/state',{},a.token)).recent.at(-1).reply,'Latest');
 }finally{await f.db.close();}
});
test('request limits persist between instances and reset after a minute',async()=>{
 const f=await fixture();try{
  for(let i=0;i<5;i++)await f.call('/register',{name:'Friend '+i,accessCode:'friends-only'});
  await assert.rejects(f.call('/register',{name:'Extra',accessCode:'friends-only'}),e=>e.status===429);
  await assert.rejects(f.call('/state',{},'bad-token'),e=>e.status===401);
  await assert.rejects(f.call('/unknown',{},''),e=>e.status===404);
  f.tick(61000);assert((await f.call('/register',{name:'Fresh',accessCode:'friends-only'})).token);
 }finally{await f.db.close();}
});

const test=require('node:test'),assert=require('node:assert/strict');
const {createService}=require('../backend/lib/social-service.cjs');
const {visitorWindow}=require('../src/visitor-layout.cjs');
test('five visitors have independent replies, recall and capacity; the sixth stays home',()=>{
 const {handle:h}=createService();const host=h('/register',{name:'Host'}),guests=Array.from({length:6},(_,i)=>h('/register',{name:'Guest '+i}));
 const call=(u,r,d)=>h(r,d,u.token);call(host,'/room/create',{name:'Party'});const code=call(host,'/state',{capacity:5}).room.code;call(host,'/preferences',{accept:true});
 for(const g of guests)call(g,'/room/join',{code});
 const ids=[];
 for(const g of guests.slice(0,5)){call(g,'/visit/send',{host:host.id,type:'luffy',message:'From '+g.id});const v=call(g,'/state').outgoing;ids.push(v.id);call(g,'/visit/depart',{id:v.id});call(host,'/visit/arrive',{id:v.id});}
 assert.equal(call(host,'/state').incomingVisits.length,5);
 assert.throws(()=>call(guests[5],'/visit/send',{host:host.id,type:'boo',message:'Sixth'}),/visitor limit/);assert.equal(call(guests[5],'/state').outgoing,null);
 assert.throws(()=>call(guests[0],'/visit/return',{id:ids[1]}));
 call(host,'/visit/return',{id:ids[0],reply:'Reply to first'});assert.equal(call(guests[0],'/state').recent[0].reply,'Reply to first');assert.equal(call(host,'/state').incomingVisits.length,4);
 call(guests[1],'/visit/return',{id:ids[1]});assert.equal(call(host,'/state').incomingVisits.length,3);
 call(guests[5],'/visit/send',{host:host.id,type:'boo',message:'Now there is space'});assert.equal(call(host,'/state').incomingVisits.length,4);
 call(host,'/preferences',{visitorLimit:2});assert.equal(call(host,'/state').incomingVisits.length,2);
 call(host,'/preferences',{accept:false});assert.equal(call(host,'/state').incomingVisits.length,0);
});
test('older desktop clients retain a one-visitor limit until they advertise support',()=>{
 const {handle:h}=createService(),a=h('/register',{name:'A'}),b=h('/register',{name:'B'});h('/room/create',{name:'Room'},a.token);h('/room/join',{code:h('/state',{},a.token).room.code},b.token);h('/preferences',{accept:true},b.token);
 assert.equal(h('/state',{},b.token).me.capacity,1);assert.equal(h('/state',{capacity:5},b.token).me.capacity,5);
 assert.throws(()=>h('/preferences',{visitorLimit:6},b.token));
});
test('visitor windows fit small displays and negative monitor coordinates',()=>{
 for(const area of [{x:0,y:0,width:1920,height:1080},{x:-1280,y:-200,width:1280,height:720},{x:0,y:0,width:600,height:400}])for(const count of [1,5]){
  const b=visitorWindow(area,count);assert(b.x>=area.x&&b.y>=area.y);assert(b.x+b.width<=area.x+area.width);assert(b.y+b.height<=area.y+area.height);
 }
});

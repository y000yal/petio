const test=require('node:test');
const assert=require('node:assert/strict');
const {pairPlay,table}=require('../src/pairs.js');
const types=['miso','ember','bumble','boo','drowsy','merlin','luffy'];
test('every character pair has its own interaction',()=>{
 const seen=new Set();
 for(const a of types)for(const b of types){
  if(a>b)continue;
  const play=pairPlay(a,b),back=pairPlay(b,a);
  assert.equal(back.host,play.guest);assert.equal(back.guest,play.host);
  const [x,y]=[a,b].sort(),row=table[x+'+'+y];
  seen.add(row.join('/'));
  assert.ok(row[0]&&row[1]);
 }
 assert.equal(seen.size,28);
});

test('meetings have space at screen edges and distinct turn-taking dialogue',()=>{const {meetingSpot,pairChat,socialStage}=require('../src/pairs.js');for(const x of [80,400,900]){const h={x,y:400,scale:.65},spot=meetingSpot(h,1000,700);assert(spot.x>=65&&spot.x<=935);assert(Math.abs(spot.x-h.x)>110);}assert.equal(meetingSpot({x:80,y:30},200,200),null);for(const type of types){const lines=new Set();for(let i=0;i<3;i++){const chat=pairChat(type,type,i);assert(chat.host&&chat.guest);lines.add(chat.guest);}assert.equal(lines.size,3);}assert.deepEqual([0,1200,3800,6400,9800].map(socialStage),['greet','guest','host','play','end']);});

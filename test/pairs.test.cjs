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

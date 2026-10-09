const test=require('node:test'),assert=require('node:assert/strict');
const {serverAddress,apiAddress}=require('../src/social-config.cjs');
test('online servers require HTTPS and API requests remain on the selected origin',()=>{
 assert.equal(serverAddress('https://petio.vercel.app/'),'https://petio.vercel.app');
 assert.equal(apiAddress('https://petio.vercel.app','/visit/send'),'https://petio.vercel.app/api/social?route=%2Fvisit%2Fsend');
 assert.equal(apiAddress('http://127.0.0.1:4319','/state'),'http://127.0.0.1:4319/state');
 for(const url of ['http://example.com','https://user:secret@example.com','https://example.com/api','https://example.com/?token=secret','file:///tmp'])assert.throws(()=>serverAddress(url));
});

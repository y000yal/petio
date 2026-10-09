// Local adapter; the hosted API uses the same visit rules.
const http=require('node:http');
const path=require('node:path');
const {createService:core}=require('../backend/lib/social-service.cjs');
function createService(options){const {handle}=core(options);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(req.method==='GET'&&req.url==='/health'){res.end(JSON.stringify({ok:true,service:'petio',version:1}));return;}
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

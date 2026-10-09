const {createStore,getPool,RequestError}=require('../lib/store.cjs');
module.exports=async function social(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
 if(req.headers.origin)return res.status(403).json({error:'Use the Petio desktop client.'});
 if(Number(req.headers['content-length'])>4096)return res.status(413).json({error:'Request too large.'});
 try{
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(Buffer.byteLength(JSON.stringify(data)||'')>4096)return res.status(413).json({error:'Request too large.'});
  const route=new URL(req.url,'https://petio.invalid').searchParams.get('route');
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
  const result=await createStore(getPool(),{registrationCode:process.env.PETIO_REGISTRATION_CODE||''}).execute(route,data,token,ip);
  return res.status(200).json(result);
 }catch(e){
  if(e instanceof SyntaxError)return res.status(400).json({error:'Invalid JSON.'});
  if(e instanceof RequestError){if(e.status===429)res.setHeader('Retry-After','60');return res.status(e.status).json({error:e.message});}
  console.error('Petio backend request failed.');return res.status(503).json({error:'Backend unavailable. Check the database configuration and schema.'});
 }
};

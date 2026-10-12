const {createHash,timingSafeEqual}=require('node:crypto');
const {createService}=require('./social-service.cjs');
const routes=new Set(['/register','/identity','/state','/room/create','/room/join','/preferences','/message','/unsend','/react','/pin','/typing','/seen','/visit/send','/visit/depart','/visit/arrive','/visit/return']);
class RequestError extends Error {constructor(message,status=400){super(message);this.status=status;}}
function createStore(pool,{now=Date.now,registrationCode=''}={}){
 return {async execute(route,data,token,ip='local'){
  if(!routes.has(route))throw new RequestError('Unknown request.',404);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestError('Invalid request.');
  if(typeof token!=='string'||token.length>128)throw new RequestError('Invalid credentials.',401);
  const client=await pool.connect();let committed=false;
  try{
   await client.query('BEGIN');
   await client.query("SET LOCAL statement_timeout = '10000'");
   await client.query("SET LOCAL lock_timeout = '8000'");
   const rows=await client.query('SELECT data FROM petio_state WHERE id = 1 FOR UPDATE');
   if(!rows.rows[0])throw new Error('Database schema not initialized');
   const db=rows.rows[0].data,stamp=now();db.limits||={};
   for(const [key,value]of Object.entries(db.limits))if(stamp-value.start>60000)delete db.limits[key];
   const digest=value=>createHash('sha256').update(value).digest('hex');
   const key=digest(route==='/register'?'register:'+ip:'requests:'+ip);
   if(!db.limits[key]&&Object.keys(db.limits).length>=1000)throw new RequestError('Too many requests. Try again in a minute.',429);
   const limit=db.limits[key]||{start:stamp,count:0};db.limits[key]=limit;limit.count++;
   let result,error;
   if(limit.count>(route==='/register'?5:180))error=new RequestError('Too many requests. Try again in a minute.',429);
   else if(route==='/register'&&registrationCode&&!timingSafeEqual(Buffer.from(digest(String(data.accessCode||''))),Buffer.from(digest(registrationCode))))error=new RequestError('Enter the private registration code.',403);
   else {
    const credentials=Object.values(db.users).some(u=>u.tokenHash===digest(token));
    if(route!=='/register'&&!credentials)error=new RequestError('Profile credentials were not accepted.',401);
    else {try{result=createService({state:db,now,leaseMs:30000}).handle(route,data,token);}catch(e){error=new RequestError(e.message);}}
   }
   await client.query('UPDATE petio_state SET data = $1::jsonb, updated_at = now() WHERE id = 1',[JSON.stringify(db)]);
   await client.query('COMMIT');
   committed=true;
   if(error)throw error;
   return result;
  }catch(e){if(!committed)await client.query('ROLLBACK').catch(()=>{});throw e;}
  finally{client.release();}
 }};
}
let pool;
function getPool(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is missing');
 if(!pool){
  const {Pool}=require('pg');
  const uri=new URL(process.env.DATABASE_URL);
  // Verify the hosted database's TLS certificate, including with Neon URLs
  // copied using sslmode=require. No credentials are logged.
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])uri.searchParams.delete(key);
  pool=new Pool({connectionString:uri.toString(),ssl:{rejectUnauthorized:true},enableChannelBinding:true,max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
  pool.on('error',()=>console.error('Petio database connection interrupted.'));
 }
 return pool;
}
module.exports={createStore,getPool,RequestError};

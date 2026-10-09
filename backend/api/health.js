const {getPool}=require('../lib/store.cjs');
module.exports=async function health(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Use GET.'});
 try{const result=await getPool().query('SELECT id FROM petio_state WHERE id = 1');if(!result.rows.length)throw new Error('Missing state');return res.status(200).json({ok:true,service:'petio',version:1});}
 catch{return res.status(503).json({ok:false,error:'Set DATABASE_URL and run schema.sql in Neon.'});}
};

const localServer='http://127.0.0.1:4319';
function serverAddress(value){
 const url=new URL(String(value).trim());
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Enter only the server origin, such as https://petio-backend.vercel.app.');
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&url.hostname==='127.0.0.1'))throw new Error('Use HTTPS for online servers. HTTP is allowed only for the local prototype.');
 return url.origin;
}
function hosted(url){return new URL(url).hostname!=='127.0.0.1';}
function apiAddress(server,route){return hosted(server)?server+'/api/social?route='+encodeURIComponent(route):server+route;}
module.exports={localServer,serverAddress,hosted,apiAddress};

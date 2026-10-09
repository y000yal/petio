let socialCurrent,socialPending=false;
const socialEl=id=>document.getElementById('social-'+id);
async function socialAction(data){
 if(socialPending)return;socialPending=true;socialEl('error').textContent='';socialEl('status').textContent=['server','refresh'].includes(data.command)?'Connecting… ⏳':'Working… ⏳';
 const buttons=[...document.querySelectorAll('[data-panel=friends] button')].map(button=>({button,disabled:button.disabled}));for(const {button}of buttons)button.disabled=true;
 let result;
 try{result=await window.pet.socialCommand(data);}
 catch{result={error:'Petio could not complete this request. Try again.'};}
 finally{socialPending=false;for(const {button,disabled}of buttons)button.disabled=disabled;}
 if(result?.state)socialRender(result.state);else if(socialCurrent)socialRender(socialCurrent);
 if(result?.error){socialEl('error').textContent=result.error;socialEl('status').textContent='Request failed. See the message below.';}
 else if(result?.notice)socialEl('error').textContent=result.notice;
 if(result?.ok)for(const input of document.querySelectorAll('[data-panel=friends] input[type=password]'))input.value='';
}
function socialRender(s){
 if(!s)return;socialCurrent=s;if(document.activeElement!==socialEl('url'))socialEl('url').value=s.server||'http://127.0.0.1:4319';socialEl('backup').hidden=!s.hasProfile;socialEl('restore').hidden=!!s.hasProfile;
 if(!socialPending)socialEl('status').textContent=s.connecting?'Connecting… ⏳':s.connected?'Connected · '+s.me.name+' 🟢':s.reachable?'Server connected ✅ Create or restore your profile below.':s.error||'Enter your Petio server address and click Connect.';
 socialEl('profile').hidden=!!s.hasProfile;socialEl('account').hidden=!s.me;
 if(!s.me)return;
 socialEl('create').hidden=!!s.room;socialEl('join').hidden=!!s.room;socialEl('room').hidden=!s.room;if(!s.room)return;
 socialEl('room-name').textContent=s.room.name;socialEl('code').value=s.room.code;socialEl('accept').checked=s.me.accept;socialEl('limit').value=s.me.visitorLimit||5;socialEl('visitors').textContent=(s.incomingVisits?.length||(s.incoming?1:0))+' visiting / '+(s.me.capacity||1)+' allowed';
 socialEl('members').textContent=s.members.length?s.members.map(m=>m.name+' · '+(m.online?(m.accept?'visitors '+(m.visitorCount||0)+'/'+(m.capacity||1)+' 🟢':'visits off'):'offline')).join(' / '):'Invite a friend to your group.';
 const select=socialEl('send').elements.host,selected=select.value;
 const options=s.members.filter(m=>m.online&&m.accept&&(m.visitorCount||0)<(m.capacity||1));select.replaceChildren();for(const m of options){const o=document.createElement('option');o.value=m.id;o.textContent=m.name;select.append(o);}if(options.some(m=>m.id===selected))select.value=selected;
 socialEl('send').hidden=!!s.outgoing;socialEl('send').querySelector('button').disabled=!s.connected||!options.length;
 socialEl('away').hidden=!s.outgoing;if(s.outgoing)socialEl('away-text').textContent='Your pet is '+(s.outgoing.phase==='active'?'visiting ':'travelling to ')+s.outgoing.hostName+' ✨';socialEl('recall').disabled=!s.connected;
 socialEl('history').replaceChildren();for(const r of [...s.recent].reverse()){const p=document.createElement('p');p.textContent=r.hostName+': '+(r.reply||r.reason)+' 🏡';socialEl('history').append(p);}
}
for(const [id,command]of [['profile','register'],['create','create'],['join','join'],['send','send'],['server','server'],['restore','restore']])socialEl(id).addEventListener('submit',e=>{e.preventDefault();socialAction({command,...Object.fromEntries(new FormData(e.target))});});
socialEl('accept').onchange=e=>socialAction({command:'accept',accept:e.target.checked});socialEl('recall').onclick=()=>socialAction({command:'recall'});socialEl('refresh').onclick=()=>socialAction({command:'refresh'});
window.pet.socialSubscribe(socialRender);window.pet.socialRead().then(socialRender);

socialEl('backup').onclick=()=>socialAction({command:'backup'});

socialEl('limit').onchange=e=>socialAction({command:'accept',visitorLimit:Number(e.target.value)});

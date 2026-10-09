let socialCurrent;
const socialEl=id=>document.getElementById('social-'+id);
async function socialAction(data){socialEl('error').textContent='';const r=await window.pet.socialCommand(data);if(r?.error)socialEl('error').textContent=r.error;else if(r?.state)socialRender(r.state);}
function socialRender(s){
 if(!s)return;socialCurrent=s;socialEl('status').textContent=s.connected?'Connected · '+s.me.name+' 🟢':s.error||'Create a profile to connect to the local group server.';
 socialEl('profile').hidden=!!s.me;socialEl('account').hidden=!s.me;
 if(!s.me)return;
 socialEl('create').hidden=!!s.room;socialEl('join').hidden=!!s.room;socialEl('room').hidden=!s.room;if(!s.room)return;
 socialEl('room-name').textContent=s.room.name;socialEl('code').value=s.room.code;socialEl('accept').checked=s.me.accept;
 socialEl('members').textContent=s.members.length?s.members.map(m=>m.name+' · '+(m.online?(m.accept?'accepting visits 🟢':'visits off'):'offline')).join(' / '):'Invite a friend to your group.';
 const select=socialEl('send').elements.host,selected=select.value;
 const options=s.members.filter(m=>m.online&&m.accept);select.replaceChildren();for(const m of options){const o=document.createElement('option');o.value=m.id;o.textContent=m.name;select.append(o);}if(options.some(m=>m.id===selected))select.value=selected;
 socialEl('send').hidden=!!s.outgoing;socialEl('send').querySelector('button').disabled=!s.connected||!options.length;
 socialEl('away').hidden=!s.outgoing;if(s.outgoing)socialEl('away-text').textContent='Your pet is '+(s.outgoing.phase==='active'?'visiting ':'travelling to ')+s.outgoing.hostName+' ✨';socialEl('recall').disabled=!s.connected;
 socialEl('history').replaceChildren();for(const r of [...s.recent].reverse()){const p=document.createElement('p');p.textContent=r.hostName+': '+(r.reply||r.reason)+' 🏡';socialEl('history').append(p);}
}
for(const [id,command]of [['profile','register'],['create','create'],['join','join'],['send','send']])socialEl(id).addEventListener('submit',e=>{e.preventDefault();socialAction({command,...Object.fromEntries(new FormData(e.target))});});
socialEl('accept').onchange=e=>socialAction({command:'accept',accept:e.target.checked});socialEl('recall').onclick=()=>socialAction({command:'recall'});socialEl('refresh').onclick=()=>socialAction({command:'refresh'});
window.pet.socialSubscribe(socialRender);window.pet.socialRead().then(socialRender);

let socialCurrent,socialPending=false,serverEditing=false,restoreOpen=false,roomMode='create';
const socialEl=id=>document.getElementById('social-'+id);
function ready(m){return !!(m.online&&m.accept&&(m.visitorCount||0)<(m.capacity||1));}
async function socialAction(data){
 if(socialPending)return;socialPending=true;socialEl('error').textContent='';socialEl('status').textContent=['server','refresh'].includes(data.command)?'Connecting…':'Working…';
 const buttons=[...document.querySelectorAll('[data-panel=friends-settings] button')].map(button=>({button,disabled:button.disabled}));for(const {button}of buttons)button.disabled=true;
 let result;
 try{result=await window.pet.socialCommand(data);}
 catch{result={error:'Petio could not complete this request. Try again.'};}
 finally{socialPending=false;for(const {button,disabled}of buttons)button.disabled=disabled;}
 if(result?.state)socialRender(result.state);else if(socialCurrent)socialRender(socialCurrent);
 if(result?.error){socialEl('error').textContent=result.error;socialEl('status').textContent='Request failed. See the message below.';}
 else if(result?.notice)socialEl('error').textContent=result.notice;
 if(result?.ok)for(const input of document.querySelectorAll('[data-panel=friends-settings] input[type=password]'))input.value='';
}
function socialRender(s){
 if(!s)return;socialCurrent=s;
 const known=s.reachable||s.connected;
 if(document.activeElement!==socialEl('url'))socialEl('url').value=s.server||'http://127.0.0.1:4319';
 const showServer=!s.connected||serverEditing;
 socialEl('server').hidden=!showServer;socialEl('server-line').hidden=!s.connected||serverEditing;socialEl('server-name').textContent=s.server||'';socialEl('intro').hidden=!!s.connected;
 socialEl('backup').hidden=!s.hasProfile;socialEl('recovery-hint').hidden=!s.hasProfile;
 socialEl('profile').hidden=!!s.hasProfile||!known;
 socialEl('restore-link').hidden=!!s.hasProfile||!known||restoreOpen;
 socialEl('restore').hidden=!!s.hasProfile||!restoreOpen;
 if(!socialPending)socialEl('status').textContent=s.connecting?'Connecting…':s.connected&&s.me?'Connected · '+s.me.name:s.reachable?'Server connected. Create or restore your profile.':s.error||'Enter your Petio server address and click Connect.';
 const notes=(s.notices||[]).filter(n=>n.kind==='join'||n.kind==='message');
 if(notes.length)socialEl('notice').textContent=notes.map(n=>n.kind==='join'?n.name+' joined the group':n.name+': '+String(n.text||'').replace(/\[\[gif:([A-Za-z0-9]+)\]\]/g,(_,id)=>/^[a-z]+$/.test(id)?id[0].toUpperCase()+id.slice(1):'GIF')).join(' · ');
 socialEl('account').hidden=!s.me;
 if(!s.me)return;
 socialEl('setup').hidden=!!s.room;
 socialEl('mode-create').classList.toggle('active',roomMode==='create');socialEl('mode-join').classList.toggle('active',roomMode==='join');
 socialEl('create').hidden=!!s.room||roomMode!=='create';socialEl('join').hidden=!!s.room||roomMode!=='join';
 socialEl('room').hidden=!s.room;if(!s.room)return;
 socialEl('room-name').textContent=s.room.name;socialEl('code').value=s.room.code;socialEl('accept').checked=s.me.accept;
 socialEl('limit').value=s.me.visitorLimit||5;socialEl('limit-row').hidden=!s.me.accept;
 socialEl('visitors').hidden=!s.me.accept;socialEl('visitors').textContent=(s.incomingVisits?.length||(s.incoming?1:0))+' visiting now';
 const members=s.members||[],online=members.filter(m=>m.online).length;
 socialEl('friends-title').textContent=members.length?members.length+' in the group · '+online+' online':'Friends';
 const list=socialEl('members');list.replaceChildren();
 if(!members.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Invite a friend with the code above.';list.append(empty);}
 for(const m of members){
  const row=document.createElement('p');row.className='friend';
  const who=document.createElement('span');who.className='who';
  if(m.online){const dot=document.createElement('i');dot.className='presence';dot.setAttribute('aria-label','Online');who.append(dot);}
  const name=document.createElement('strong');name.textContent=m.name;who.append(name);
  const status=document.createElement('span');status.className='status';status.textContent=m.online?(m.accept?(ready(m)?'Ready for a visit':'Full right now'):'Visits off'):'Offline';
  const visit=document.createElement('button');visit.type='button';visit.className='send-visit';visit.textContent='Send pet to visit';visit.setAttribute('aria-label','Send pet to visit '+m.name);visit.disabled=socialPending||!s.connected||!!s.outgoing||!ready(m);visit.title=s.outgoing?'Recall your pet before starting another visit':!ready(m)?status.textContent:'Your pet will leave your desktop and visit '+m.name;visit.onclick=()=>socialAction({command:'visit',host:m.id});
  row.append(who,status,visit);list.append(row);
 }
 socialEl('away').hidden=!s.outgoing;if(s.outgoing)socialEl('away-text').textContent='Your pet is '+(s.outgoing.phase==='active'?'visiting ':'travelling to ')+s.outgoing.hostName;socialEl('recall').disabled=!s.connected;
 socialEl('history-title').hidden=!s.recent?.length;socialEl('history').replaceChildren();
 for(const r of [...(s.recent||[])].reverse()){const p=document.createElement('p');p.textContent=r.hostName+': '+(r.reply||r.reason);socialEl('history').append(p);}
}
for(const [id,command]of [['profile','register'],['create','create'],['join','join'],['server','server'],['restore','restore']])socialEl(id).addEventListener('submit',e=>{e.preventDefault();if(id==='server')serverEditing=false;socialAction({command,...Object.fromEntries(new FormData(e.target))});});
socialEl('accept').onchange=e=>socialAction({command:'accept',accept:e.target.checked,visitorLimit:Number(socialEl('limit').value)});
socialEl('recall').onclick=()=>socialAction({command:'recall'});socialEl('refresh').onclick=()=>socialAction({command:'refresh'});
socialEl('backup').onclick=()=>socialAction({command:'backup'});
socialEl('limit').onchange=e=>socialAction({command:'accept',accept:socialEl('accept').checked,visitorLimit:Number(e.target.value)});
socialEl('change').onclick=()=>{serverEditing=true;if(socialCurrent)socialRender(socialCurrent);socialEl('url').focus();};
socialEl('code-toggle').onchange=e=>{socialEl('code-field').hidden=!e.target.checked;if(!e.target.checked)socialEl('code-field').querySelector('input').value='';};
socialEl('show-restore').onclick=()=>{restoreOpen=true;if(socialCurrent)socialRender(socialCurrent);};
socialEl('mode-create').onclick=()=>{roomMode='create';if(socialCurrent)socialRender(socialCurrent);};
socialEl('mode-join').onclick=()=>{roomMode='join';if(socialCurrent)socialRender(socialCurrent);};
window.pet.socialSubscribe(socialRender);window.pet.socialRead().then(socialRender);

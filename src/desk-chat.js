(function(){
 const panel=document.querySelector('#desk-chat');
 if(!panel||!window.pet)return;
 const log=document.querySelector('#desk-log');
 const select=document.querySelector('#desk-host');
 const form=document.querySelector('#desk-form');
 const status=document.querySelector('#desk-status');
 const typingLine=document.querySelector('#desk-typing');
 const preview=document.querySelector('#desk-preview');
 let state=null,chosen='',sent='',seenKey='',seq=0,timer=0,outgoing=[];
 const key='sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';
 function thread(host,me,chat){return (chat||[]).filter(m=>host==='group'?m.to==='group':(m.from===me&&m.to===host)||(m.from===host&&m.to===me));}
 function showGif(){
  preview.replaceChildren();
  if(!chosen){preview.hidden=true;return;}
  preview.hidden=false;renderNote(preview,'[[gif:'+chosen+']]');
  const clear=document.createElement('button');clear.type='button';clear.className='gif-clear';clear.setAttribute('aria-label','Remove GIF');clear.textContent='✕';
   clear.onclick=e=>{e.stopPropagation();chosen='';sent='';for(const b of document.querySelectorAll('#desk-gif-results button'))b.classList.remove('on');showGif();markTools();};
  preview.append(clear);
 }
 function drawGifs(gifs){
  const box=document.querySelector('#desk-gif-results');box.replaceChildren();
  if(!gifs.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No GIFs match that.';box.append(empty);return;}
  for(const gif of gifs){
   const b=document.createElement('button');b.type='button';b.dataset.id=gif.id;b.title=gif.title||'GIF';b.setAttribute('aria-label',gif.title||'GIF');b.classList.toggle('on',chosen===gif.id);
   const img=document.createElement('img');img.alt='';img.src=(gif.images?.preview_gif||gif.images?.fixed_width_small||{}).url||'';b.append(img);
   b.onclick=()=>{chosen=chosen===gif.id?'':gif.id;sent=chosen===gif.id?(gif.analytics?.onsent?.url||''):'';for(const button of box.querySelectorAll('button'))button.classList.toggle('on',button.dataset.id===chosen);if(chosen){document.querySelector('#desk-gif-tray').hidden=true;document.querySelector('#desk-gif').setAttribute('aria-expanded','false');}markTools();showGif();};
   box.append(b);
  }
 }
 function loadGifs(){
  const box=document.querySelector('#desk-gif-results'),q=document.querySelector('#desk-gif-search').value.trim().slice(0,50),mine=++seq;
  box.replaceChildren();const loading=document.createElement('p');loading.className='empty';loading.textContent='Loading GIFs…';box.append(loading);
  const url=new URL(q?'https://api.giphy.com/v1/gifs/search':'https://api.giphy.com/v1/gifs/trending');
  url.searchParams.set('api_key',key);url.searchParams.set('limit','18');url.searchParams.set('rating','pg-13');if(q)url.searchParams.set('q',q);
  fetch(url).then(r=>r.json()).then(data=>{if(mine!==seq)return;drawGifs(Array.isArray(data.data)?data.data:[]);}).catch(()=>{if(mine!==seq)return;box.replaceChildren();const empty=document.createElement('p');empty.className='empty';empty.textContent='Could not load GIFs.';box.append(empty);});
 }
 let replyTarget=null;
 function setReply(message){replyTarget=message?{id:message.id,name:message.from===state?.me?.id?'You':message.name,text:message.text}:null;fillReplyBar(document.querySelector('#desk-reply'),replyTarget,()=>setReply(null));form.elements.message.focus();}
 async function messageAction(command,extra){
  try{const result=await window.pet.socialCommand({command,...extra});if(result?.error){status.textContent=result.error;return;}status.textContent='';if(result?.state)paint(result.state);}catch{status.textContent='Could not update that message.';}
 }
 function drawRows(rows,local,me){
  if(!rows.length&&!local.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No messages yet.';log.append(empty);return;}
  appendPinned(log,rows);
  for(const m of rows)appendBubble(log,m,me,{reply:setReply,react:(message,emoji)=>messageAction('react',{id:message.id,emoji}),pin:message=>messageAction('pin',{id:message.id}),unsend:message=>unsend(message.id)});
 }
 async function unsend(id){
  try{
   const result=await window.pet.socialCommand({command:'unsend',id});
   if(result?.error){status.textContent=result.error;return;}
   status.textContent='';if(result?.state)paint(result.state);
  }catch{status.textContent='Could not unsend that message.';}
 }
 function markTools(){document.querySelector('#desk-emoji').classList.toggle('on',!document.querySelector('#desk-emoji-tray').hidden);document.querySelector('#desk-gif').classList.toggle('on',!document.querySelector('#desk-gif-tray').hidden||!!chosen);}
 async function deliver(item){
  paint(state);
  try{
   if(item.ping){const ping=item.ping;item.ping='';fetch(ping).catch(()=>{});}
   const result=await window.pet.socialCommand({command:'send',host:item.host,message:item.text,reply:item.reply?.id||''});
   const next=result?.state||state;
   if(result?.error){item.failed=true;item.reason=result.error;paint(next);return;}
   const rows=thread(item.host,next?.me?.id,next?.chat);
   if(rows.some(m=>m.from===next?.me?.id&&(m.to||'group')===item.host&&m.text===item.text&&(m.reply?.id||'')===(item.reply?.id||'')))outgoing=outgoing.filter(entry=>entry.id!==item.id);
   paint(next);
  }catch{item.failed=true;item.reason='';paint(state);}
 }
 const threads=document.querySelector('#desk-threads'),jump=document.querySelector('#desk-jump');
 let stick=false,below=0,knownIds=null;
 function unreadHosts(s){
  const map=new Map();if(!s?.me)return map;
  for(const m of s.chat||[]){if(m.from===s.me.id||(m.seen||[]).includes(s.me.id))continue;const host=m.to==='group'?'group':m.from;map.set(host,(map.get(host)||0)+1);}
  return map;
 }
 function paintThreads(s){
  const me=s.me.id,unread=unreadHosts(s),scrollTop=threads.scrollTop;
  const items=[{id:'group',name:s.room?.name||'Group',online:false,accept:true},...(s.members||[])];
  threads.replaceChildren();
  for(const item of items){
   const rows=thread(item.id,me,s.chat),last=rows[rows.length-1],count=unread.get(item.id)||0;
   const b=document.createElement('button');b.type='button';b.className='thread'+(select.value===item.id?' on':'')+(count?' unread':'');b.setAttribute('role','option');b.setAttribute('aria-selected',String(select.value===item.id));
   if(item.id!=='group'&&!item.accept)b.disabled=true;
   const dot=document.createElement('i');dot.className='presence'+(item.id==='group'?' group':item.online?' live':'');
   const text=document.createElement('span');const name=document.createElement('strong');name.textContent=item.name+(item.id!=='group'&&!item.accept?' · visits off':'');const preview=document.createElement('small');preview.textContent=last?(notePlain(last.text).slice(0,48)||'GIF'):'No messages yet';text.append(name,preview);b.append(dot,text);
   if(count){const em=document.createElement('em');em.textContent=count>9?'9+':String(count);b.append(em);}
   b.onclick=()=>{if(b.disabled||select.value===item.id)return;select.value=item.id;stick=true;below=0;paint(state);};
   threads.append(b);
  }
  threads.scrollTop=scrollTop;
 }
 function paint(s){
  state=s||null;
  const looking=!document.querySelector('[data-panel="friends-chat"]').hidden;
  if(!s?.connected||!s.room||!s.me){panel.hidden=false;form.hidden=true;threads.hidden=true;typingLine.hidden=true;jump.hidden=true;log.replaceChildren();const empty=document.createElement('p');empty.className='empty';empty.textContent=!s?.connected?'Connect in Settings to chat.':!s?.me?'Create a profile in Settings to chat.':'Join a group in Settings to start chatting.';log.append(empty);return;}
  panel.hidden=false;form.hidden=false;threads.hidden=false;
  const members=s.members||[],previous=select.value||'group',signature=members.map(m=>m.id+m.name+m.online+m.accept).join('|');
  if(select.dataset.members!==signature){
   select.replaceChildren();
   const group=document.createElement('option');group.value='group';group.textContent='Group';select.append(group);
   for(const m of members){const o=document.createElement('option');o.value=m.id;o.disabled=!m.accept;o.textContent=m.name;select.append(o);}
   select.dataset.members=signature;
   const keep=[...select.options].find(o=>o.value===previous&&!o.disabled);
   select.value=keep?keep.value:'group';
  }
  const host=select.value||'group',rows=thread(host,s.me.id,s.chat),me=s.me.id,used=new Set();
  const incoming=rows.filter(m=>m.from!==me),latest=incoming[incoming.length-1];
  if(looking&&latest&&!(latest.seen||[]).includes(me)){const mark=host+':'+latest.id;if(mark!==seenKey){seenKey=mark;window.pet.socialCommand({command:'seen',host}).catch(()=>{});}}
  if(looking)for(const m of rows){if(m.from!==me&&!(m.seen||[]).includes(me))m.seen=[...(m.seen||[]),me];}
  outgoing=outgoing.filter(item=>{if(item.failed)return true;const hit=rows.find(m=>!used.has(m.id)&&m.from===me&&(m.to||'group')===item.host&&m.text===item.text&&(m.reply?.id||'')===(item.reply?.id||''));if(!hit)return true;used.add(hit.id);return false;});
  const local=outgoing.filter(item=>item.host===host);
  const hadKnown=!!knownIds,fresh=hadKnown?rows.filter(m=>m.id&&!knownIds.has(m.id)&&m.from!==me):[];
  knownIds=new Set((s.chat||[]).filter(m=>m.id).map(m=>m.id));
  const logKey=JSON.stringify([host,rows.map(m=>[m.id,m.text,!!m.pinned,m.reply||null,m.reactions||null,(m.seen||[]).slice().sort()]),local.map(item=>[item.id,item.text,!!item.failed,item.reason||'',item.reply||null])]);
  if(looking&&!paint.wasOpen)stick=true;
  paint.wasOpen=looking;
  if(logKey!==paint.logKey){
   paint.logKey=logKey;closeBubbleMenus();
   const prev=log.scrollTop,near=log.scrollHeight-prev-log.clientHeight<48||!log.childElementCount;
   log.replaceChildren();
   drawRows(rows,local,me);
   const mine=rows.filter(m=>m.from===me),last=mine[mine.length-1];
   if(last){const receipt=document.createElement('p');receipt.className='receipt';const seen=host==='group'?(last.seen||[]).length>0:(last.seen||[]).includes(host);receipt.textContent=seen?'Seen':'Delivered';log.append(receipt);}
   for(const item of local){const line=document.createElement('p');line.className='mine';addQuote(line,item.reply);const who=document.createElement('span');who.className='who';who.textContent='You';const body=document.createElement('span');renderNote(body,item.text);line.append(who,body);log.append(line);if(!item.failed)continue;const fail=document.createElement('p');fail.className='fail';const label=document.createElement('span');label.textContent=item.reason||'Failed to send';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=()=>{item.failed=false;deliver(item);};fail.append(label,retry);log.append(fail);}
   if(stick||!hadKnown||near){log.scrollTop=log.scrollHeight;jump.hidden=true;below=0;stick=false;}
   else{log.scrollTop=prev;if(looking&&fresh.length){below+=fresh.length;jump.hidden=false;jump.querySelector('b').textContent=String(below);}}
  }
  const typing=(s.typing||[]).filter(t=>t.to===host);
  typingLine.hidden=!typing.length;
  typingLine.textContent=typing.length?(typing.map(t=>t.name).join(', ')+(typing.length>1?' are':' is')+' typing…'):'';
  paintThreads(s);
 }
 document.querySelector('#desk-emoji').onclick=()=>{const tray=document.querySelector('#desk-emoji-tray');tray.hidden=!tray.hidden;document.querySelector('#desk-emoji').setAttribute('aria-expanded',String(!tray.hidden));document.querySelector('#desk-gif-tray').hidden=true;if(!tray.hidden){if(!tray.dataset.ready&&window.PetioEmoji){tray.dataset.ready='1';PetioEmoji.mount(tray);}tray.querySelector('[frimousse-search]')?.focus();}markTools();};
 document.querySelector('#desk-gif').onclick=()=>{const tray=document.querySelector('#desk-gif-tray');tray.hidden=!tray.hidden;document.querySelector('#desk-gif').setAttribute('aria-expanded',String(!tray.hidden));document.querySelector('#desk-emoji-tray').hidden=true;if(!tray.hidden){loadGifs();document.querySelector('#desk-gif-search').focus();}markTools();};
 document.querySelector('#desk-gif-search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(loadGifs,280);});
 document.querySelector('#desk-gif-search').addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});
 let typingTimer=0,typingOn=false;
 function queueTyping(){
  clearTimeout(typingTimer);
  typingTimer=setTimeout(()=>{
   const active=form.elements.message.value.trim().length>=3;
   if(active===typingOn)return;
   typingOn=active;
   window.pet.socialCommand({command:'typing',host:select.value||'group',active}).catch(()=>{});
  },420);
 }
 function stopTyping(){
  clearTimeout(typingTimer);
  if(!typingOn)return;
  typingOn=false;
  window.pet.socialCommand({command:'typing',host:select.value||'group',active:false}).catch(()=>{});
 }
 form.elements.message.addEventListener('input',queueTyping);
 form.elements.message.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(document.activeElement?.closest?.('#desk-emoji-tray, #desk-gif-search'))return;
  const host=select.value||'group';
  if(select.selectedOptions[0]?.disabled){status.textContent='That friend has visits turned off.';return;}
  const message=[form.elements.message.value.trim(),chosen?'[[gif:'+chosen+']]':''].filter(Boolean).join(' ').slice(0,280);
  if(!message)return;
  const reply=replyTarget?{id:replyTarget.id,name:replyTarget.name,text:replyTarget.text}:null;
  const item={id:Date.now()+':'+Math.random(),host,text:message,failed:false,ping:chosen?sent:'',reason:'',reply};
  form.elements.message.value='';setReply(null);chosen='';sent='';stopTyping();status.textContent='';showGif();markTools();outgoing.push(item);deliver(item);
 });
 jump.onclick=()=>{log.scrollTop=log.scrollHeight;jump.hidden=true;below=0;};
 log.addEventListener('scroll',()=>{if(log.scrollHeight-log.scrollTop-log.clientHeight<48){jump.hidden=true;below=0;}});
 window.pet.socialSubscribe(paint);
 window.pet.socialRead().then(paint).catch(()=>paint(null));
})();

let previewType=null,current, started=performance.now(),previewTimer=null,activeTab='appearance',reminderKey='';
const gallery=document.querySelector('#characters'),preview=document.querySelector('#preview');
for(const [id,p] of Object.entries(companions)){
 const b=document.createElement('button');b.className='character';b.dataset.type=id;b.setAttribute('aria-label',p.name+' — '+p.label);b.title=p.label;
 const c=document.createElement('canvas');c.width=120;c.height=100;const title=document.createElement('strong');title.textContent=p.name;b.append(c,title);b.addEventListener('click',()=>{previewType=id;render(current);});gallery.append(b);
 drawPet(c.getContext('2d'),{type:id,action:'happy',direction:1},1,1,60,51,.48);
}
function tab(name){if(name==='friends')name='friends-settings';activeTab=name;document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name||(b.dataset.tab==='friends'&&name==='friends-settings')));document.querySelector('#breadcrumb').textContent=({appearance:'YOUR COMPANION',behavior:'HABITS & CARE',reminders:'YOUR FRIENDLY REMINDERS',app:'APP','friends-chat':'CHAT','friends-settings':'FRIENDS & VISITS'})[name]||'YOUR COMPANION';if(name==='friends-chat'&&window.pet)window.pet.closeComposer();restartPreview();}
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>tab(b.dataset.tab));
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();tab('appearance');});
window.pet.onTab(tab);
window.pet.onOpenChat(host=>{tab('friends-chat');if(host&&window.PetioDesk)window.PetioDesk.open(host);});
document.querySelector('#window-min').onclick=()=>window.pet.minimizeSettings();
document.querySelector('#window-close').onclick=()=>window.pet.closeSettings();
function render(state){
 if(!state)return;current=state;
 for(const b of document.querySelectorAll('[data-type]')){b.classList.toggle('selected',b.dataset.type===state.type);b.setAttribute('aria-pressed',String(b.dataset.type===state.type));}
 previewType||=state.type;
 for(const b of document.querySelectorAll('[data-type]'))b.classList.toggle('previewing',b.dataset.type===previewType&&previewType!==state.type);
 const p=companions[previewType],other=previewType!==state.type;document.querySelector('#pet-name').textContent=p.name;document.querySelector('#pet-detail').textContent=p.detail;
 const card=characterCards[previewType];document.querySelector('#pet-role').textContent=card.role;document.querySelector('#pet-power').textContent=card.power;document.querySelector('#pet-weak').textContent=card.weak;document.querySelector('#pet-info').dataset.tip=card.bio;
 const stats=document.querySelector('#stats');stats.replaceChildren();for(const [k,v] of Object.entries(card.stats)){const row=document.createElement('div');row.className='stat';const n=document.createElement('span');n.textContent=k;const bar=document.createElement('i');const fill=document.createElement('b');fill.style.width=v*10+'%';fill.style.background=p.color;bar.append(fill);const num=document.createElement('em');num.textContent=v;row.append(n,bar,num);stats.append(row);}
 const use=document.querySelector('#use-pet');use.hidden=!other;use.textContent='Use '+p.name;document.querySelector('#preview-eyebrow').textContent=other?'PREVIEW':'ON YOUR DESKTOP';
 for(const id of ['scale','speed','menuSize','personality','lookAt','aware','notify','water','waterMinutes','roaming','crossScreens','attention','attentionMinutes','prompts','alwaysOnTop','login','sounds','volume','autoUpdate','chatTheme']){const el=document.getElementById(id);if(document.activeElement!==el){if(el.type==='checkbox')el.checked=state[id];else el.value=state[id];}}
 const mode=state.chatMode==='light'?'light':'dark';document.documentElement.dataset.mode=mode;document.documentElement.style.colorScheme=mode;const desk=document.querySelector('#desk-chat');if(desk)desk.dataset.mode=mode;
 document.querySelector('#scale-value').value=Math.round(state.scale*100)+'%';
 // A zone keeps the pet on one screen, so screen-hopping options are switched off while it is set.
 const zone=state.zone,cross=document.querySelector('#crossScreens');
 document.querySelector('#zone-text').textContent=zone?'Zone set: '+zone.width+' × '+zone.height+' px. Your friend stays inside it; cross-screen travel is off while it is set.':'Draw an area of your screen. Your friend will stay inside it and never cross it.';
 document.querySelector('#zone-set').textContent=zone?'Redraw zone':'Set zone';document.querySelector('#zone-clear').hidden=!zone;
 cross.disabled=!!zone;if(zone)cross.checked=false;cross.closest('label').classList.toggle('disabled',!!zone);document.querySelector('#login').disabled=!state.packaged;const oneScreen=(state.screens||1)<2;document.querySelector('#crossScreens').closest('label').hidden=oneScreen;document.querySelector('#visit-row').hidden=oneScreen;
 document.querySelector('#login-hint').textContent=state.packaged?'Start your day with a familiar face.':'Disabled while running from source (npm start / dev). Build the installer with npm run dist to use it.';
 const hear=!!state.sounds;document.querySelector('#volume').closest('label').hidden=!hear;document.querySelector('[data-perform="sound-test"]').closest('label').hidden=!hear;
 const key=JSON.stringify(state.reminders);if(key===reminderKey)return;reminderKey=key;
 const list=document.querySelector('#reminder-list');list.replaceChildren();
 if(!state.reminders.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Nothing to remember yet. A little peace of mind.';list.append(empty);}
 for(const reminder of [...state.reminders].sort((a,b)=>a.due-b.due)){
  const row=document.createElement('div');row.className='card reminder';const text=document.createElement('p');text.textContent=reminder.text;const time=document.createElement('small');
  const minutes=reminder.intervalMs/60000,repeat=minutes?(minutes%60===0?`Every ${minutes/60} hour${minutes===60?'':'s'}`:`Every ${minutes} minutes`):'Once';
  time.textContent=repeat+(reminder.window?' · '+reminder.window.start+'–'+reminder.window.end+' local':'')+' · '+new Date(reminder.due).toLocaleString();text.append(time);const remove=document.createElement('button');remove.textContent='Remove';remove.addEventListener('click',()=>window.pet.reminder({remove:reminder.id}));row.append(text,remove);list.append(row);
 }
}
async function update(patch){try{render(await window.pet.update(patch));document.querySelector('#saved').textContent='✓ Saved on this computer';}catch{document.querySelector('#saved').textContent='Could not save. Please try again.';}}
for(const id of ['scale','speed','menuSize','personality','lookAt','aware','notify','water','waterMinutes','roaming','crossScreens','attention','attentionMinutes','prompts','alwaysOnTop','login','sounds','volume','autoUpdate','chatTheme']){
 const input=document.getElementById(id);input.addEventListener('change',()=>{if(!input.checkValidity()){input.reportValidity();return;}update({[id]:input.type==='checkbox'?input.checked:['range','number'].includes(input.type)?Number(input.value):input.value});});
}
document.querySelector('#scale').addEventListener('input',e=>document.querySelector('#scale-value').value=Math.round(Number(e.target.value)*100)+'%');
for(const b of document.querySelectorAll('[data-perform]'))b.addEventListener('click',()=>window.pet.command(b.dataset.perform));
function paintUpdate(status){
 const line=document.querySelector('#update-status'),button=document.querySelector('#update-check');
 if(!line||!button||!status)return;
 line.textContent=status.status==='available'?'Update available: Petio '+(status.version||'a new version'):status.message||('Petio '+(status.current||''));line.classList.toggle('available',status.status==='available'||status.status==='ready');
 const version=document.querySelector('#app-version');if(version&&status.current)version.textContent='Petio '+status.current;
 button.disabled=status.status==='checking'||status.status==='downloading';
 button.dataset.update=status.status||'';
 button.textContent=status.status==='ready'?'Restart to update':status.status==='downloading'?'Downloading…':status.status==='available'?'Download and install':'Check for updates';
 const note=document.querySelector('[data-tab="app"] .nav-note');
 if(note){const pending=status.status==='available'||status.status==='downloading'||status.status==='ready';note.hidden=!pending;note.textContent=status.status==='ready'?'Restart':status.status==='downloading'?'…':'Update';}
}
window.pet.onUpdate(paintUpdate);
window.pet.updateStatus().then(paintUpdate);
document.querySelector('#update-check').addEventListener('click',()=>{const button=document.querySelector('#update-check');if(button.dataset.update==='ready')window.pet.updateInstall();else if(button.dataset.update==='available')window.pet.updateDownload().then(paintUpdate);else window.pet.updateCheck().then(paintUpdate);});
document.querySelector('#zone-set').addEventListener('click',async()=>{document.querySelector('#zone-set').disabled=true;try{render(await window.pet.zoneSet());}finally{document.querySelector('#zone-set').disabled=false;}});
document.querySelector('#zone-clear').addEventListener('click',async()=>render(await window.pet.zoneClear()));
document.querySelector('#use-pet').addEventListener('click',()=>{if(previewType&&previewType!==current.type)update({type:previewType});});
document.querySelector('#reminder-unit').addEventListener('change',e=>{document.querySelector('#reminder-minutes').max=e.target.value==='hours'?'168':'10080';});
document.querySelector('#reminder-form').addEventListener('submit',async e=>{e.preventDefault();const result=await window.pet.reminder({text:document.querySelector('#reminder-text').value,minutes:Number(document.querySelector('#reminder-minutes').value)*(document.querySelector('#reminder-unit').value==='hours'?60:1),recurring:document.querySelector('#reminder-mode').value==='repeat',window:document.querySelector('#reminder-mode').value==='repeat'&&document.querySelector('#reminder-window-enabled').checked?{start:document.querySelector('#reminder-window-start').value,end:document.querySelector('#reminder-window-end').value}:null});document.querySelector('#reminder-error').textContent=result.error||'';if(result.ok)document.querySelector('#reminder-text').value='';});
window.pet.subscribe(render);window.pet.read().then(render);
const previewContext=preview.getContext('2d');
function previewFrame(){previewTimer=null;if(document.hidden||activeTab!=='appearance')return;previewContext.clearRect(0,0,260,245);if(current)drawPet(previewContext,{...current,type:previewType||current.type,action:'idle',started:0,until:1,direction:1},(performance.now()-started)/1000,1,130,130,current.scale);previewTimer=setTimeout(previewFrame,1000/30);}
function restartPreview(){clearTimeout(previewTimer);previewTimer=null;previewFrame();}
document.addEventListener('visibilitychange',restartPreview);restartPreview();

function reminderWindowControls(){const repeat=document.querySelector('#reminder-mode').value==='repeat',enabled=repeat&&document.querySelector('#reminder-window-enabled').checked;document.querySelector('#reminder-window-controls').hidden=!repeat;document.querySelector('#reminder-window-times').hidden=!enabled;for(const id of ['start','end']){const input=document.querySelector('#reminder-window-'+id);input.disabled=!enabled;input.required=enabled;}}
document.querySelector('#reminder-mode').addEventListener('change',reminderWindowControls);document.querySelector('#reminder-window-enabled').addEventListener('change',reminderWindowControls);reminderWindowControls();

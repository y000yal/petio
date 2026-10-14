const BUBBLE_UNSEND_FOR=30*60*1000;
const QUICK_REACTS=['❤️','😂','😮','😢','😡','👍'];
function bubbleSvg(path){return '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">'+path+'</svg>';}
const BUBBLE_ICONS={
 more:bubbleSvg('<circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/>'),
 reply:bubbleSvg('<path d="M9 7.5 4.5 12 9 16.5M4.5 12H14a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
 react:bubbleSvg('<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8.5 13.5c.8 1.3 2 2 3.5 2s2.7-.7 3.5-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
 pin:bubbleSvg('<path d="M9 4h6l-1 5.5 3 2v2H7v-2l3-2L9 4zM12 13.5V20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'),
 unsend:bubbleSvg('<path d="M9 7.5H4.2V4M4.6 7.4a8 8 0 1 1-1.1 4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>')
};
function closeBubbleMenus(){
 for(const el of document.querySelectorAll('.msg-menu,.react-pop'))el.remove();
 syncChatHit();
}
function bubbleButton(label,icon){
 const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',label);button.title=label;button.innerHTML=icon;return button;
}
function placePop(pop,anchor){
 document.body.append(pop);
 const r=anchor.getBoundingClientRect(),width=pop.offsetWidth||180,height=pop.offsetHeight||80;
 let left=r.left,top=r.bottom+6;
 if(left+width>window.innerWidth-8)left=Math.max(8,window.innerWidth-width-8);
 if(top+height>window.innerHeight-8)top=Math.max(8,r.top-height-6);
 pop.style.left=left+'px';pop.style.top=top+'px';
}
function fillReplyBar(bar,message,onClear){
 bar.replaceChildren();
 if(!message){bar.hidden=true;return;}
 bar.hidden=false;
 const label=document.createElement('span');const name=document.createElement('b');name.textContent=message.name||'Message';const preview=document.createElement('i');preview.textContent=notePlain(message.text).slice(0,80)||'GIF';label.append(name,preview);
 const clear=document.createElement('button');clear.type='button';clear.setAttribute('aria-label','Cancel reply');clear.textContent='✕';clear.onclick=e=>{e.preventDefault();e.stopPropagation();onClear();};
 bar.append(label,clear);
}
function addQuote(line,reply){
 if(!reply||!reply.text)return;
 const quote=document.createElement('span');quote.className='quote';const name=document.createElement('b');name.textContent=reply.name||'Message';const preview=document.createElement('i');preview.textContent=notePlain(reply.text).slice(0,80)||'GIF';quote.append(name,preview);line.append(quote);
}
function appendBubble(log,m,me,hooks){
 const mine=m.from===me,wrap=document.createElement('div');
 wrap.className='bubble'+(mine?' mine':' theirs')+(m.pinned?' pinned':'');if(m.id)wrap.dataset.id=m.id;
 const row=document.createElement('div');row.className='bubble-row';
 const line=document.createElement('p');line.className=mine?'mine':'theirs';
 addQuote(line,m.reply);
 const who=document.createElement('span');who.className='who';who.textContent=mine?'You':m.name;const body=document.createElement('span');renderNote(body,m.text);line.append(who,body);
 if(m.pinned){const mark=document.createElement('span');mark.className='pin-mark';mark.innerHTML=BUBBLE_ICONS.pin+'<span>Pinned</span>';wrap.prepend(mark);}
 if(m.id){
  const tools=document.createElement('div');tools.className='msg-tools';
  const more=bubbleButton('More',BUBBLE_ICONS.more),reply=bubbleButton('Reply',BUBBLE_ICONS.reply),react=bubbleButton('React',BUBBLE_ICONS.react);
  more.onclick=e=>{e.stopPropagation();openMessageMenu(more,m,me,hooks);};
  reply.onclick=e=>{e.stopPropagation();closeBubbleMenus();hooks.reply(m);};
  react.onclick=e=>{e.stopPropagation();openReactionPicker(react,m,hooks);};
  tools.append(more,reply,react);row.append(tools);
 }
 row.append(line);wrap.append(row);
 const reactions=Array.isArray(m.reactions)?m.reactions.filter(r=>r&&r.emoji&&Array.isArray(r.by)&&r.by.length):[];
 if(reactions.length){
  const chips=document.createElement('div');chips.className='reacts';
  for(const r of reactions){const chip=document.createElement('button');chip.type='button';chip.className='react'+(r.by.includes(me)?' on':'');chip.textContent=r.emoji+' '+r.by.length;chip.onclick=()=>hooks.react(m,r.emoji);chips.append(chip);}
  wrap.append(chips);
 }
 log.append(wrap);
}
function openMessageMenu(anchor,m,me,hooks){
 closeBubbleMenus();
 const menu=document.createElement('div');menu.className='msg-menu';
 const when=document.createElement('p');when.className='when';const sent=new Date(m.at||Date.now());when.textContent=Number.isNaN(sent.getTime())?'':sent.toLocaleString([],{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
 const pin=document.createElement('button');pin.type='button';pin.innerHTML='<span>'+(m.pinned?'Unpin':'Pin')+'</span>'+BUBBLE_ICONS.pin;pin.onclick=e=>{e.stopPropagation();closeBubbleMenus();hooks.pin(m);};
 menu.append(when,pin);
 if(m.from===me&&m.id&&Date.now()-(m.at||0)<BUBBLE_UNSEND_FOR){
  const undo=document.createElement('button');undo.type='button';undo.className='danger';undo.innerHTML='<span>Unsend</span>'+BUBBLE_ICONS.unsend;undo.onclick=e=>{e.stopPropagation();closeBubbleMenus();hooks.unsend(m);};
  menu.append(undo);
 }
 placePop(menu,anchor);
}
function recentEmoji(){try{const saved=JSON.parse(localStorage.getItem('petio-recent-emoji')||'[]');return Array.isArray(saved)?saved.filter(e=>typeof e==='string').slice(0,8):[];}catch{return [];}}
function rememberEmoji(emoji){const next=[emoji,...recentEmoji().filter(e=>e!==emoji)].slice(0,8);try{localStorage.setItem('petio-recent-emoji',JSON.stringify(next));}catch{}}
function emojiButton(emoji,choose){const button=document.createElement('button');button.type='button';button.textContent=emoji;button.setAttribute('aria-label','React with '+emoji);button.onclick=e=>{e.stopPropagation();rememberEmoji(emoji);choose(emoji);};return button;}
function syncChatHit(){if(typeof window.petChatHit==='function')window.petChatHit();}
function openReactionPicker(anchor,m,hooks){
 closeBubbleMenus();
 const pop=document.createElement('div');pop.className='react-pop';
 const quick=document.createElement('div');quick.className='quick';
 const choose=emoji=>{closeBubbleMenus();hooks.react(m,emoji);};
 for(const emoji of QUICK_REACTS)quick.append(emojiButton(emoji,choose));
 const plus=document.createElement('button');plus.type='button';plus.className='more-emojis';plus.textContent='+';plus.setAttribute('aria-label','More emoji');
 plus.onclick=e=>{e.stopPropagation();if(pop.classList.contains('wide'))return;pop.classList.add('wide');quick.hidden=true;const panel=document.createElement('div');panel.className='react-more';
  const yours=document.createElement('p');yours.className='react-label';yours.textContent='Your Reactions';const yoursRow=document.createElement('div');yoursRow.className='quick';for(const emoji of QUICK_REACTS)yoursRow.append(emojiButton(emoji,choose));
  const recent=recentEmoji();panel.append(yours,yoursRow);
  if(recent.length){const label=document.createElement('p');label.className='react-label';label.textContent='Recently Used';const row=document.createElement('div');row.className='quick';for(const emoji of recent)row.append(emojiButton(emoji,choose));panel.append(label,row);}
  const picker=document.createElement('div');picker.className='react-picker';panel.append(picker);pop.append(panel);
  if(window.PetioEmoji)PetioEmoji.mount(picker,emoji=>{rememberEmoji(emoji);choose(emoji);});
  placePop(pop,anchor);syncChatHit();
 };
 quick.append(plus);pop.append(quick);
 pop.addEventListener('wheel',e=>e.stopPropagation());
 placePop(pop,anchor);syncChatHit();
}
function appendPinned(log,rows){
 const pinned=rows.filter(m=>m.pinned);if(!pinned.length)return;
 const bar=document.createElement('div');bar.className='pins';
 for(const m of pinned){const button=document.createElement('button');button.type='button';button.textContent='📌 '+(m.name||'Message')+': '+(notePlain(m.text).slice(0,42)||'GIF');button.onclick=()=>log.querySelector('[data-id="'+m.id+'"]')?.scrollIntoView({block:'center'});bar.append(button);}
 log.append(bar);
}
document.addEventListener('pointerdown',e=>{if(e.target.closest('.msg-menu,.react-pop,.msg-tools'))return;closeBubbleMenus();});
document.addEventListener('scroll',e=>{if(e.target&&e.target.closest&&e.target.closest('#deliver-log,#desk-log'))closeBubbleMenus();},true);

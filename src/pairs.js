// Each companion pair plays a different little scene. Keys are the two types in alphabetical order.
const table={
 'boo+boo':['spook','spook'],
 'boo+bumble':['peekaboo','circle'],
 'boo+drowsy':['lantern','nodoff'],
 'boo+ember':['spook','dance'],
 'boo+luffy':['peekaboo','play'],
 'boo+merlin':['spook','spark'],
 'boo+miso':['peekaboo','nuzzle'],
 'bumble+bumble':['waggle','waggle'],
 'bumble+drowsy':['honey','yawn'],
 'bumble+ember':['flower','flamejuggle'],
 'bumble+luffy':['circle','play'],
 'bumble+merlin':['waggle','spark'],
 'bumble+miso':['circle','pounce'],
 'drowsy+drowsy':['yawn','yawn'],
 'drowsy+ember':['cocoa','dance'],
 'drowsy+luffy':['nodoff','play'],
 'drowsy+merlin':['sheep','spark'],
 'drowsy+miso':['nodoff','nuzzle'],
 'ember+ember':['dance','dance'],
 'ember+luffy':['micdrop','play'],
 'ember+merlin':['tridentspin','spark'],
 'ember+miso':['dance','yarnplay'],
 'luffy+luffy':['play','play'],
 'luffy+merlin':['play','spark'],
 'luffy+miso':['play','yarnplay'],
 'merlin+merlin':['spark','spark'],
 'merlin+miso':['spark','nuzzle'],
 'miso+miso':['nuzzle','nuzzle']
};
function pairPlay(a,b){
 const row=table[[a,b].sort().join('+')];
 if(!row) return {host:'greet',guest:'greet'};
 const hostFirst=a<=b;
 return {host:hostFirst?row[0]:row[1],guest:hostFirst?row[1]:row[0]};
}
const socialVoices={miso:[['Found any good sunbeams? ☀️','Want to compare tiny paw prints? 🐾','Your desktop smells like adventure!'],['I saved a sunny spot for you. 🐱','Purr. You’re welcome in my territory.','Let’s patrol together!']],ember:[['Can I show you a tiny fire trick? 🔥','Who’s ready for a little mischief?','My trident says hello! 🔱'],['Only tiny flames near the keyboard! 🔥','You bring the mischief. I’ll bring sparks.','Now that’s a friend with spirit!']],bumble:[['I brought a little honey! 🍯','Any flowers on this desktop? 🌼','Bzz! Happy to bee here! 🐝'],['That’s sweeter than honey! 🍯','Let’s make this place bloom. 🌼','You can bee my adventure buddy!']],boo:[['Boo! A friendly hello. 👻','Can I haunt this corner with you?','I floated all this way to see you!'],['You don’t have to scare me to say hi! 👻','There’s room for one more little ghost.','You’re a very welcome haunting!']],drowsy:[['Is there a spare pillow here? 💤','I walked all this way… almost.','We can chat lying down, right?'],['I was saving this nap spot for you. 💤','Let’s be quietly excited together.','Five more minutes… then adventure.']],merlin:[['I brought a friendship spell! ✨','A portal led me to a new friend.','Want to see a little magic? 🪄'],['The best magic is good company. ✨','My crystal predicted a lovely visitor.','Let’s make this desktop enchanted!']],luffy:[['Adventure buddy! Want to play? 🐾','I followed the smell of snacks!','Permission to board your desktop? 🏴‍☠️'],['Welcome aboard, crewmate! 🐶','I saved you a snack. Maybe two.','Next stop: a grand desktop adventure!']]};
function pairChat(host,guest,variation=0){const i=Math.abs(Math.trunc(variation)||0)%3;return {guest:(socialVoices[guest]||socialVoices.miso)[0][i],host:(socialVoices[host]||socialVoices.miso)[1][i]};}
function meetingSpot(host,width,height,scale=.65){const gap=140*Math.max(scale,host.scale||.65)+28,pad=65,side=width-host.x>host.x?1:-1,x=host.x+side*gap;if(x<pad||x>width-pad||host.y<75||host.y>height-24)return null;return {x,y:Math.min(height-45,host.y),side,gap};}
function socialStage(age){return age<1200?'greet':age<3800?'guest':age<6400?'host':age<9800?'play':'end';}
if(typeof module!=='undefined') module.exports={pairPlay,table,pairChat,meetingSpot,socialStage};

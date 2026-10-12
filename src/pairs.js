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
if(typeof module!=='undefined') module.exports={pairPlay,table};

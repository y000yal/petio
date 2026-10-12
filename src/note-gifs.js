var noteGifs={wave:'Wave',heart:'Heart',spark:'Spark',laugh:'Laugh',paw:'Paw',party:'Party',sleep:'Sleep',ghost:'Ghost'};
// Animated Noto Emoji (SIL Open Font License), served by Google Fonts.
var notoGifs=[['1f602','tears of joy'],['1f923','rolling on the floor'],['1f606','laughing'],['1f605','sweat smile'],['1f600','grinning face'],['1f603','smiling face'],['1f604','smiling eyes'],['1f601','beaming face'],['1f60a','smiling blush'],['1f60d','heart eyes'],['1f970','smiling hearts'],['1f618','kiss'],['1f60e','sunglasses'],['1f929','star struck'],['1f973','party face'],['1f389','party popper'],['1f38a','confetti'],['1f525','fire'],['2728','sparkles'],['1f44d','thumbs up'],['1f44f','clapping'],['1f64c','hooray'],['1f44b','waving'],['2764','red heart'],['1f496','beating heart'],['1f497','growing heart'],['1f498','sparkling heart'],['1f493','two hearts'],['1f494','broken heart'],['1f9e1','orange heart'],['1f49b','yellow heart'],['1f49a','green heart'],['1f499','blue heart'],['1f49c','purple heart'],['1f5a4','black heart'],['1f90d','white heart'],['1f48b','kiss mark'],['1f97a','pleading'],['1f622','crying'],['1f62d','sobbing'],['1f625','sad'],['1f641','frown'],['1f61e','disappointed'],['1f914','thinking'],['1f92d','giggle'],['1f917','hug'],['1f60f','smirk'],['1f612','unamused'],['1f644','eye roll'],['1f621','angry'],['1f620','mad'],['1f92c','cursing'],['1f92f','mind blown'],['1f631','scream'],['1f630','anxious'],['1f628','fearful'],['1f608','imp'],['1f47b','ghost'],['1f47d','alien'],['1f916','robot'],['1f63a','smiling cat'],['1f63b','heart cat'],['1f639','laughing cat'],['1f431','cat'],['1f98a','fox'],['1f43c','panda'],['1f98b','butterfly'],['1f41d','bee'],['1f338','blossom'],['1f340','clover'],['1f31f','glowing star'],['1f31e','sun'],['2b50','star'],['1f4a5','boom'],['1f381','gift'],['1f382','birthday cake'],['1f36a','cookie'],['1f355','pizza'],['1f354','burger'],['2615','coffee'],['1f37b','cheers'],['1f44e','thumbs down'],['1f91e','fingers crossed'],['1f4aa','strong'],['1f4af','hundred'],['1f4a9','poo'],['1f680','rocket'],['1f3b6','notes'],['1f64f','please'],['1f634','sleeping'],['1f62a','sleepy'],['1f971','yawn'],['1f60b','yum'],['1f924','drooling'],['1f910','shush'],['1f974','woozy'],['1f637','mask'],['1f44c','ok'],['1f91d','handshake'],['1f91f','love you'],['270c','peace'],['1f483','dance'],['1f44a','fist bump'],['1f913','nerd'],['1f9d0','monocle'],['1f62c','grimace']];
var notoByCode=Object.fromEntries?Object.fromEntries(notoGifs.map(function(g){return [g[0],g[1]];})):{};
function notoStill(cp){return 'https://fonts.gstatic.com/s/e/notoemoji/latest/'+cp+'/512.png';}
function notoMotion(cp){return 'https://fonts.gstatic.com/s/e/notoemoji/latest/'+cp+'/512.gif';}
function searchGifs(q){var n=String(q||'').trim().toLowerCase(),list=n?notoGifs.filter(function(g){return g[1].indexOf(n)>=0;}):notoGifs;return list.slice(0,24).map(function(g){return {cp:g[0],name:g[1]};});}
function giphyUrl(id){return 'https://media.giphy.com/media/'+id+'/100.gif';}
function gifLabel(id){return noteGifs[id]||notoByCode[id]||(id?'GIF':'');}
function notePlain(message){return String(message||'').replace(/\[\[gif:([A-Za-z0-9]+)\]\]/g,function(_,id){return gifLabel(id);}).replace(/[ \t]{2,}/g,' ').trim();}
function renderNote(el,message){
 el.replaceChildren();
 const text=String(message||''),re=/\[\[gif:([A-Za-z0-9]+)\]\]/g;
 let last=0,match;
 while((match=re.exec(text))){
  if(match.index>last)el.append(document.createTextNode(text.slice(last,match.index)));
  const id=match[1],label=gifLabel(id);
  if(label){const img=document.createElement('img');img.className='note-gif';img.alt=label==='GIF'?'':label;img.src=noteGifs[id]?'gifs/'+id+'.gif':notoByCode[id]?notoMotion(id):giphyUrl(id);el.append(img);}
  last=match.index+match[0].length;
 }
 if(last<text.length)el.append(document.createTextNode(text.slice(last)));
}
if(typeof module!=='undefined')module.exports={noteGifs,renderNote,notePlain};

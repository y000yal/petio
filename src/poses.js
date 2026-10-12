function actionPose(action,progress,time,type='miso',need=0){
 const p={y:0,squash:1,bend:0,leftArm:0,rightArm:0,leftFoot:0,rightFoot:0,rotation:0,xscale:1,size:1,ball:null,dx:0,lean:0,face:'normal'};
 if(action==='gameThink'){const beat=Math.sin(time*(type==='drowsy'?3:9));p.rightArm=7+beat*5;p.leftArm=4-beat*2;p.lean=beat*.04;p.face='focused';p.y=-Math.abs(beat)*.6;return p;}
 if(action==='gameReveal'||action==='gamePlace'){const reach=Math.sin(Math.min(1,progress)*Math.PI);p.rightArm=4+reach*10;p.leftArm=2;p.squash=1-.04*Math.sin(progress*Math.PI*2);p.lean=.12*reach;p.face='happy';p.y=-reach;return p;}
 if(action==='gameLose'){p.leftArm=p.rightArm=-2;p.lean=-.08;p.squash=.94;p.face='closed';return p;}
 if(action==='gameDraw'){p.leftArm=4+Math.sin(time*5);p.rightArm=4-Math.sin(time*5);p.face='happy';return p;}
 const smooth=x=>x*x*(3-2*x);let air=-1;
 // Luffy uses authored whole-body poses, interpolated between animation frames.
 if(type==='luffy'&&['jump','flip','pounce'].includes(action)){
  const spin=action==='flip',u=Math.max(0,Math.min(1,progress));
  // time, height, squash, paw tuck, head dip, ear lag, rotation, expression
  const frames=spin? [
   [0,0,1,0,0,0,0,'happy'],[.10,0,.93,1,1,1,-.08,'focused'],[.23,0,.78,3,2,2,-.16,'focused'],
   [.31,-8,1.12,0,-1,3,0,'wide'],[.37,-19,1.03,3,2,1,.65,'wide'],[.43,-28,.96,6,5,-1,1.45,'closed'],
   [.49,-33,.9,8,7,-3,2.35,'closed'],[.55,-34,.88,8,7,-4,3.3,'closed'],[.60,-31,.92,7,6,-3,4.25,'closed'],
   [.65,-25,.96,6,4,-2,5.05,'wide'],[.70,-16,1.03,3,1,0,5.75,'wide'],[.77,-3,1.08,-1,0,2,Math.PI*2,'wide'],
   [.83,0,.76,3,2,3,Math.PI*2,'closed'],[.91,-1,1.04,.5,-.5,-1,Math.PI*2,'happy'],[1,0,1,0,0,0,Math.PI*2,'happy']
  ]:[
   [0,0,1,0,0,0,0,'happy'],[.10,0,.94,1,1,1,0,'focused'],
   [.23,0,.78,3,2,2,spin?-.16:0,'focused'],
   [.31,-8,1.12,-1,-1,3,0,'wide'],
   [.45,-29,1.02,spin?7:4,-2,-3,spin?1.8:0,'wide'],
   [.55,-33,.96,spin?8:5,-1,-4,spin?3.6:0,'happy'],
   [.67,-22,1,spin?5:2,0,-2,spin?5.8:0,'happy'],
   [.77,-3,1.08,-1,1,1,spin?Math.PI*2:0,'wide'],
   [.83,0,.76,3,2,3,spin?Math.PI*2:0,'closed'],
   [.91,-1,1.04,.5,-.5,-1,spin?Math.PI*2:0,'happy'],
   [1,0,1,0,0,0,spin?Math.PI*2:0,'happy']];
  let i=1;while(i<frames.length-1&&u>frames[i][0])i++;
  const a=frames[i-1],b=frames[i],k=smooth((u-a[0])/(b[0]-a[0])),mix=j=>a[j]+(b[j]-a[j])*k;
  p.y=mix(1);p.squash=mix(2);p.rotation=mix(6);p.face=b[7];
  p.dog={curl:spin?Math.max(0,Math.min(1,(mix(3)-1)/7)):0,tuck:mix(3),headDip:mix(4),ears:mix(5),phase:i};return p;
 }
 if(type==='luffy'&&action==='gomu'){
  const q=luffyPunchPose(progress);p.punch=q;p.lean=q.lean;p.squash=q.squash;return p;
 }
 if(action==='ping')return actionPose('jump',progress,time,type); // a quick hop when a notification arrives
 if(action==='welcome'){ // excitement level 1-3 (need), expressed differently by each companion
  const n=Math.max(1,Math.min(3,need)),period=1/(1+.15*n),k=Math.floor(time/period),s=(time/period)%1,kind=n>=2&&k%3===2&&type!=='drowsy'&&type!=='bumble'&&type!=='boo'?'flip':'jump',w=actionPose(kind,s,time,type);
  w.leftArm=Math.max(w.leftArm,6)+Math.sin(time*18)*1.5;w.rightArm=Math.max(w.rightArm,6)-Math.sin(time*18)*1.5;w.y*=1+.1*n;if(kind==='flip'&&n>=3)w.rotation*=2;
  if(type==='miso'){w.dx=Math.sin(time*5)*24;w.lean=Math.cos(time*5)*.16;w.y=-Math.abs(Math.sin(time*10))*3;w.rotation=0;} // zoomies
  if(type==='ember'){w.lean+=Math.sin(time*16)*.04;} // flips, fire sparks and devil horns
  if(type==='bumble'){w.dx=Math.sin(time*3)*22;w.y=-9+Math.cos(time*3)*9;w.lean=Math.cos(time*3)*.2;w.rotation=0;} // loop-the-loop flying
  if(type==='boo'){w.xscale=Math.max(.35,Math.abs(Math.cos(time*6)));w.y=-6-Math.abs(Math.sin(time*3))*6;w.rotation=0;} // twirls like a tornado
  if(type==='drowsy'){const c=(time/1.8)%1;w.y=-Math.max(0,Math.sin(c*Math.PI))*5;w.leftArm=w.rightArm=8+Math.sin(time*2)*2;w.lean=Math.sin(time*1.5)*.05;w.face='happy';w.rotation=0;} // a slow, sleepy cheer
  if(type==='merlin'){w.y=-8-Math.sin(time*2)*3;w.xscale=Math.max(.35,Math.abs(Math.cos(time*3)));w.rotation=0;w.rightArm=10;} // levitates and spins with her wand up
  return w;
 }
 if(action==='beg'){ // needier every level: bigger jumps, more flips, flailing arms
  const n=Math.max(1,need),period=1.5/(1+.2*n),k=Math.floor(time/period),s=(time/period)%1,kind=(n>=5?k%2===1:n>=2&&k%3===1)?'flip':'jump',q=actionPose(kind,s,time,type);
  q.y*=1+.1*n;if(kind==='flip'&&n>=4)q.rotation*=2;if(n>=3){q.leftArm=Math.max(q.leftArm,6)+Math.sin(time*22)*2;q.rightArm=Math.max(q.rightArm,6)-Math.sin(time*22)*2;}
  return q;
 }

 if(action==='jump'||action==='flip'||action==='pounce'||action==='alert'){
  const s=action==='alert'?(time*.9)%1:Math.max(0,Math.min(1,progress)),launch=type==='drowsy'?.07:.2,crouch=type==='drowsy'?.25:1,land=.76;
  if(s<launch){const k=smooth(s/launch);p.squash=1-.2*k*crouch;p.bend=3*k*crouch;p.leftArm=p.rightArm=-2*k*crouch;p.face='focused';}
  else if(s<land){const f=(s-launch)/(land-launch);air=f;const height=Math.sin(f*Math.PI);p.y=-25*height;p.squash=1+.07*Math.sin(f*Math.PI*2);p.bend=(action==='flip'?5:3)*height;p.leftArm=action==='flip'?4:7;p.rightArm=p.leftArm;p.face='surprised';if(action==='flip')p.rotation=smooth(f)*Math.PI*2;}
  else{const f=(s-land)/(1-land),impact=Math.sin(Math.min(1,f/.35)*Math.PI/2)*(1-smooth(f));p.squash=1-.23*impact;p.bend=4*impact;p.leftArm=p.rightArm=-2*impact;p.face=f<.55?'squeezed':'happy';if(action==='flip')p.rotation=Math.PI*2;}
 if(action==='alert'&&s>=.2&&s<.76)p.leftArm=p.rightArm=7+Math.sin(time*22)*3;
 }else if(action==='dance'){
  const beat=Math.sin(time*8);p.y=-Math.abs(beat)*1.3;p.lean=beat*.12;p.leftArm=4+Math.sin(time*8)*5;p.rightArm=4-Math.sin(time*8)*5;p.leftFoot=Math.max(0,beat)*3;p.rightFoot=Math.max(0,-beat)*3;p.bend=1;p.face=beat>.5?'wink':'happy';
 }else if(action==='land'){
  const impact=Math.sin(Math.min(1,progress)*Math.PI);p.squash=1-.18*impact;p.bend=3*impact;p.face='squeezed';
 }


 if(action==='pet'){
  const w=Math.sin(time*14),sway=Math.sin(time*3);p.face='happy';
  if(type==='miso'){p.y=Math.sin(time*32)*.35;p.squash=.95+Math.sin(time*6)*.03;p.lean=sway*.07;p.bend=2;} // purring rumble
  else if(type==='ember'){p.y=-Math.abs(Math.sin(time*7))*3.5;p.leftArm=p.rightArm=5+w*2;p.lean=w*.05;p.face='wink';} // excited hops
  else if(type==='bumble'){p.y=Math.sin(time*6)*3;p.lean=Math.sin(time*6)*.2;p.leftArm=p.rightArm=3;} // happy loop-de-loop
  else if(type==='boo'){p.y=-4+Math.sin(time*2)*2;p.lean=sway*.14;p.squash=.95+Math.sin(time*4)*.03;} // shy floating sway
  else if(type==='drowsy'){p.lean=Math.sin(time*1.4)*.12;p.squash=.92+Math.sin(time*1.4)*.03;p.y=1;} // slow sleepy nuzzle
  else if(type==='merlin'){p.y=-Math.abs(Math.sin(time*5))*2.5;p.rightArm=7+Math.sin(time*5)*2;p.leftArm=2;p.lean=sway*.1;} // wand-raising twirl
 }

 if(action==='chase'){ // Miso: bats at a dangling ball of yarn, hops for it, then sits down to lick its paws
  const s=Math.max(0,Math.min(1,progress));
  if(s<.62){
   const th=Math.sin(time*2.4)*.55,bx=Math.sin(th)*34,beat=Math.sin(time*9),hop=Math.max(0,Math.sin(time*4.8));
   p.lean=Math.max(-1,Math.min(1,bx/14))*.12;p.y=-hop*3.2;p.squash=1-.05*(1-hop);p.bend=2;p.face=hop>.5?'surprised':'focused';
   if(bx>5){p.rightArm=7+Math.max(0,beat)*3;p.leftArm=2;}else if(bx<-5){p.leftArm=7+Math.max(0,beat)*3;p.rightArm=2;}else{p.leftArm=p.rightArm=6+Math.max(0,beat)*3;}
  }else{ // licking a paw, eyes shut
   const w=Math.sin(time*9);p.rightArm=9+w*1.5;p.lean=.08+w*.02;p.face='squeezed';p.bend=2;p.y=0;
  }
 }
 // Idle hobbies: arms hold the prop, the body stays calm.
 const sip=Math.max(0,Math.sin(time*1.1)),nod=Math.sin(time*2);
 if(action==='coffee'){p.rightArm=8+sip*3;p.lean=sip*.04;}
 else if(action==='phone'){p.rightArm=8+nod*.5;p.bend=1;p.lean=.05;}
 else if(action==='laptop'){p.bend=2;p.lean=.07+Math.sin(time*9)*.012;p.face='focused';}
 else if(action==='stretch'){const e=Math.sin(time*1.4);p.leftArm=p.rightArm=7+e*3;p.squash=1.06+e*.04;p.lean=Math.sin(time*1.1)*.12;p.face='squeezed';}
 else if(action==='book'){p.leftArm=p.rightArm=4;p.lean=.03;p.face='focused';}
 else if(action==='snack'){p.rightArm=9-Math.max(0,Math.sin(time*5))*1.5;p.y=Math.sin(time*10)*.3;p.face='happy';}
 else if(action==='juggle'){p.leftArm=7+Math.sin(time*4.5)*2;p.rightArm=7-Math.sin(time*4.5)*2;p.y=Math.sin(time*9)*.5;p.face='wink';}
 else if(action==='cauldron'){p.rightArm=8;p.lean=Math.sin(time*4)*.06;p.bend=1;p.face='focused';}
 else if(action==='spellpractice'){const w=Math.sin(time*5);p.rightArm=9+w*2;p.lean=Math.sin(time*2.5)*.08;p.face=w>.6?'surprised':'focused';}
 else if(action==='crystalball'){p.leftArm=p.rightArm=6;p.bend=2;p.lean=Math.sin(time*1.2)*.03;p.face='focused';}
 else if(action==='groom'){const w=Math.sin(time*9);p.rightArm=9+w*1.5;p.lean=.08+w*.02;p.face='squeezed';}
 else if(action==='yarnplay'){const b=Math.sin(time*2.5);p.lean=b*.08;p.y=-Math.abs(Math.sin(time*5))*1.5;p.leftArm=b>0?-1:3;p.rightArm=b>0?3:-1;p.face='focused';}
 else if(action==='loaf'){p.squash=.94+Math.sin(time*1.6)*.015;p.face='happy';}
 else if(action==='marshmallow'){p.rightArm=6;p.lean=.05;p.face='focused';}
 else if(action==='tridentspin'){p.rightArm=9;p.lean=Math.sin(time*8)*.05;p.face='wink';}
 else if(action==='flamejuggle'){p.leftArm=7+Math.sin(time*4.5)*2;p.rightArm=7-Math.sin(time*4.5)*2;p.y=Math.sin(time*9)*.5;p.face='wink';}
 else if(action==='flower'){p.rightArm=8;p.lean=Math.sin(time*2)*.05;p.face='happy';}
 else if(action==='honey'){p.rightArm=8+Math.max(0,Math.sin(time*1.4))*2;p.lean=.04;p.face='happy';}
 else if(action==='waggle'){p.lean=Math.sin(time*14)*.2;p.y=Math.sin(time*7)*1.2;p.leftArm=p.rightArm=3;p.face='happy';}
 else if(action==='peekaboo'){const hide=time%3<1.6;p.leftArm=p.rightArm=hide?5:0;p.face=hide?'squeezed':'surprised';p.y=hide?0:-2;}
 else if(action==='lantern'){p.rightArm=6;p.lean=Math.sin(time*1.6)*.07;p.face='focused';}
 else if(action==='spook'){p.leftArm=p.rightArm=8+Math.sin(time*6)*2;p.lean=Math.sin(time*3)*.14;p.face='surprised';}
 else if(action==='nodoff'){const c=time%4,jerk=c>3.3;p.lean=jerk?0:Math.min(.28,c*.08);p.squash=jerk?1.03:.92;p.face='squeezed';}
 else if(action==='sheep'){p.lean=Math.sin(time*1.2)*.05;p.squash=.95;p.face='squeezed';}
 else if(action==='cocoa'){const s2=Math.max(0,Math.sin(time*.9));p.rightArm=8+s2*3;p.lean=s2*.04;p.squash=.95;}
 else if(action==='drink'){ // 3 s cycle: reach for the drink, sip (head tips back), lower it with a happy sigh
  const c=(time%3)/3,sipK=c>.25&&c<.75?Math.sin((c-.25)/.5*Math.PI):0,reach=c<.25?c/.25:c>.75?1-(c-.75)/.25:1;
  p.rightArm=3+reach*6+sipK*2;p.lean=-sipK*.1;p.face=sipK>.3?'squeezed':c>.8?'happy':'normal';p.bend=1;
  if(type==='merlin'){p.rightArm=5+reach*3;p.leftArm=2;}
  if(type==='miso'){p.rightArm=0;p.lean=sipK*.14;p.bend=2;p.y=sipK*1.5;}
  if(type==='boo'){p.rightArm=0;}
 }
 else if(action==='scare'){ // Boo lurks (nearly invisible), then pops out big and shaky with arms up
  const s=Math.max(0,Math.min(1,progress)),pop=s>=.5?Math.sin(Math.min(1,(s-.5)/.2)*Math.PI/2):0,settle=s>.7?(s-.7)/.3:0;
  p.squash=s<.5?.9:1;p.size=s<.5?1:1+.45*pop*(1-settle);p.leftArm=p.rightArm=s<.5?0:9;p.lean=s<.5?0:Math.sin(time*40)*.07*(1-settle);p.face=s<.5?'squeezed':'surprised';p.y=s<.5?0:-4*pop*(1-settle);
 }
 else if(action==='scratch'){ // head being scratched: eyes shut, leaning into the hand
  const w=Math.sin(time*16);p.face='normal';p.squash=.96+Math.sin(time*9)*.02;p.y=-Math.abs(w)*.5;p.lean=Math.sin(time*3)*.03;
  if(type==='miso'){p.y=Math.sin(time*34)*.35;p.squash=.94;} // purr rumble
  if(type==='ember'){p.face=Math.sin(time*2)>0?'wink':'normal';} // pretends not to enjoy it
  if(type==='bumble'){p.y=Math.sin(time*22)*.8;} // wings flutter
  if(type==='boo'){p.y=-2+Math.sin(time*3)*1.5;}
  if(type==='drowsy'){p.squash=.88;p.lean=.06;p.y=1;} // melts
  if(type==='merlin'){p.lean=Math.sin(time*5)*.05;}
 }
 else if(action==='pollinate'){ // Bumble: a flower sprouts, it dives in for pollen, then delivers it to a honey jar and waggle-dances
  const s=Math.max(0,Math.min(1,progress)),sm2=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const dx=s<.3?0:s<.42?18*sm2((s-.3)/.12):s<.6?18:s<.72?18-24*sm2((s-.6)/.12):-6;
  p.dx=dx;p.face='happy';p.leftArm=p.rightArm=3;
  const moving=(s>=.3&&s<.42)||(s>=.6&&s<.72),dir=s<.5?1:-1;
  p.lean=moving?dir*.16:s>=.72?Math.sin(time*14)*.18:Math.sin(time*3)*.04;
  p.y=s>=.42&&s<.6?3+Math.sin(time*14)*1.2:s>=.72?Math.sin(time*7)*1.2:Math.sin(time*5)*.8;
 }
 else if(action==='micdrop'){ // Ember: sunglasses on, struts with a mic, drops it in a burst of fire, smirks
  const s=Math.max(0,Math.min(1,progress));
  if(s<.2){p.leftArm=p.rightArm=9+Math.sin(time*10);p.y=-Math.abs(Math.sin(time*6))*2;p.face='wink';}
  else if(s<.62){p.rightArm=8;p.leftArm=Math.sin(time*3)>0?5:1;p.dx=Math.sin(time*3)*7;p.lean=Math.sin(time*3)*.09;p.y=-Math.abs(Math.sin(time*6))*1.2;p.face='happy';}
  else if(s<.72){const k=(s-.62)/.1;p.rightArm=8-k*9;p.lean=-.08*k;p.dx=0;p.face='wink';}
  else{p.leftArm=p.rightArm=1;p.lean=-.06+Math.sin(time*2)*.02;p.squash=1;p.face='wink';}
 }
 else if(action==='expect'){ // waiting for a pet: still, eager, wiggling
  p.lean=Math.sin(time*14)*.04;p.y=Math.sin(time*7)*.4;p.leftArm=p.rightArm=2+Math.sin(time*14);
 }
 else if(action==='relax'){const b=Math.sin(time*1.6);p.squash=.97+b*.025;p.lean=Math.sin(time*.8)*.05;p.y=b*.6;p.face='squeezed';}
 // Each companion jumps, spins and sleeps in its own way.
 const flip=action==='flip'&&air>=0,landed=action==='flip'&&air<0&&progress>.5,breath=Math.sin(time*2);
 if(type==='miso'&&action==='jump'&&air>=0){p.squash+=.05;p.leftArm=p.rightArm=3;}
 if(type==='miso'&&action==='flip'){ // tuck into a ball (own sprite) and roll sideways along the ground, then unfurl
  const s=Math.max(0,Math.min(1,progress)),tuck=s<.2?smooth(s/.2):s<.76?1:1-smooth(Math.min(1,(s-.76)/.14)),f=Math.max(0,Math.min(1,(s-.2)/.56));
  p.size=1-.5*tuck;p.rotation=0;p.leftArm=p.rightArm=-2*tuck;p.bend=3*tuck;
  if(s>=.2&&s<.76){const dx=36*Math.sin(Math.PI*f);p.ball={dx,rot:dx/6*(f<.5?1:1)};p.y=-2*Math.abs(Math.sin(f*Math.PI*4));}
 }
 if(type==='ember'){if(action==='jump')p.y*=1.3;if(flip)p.rotation*=2;if(landed)p.rotation=Math.PI*4;}
 if(type==='bumble'){if(flip){p.rotation=-p.rotation;p.y=-34*Math.sin(air*Math.PI);p.lean=Math.sin(air*Math.PI*2)*.2;}if(landed)p.rotation=-Math.PI*2;if(action==='jump'&&air>=0)p.y+=Math.sin(air*Math.PI*6)*2;}
 if(type==='boo'){if(action==='jump'&&air>=0)p.y*=.8;if(flip){p.rotation=Math.sin(air*Math.PI*2)*.9;p.lean=Math.cos(air*Math.PI*2)*.25;}if(landed)p.rotation=0;}
 if(type==='drowsy'&&action==='flip'){ // tries a flip, wobbles at the top, gives up and slumps back
  const s=Math.max(0,Math.min(1,progress)),tilt=s<.4?smooth(s/.4):s<.55?1+Math.sin(time*26)*.04:1-smooth(Math.min(1,(s-.55)/.3));
  p.rotation=tilt*1.1;p.y=s<.4?-4*Math.sin(s/.4*Math.PI):0;p.squash=s<.55?1:.9;p.bend=s>.55?2:0;p.leftArm=p.rightArm=s<.55?5+Math.sin(time*20)*2:-1;p.face=s<.4?'focused':'squeezed';
 }
 if(type==='merlin'&&flip){p.rotation=0;p.xscale=Math.max(.12,Math.abs(Math.cos(air*Math.PI*4)));p.y*=.7;}
 if(action==='sleep'||action==='yawn'){
  if(type==='miso'){p.squash=.86+breath*.02;p.bend=3;p.lean=-.05;}
  else if(type==='ember'){p.squash=.9+breath*.02;p.lean=.07;p.y=1;}
  else if(type==='bumble'){p.y=4;p.lean=-.12;p.squash=.95+breath*.01;}
  else if(type==='boo'){p.y=Math.sin(time*1.2)*3-1;p.lean=Math.sin(time*.8)*.06;}
  else if(type==='drowsy'){p.lean=0;p.squash=.97+breath*.02;p.y=0;}
  else if(type==='merlin'){p.squash=.92+breath*.015;p.lean=Math.sin(time*.9)*.07;}
 }
 // The same command has a different physical vocabulary for each companion.
 if(type==='ember'){p.lean+=action==='dance'?Math.sin(time*11)*.15:0;p.leftArm*=1.15;p.rightArm*=1.15;}
 if(type==='drowsy'){p.y*=.4;p.leftArm*=.45;p.rightArm*=.45;p.lean*=.5;if(action==='dance'){p.leftFoot*=.4;p.rightFoot*=.4;}}
 if(type==='merlin'){p.y*=1.15;p.bend*=.45;if(action==='dance'){p.lean=Math.sin(time*3)*.18;p.leftArm=2;p.rightArm=7+Math.sin(time*3)*2;}}
 if(type==='luffy'&&action==='dance'){p.y=-Math.abs(Math.sin(time*6))*3;p.lean=Math.sin(time*6)*.1;}
 if(type==='bumble'){p.bend=0;p.leftFoot=p.rightFoot=0;if(action==='dance'){p.y=Math.sin(time*5)*4;p.lean=Math.sin(time*7)*.22;}}
 if(type==='boo'){p.bend=0;p.leftFoot=p.rightFoot=0;p.squash=1+(1-p.squash)*.2;if(action==='dance'){p.y=Math.sin(time*2)*4;p.lean=Math.sin(time*2)*.2;}}
 return p;
}
function luffyPunchPose(progress){
 const u=Math.max(0,Math.min(1,progress));
 // time, reach, body lean, squash, lifted paw, elastic arm wave
 const frames=[[0,0,0,1,0,0],[.12,-3,-.06,.97,3,0],[.27,-7,-.15,.88,6,-2],
  [.32,7,.03,1.06,7,2],[.36,48,.15,1.02,8,0],[.40,51,.13,.98,8,.4],
  [.48,48,.1,1,7,0],[.58,29,.02,1,6,6],[.66,4,-.09,.95,5,-4],
  [.73,10,.045,1.03,4,2],[.8,0,-.025,.99,2,-1],[.9,0,0,1,0,0],[1,0,0,1,0,0]];
 let i=1;while(i<frames.length-1&&u>frames[i][0])i++;
 const a=frames[i-1],b=frames[i],f=(u-a[0])/(b[0]-a[0]),k=f*f*(3-2*f),mix=j=>a[j]+(b[j]-a[j])*k;
 return {reach:mix(1),lean:mix(2),squash:mix(3),paw:mix(4),wave:mix(5),impact:u>=.36&&u<.44,phase:i};
}
if(typeof module!=='undefined')module.exports={actionPose,luffyPunchPose};

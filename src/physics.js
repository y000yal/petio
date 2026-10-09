// A damped spring driven by cursor velocity, integrated in small stable steps.
function advanceSwing(swing, velocity, target, dt){
 for(let remaining=Math.min(dt,.1);remaining>0;){const step=Math.min(remaining,1/120);velocity+=(65*(target-swing)-12*velocity)*step;swing+=velocity*step;remaining-=step;}
 return {swing,velocity};
}
if(typeof module!=='undefined')module.exports={advanceSwing};

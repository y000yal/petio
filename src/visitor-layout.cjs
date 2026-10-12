function visitorWindow(workArea){
 return {width:Math.round(workArea.width),height:Math.round(workArea.height),x:Math.round(workArea.x),y:Math.round(workArea.y)};
}
module.exports={visitorWindow};

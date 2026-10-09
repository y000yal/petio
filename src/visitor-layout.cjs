function visitorWindow(workArea,count){
 const width=Math.min(count>1?980:340,workArea.width),height=Math.min(480,workArea.height);
 return {width,height,x:Math.round(workArea.x+workArea.width-width- Math.min(20,Math.max(0,(workArea.width-width)/2))),y:Math.round(workArea.y+workArea.height-height-Math.min(20,Math.max(0,(workArea.height-height)/2)))};
}
module.exports={visitorWindow};

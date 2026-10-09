const {app,BrowserWindow}=require('electron');
app.whenReady().then(()=>{const w=new BrowserWindow({show:false});for(const x of [-0,0,-1]){try{w.setPosition(x,10);console.log('setPosition',Object.is(x,-0)?'negative zero':x,'accepted');}catch(e){console.log('setPosition',Object.is(x,-0)?'negative zero':x,'REJECTED:',e.message);}}w.destroy();app.quit();});

const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('visitor',{
 onExit:cb=>ipcRenderer.on('visitor-exit',(_e,id)=>cb(id)),
 onState:cb=>ipcRenderer.on('visitor-state',(_e,s)=>cb(s)),
 host:()=>ipcRenderer.invoke('visitor-host'),
 play:data=>ipcRenderer.send('visitor-play',data),
 hit:value=>ipcRenderer.send('visitor-hit',value),
 sendHome:(reply,id)=>ipcRenderer.invoke('visitor-return',reply,id)
});

const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('visitor',{onState:cb=>ipcRenderer.on('visitor-state',(_e,s)=>cb(s)),hit:value=>ipcRenderer.send('visitor-hit',value),sendHome:(reply,id)=>ipcRenderer.invoke('visitor-return',reply,id)});

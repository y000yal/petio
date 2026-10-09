const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('visitor',{onState:cb=>ipcRenderer.on('visitor-state',(_e,s)=>cb(s)),sendHome:reply=>ipcRenderer.invoke('visitor-return',reply)});

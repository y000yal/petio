const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('zonePicker', { done: rect => ipcRenderer.send('zone-picked', rect) });

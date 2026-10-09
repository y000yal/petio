const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pet', {
  command: command => { if (['down', 'up', 'menu', 'more', 'notifications', 'close', 'pet', 'jump', 'flip', 'dead', 'dance', 'sleep', 'idle', 'wander', 'settings', 'reminder', 'attention', 'visit', 'special', 'sound-test'].includes(command)) ipcRenderer.send('pet-command', command); },
  onSound: callback => ipcRenderer.on('pet-sound', (_event, sound) => callback(sound)),
  look: callback => ipcRenderer.on('pet-look', (_event, v) => callback(v)),
  view: callback => ipcRenderer.on('pet-view', (_event, v) => callback(v)),
  clip: callback => ipcRenderer.on('pet-clip', (_event, clip) => callback(clip)),
  motion: callback => ipcRenderer.on('pet-motion', (_event, velocity) => callback(velocity)),
  socialRead: () => ipcRenderer.invoke('social-read'),
  socialCommand: data => ipcRenderer.invoke('social-command',data),
  socialSubscribe: callback => ipcRenderer.on('social-state',(_event,state)=>callback(state)),
  read: () => ipcRenderer.invoke('pet-read'),
  zoneSet: () => ipcRenderer.invoke('pet-zone-set'),
  zoneClear: () => ipcRenderer.invoke('pet-zone-clear'),
  previewSound: type => ipcRenderer.send('pet-preview-sound', type),
  update: patch => ipcRenderer.invoke('pet-settings', patch),
  reminder: data => ipcRenderer.invoke('pet-reminder', data),
  onTab: callback => ipcRenderer.on('settings-tab', (_event, tab) => callback(tab)),
  subscribe: callback => ipcRenderer.on('pet-state', (_event, state) => callback(state))
});

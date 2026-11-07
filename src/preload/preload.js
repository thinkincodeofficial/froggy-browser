const { contextBridge, ipcRenderer } = require('electron');

// The browser UI's only way to talk to the main process.
contextBridge.exposeInMainWorld('froggy', {
  platform: process.platform,
  newTab: () => ipcRenderer.send('tab:new'),
  closeTab: (id) => ipcRenderer.send('tab:close', id),
  activateTab: (id) => ipcRenderer.send('tab:activate', id),
  moveTab: (id, index) => ipcRenderer.send('tab:move', id, index),
  popOut: (id) => ipcRenderer.send('tab:popout', id),
  dock: (id) => ipcRenderer.send('tab:dock', id),
  navigate: (input) => ipcRenderer.send('tab:navigate', input),
  nav: (action) => ipcRenderer.send('tab:nav', action),
  toggleSplit: () => ipcRenderer.send('view:split'),
  updateSettings: (patch) => ipcRenderer.send('settings:update', patch),
  onState: (callback) => ipcRenderer.on('state', (_event, state) => callback(state)),
  onFocusAddress: (callback) => ipcRenderer.on('focus-address', () => callback()),
});

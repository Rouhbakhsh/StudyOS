const { contextBridge, ipcRenderer } = require('electron');

// پل امن بین صفحه و پردازش اصلی؛ فقط همین توابع در دسترس صفحه هستند
contextBridge.exposeInMainWorld('studyosDesktop', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (json) => ipcRenderer.invoke('state:save', json),
  saveStateSync: (json) => ipcRenderer.sendSync('state:save-sync', json),
  getDataInfo: () => ipcRenderer.invoke('data:info'),
  openDataFolder: () => ipcRenderer.invoke('data:open-folder'),
});

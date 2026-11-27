// Ponte segura entre as páginas locais da app (escolher / sem ligação) e o programa.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('SPAPDesktop', {
  pc: true,
  escolher: tipo => ipcRenderer.send('spap-escolher', String(tipo || '')),
  tentarDeNovo: () => ipcRenderer.send('spap-tentar'),
  trocarApp: () => ipcRenderer.send('spap-trocar'),
  info: () => ipcRenderer.invoke('spap-info')
});

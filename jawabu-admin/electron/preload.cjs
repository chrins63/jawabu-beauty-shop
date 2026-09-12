const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sleekDesktop', {
  isDesktop: true,
});

import { contextBridge, ipcRenderer } from 'electron';
import type { ImageToolkitApi } from '../shared/api-types';
import type { UpdaterStatus } from '../shared/types';

const api: ImageToolkitApi = {
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    appDataPath: () => ipcRenderer.invoke('app:appDataPath'),
    relaunch: () => ipcRenderer.invoke('app:relaunch')
  },
  dialog: {
    selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
    selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:selectDirectory', defaultPath)
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:showItemInFolder', fullPath)
  },
  image: {
    process: (payload) => ipcRenderer.invoke('image:process', payload)
  },
  fs: {
    scanDirectory: (root, extensions) => ipcRenderer.invoke('fs:scanDirectory', root, extensions),
    readFileBase64: (path) => ipcRenderer.invoke('fs:readFileBase64', path),
    writeFileBase64: (path, base64) => ipcRenderer.invoke('fs:writeFileBase64', path, base64),
    ensureDir: (path) => ipcRenderer.invoke('fs:ensureDir', path),
    exists: (path) => ipcRenderer.invoke('fs:exists', path),
    stat: (path) => ipcRenderer.invoke('fs:stat', path)
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onStatus: (callback: (status: UpdaterStatus) => void) => {
      const listener = (_e: unknown, status: UpdaterStatus) => callback(status);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    }
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  }
};

contextBridge.exposeInMainWorld('api', api);

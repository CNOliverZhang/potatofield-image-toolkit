import { contextBridge, ipcRenderer } from 'electron';
import type { ImageToolkitApi } from '../shared/api-types';
import type { UpdaterStatus } from '../shared/types';

const api: ImageToolkitApi = {
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    appDataPath: () => ipcRenderer.invoke('app:appDataPath'),
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
    isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
    getOpenAtLogin: () => ipcRenderer.invoke('app:openAtLogin'),
    setOpenAtLogin: (open: boolean) => ipcRenderer.invoke('app:setOpenAtLogin', open),
    getZoomFactor: () => ipcRenderer.invoke('app:zoomFactor'),
    setZoomFactor: (factor: number) => ipcRenderer.invoke('app:setZoomFactor', factor),
    // 同步读取：首帧就要用它决定页面背景（避免先用不透明再切换导致闪烁）
    windowMaterial: ipcRenderer.sendSync('app:windowMaterial') as boolean,
    acrylicLib: ipcRenderer.sendSync('app:acrylicLib') as boolean
  },
  dialog: {
    selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
    selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:selectDirectory', defaultPath)
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
    openPath: (fullPath) => ipcRenderer.invoke('shell:openPath', fullPath)
  },
  image: {
    process: (payload) => ipcRenderer.invoke('image:process', payload)
  },
  template: {
    saveAsset: (sourcePath: string) => ipcRenderer.invoke('templateAsset:save', sourcePath),
    resolveAsset: (fileName: string) => ipcRenderer.invoke('templateAsset:resolve', fileName),
    removeAsset: (fileName: string) => ipcRenderer.invoke('templateAsset:remove', fileName),
    importLegacy: () => ipcRenderer.invoke('legacy:importTemplates'),
    /** 编辑页预览底图（中性占位图）的绝对路径 */
    placeholder: () => ipcRenderer.invoke('template:placeholder'),
    /** 模板库：权威数据在主进程，读取与增删改都返回最新全量数据 */
    list: () => ipcRenderer.invoke('template:list'),
    add: (payload) => ipcRenderer.invoke('template:add', payload),
    update: (payload) => ipcRenderer.invoke('template:update', payload),
    remove: (payload) => ipcRenderer.invoke('template:remove', payload),
    setLegacyImported: (value) => ipcRenderer.invoke('template:setLegacyImported', value),
    /** 编辑窗口入参：开窗口前暂存，编辑页挂载后取走 */
    setEditing: (payload) => ipcRenderer.invoke('template:setEditing', payload),
    takeEditing: () => ipcRenderer.invoke('template:takeEditing'),
    apply: (payload) => ipcRenderer.invoke('template:apply', payload),
    onApplied: (cb) => ipcRenderer.on('template:applied', (_e, payload) => cb(payload)),
    /** 模板库变更：主进程写入后把最新数据推给所有窗口 */
    onChanged: (cb) => ipcRenderer.on('template:updated', (_e, payload) => cb(payload))
  },
  fs: {
    scanDirectory: (root, extensions) => ipcRenderer.invoke('fs:scanDirectory', root, extensions),
    readFileBase64: (path) => ipcRenderer.invoke('fs:readFileBase64', path),
    writeFileBase64: (path, base64) => ipcRenderer.invoke('fs:writeFileBase64', path, base64),
    ensureDir: (path) => ipcRenderer.invoke('fs:ensureDir', path),
    exists: (path) => ipcRenderer.invoke('fs:exists', path),
    stat: (path) => ipcRenderer.invoke('fs:stat', path),
    remove: (path) => ipcRenderer.invoke('fs:remove', path)
  },
  font: {
    listInstalled: (force?: boolean) => ipcRenderer.invoke('font:listInstalled', force),
    isInstalled: (family, style) => ipcRenderer.invoke('font:isInstalled', family, style),
    matchInstalled: (list, family, style) =>
      ipcRenderer.invoke('font:matchInstalled', list, family, style)
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
    open: (options) => ipcRenderer.send('window:open', options),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChanged: (callback: (maximized: boolean) => void) => {
      const listener = (_e: unknown, v: boolean) => callback(v);
      ipcRenderer.on('window:maximize-changed', listener);
      return () => ipcRenderer.removeListener('window:maximize-changed', listener);
    }
  },
  theme: {
    set: (darkMode: boolean, themeColor: string) =>
      ipcRenderer.send('theme:set', { darkMode, themeColor }),
    onChanged: (callback: (payload: { darkMode: boolean; themeColor: string }) => void) => {
      const listener = (_e: unknown, payload: { darkMode: boolean; themeColor: string }) => callback(payload);
      ipcRenderer.on('theme:changed', listener);
      return () => ipcRenderer.removeListener('theme:changed', listener);
    }
  }
};

contextBridge.exposeInMainWorld('api', api);

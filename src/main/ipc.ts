import { ipcMain, dialog, shell, app, BrowserWindow, nativeTheme } from 'electron';
import { processImage } from './image';
import { openWindow, getZoomFactor, setZoomFactor, hasWindowMaterial, refreshAcrylicVibrancy } from './windows';
import { getOpenAtLogin, setOpenAtLogin } from './system';
import {
  scanDirectory,
  readFileBase64,
  writeFileBase64,
  ensureDir,
  fileExists,
  fileStat,
  removeFile
} from './fs';
import { checkForUpdates, downloadUpdate, quitAndInstall } from './updater';
import { listInstalledFonts, isFontInstalled, matchInstalled } from './fonts';
import type {
  ImageProcessPayload,
  ImageProcessResult,
  SelectFileOptions
} from '../shared/types';

export function registerIpc(): void {
  ipcMain.handle('app:version', () => app.getVersion());
  // 同步通道：渲染进程首帧就需要知道是否启用系统材质（决定页面背景是否全透明）
  ipcMain.on('app:windowMaterial', (e) => {
    e.returnValue = hasWindowMaterial();
  });
  ipcMain.handle('app:isPackaged', () => app.isPackaged);
  ipcMain.handle('app:openAtLogin', () => getOpenAtLogin());
  ipcMain.handle('app:setOpenAtLogin', (_e, open: boolean) => setOpenAtLogin(open));
  ipcMain.handle('app:zoomFactor', () => getZoomFactor());
  ipcMain.handle('app:setZoomFactor', (_e, factor: number) => setZoomFactor(Number(factor)));
  ipcMain.handle('app:appDataPath', () => app.getPath('userData'));

  ipcMain.handle('dialog:selectFile', async (_e, options: SelectFileOptions): Promise<string[] | null> => {
    const result = await dialog.showOpenDialog({
      title: options.title ?? '选择文件',
      defaultPath: options.defaultPath,
      filters: options.filters,
      properties: ['openFile', ...(options.multiSelections ? (['multiSelections'] as const) : [])]
    });
    return result.canceled ? null : result.filePaths;
  });

  ipcMain.handle('dialog:selectDirectory', async (_e, defaultPath?: string): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '选择文件夹',
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url);
  });
  ipcMain.handle('shell:showItemInFolder', (_e, fullPath: string) => {
    shell.showItemInFolder(fullPath);
  });
  // 用系统默认程序打开：字体文件会调起 Windows 字体预览/安装器
  ipcMain.handle('shell:openPath', (_e, fullPath: string) => {
    return shell.openPath(fullPath);
  });

  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.quit();
  });

  const senderWindow = (e: Electron.IpcMainInvokeEvent): BrowserWindow | null =>
    BrowserWindow.fromWebContents(e.sender);

  ipcMain.on('window:minimize', (e) => senderWindow(e)?.minimize());
  ipcMain.on('window:maximize', (e) => {
    const w = senderWindow(e);
    if (!w) return;
    w.isMaximized() ? w.unmaximize() : w.maximize();
  });
  ipcMain.on('window:close', (e) => senderWindow(e)?.close());
  ipcMain.handle('window:isMaximized', (e) => senderWindow(e)?.isMaximized() ?? false);

  ipcMain.on('window:open', (_e, options: { route?: string; key?: string }) => {
    openWindow(options);
  });

  // 跨窗口主题同步：将主题变更广播给除发送者外的所有窗口
  ipcMain.on(
    'theme:set',
    (e, payload: { darkMode: boolean; themeColor: string }) => {
      const sender = BrowserWindow.fromWebContents(e.sender);
      // macOS 玻璃材质的外观跟随窗口的 NSAppearance：
      // 应用切深色时必须同步系统外观，否则玻璃仍是亮色、与页面内容冲突
      nativeTheme.themeSource = payload.darkMode ? 'dark' : 'light';
      // 旧系统（Win10）的第三方毛玻璃色调需要同步刷新
      refreshAcrylicVibrancy();
      for (const win of BrowserWindow.getAllWindows()) {
        if (win === sender || win.isDestroyed()) continue;
        win.webContents.send('theme:changed', payload);
      }
    }
  );

  ipcMain.handle('image:process', async (_e, payload: ImageProcessPayload): Promise<ImageProcessResult> => {
    return processImage(payload);
  });

  ipcMain.handle('fs:scanDirectory', (_e, root: string, extensions: string[]) => scanDirectory(root, extensions));
  ipcMain.handle('fs:readFileBase64', (_e, path: string) => readFileBase64(path));
  ipcMain.handle('fs:writeFileBase64', (_e, path: string, base64: string) => writeFileBase64(path, base64));
  ipcMain.handle('fs:ensureDir', (_e, path: string) => ensureDir(path));
  ipcMain.handle('fs:exists', (_e, path: string) => fileExists(path));
  ipcMain.handle('fs:stat', (_e, path: string) => fileStat(path));
  ipcMain.handle('fs:remove', (_e, path: string) => removeFile(path));

  // 系统字体：直接读注册表/字体目录，不受 Chromium 字体缓存影响
  ipcMain.handle('font:listInstalled', (_e, force?: boolean) => listInstalledFonts(!!force));
  ipcMain.handle('font:isInstalled', (_e, family: string, style?: string) =>
    isFontInstalled(family, style)
  );
  ipcMain.handle('font:matchInstalled', (_e, list: { family: string; style: string }[], family: string, style?: string) =>
    matchInstalled(list ?? [], family, style)
  );

  ipcMain.handle('updater:check', () => checkForUpdates());
  ipcMain.handle('updater:download', () => downloadUpdate());
  ipcMain.handle('updater:quitAndInstall', () => quitAndInstall());
}

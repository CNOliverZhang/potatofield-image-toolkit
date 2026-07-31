import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import { processImage } from './image';
import {
  scanDirectory,
  readFileBase64,
  writeFileBase64,
  ensureDir,
  fileExists,
  fileStat
} from './fs';
import { checkForUpdates, downloadUpdate, quitAndInstall } from './updater';
import type {
  ImageProcessPayload,
  ImageProcessResult,
  SelectFileOptions
} from '../shared/types';

export function registerIpc(): void {
  ipcMain.handle('app:version', () => app.getVersion());
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

  ipcMain.handle('image:process', async (_e, payload: ImageProcessPayload): Promise<ImageProcessResult> => {
    return processImage(payload);
  });

  ipcMain.handle('fs:scanDirectory', (_e, root: string, extensions: string[]) => scanDirectory(root, extensions));
  ipcMain.handle('fs:readFileBase64', (_e, path: string) => readFileBase64(path));
  ipcMain.handle('fs:writeFileBase64', (_e, path: string, base64: string) => writeFileBase64(path, base64));
  ipcMain.handle('fs:ensureDir', (_e, path: string) => ensureDir(path));
  ipcMain.handle('fs:exists', (_e, path: string) => fileExists(path));
  ipcMain.handle('fs:stat', (_e, path: string) => fileStat(path));

  ipcMain.handle('updater:check', () => checkForUpdates());
  ipcMain.handle('updater:download', () => downloadUpdate());
  ipcMain.handle('updater:quitAndInstall', () => quitAndInstall());
}

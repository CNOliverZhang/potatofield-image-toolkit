import { autoUpdater } from 'electron-updater';
import { getWindows } from './windows';
import type { UpdaterStatus } from '../shared/types';

autoUpdater.autoDownload = false;
autoUpdater.allowDowngrade = false;

function broadcast(status: UpdaterStatus): void {
  for (const win of getWindows().values()) {
    if (!win.isDestroyed()) win.webContents.send('updater:status', status);
  }
}

export function initUpdater(): void {
  autoUpdater.on('checking-for-update', () => broadcast({ event: 'checking' }));
  autoUpdater.on('update-available', (info) => broadcast({ event: 'available', data: info }));
  autoUpdater.on('update-not-available', (info) => broadcast({ event: 'not-available', data: info }));
  autoUpdater.on('download-progress', (progress) => broadcast({ event: 'progress', data: progress }));
  autoUpdater.on('update-downloaded', (info) => broadcast({ event: 'downloaded', data: info }));
  autoUpdater.on('error', (err) =>
    broadcast({ event: 'error', data: err?.message ?? String(err) })
  );
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(() => {});
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(() => {});
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

import { app, Tray, Menu, nativeImage } from 'electron';
import { openWindow, getWindows, resolveAppIcon } from './windows';
import { registerIpc } from './ipc';
import { initUpdater, checkForUpdates } from './updater';

try {
  if (require('electron-squirrel-startup')) app.quit();
} catch {
  /* 开发环境无此依赖可忽略 */
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let tray: Tray | null = null;

function createTray(): void {
  const iconPath = resolveAppIcon().replace(/icon\.ico$/, 'icon.png');
  let image: Electron.NativeImage;
  try {
    image = nativeImage.createFromPath(iconPath);
  } catch {
    image = nativeImage.createEmpty();
  }
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  tray.setToolTip('洋芋田图像工具箱');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开主窗口', click: () => openWindow({ key: 'main', route: '/' }) },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ])
  );
  tray.on('click', () => openWindow({ key: 'main', route: '/' }));
}

app.whenReady().then(() => {
  registerIpc();
  initUpdater();
  openWindow({ key: 'main', route: '/' });
  createTray();
  setTimeout(checkForUpdates, 3000);
});

app.on('second-instance', () => {
  const main = getWindows().get('main');
  if (main && !main.isDestroyed()) {
    if (main.isMinimized()) main.restore();
    main.focus();
  } else {
    openWindow({ key: 'main', route: '/' });
  }
});

app.on('window-all-closed', () => {});

app.on('activate', () => {
  openWindow({ key: 'main', route: '/' });
});

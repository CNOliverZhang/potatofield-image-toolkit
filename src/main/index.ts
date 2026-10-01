import { app, Tray, Menu, nativeImage, type MenuItemConstructorOptions } from 'electron';
import { openWindow, getWindows, resolveAppIcon } from './windows';
import { registerIpc } from './ipc';
import { initUpdater, checkForUpdates } from './updater';
// 工具清单是渲染进程的单一数据源（首页卡片/侧边栏都用它），托盘菜单直接复用，
// 保证入口名称与批量能力不会和界面不一致
import { tools } from '../renderer/consts/tools';

try {
  if (require('electron-squirrel-startup')) app.quit();
} catch {
  /* 开发环境无此依赖可忽略 */
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let tray: Tray | null = null;

/**
 * 在主窗口内打开指定工具：主窗口已存在就复用并切路由（不再开新窗），
 * 否则新建主窗口并直接落在该工具页
 */
function openToolInMainWindow(route: string): void {
  const main = getWindows().get('main');
  if (main && !main.isDestroyed()) {
    if (main.isMinimized()) main.restore();
    main.focus();
    main.webContents.send('window:navigate', route);
    return;
  }
  openWindow({ key: 'main', route });
}

/** 批量工具：独立窗口打开（与界面里首页卡片的「批量处理」入口一致，按 route 去重） */
function openBatchWindow(route: string): void {
  openWindow({ key: route, route });
}

/** 托盘菜单里的工具项：支持批量的工具挂二级菜单，其余直接打开 */
function buildToolMenuItems(): MenuItemConstructorOptions[] {
  return tools.map((tool) => {
    if (tool.batchRoute) {
      return {
        label: tool.label,
        submenu: [
          { label: `打开${tool.label}`, click: () => openToolInMainWindow(tool.path) },
          { label: `${tool.label}（批量）`, click: () => openBatchWindow(tool.batchRoute as string) }
        ]
      };
    }
    return { label: tool.label, click: () => openToolInMainWindow(tool.path) };
  });
}

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
      ...buildToolMenuItems(),
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

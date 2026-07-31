import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { join } from 'path';

const windows = new Map<string, BrowserWindow>();

export interface OpenWindowOptions extends BrowserWindowConstructorOptions {
  route?: string;
  key?: string;
}

export function openWindow(options: OpenWindowOptions = {}): BrowserWindow {
  const { route = '/', key, ...rest } = options;
  const dedupKey = key ?? '';
  if (dedupKey && windows.has(dedupKey)) {
    const existing = windows.get(dedupKey)!;
    if (!existing.isDestroyed()) {
      existing.focus();
      return existing;
    }
    windows.delete(dedupKey);
  }

  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    ...rest
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${route}`);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route });
  }

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    if (dedupKey) windows.delete(dedupKey);
  });

  // 同步最大化状态给渲染进程（覆盖双击标题栏 / 系统贴靠等外部触发）
  win.on('maximize', () => win.webContents.send('window:maximize-changed', true));
  win.on('unmaximize', () => win.webContents.send('window:maximize-changed', false));

  if (dedupKey) windows.set(dedupKey, win);
  return win;
}

export function getWindows(): Map<string, BrowserWindow> {
  return windows;
}

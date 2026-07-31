import { app, BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

const windows = new Map<string, BrowserWindow>();

// 开发模式 electron-vite 将 preload 编译为 index.mjs，生产构建为 index.js，两者都要兼容
function resolvePreload(): string {
  const base = join(__dirname, '../preload/index');
  if (existsSync(base + '.mjs')) return base + '.mjs';
  return base + '.js';
}

// 应用图标：Windows 用 .ico（任务栏/窗口），其它平台用 .png
// 多候选路径回退，兼容 dev（项目根）/ 打包（resources）等不同运行位置
export function resolveAppIcon(): string {
  const name = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const candidates = [
    join(app.getAppPath(), 'build/icons', name),
    join(process.cwd(), 'build/icons', name),
    join(__dirname, '../icons', name)
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

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
    icon: resolveAppIcon(),
    show: false,
    webPreferences: {
      preload: resolvePreload(),
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

  // dev 模式自动打开 DevTools（独立窗口，方便定位样式/逻辑问题）
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

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

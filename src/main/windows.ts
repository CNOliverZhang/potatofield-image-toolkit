import { app, BrowserWindow, nativeTheme, type BrowserWindowConstructorOptions } from 'electron';

/**
 * Windows 旧系统（不支持原生 acrylic，即 Win11 22H2 以下，含 Win10）
 * 用 electron-acrylic-window 通过 SetWindowCompositionAttribute 实现毛玻璃。
 * 该库是 Windows 专用原生模块，在其它平台或未编译成功时不可用 —— 因此用可选依赖 +
 * 惰性 require，取不到就退回普通窗口（页面底色不透明，不会出现全透明窗口）。
 */
let AcrylicBrowserWindow: typeof BrowserWindow | null = null;
if (process.platform === 'win32' && !supportsAcrylic()) {
  try {
    AcrylicBrowserWindow = require('electron-acrylic-window').BrowserWindow as typeof BrowserWindow;
  } catch {
    AcrylicBrowserWindow = null;
  }
}

/** 是否启用了第三方毛玻璃（Win10 等旧系统） */
export function hasAcrylicLib(): boolean {
  return AcrylicBrowserWindow !== null;
}

/**
 * 毛玻璃色调（#RRGGBBAA，库支持自定义色值，见 getColorsFromTheme）：
 * 库预设 light/dark 的 alpha 仅 0x88（53%），Win10 白天模式下内容透得太狠、看不清。
 * 这里改为「带点白的磨砂 / 带点黑的磨砂」：
 *   浅色 #FAFAFA（近白）、深色 #1A1A1A（近黑），alpha 取 0x99（60%）：
 *   系统模糊底纹透出四成，毛玻璃质感明显。
 * 想更透 / 更实只调色值末尾两位即可 —— 实测档位：
 *   F2(95%) 过实、看不出玻璃感；E6(90%) 偏实；CC(80%) 磨砂感明显；
 *   99(60%) 更透（当前值）；88(53%) 库预设、白天模式下看不清内容。
 *   注意别取 00（等于完全透明）或 FF（完全无模糊）。
 */
const ACRYLIC_TINT = { light: '#fafafa99', dark: '#1a1a1a99' } as const;

/** 构建毛玻璃参数：Win10 1803(17134) 以上用亚克力，更早用经典模糊 */
function buildVibrancyOptions(): Record<string, unknown> {
  const build = process.platform === 'win32' ? Number(process.getSystemVersion().split('.')[2] ?? 0) : 0;
  return {
    theme: nativeTheme.shouldUseDarkColors ? ACRYLIC_TINT.dark : ACRYLIC_TINT.light,
    effect: build >= 17134 ? 'acrylic' : 'blur',
    // 窗口移动/缩放时由库自行刷新（Win10 亚克力必须，否则拖动后背景错位）
    useCustomWindowRefreshMethod: true,
    maximumRefreshRate: 30,
    disableOnBlur: false
  };
}
import { join } from 'path';
import { existsSync } from 'fs';
import { loadZoomFactor, saveZoomFactor } from './system';

const windows = new Map<string, BrowserWindow>();

/** 处于「程序化改尺寸」中的窗口：其 will-resize 不拦截（见 openWindow 内的说明） */
const programmaticResizeWindows = new WeakSet<BrowserWindow>();

/**
 * 以「程序化改尺寸」身份执行 fn：期间该窗口的 will-resize 不被拦截。
 * 用于窗口去重时恢复窗口位置等内部 setBounds 调用；最大化/还原走 maximize()/unmaximize()，
 * 本身不触发 will-resize，无需包一层。
 */
export function runWithProgrammaticResize<T>(win: BrowserWindow, fn: () => T): T {
  programmaticResizeWindows.add(win);
  // 放行窗口期稍长于同步调用，覆盖原生侧延迟派发的 resize
  setTimeout(() => programmaticResizeWindows.delete(win), 300);
  return fn();
}

/** 套用已保存的界面缩放；导航完成后缩放可能被重置，故补一次 */
function applyZoom(win: BrowserWindow): void {
  const apply = (): void => {
    if (!win.isDestroyed()) win.webContents.setZoomFactor(loadZoomFactor());
  };
  apply();
  win.webContents.on('did-finish-load', apply);
}

export function getZoomFactor(): number {
  return loadZoomFactor();
}

/** 修改界面缩放：持久化后立即作用到所有已打开的窗口 */
export function setZoomFactor(factor: number): number {
  saveZoomFactor(factor);
  for (const win of windows.values()) {
    if (!win.isDestroyed()) win.webContents.setZoomFactor(factor);
  }
  return factor;
}

// 开发模式 electron-vite 将 preload 编译为 index.mjs，生产构建为 index.js，两者都要兼容
function resolvePreload(): string {
  const base = join(__dirname, '../preload/index');
  if (existsSync(base + '.mjs')) return base + '.mjs';
  return base + '.js';
}

// 应用图标：Windows 用 .ico（任务栏/窗口），其它平台用 .png
// 多候选路径回退，兼容 dev（项目根）/ 打包（resources）等不同运行位置。
// 打包后图标由 electron-builder 的 extraResources 拷到 resources/icons
// （build.files 白名单只放 out 与 package.json，所以必须走 extraResources）
export function resolveAppIcon(): string {
  const name = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const candidates = [
    join(process.resourcesPath, 'icons', name),
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

  const Ctor = AcrylicBrowserWindow ?? BrowserWindow;
  const win = new Ctor({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    // macOS：隐藏标题栏但保留系统红绿灯，窗口控制交给系统；
    // Windows：无边框，窗口控制由右上角自绘按钮提供（见 WindowControls.vue）
    titleBarStyle: 'hidden',
    frame: false,
    // transparent 是 vibrancy（macOS）与 acrylic（Windows）生效的前提
    transparent: true,
    backgroundColor: '#00000000',
    // 系统窗口材质：macOS 玻璃质感 / Windows 11 亚克力（其余平台不支持，保持普通窗口）
    // 注意：vibrancy 的 light/dark/appearance-based 等旧值已被 Apple 移除，只能用位置类取值
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window' as const } : {}),
    // 材质始终活跃（默认跟随窗口焦点，失焦时会变淡）
    ...(process.platform === 'darwin' ? { visualEffectState: 'active' as const } : {}),
    // Windows 11 22H2 以上：系统材质由 DWM 画在「整个窗口矩形」上（含非客户区），
    // 并且 DWM 不提供透明度调节 —— 可读性只能由页面叠一层半透明底色解决（见 global.css）。
    // 材质用 acrylic（亚克力，模糊壁纸+背景窗口，质感与 Win10 库的 acrylic 档一致）；
    // 通透度通过页面的 --material-tint-alpha 控制，取值对齐 Win10 库的 0x99（60%）
    ...(supportsAcrylic() ? { backgroundMaterial: 'acrylic' as const } : {}),
    // 旧系统（Win10 等）：交给第三方库做毛玻璃
    ...(AcrylicBrowserWindow ? { vibrancy: buildVibrancyOptions() } : {}),
    icon: resolveAppIcon(),
    show: false,
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    ...rest
    // vibrancy / visualEffectState / backgroundMaterial 在类型定义里未完全覆盖，按需断言
  } as BrowserWindowConstructorOptions);

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${route}`);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route });
  }

  applyZoom(win);

  // 先 show 再 focus：从工具页打开独立窗口（如模板编辑）时，
  // macOS 上仅 show 不一定把新窗口带到前台，表现为「点了却还是主窗口在前」
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

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

  // 禁止用户拖拽调整窗口大小（产品形态固定尺寸，只能在默认/最大化之间切换）。
  // 不能直接 resizable: false —— 那会连带禁用 Windows 的最大化按钮和 macOS 的绿灯；
  // 因此保持 resizable，把「用户拖拽」触发的 will-resize 全部拦截：
  // 最大化 / 还原走 maximize() / unmaximize()（程序化改尺寸不触发 will-resize），
  // 其它程序化调用（窗口去重时的 setBounds 等）经 runWithProgrammaticResize 放行兜底。
  win.on('will-resize', (event) => {
    if (programmaticResizeWindows.has(win) || win.isMaximized()) return;
    event.preventDefault();
  });

  if (dedupKey) windows.set(dedupKey, win);
  return win;
}

export function getWindows(): Map<string, BrowserWindow> {
  return windows;
}

/**
 * 当前系统是否支持亚克力材质：
 * acrylic 是 Windows 11 22H2（build 22621）才有的系统材质，Win10 上设置无效；
 * 而窗口本身是 transparent 的，一旦页面又全透明就会变成完全透明（直接透出桌面）。
 */
export function supportsAcrylic(): boolean {
  if (process.platform !== 'win32') return false;
  const parts = process.getSystemVersion().split('.');
  return Number(parts[2] ?? 0) >= 22621;
}

/** 当前窗口是否启用了系统材质（渲染进程据此决定是否让页面背景全透明） */
export function hasWindowMaterial(): boolean {
  return process.platform === 'darwin' || supportsAcrylic() || hasAcrylicLib();
}

/** 主题切换后更新第三方毛玻璃的色调（Win10 等旧系统） */
export function refreshAcrylicVibrancy(): void {
  if (!AcrylicBrowserWindow) return;
  try {
    const options = buildVibrancyOptions();
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue;
      // 必须用「实例方法」win.setVibrancy()：
      // 库导出的 setVibrancy(win, opts) 会把 vibrnacyConfig.currentOpacity 重置为 0，
      // 而原生层正是拿 currentOpacity 当色调 alpha —— 结果就是材质变回完全透明。
      // 实例方法会先把 colors.a（色值里的 alpha）同步进 currentOpacity 再下发。
      const apply = (win as unknown as { setVibrancy?: (o: unknown) => void }).setVibrancy;
      if (typeof apply === 'function') {
        apply.call(win, options);
      } else {
        const { setVibrancy } = require('electron-acrylic-window');
        setVibrancy(win, options);
      }
    }
  } catch {
    /* 库不可用时忽略，窗口保持普通底色 */
  }
}

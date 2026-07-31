import { BrowserWindow, screen } from 'electron';
import { createRequire } from 'node:module';

// 该原生包为 CJS（含 win32-x64 预编译 .node），主进程产物为 ESM，
// 故用 createRequire 加载。必须 external，不可被 Rollup 打包进 bundle。
const require = createRequire(import.meta.url);
const glassLib = require('@hicccc77/electron-liquid-glass') as {
  isSupported(): boolean;
  createPanel(opts: Record<string, unknown>): {
    show(fadeMs?: number): void;
    hide(fadeMs?: number): void;
    destroy(): void;
    setBounds(bounds: { x: number; y: number; width: number; height: number }): void;
  } | null;
};

let supported = false;
try {
  supported = !!glassLib && typeof glassLib.isSupported === 'function' && glassLib.isSupported();
} catch {
  supported = false;
}

export function isGlassSupported(): boolean {
  return supported;
}

/**
 * 为窗口创建并维护一个原生液态玻璃面板（Windows 专用）。
 *
 * 原理：通过 DXGI 桌面复制 + D3D11 实时折射桌面，生成一块独立原生窗口，
 * 钉在该 Electron 窗口正下方作为真正的玻璃背景（含模糊 / 透镜位移 / 色散）。
 * Electron 透明窗口只负责绘制玻璃“表面”装饰（高光 / 描边 / 着色 / 文字）。
 *
 * 非 Windows 或后端不可用时自动跳过，由 CSS glassmorphism 作为回退方案。
 *
 * @param win 已创建、transparent:true 的 BrowserWindow
 */
export function attachGlass(win: BrowserWindow): void {
  if (!supported) return;

  // 屏幕坐标 → 物理像素：Electron 逻辑坐标 × 所在显示器 dpr
  const toPhysical = (): { x: number; y: number; width: number; height: number } => {
    const b = win.getBounds();
    const disp = screen.getDisplayMatching(b) ?? screen.getPrimaryDisplay();
    const dpr = disp.scaleFactor || 1;
    return {
      x: Math.round(b.x * dpr),
      y: Math.round(b.y * dpr),
      width: Math.round(b.width * dpr),
      height: Math.round(b.height * dpr)
    };
  };

  const dpr = (screen.getDisplayMatching(win.getBounds()) ?? screen.getPrimaryDisplay()).scaleFactor || 1;

  const panel = glassLib.createPanel({
    ...toPhysical(),
    cornerRadius: 14 * dpr, // 与 CSS .layout 圆角（14px 逻辑）对齐
    blurSigma: 6,
    displacementScale: 70, // 边缘透镜位移（液态玻璃标志性效果）
    aberrationIntensity: 1.8, // 轻微 RGB 色散
    saturation: 1.4,
    dpr,
    anchorWindow: win // 将面板 z 序钉在窗口正下方
  });
  if (!panel) return;

  panel.show(150);

  const syncBounds = () => panel.setBounds(toPhysical());
  win.on('move', syncBounds);
  win.on('resize', syncBounds);
  win.on('minimize', () => panel.hide(150));
  win.on('restore', () => panel.show(150));
  win.on('closed', () => {
    win.removeListener('move', syncBounds);
    win.removeListener('resize', syncBounds);
    try {
      panel.destroy();
    } catch {
      /* 面板可能已随进程退出销毁 */
    }
  });

  // 通知渲染进程：真实折射由原生面板提供，CSS 改用更轻量的表面着色
  const markNative = () =>
    win.webContents
      .executeJavaScript('document.documentElement.dataset.nativeGlass = "true"')
      .catch(() => {});
  win.webContents.on('did-finish-load', markNative);
  if (win.webContents.getURL()) markNative(); // 页面已加载则立即标记
}

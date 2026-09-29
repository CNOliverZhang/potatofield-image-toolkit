import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 与窗口无关的系统级设置：开机启动、界面缩放。
 *
 * 缩放值单独存一份到用户数据目录——渲染进程的 Pinia 持久化（localStorage）
 * 主进程读不到，而新开的窗口需要在创建时就知道该用多少缩放。
 */

interface SystemSettings {
  zoomFactor?: number;
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'system-settings.json');
}

function read(): SystemSettings {
  try {
    const file = settingsPath();
    if (!existsSync(file)) return {};
    return JSON.parse(readFileSync(file, 'utf8')) as SystemSettings;
  } catch {
    return {};
  }
}

function write(next: SystemSettings): void {
  try {
    writeFileSync(settingsPath(), JSON.stringify(next));
  } catch {
    /* 写入失败时忽略，缩放退化为「当前会话有效」 */
  }
}

export function loadZoomFactor(): number {
  const value = Number(read().zoomFactor ?? 1);
  return Number.isFinite(value) && value >= 0.5 && value <= 3 ? value : 1;
}

export function saveZoomFactor(factor: number): void {
  write({ ...read(), zoomFactor: factor });
}

/** 是否随系统开机启动 */
export function getOpenAtLogin(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

export function setOpenAtLogin(open: boolean): void {
  app.setLoginItemSettings({ openAtLogin: open });
}

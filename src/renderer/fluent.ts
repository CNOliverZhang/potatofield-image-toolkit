import * as Fluent from '@fluentui/web-components';
import {
  provideFluentDesignSystem,
  baseLayerLuminance,
  StandardLuminance,
  accentBaseColor,
  SwatchRGB
} from '@fluentui/web-components';

// 自动发现并注册所有 fluent-* 组件工厂（微软官方 Fluent UI Web Components）
const factories: unknown[] = [];
for (const key of Object.keys(Fluent)) {
  if (!key.startsWith('fluent')) continue;
  const fn = (Fluent as Record<string, unknown>)[key];
  if (typeof fn !== 'function') continue;
  try {
    const reg = (fn as () => { type?: unknown; definitions?: unknown })();
    if (reg && reg.type && reg.definitions) factories.push(reg);
  } catch {
    /* 非组件工厂，忽略 */
  }
}
const system = provideFluentDesignSystem(document.body);
for (const reg of factories) {
  try {
    system.register(reg as never);
  } catch {
    /* 个别组件注册失败不影响整体 */
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').padEnd(6, '0');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255
  };
}

/** 将明暗模式与主题色应用到 Fluent 设计令牌（驱动所有 fluent-* 组件外观） */
export function applyFluentTheme(dark: boolean, accentHex: string): void {
  baseLayerLuminance.setValueFor(document.body, dark ? StandardLuminance.DarkMode : StandardLuminance.LightMode);
  const { r, g, b } = hexToRgb(accentHex || '#0f6cbd');
  accentBaseColor.setValueFor(document.body, SwatchRGB.create(r, g, b));
}

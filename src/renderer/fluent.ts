import { setTheme } from '@fluentui/web-components';
import { createDarkTheme, createLightTheme } from '@fluentui/tokens';
import type { BrandVariants } from '@fluentui/tokens';

// 按需注册项目实际使用的 Fluent 组件（必须，否则 <fluent-*> 标签为未定义元素）。
// 注意：不要改用 define-all —— 它会连 fluent-dialog 一起注册，而
// AppDialog.vue 依赖的是「未注册的 fluent-dialog 标签 + 自绘样式」这一行为。
import '@fluentui/web-components/button/define.js';
import '@fluentui/web-components/dropdown/define.js';
import '@fluentui/web-components/listbox/define.js';
import '@fluentui/web-components/option/define.js';
import '@fluentui/web-components/text-input/define.js';
import '@fluentui/web-components/slider/define.js';
import '@fluentui/web-components/checkbox/define.js';
import '@fluentui/web-components/switch/define.js';
import '@fluentui/web-components/tablist/define.js';
import '@fluentui/web-components/tab/define.js';

const DEFAULT_ACCENT = '#0f6cbd';

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * 由用户所选主题色生成 Fluent 品牌色阶（10 最暗 … 160 最亮）。
 * 亮色主题的主色取 brand[80]、暗色主题取 brand[100]（createLight/DarkTheme 的取用约定），
 * 这里把 brand[80] 精确放在所选色上，保证亮色模式下主按钮等元素与所选主题色完全一致。
 */
function buildBrandVariants(hex: string): BrandVariants {
  const { h, s, l } = hexToHsl(hex);
  const shades = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];
  const i80 = shades.indexOf(80);
  const out: Record<number, string> = {};
  shades.forEach((shade, i) => {
    const t = i / (shades.length - 1);
    // 以所选色明度为中心的斜坡；暗端少降饱和、亮端明显降饱和（贴近 Fluent 品牌斜坡观感）
    const li = Math.min(0.985, Math.max(0.08, l + (t - i80 / (shades.length - 1)) * 0.72));
    const si = Math.max(0.18, s * (1 - Math.max(0, t - i80 / (shades.length - 1)) * 0.75));
    out[shade] = hslToHex(h, si, li);
  });
  out[80] = hex; // 主色精确等于所选色
  return out as BrandVariants;
}

/** 将明暗模式与主题色应用到 Fluent 设计令牌（驱动所有 fluent-* 组件外观） */
export function applyFluentTheme(dark: boolean, accentHex: string): void {
  const accent = accentHex || DEFAULT_ACCENT;
  const brand = buildBrandVariants(accent);
  setTheme(dark ? createDarkTheme(brand) : createLightTheme(brand));
  // 应用级变量：v3 不再有 accentBaseColor 注入，--accent-base-color 由应用自行维护
  // （global.css 与各页面共 41 处直引主题色，取值必须与设置页所选色完全一致）
  document.body.style.setProperty('--accent-base-color', accent);
}

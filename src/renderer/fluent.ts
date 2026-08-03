import {
  provideFluentDesignSystem,
  baseLayerLuminance,
  StandardLuminance,
  accentBaseColor,
  SwatchRGB,
  // 显式导入项目中实际使用的 Fluent 组件
  fluentButton,
  fluentTextField,
  fluentSlider,
  fluentSelect,
  fluentOption,
  fluentCheckbox,
  fluentSwitch
} from '@fluentui/web-components';

// 将所有用到的 Fluent 组件注册到设计系统（必须，否则 <fluent-*> 标签为空未定义元素）
provideFluentDesignSystem(document.body).register(
  fluentButton(),
  fluentTextField(),
  fluentSlider(),
  fluentSelect(),
  fluentOption(),
  fluentCheckbox(),
  fluentSwitch()
);

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

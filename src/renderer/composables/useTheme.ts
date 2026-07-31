import { watch } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { applyFluentTheme } from '@renderer/fluent';

export function applyTheme(): void {
  const settings = useSettingsStore();
  const root = document.documentElement;
  root.style.setProperty('--main-color', settings.themeColor);
  root.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  // 同步到 Fluent UI 设计令牌（驱动所有 fluent-* 组件外观）
  applyFluentTheme(settings.darkMode, settings.themeColor);
}

export function useTheme(): void {
  const settings = useSettingsStore();
  watch(
    () => [settings.themeColor, settings.darkMode],
    () => applyTheme(),
    { immediate: true }
  );
}

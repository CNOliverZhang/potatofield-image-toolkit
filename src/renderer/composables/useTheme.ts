import { watch } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';

export function applyTheme(): void {
  const settings = useSettingsStore();
  const root = document.documentElement;
  root.style.setProperty('--main-color', settings.themeColor);
  if (settings.darkMode) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

export function useTheme(): void {
  const settings = useSettingsStore();
  watch(
    () => [settings.themeColor, settings.darkMode],
    () => applyTheme(),
    { immediate: true }
  );
}

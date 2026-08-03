import { watch } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { applyFluentTheme } from '@renderer/fluent';

/** 将当前主题应用到文档（深色模式 data-theme + Fluent 强调色） */
export function applyTheme(): void {
  const settings = useSettingsStore();
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  applyFluentTheme(settings.darkMode, settings.themeColor);
}

// 跨窗口主题同步：任意窗口（含独立窗口）切换深色模式/主题色后，
// 通过主进程广播给其它窗口，使其实时响应。参考 richtext-editor 的跨窗口共享思路。
let applyingRemote = false;
let ready = false;

export function useTheme(): void {
  const settings = useSettingsStore();

  // 本地主题变化时：立即应用，并广播给其它窗口（首帧初始化不广播）
  watch(
    () => [settings.themeColor, settings.darkMode],
    () => {
      applyTheme();
      if (ready && !applyingRemote) {
        window.api.theme.set(settings.darkMode, settings.themeColor);
      }
    },
    { immediate: true, flush: 'sync' }
  );

  ready = true;

  // 收到其它窗口的主题变更：更新本地状态（同步触发上面的 watcher 应用，但受 applyingRemote 保护不回环广播）
  window.api.theme.onChanged(({ darkMode, themeColor }) => {
    applyingRemote = true;
    settings.darkMode = darkMode;
    settings.themeColor = themeColor;
    applyingRemote = false;
  });
}

import { watch } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { applyFluentTheme } from '@renderer/fluent';

/** 系统当前是否为深色（Electron 中 prefers-color-scheme 跟随 nativeTheme，含 themeSource=system 时跟随 OS） */
function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 按偏好模式推导当前生效的深色状态 */
export function effectiveDark(themeMode: 'system' | 'light' | 'dark'): boolean {
  return themeMode === 'system' ? systemPrefersDark() : themeMode === 'dark';
}

/** 将当前主题应用到文档（深色模式 data-theme + Fluent 强调色），并把生效值回写 darkMode 供兼容读取 */
export function applyTheme(): void {
  const settings = useSettingsStore();
  const dark = effectiveDark(settings.themeMode);
  settings.darkMode = dark;
  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  applyFluentTheme(dark, settings.themeColor);
}

// 跨窗口主题同步：任意窗口（含独立窗口）切换颜色模式/主题色后，
// 通过主进程广播给其它窗口，使其实时响应。参考 richtext-editor 的跨窗口共享思路。
let applyingRemote = false;
let ready = false;

function syncPayload() {
  const settings = useSettingsStore();
  return {
    mode: settings.themeMode,
    darkMode: effectiveDark(settings.themeMode),
    themeColor: settings.themeColor
  };
}

export function useTheme(): void {
  const settings = useSettingsStore();

  // 本地主题变化时：立即应用，并广播给其它窗口（首帧初始化不广播）
  watch(
    () => [settings.themeColor, settings.themeMode],
    () => {
      applyTheme();
      if (ready && !applyingRemote) {
        window.api.theme.set(syncPayload());
      }
    },
    { immediate: true, flush: 'sync' }
  );

  ready = true;

  // 启动时同步一次给主进程：首帧的 watcher 是「不广播」的，
  // 而主进程需要据此设置 nativeTheme（macOS 玻璃材质的外观跟随窗口 NSAppearance）。
  // 少了这一步，持久化保存的深色模式在启动时玻璃仍是亮色。
  window.api.theme.set(syncPayload());

  // 跟随系统时：系统颜色模式变化（含用户在系统中切换、以及日出日落自动切换）实时响应。
  // Electron 里 prefers-color-scheme 会跟随 nativeTheme —— themeSource 为 system 时即反映 OS 设置。
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useSettingsStore().themeMode === 'system') applyTheme();
  });

  // 收到其它窗口的主题变更：更新本地状态（同步触发上面的 watcher 应用，但受 applyingRemote 保护不回环广播）
  window.api.theme.onChanged(({ mode, darkMode, themeColor }) => {
    applyingRemote = true;
    settings.themeMode = mode;
    settings.darkMode = darkMode;
    settings.themeColor = themeColor;
    applyingRemote = false;
  });
}

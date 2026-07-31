import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 跟踪主窗口是否处于最大化状态，并同步到 <html data-maximized>，
 * 供 CSS 在最大化时取消悬浮内边距 / 阴影 / 圆角。
 */
const maximized = ref(false);

export function useWindowState() {
  let unsubscribe: (() => void) | undefined;

  function sync() {
    document.documentElement.dataset.maximized = maximized.value ? 'true' : 'false';
  }

  onMounted(async () => {
    try {
      maximized.value = await window.api.window.isMaximized();
      sync();
    } catch {
      /* ignore */
    }
    try {
      unsubscribe = window.api.window.onMaximizeChanged((v) => {
        maximized.value = v;
        sync();
      });
    } catch {
      /* ignore */
    }
  });

  onUnmounted(() => unsubscribe?.());

  function toggleMax() {
    window.api.window.maximize();
    // 状态由 maximize-changed 事件修正（覆盖双击标题栏等外部最大化）
    setTimeout(async () => {
      try {
        maximized.value = await window.api.window.isMaximized();
        sync();
      } catch {
        /* ignore */
      }
    }, 120);
  }

  return { maximized, toggleMax };
}

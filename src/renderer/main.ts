import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import './fluent'; // 注册微软官方 Fluent UI Web Components 并设置主题 API
import App from './App.vue';
import router from './router';
import './styles/global.css';

library.add(fas, far);

// macOS 与 Windows 的窗口观感差异较大（macOS 自带圆角、阴影与红绿灯，
// Windows 需要靠透明余量 + 自绘卡片边框阴影模拟），
// 这里提前在 <html> 上标记平台，供 CSS 做差异化处理
const platform = navigator.platform.toLowerCase();
document.documentElement.setAttribute(
  'data-platform',
  platform.includes('mac') ? 'mac' : platform.includes('win') ? 'win' : 'other',
);

// 是否启用了系统窗口材质（macOS vibrancy / Windows acrylic）：
// 有材质时窗口底色改为半透明，让毛玻璃/亚克力透出来；不支持的平台保持不透明，
// 否则会直接透出桌面内容，既难看又影响文字可读性
// 由主进程判断（Windows 需精确到 22H2 以上才支持 acrylic）
const hasWindowMaterial = window.api.app.windowMaterial;
document.documentElement.dataset.material = hasWindowMaterial ? 'on' : 'off';

// 全局关闭 Fluent tablist 的方向键切换（含 Home/End，它们同样会换 tab）：
// 侧边导航与工具内的 tab 都改为「只点击切换」，避免焦点移动与页面状态不一致带来的困惑。
// 在捕获阶段拦截并阻断传播，事件就到不了 tablist 自身的 keydown 处理器。
const TAB_NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
document.addEventListener(
  'keydown',
  (e) => {
    if (!TAB_NAV_KEYS.includes(e.key)) return;
    // 两种判定都要有：
    // ① composedPath —— 焦点在 tablist 内部时（closest 跨不过影子边界）
    // ② activeElement —— 焦点未真正落到 tab 上时事件 target 会是 body，
    //    而 FAST 的按键处理器挂在 document 层，仅靠路径判定会漏掉这种情况
    const inTablist = (e.composedPath?.() ?? []).some(
      (node) => (node as HTMLElement).tagName === 'FLUENT-TABLIST'
    );
    const active = document.activeElement as HTMLElement | null;
    const activeInTablist = !!active?.closest?.('fluent-tablist') || active?.tagName === 'FLUENT-TAB';
    if (inTablist || activeInTablist) {
      // stopPropagation 只阻断向下/向上传递，拦不住同一节点上的其它监听器；
      // FAST 的按键处理器与本监听器同在 document 层，必须用 stopImmediatePropagation
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true
);

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');

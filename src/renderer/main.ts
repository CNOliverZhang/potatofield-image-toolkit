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

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');

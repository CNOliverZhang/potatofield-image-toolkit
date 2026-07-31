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

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.component('font-awesome-icon', FontAwesomeIcon);

app.mount('#app');

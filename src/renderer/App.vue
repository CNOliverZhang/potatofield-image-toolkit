<template>
  <router-view />
  <ToastHost />
  <AppDialog />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from './composables/useTheme';
import { useSettingsStore } from './stores/settings';
import type { TemplateApplyPayload, TemplateStoreData } from '@shared/types';
import { useMessagesStore } from './stores/messages';
import { registerClient, getPlatform } from './composables/useOnlineApi';
import { startUpdaterWatcher } from './composables/useUpdater';
import ToastHost from './components/ToastHost.vue';
import AppDialog from './components/AppDialog.vue';

useTheme();

// 独立模板窗口发出的「应用/编辑模板」：由本窗口（主窗口）载入参数并跳转到对应工具，
// 模板窗口自身不跳转，以保持独立窗口语义与主窗口单例
const router = useRouter();
const applySettings = useSettingsStore();
window.api.template.onApplied((payload: TemplateApplyPayload) => {
  applySettings.setToolParams('watermarkPending', payload as unknown as Record<string, unknown>);
  router.push('/watermark');
});

// 模板库变更：主进程持有权威数据，写入后推全量给所有窗口，直接采用即可
window.api.template.onChanged((data: TemplateStoreData) => {
  useSettingsStore().applyTemplateStore(data);
});

// 托盘菜单点击工具入口：主进程让本窗口切到该工具页（主窗口已存在时不会再开新窗）
window.api.window.onNavigate((route: string) => {
  if (route && route !== router.currentRoute.value.path) router.push(route);
});

onMounted(async () => {
  const settings = useSettingsStore();
  const messages = useMessagesStore();
  // 接管更新流程：主进程启动 3 秒后的自动检查若发现新版本，在任何页面都能弹出提示
  //（此前监听只在设置页，首页启动时「available」事件无人处理，表现为从不提示更新）
  startUpdaterWatcher();
  // 模板库由主进程持有：启动时拉一份，之后靠 template:updated 推送保持同步
  await settings.loadTemplates();
  const identifier = settings.ensureIdentifier();
  const version = await window.api.app.version();
  registerClient({ identifier, version, platform: getPlatform() }).catch(() => {});
  messages.loadMessages().catch(() => {});
});
</script>

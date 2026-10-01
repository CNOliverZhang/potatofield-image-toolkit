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

onMounted(async () => {
  const settings = useSettingsStore();
  const messages = useMessagesStore();
  // 模板库由主进程持有：启动时拉一份，之后靠 template:updated 推送保持同步
  await settings.loadTemplates();
  const identifier = settings.ensureIdentifier();
  const version = await window.api.app.version();
  registerClient({ identifier, version, platform: getPlatform() }).catch(() => {});
  messages.loadMessages().catch(() => {});
});
</script>

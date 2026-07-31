<template>
  <router-view />
  <ToastHost />
  <AppDialog />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTheme } from './composables/useTheme';
import { useSettingsStore } from './stores/settings';
import { useMessagesStore } from './stores/messages';
import { registerClient, getPlatform } from './composables/useOnlineApi';
import ToastHost from './components/ToastHost.vue';
import AppDialog from './components/AppDialog.vue';

useTheme();

onMounted(async () => {
  const settings = useSettingsStore();
  const messages = useMessagesStore();
  const identifier = settings.ensureIdentifier();
  const version = await window.api.app.version();
  registerClient({ identifier, version, platform: getPlatform() }).catch(() => {});
  messages.loadMessages().catch(() => {});
});
</script>

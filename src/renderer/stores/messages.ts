import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getMessageList, getLatestMessage } from '@renderer/composables/useOnlineApi';

export const useMessagesStore = defineStore('messages', () => {
  const list = ref<any[]>([]);
  const latest = ref<any>(null);
  const loading = ref(false);

  async function loadMessages(): Promise<void> {
    loading.value = true;
    try {
      list.value = await getMessageList();
      latest.value = await getLatestMessage();
    } catch {
      list.value = [];
      latest.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { list, latest, loading, loadMessages };
});

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getFontList, downloadFont } from '@renderer/composables/useOnlineApi';
import { useSettingsStore } from './settings';

export interface FontItem {
  id: number;
  name: string;
  previewImage?: string;
  fontFile?: string;
  [key: string]: unknown;
}

export const useFontsStore = defineStore('fonts', () => {
  const onlineFonts = ref<FontItem[]>([]);
  const loading = ref(false);
  const installed = ref<Record<number, boolean>>({});

  async function loadOnlineFonts(): Promise<void> {
    loading.value = true;
    try {
      onlineFonts.value = await getFontList();
    } catch {
      onlineFonts.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function installFont(font: FontItem): Promise<void> {
    const settings = useSettingsStore();
    const buffer = await downloadFont(font);
    const base64 = arrayBufferToBase64(buffer);
    const dir = `${settings.defaultSaveDirectory || (await window.api.app.appDataPath())}/fonts`;
    await window.api.fs.ensureDir(dir);
    await window.api.fs.writeFileBase64(`${dir}/${font.name}.ttf`, base64);
    installed.value = { ...installed.value, [font.id]: true };
  }

  return { onlineFonts, loading, installed, loadOnlineFonts, installFont };
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

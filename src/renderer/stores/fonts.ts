import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getFontFamilyList, downloadFont } from '@renderer/composables/useOnlineApi';
import { useSettingsStore } from './settings';

export interface FontItem {
  id: number;
  name: string; // 样式名（如 常规 / Bold）
  previewImage?: string;
  fontFile?: string;
  [key: string]: unknown;
}

export interface FontFamilyItem {
  id: number;
  name: string; // 字体族名
  language?: number;
  fonts: FontItem[];
}

export const useFontsStore = defineStore('fonts', () => {
  const fontFamilies = ref<FontFamilyItem[]>([]);
  const loading = ref(false);
  const installed = ref<Record<number, boolean>>({});

  /** 后端字体项没有现成展示名：font.name 是样式名（如"常规"），样式对象挂在 fontStyle 关联上 */
  function normalizeFont(raw: Record<string, unknown>): FontItem {
    const style = raw.fontStyle as Record<string, unknown> | undefined;
    const styleName = style && style.name ? String(style.name) : '';
    const name = String(raw.name ?? '').trim() || styleName || '未命名字体';
    return {
      ...raw,
      id: Number(raw.id ?? 0),
      name,
      previewImage: raw.previewImage ? String(raw.previewImage) : undefined,
      fontFile: raw.fontFile ? String(raw.fontFile) : undefined
    } as FontItem;
  }

  function normalizeFamily(raw: Record<string, unknown>): FontFamilyItem {
    const rawFonts = Array.isArray(raw.fonts) ? (raw.fonts as Record<string, unknown>[]) : [];
    return {
      id: Number(raw.id ?? 0),
      name: String(raw.name ?? '').trim() || '未命名字体族',
      language: raw.language === undefined ? undefined : Number(raw.language),
      fonts: rawFonts.map(normalizeFont)
    };
  }

  /** 拉取字体族列表（name：按字体族名模糊搜索） */
  async function loadFontFamilies(name?: string): Promise<void> {
    loading.value = true;
    try {
      const raw = (await getFontFamilyList(name)) as Record<string, unknown>[];
      fontFamilies.value = raw.map(normalizeFamily);
    } catch {
      fontFamilies.value = [];
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
    // 扩展名跟随实际字体文件（可能是 .ttf / .otf 等）
    const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(font.fontFile || '');
    const ext = match ? `.${match[1].toLowerCase()}` : '.ttf';
    await window.api.fs.writeFileBase64(`${dir}/${font.name}${ext}`, base64);
    installed.value = { ...installed.value, [font.id]: true };
  }

  return { fontFamilies, loading, installed, loadFontFamilies, installFont };
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

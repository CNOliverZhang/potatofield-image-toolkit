import { defineStore } from 'pinia';
import CryptoJS from 'crypto-js';

/** 默认输出格式：original 表示保持原图格式 */
export type DefaultOutputFormat = 'original' | 'png' | 'jpeg' | 'webp';

interface DefaultOutput {
  format: DefaultOutputFormat;
  quality: number;
}

interface SettingsState {
  themeColor: string;
  darkMode: boolean;
  defaultSaveDirectory: string;
  defaultExportParams: Record<string, Record<string, unknown>>;
  /** 各工具新增「输出设置」时的默认值 */
  defaultOutput: DefaultOutput;
  identifier: string;
  recentSaveDirs: string[];
}

function generateIdentifier(): string {
  const raw = `potatofield${Date.now()}${Math.random()}`;
  return CryptoJS.AES.encrypt(raw, 'potatofield-image-toolkit').toString();
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    themeColor: '#3a8ee6',
    darkMode: false,
    defaultSaveDirectory: '',
    defaultExportParams: {},
    defaultOutput: { format: 'original', quality: 90 },
    identifier: '',
    recentSaveDirs: []
  }),
  getters: {
    toolParams: (state) => (name: string) => state.defaultExportParams[name] ?? {}
  },
  actions: {
    setThemeColor(color: string) {
      this.themeColor = color;
    },
    toggleDark(value?: boolean) {
      this.darkMode = value ?? !this.darkMode;
    },
    setDefaultSaveDirectory(dir: string) {
      this.defaultSaveDirectory = dir;
    },
    addRecentSaveDir(dir: string) {
      if (!dir) return;
      const list = this.recentSaveDirs.filter((d) => d !== dir);
      list.unshift(dir);
      this.recentSaveDirs = list.slice(0, 12);
      if (!this.defaultSaveDirectory) this.defaultSaveDirectory = dir;
    },
    removeRecentSaveDir(dir: string) {
      this.recentSaveDirs = this.recentSaveDirs.filter((d) => d !== dir);
    },
    setToolParams(name: string, params: Record<string, unknown>) {
      this.defaultExportParams = { ...this.defaultExportParams, [name]: params };
    },
    setDefaultOutput(patch: Partial<DefaultOutput>) {
      this.defaultOutput = { ...this.defaultOutput, ...patch };
    },
    ensureIdentifier(): string {
      if (!this.identifier) this.identifier = generateIdentifier();
      return this.identifier;
    }
  },
  persist: true
});

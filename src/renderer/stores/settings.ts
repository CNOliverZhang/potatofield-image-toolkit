import { defineStore } from 'pinia';
import CryptoJS from 'crypto-js';

interface SettingsState {
  themeColor: string;
  darkMode: boolean;
  defaultSaveDirectory: string;
  defaultExportParams: Record<string, Record<string, unknown>>;
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
    ensureIdentifier(): string {
      if (!this.identifier) this.identifier = generateIdentifier();
      return this.identifier;
    }
  },
  persist: true
});

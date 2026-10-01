import { defineStore } from 'pinia';
import type { TemplateItem, TemplateStoreData, TemplateToolKey } from '@shared/types';
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
  /**
   * 各工具的模板库（目前仅 watermark）。
   * 权威数据在主进程 templates.json，这里是各窗口的展示用副本，
   * 通过 loadTemplates / 增删改 action（走 IPC）与主进程同步。
   */
  templates: Record<TemplateToolKey, TemplateItem[]>;
  /** 是否已完成旧版本（3.x）模板导入（只跑一次，标记同样存主进程） */
  legacyImported: boolean;
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
    recentSaveDirs: [],
    templates: { watermark: [] },
    legacyImported: false
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
    /** 用主进程推送的全量数据刷新本地副本 */
    applyTemplateStore(data: TemplateStoreData) {
      this.templates = data.templates;
      this.legacyImported = data.legacyImported;
    },
    /** 首次进入模板相关页面时拉取一次 */
    async loadTemplates(): Promise<void> {
      this.applyTemplateStore(await window.api.template.list());
    },
    /** 新增模板（主进程落盘 + 广播），返回新项 */
    async addTemplate(
      tool: TemplateToolKey,
      name: string,
      params: unknown,
      legacy = false
    ): Promise<TemplateItem | null> {
      const before = new Set((this.templates[tool] ?? []).map((i) => i.id));
      const data = await window.api.template.add({ tool, name, params, legacy });
      this.applyTemplateStore(data);
      return (data.templates[tool] ?? []).find((i) => !before.has(i.id)) ?? null;
    },
    async updateTemplate(tool: TemplateToolKey, id: string, patch: { name?: string; params?: unknown }) {
      this.applyTemplateStore(await window.api.template.update({ tool, id, ...patch }));
    },
    async removeTemplate(tool: TemplateToolKey, id: string) {
      this.applyTemplateStore(await window.api.template.remove({ tool, id }));
    },
    async markLegacyImported() {
      this.applyTemplateStore(await window.api.template.setLegacyImported(true));
    },
    ensureIdentifier(): string {
      if (!this.identifier) this.identifier = generateIdentifier();
      return this.identifier;
    }
  },
  // 模板库与旧版导入标记不落 localStorage：它们由主进程 templates.json 持有，
  // 若这里也持久化，窗口启动时会先显示一份可能过期的副本
  persist: {
    paths: [
      'themeColor',
      'darkMode',
      'defaultSaveDirectory',
      'defaultExportParams',
      'defaultOutput',
      'identifier',
      'recentSaveDirs'
    ]
  }
});

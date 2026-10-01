import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { TemplateEditPayload, TemplateItem, TemplateStoreData, TemplateToolKey } from '../shared/types';
import { appDataDir } from './templateAssets';

/**
 * 模板库的权威存储：主进程 userData/templates.json。
 *
 * 为什么不放在渲染层（Pinia + localStorage）：
 * 每个窗口各自持有一份状态副本，跨窗口的 localStorage 写入存在同步延迟，
 * 实测会出现「编辑窗口保存的模板被另一个窗口的旧副本覆盖 / 根本没落盘」。
 * 主进程是单实例，天然是唯一数据源；渲染层只负责展示与发起变更。
 *
 * 文件结构见 TemplateStoreData（shared/types.ts）。
 */
const FILE = 'templates.json';

function filePath(): string {
  return join(appDataDir(), FILE);
}

function emptyStore(): TemplateStoreData {
  return { version: 1, legacyImported: false, templates: { watermark: [] } };
}

/** 内存缓存：避免每次都读盘；写入即更新 */
let cache: TemplateStoreData | null = null;

function isStoreShape(value: unknown): value is TemplateStoreData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<TemplateStoreData>;
  return !!v.templates && typeof v.templates === 'object';
}

export function readTemplateStore(): TemplateStoreData {
  if (cache) return cache;
  try {
    const file = filePath();
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      if (isStoreShape(parsed)) {
        cache = { ...emptyStore(), ...parsed, templates: { ...emptyStore().templates, ...parsed.templates } };
        return cache;
      }
    }
  } catch {
    /* 文件损坏时退回空库，不阻塞启动 */
  }
  cache = emptyStore();
  return cache;
}

function commit(next: TemplateStoreData): TemplateStoreData {
  cache = next;
  try {
    writeFileSync(filePath(), JSON.stringify(next, null, 2), 'utf8');
  } catch {
    /* 写盘失败不影响本次会话使用 */
  }
  return next;
}

export function listTemplates(tool: TemplateToolKey): TemplateItem[] {
  return readTemplateStore().templates[tool] ?? [];
}

function nowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 新增模板（最新在前） */
export function addTemplate(
  tool: TemplateToolKey,
  name: string,
  params: unknown,
  legacy = false
): TemplateItem {
  const store = readTemplateStore();
  const now = Date.now();
  const item: TemplateItem = {
    id: nowId(),
    name,
    createdAt: now,
    updatedAt: now,
    params: params as Record<string, unknown>,
    legacy: legacy || undefined
  };
  const list = [item, ...(store.templates[tool] ?? [])];
  commit({ ...store, templates: { ...store.templates, [tool]: list } });
  return item;
}

export function updateTemplate(
  tool: TemplateToolKey,
  id: string,
  patch: { name?: string; params?: unknown }
): TemplateItem | null {
  const store = readTemplateStore();
  let hit: TemplateItem | null = null;
  const list = (store.templates[tool] ?? []).map((item) => {
    if (item.id !== id) return item;
    hit = {
      ...item,
      name: patch.name ?? item.name,
      params: (patch.params as Record<string, unknown>) ?? item.params,
      updatedAt: Date.now()
    };
    return hit;
  });
  commit({ ...store, templates: { ...store.templates, [tool]: list } });
  return hit;
}

export function removeTemplate(tool: TemplateToolKey, id: string): boolean {
  const store = readTemplateStore();
  const list = (store.templates[tool] ?? []).filter((item) => item.id !== id);
  const removed = list.length !== (store.templates[tool] ?? []).length;
  commit({ ...store, templates: { ...store.templates, [tool]: list } });
  return removed;
}

export function setLegacyImported(value: boolean): void {
  const store = readTemplateStore();
  commit({ ...store, legacyImported: value });
}

/**
 * 编辑窗口的入参暂存（替代原先的「两窗口共享 localStorage」）。
 * 主进程内存即可：写入与读取都在窗口打开前后的极短时间内发生，不需要落盘。
 */
let pendingEdit: TemplateEditPayload | null = null;

export function setEditingPayload(payload: TemplateEditPayload): void {
  pendingEdit = payload;
}

/** 取走待编辑参数（取后即清空，避免下次误入） */
export function takeEditingPayload(): TemplateEditPayload | null {
  const value = pendingEdit;
  pendingEdit = null;
  return value;
}

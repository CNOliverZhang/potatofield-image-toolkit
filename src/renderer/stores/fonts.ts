import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getFontFamilyList, downloadFont } from '@renderer/composables/useOnlineApi';
import {
  queryLocalFonts,
  groupLocalFonts,
  isInstalledLocally,
  supportsLocalFonts,
  normalizeFontName,
  canonicalStyle,
  type LocalFont,
  type LocalFontFamily
} from '@renderer/composables/useLocalFonts';

export interface FontItem {
  id: number;
  name: string; // 样式名（如 常规 / Bold）
  familyName: string; // 所属字体族名
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

/** 字体下载缓存目录（仅作待安装暂存，装进系统后即删除） */
async function cacheDir(): Promise<string> {
  const base = await window.api.app.appDataPath();
  return `${base}/fonts/downloads`;
}

function safeFileName(name: string): string {
  return String(name ?? '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'font';
}

function extOf(fontFile: string | undefined): string {
  const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(fontFile || '');
  return match ? `.${match[1].toLowerCase()}` : '.ttf';
}

export const useFontsStore = defineStore('fonts', () => {
  const fontFamilies = ref<FontFamilyItem[]>([]);
  const loading = ref(false);
  /** fontId -> 是否已安装到系统（由系统字体枚举结果推导，非本地持久标记） */
  const installed = ref<Record<number, boolean>>({});
  /** 正在安装中的字体 id（按钮 loading 态） */
  const installing = ref<Record<number, boolean>>({});

  /** 系统已安装字体（渲染进程 queryLocalFonts：含完整元数据，但 Chromium 会缓存，装新字体后不刷新） */
  const localFonts = ref<LocalFont[]>([]);
  const localFamilies = ref<LocalFontFamily[]>([]);
  const localLoading = ref(false);
  const localSupported = ref(supportsLocalFonts());

  /** 主进程实时读到的系统字体（注册表 + 字体目录）：用于「已安装」判定，装完即刻生效 */
  const systemFonts = ref<{ family: string; style: string }[]>([]);

  /** 本工具安装过的字体记录（按线上字体 id 记录，不依赖名称匹配） */
  const installHistory = ref<{ fontId?: number; family: string; style: string; at: number }[]>([]);

  /** 已装进系统、但渲染进程字体列表里还没有的字体数（这些需重启应用才能在预览中渲染） */
  const pendingRestart = ref(0);

  /** 后端字体项没有现成展示名：font.name 是样式名（如"常规"），样式对象挂在 fontStyle 关联上 */
  function normalizeFont(raw: Record<string, unknown>, familyName: string): FontItem {
    const style = raw.fontStyle as Record<string, unknown> | undefined;
    const styleName = style && style.name ? String(style.name) : '';
    const name = String(raw.name ?? '').trim() || styleName || '未命名字体';
    return {
      ...raw,
      id: Number(raw.id ?? 0),
      name,
      familyName,
      previewImage: raw.previewImage ? String(raw.previewImage) : undefined,
      fontFile: raw.fontFile ? String(raw.fontFile) : undefined
    } as FontItem;
  }

  function normalizeFamily(raw: Record<string, unknown>): FontFamilyItem {
    const rawFonts = Array.isArray(raw.fonts) ? (raw.fonts as Record<string, unknown>[]) : [];
    const familyName = String(raw.name ?? '').trim() || '未命名字体族';
    return {
      id: Number(raw.id ?? 0),
      name: familyName,
      language: raw.language === undefined ? undefined : Number(raw.language),
      fonts: rawFonts.map((f) => normalizeFont(f, familyName))
    };
  }

  /** 拉取主进程读到的系统字体列表（force：安装后跳过缓存立即重读） */
  async function loadSystemFonts(force = false): Promise<void> {
    try {
      systemFonts.value = await window.api.font.listInstalled(force);
    } catch {
      systemFonts.value = [];
    }
    refreshInstalledState(); // 数据源变了，已安装状态要跟着重算
    updatePendingRestart();
  }

  /** 统计「本工具已安装、但渲染进程字体列表还没有」的字体数量。
   *  只统计自己装过的字体：系统字体目录里大量文件名与族名不一致（如 msyh.ttc），
   *  若用全量列表算差集会产生几百条的误报。 */
  function updatePendingRestart(): void {
    if (!localFonts.value.length) {
      pendingRestart.value = 0;
      return;
    }
    const known = new Set(localFonts.value.map((f) => normalizeFontName(f.family)));
    const seen = new Set<string>();
    let n = 0;
    for (const h of installHistory.value) {
      const key = normalizeFontName(h.family);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (!known.has(key)) n++;
    }
    pendingRestart.value = n;
  }

  /** 安装历史持久化（appData/fonts/installed.json） */
  async function historyPath(): Promise<string> {
    const base = await window.api.app.appDataPath();
    return `${base}/fonts/installed.json`;
  }

  async function loadInstallHistory(): Promise<void> {
    try {
      const p = await historyPath();
      if (!(await window.api.fs.exists(p))) {
        installHistory.value = [];
        return;
      }
      const b64 = await window.api.fs.readFileBase64(p);
      installHistory.value = JSON.parse(base64ToUtf8(b64)) ?? [];
    } catch {
      installHistory.value = [];
    }
  }

  async function saveInstallHistory(): Promise<void> {
    try {
      const p = await historyPath();
      await window.api.fs.ensureDir(`${(await window.api.app.appDataPath())}/fonts`);
      await window.api.fs.writeFileBase64(p, utf8ToBase64(JSON.stringify(installHistory.value)));
    } catch {
      /* 记录失败不影响安装流程 */
    }
  }

  /** 记录一次成功安装（按线上字体 id，后续判定不再依赖名称匹配） */
  async function recordInstalled(font: FontItem): Promise<void> {
    const fam = normalizeFontName(font.familyName);
    const st = normalizeFontName(font.name);
    if (!fam) return;
    const dup = installHistory.value.some(
      (h) => (h.fontId && h.fontId === font.id) ||
        (!h.fontId && normalizeFontName(h.family) === fam && normalizeFontName(h.style) === st)
    );
    if (dup) return;
    installHistory.value = [
      ...installHistory.value,
      { fontId: font.id, family: font.familyName, style: font.name, at: Date.now() }
    ];
    refreshInstalledState();
    await saveInstallHistory();
  }

  /** 重算每个线上字体的「已安装」状态：
   *  1) 本工具安装过的（按 id，最可靠，不受线上名与系统名不一致影响）
   *  2) 否则按族名/样式在系统字体里匹配 */
  function refreshInstalledState(): void {
    const ids = new Set(installHistory.value.map((h) => h.fontId).filter((v): v is number => !!v));
    const map: Record<number, boolean> = {};
    for (const fam of fontFamilies.value) {
      for (const f of fam.fonts) {
        if (!f.id) continue;
        map[f.id] =
          ids.has(f.id) || isInstalledLocally(f.familyName || fam.name, f.name, systemFonts.value);
      }
    }
    installed.value = map;
  }

  /** 拉取字体族列表（name：按字体族名模糊搜索） */
  async function loadFontFamilies(name?: string): Promise<void> {
    if (!installHistory.value.length) await loadInstallHistory();
    loading.value = true;
    try {
      const raw = (await getFontFamilyList(name)) as Record<string, unknown>[];
      fontFamilies.value = raw.map(normalizeFamily);
    } catch {
      fontFamilies.value = [];
    } finally {
      loading.value = false;
    }
    // 以主进程读到的系统字体为准标记已安装（渲染进程的 queryLocalFonts 有缓存，装完查不到）
    if (!systemFonts.value.length) await loadSystemFonts();
    else refreshInstalledState();
  }

  /** 枚举系统已安装字体 */
  async function loadLocalFonts(): Promise<void> {
    localLoading.value = true;
    try {
      localFonts.value = await queryLocalFonts();
      localFamilies.value = groupLocalFonts(localFonts.value);
    } catch {
      localFonts.value = [];
      localFamilies.value = [];
    } finally {
      localLoading.value = false;
    }
    // 历史可能还没读完（与列表加载并行），这里补一次再统计
    if (!installHistory.value.length) await loadInstallHistory();
    updatePendingRestart();
  }

  /** 系统字体快照的键：族名 + 归一化样式 */
  function fontKey(f: { family: string; style?: string }): string {
    return `${normalizeFontName(f.family)}|${canonicalStyle(f.style)}`;
  }

  /** 轮询等待系统字体列表出现「新增项」。
   *  不按名称匹配判定：线上族名（如「思源宋体」）常与系统真实名（Noto Serif SC）不一致，
   *  只要列表里多出任何字体，就说明用户刚装完了。 */
  async function waitForNewFont(before: Set<string>, timeoutMs = 90000, intervalMs = 2500): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const now = await window.api.font.listInstalled(true);
      const added = now.filter((f) => !before.has(fontKey(f)));
      if (added.length) {
        systemFonts.value = now;
        updatePendingRestart();
        // 同步一次渲染进程列表，用于统计还有多少字体需重启才能预览
        localFonts.value = await queryLocalFonts();
        localFamilies.value = groupLocalFonts(localFonts.value);
        updatePendingRestart();
        return true;
      }
    }
    return false;
  }

  /** 安装字体到系统：下载到缓存 → 调起系统字体安装器 → 等待安装完成 → 删除缓存 */
  async function installFont(font: FontItem): Promise<{ ok: boolean; pending?: boolean }> {
    installing.value = { ...installing.value, [font.id]: true };
    try {
      const dir = await cacheDir();
      await window.api.fs.ensureDir(dir);
      const ext = extOf(font.fontFile);
      const fileName = `${safeFileName(font.familyName)}__${safeFileName(font.name)}${ext}`;
      const filePath = `${dir}/${fileName}`;

      const buffer = await downloadFont(font);
      await window.api.fs.writeFileBase64(filePath, arrayBufferToBase64(buffer));

      // 安装前的系统字体快照（缓存目录不在扫描范围内，不会干扰比对）
      const before = new Set((await window.api.font.listInstalled(true)).map(fontKey));

      // 用系统默认程序打开字体文件：Windows 会弹出字体预览窗口，用户点「安装」即装进系统
      const err = await window.api.shell.openPath(filePath);
      if (err) {
        // 打不开时把文件所在目录展示给用户，可手动双击安装
        await window.api.shell.showItemInFolder(filePath);
      }

      const ok = await waitForNewFont(before);
      if (ok) {
        // 已装进系统，渲染时按字体名查找，缓存文件可以删除
        await window.api.fs.remove(filePath);
        await recordInstalled(font);
        updatePendingRestart();
        return { ok: true };
      }
      // 超时未检测到：保留缓存文件，状态留待下次刷新时再判定
      return { ok: false, pending: true };
    } finally {
      const next = { ...installing.value };
      delete next[font.id];
      installing.value = next;
    }
  }

  /** 清理下载缓存：仅删除已确认安装到系统的字体文件 */
  async function cleanDownloads(): Promise<number> {
    const dir = await cacheDir();
    if (!(await window.api.fs.exists(dir))) return 0;
    const { fileList } = await window.api.fs.scanDirectory(dir, ['ttf', 'otf', 'ttc', 'woff', 'woff2']);
    if (!fileList.length) return 0;
    // 用主进程列表判定，避免 Chromium 缓存导致已安装却判成未装而误删
    if (!systemFonts.value.length) await loadSystemFonts(true);
    const locals = systemFonts.value;
    let removed = 0;
    for (const p of fileList) {
      const name = (p.split(/[\\/]/).pop() ?? '').replace(/\.[^.]+$/, '');
      const [fam, style] = name.split('__');
      if (fam && isInstalledLocally(fam, style ?? '', locals)) {
        await window.api.fs.remove(p);
        removed++;
      }
    }
    return removed;
  }

  const installedCount = computed(() => Object.values(installed.value).filter(Boolean).length);

  return {
    fontFamilies,
    loading,
    installed,
    installing,
    installedCount,
    localFonts,
    localFamilies,
    localLoading,
    localSupported,
    systemFonts,
    pendingRestart,
    installHistory,
    loadFontFamilies,
    loadLocalFonts,
    loadSystemFonts,
    loadInstallHistory,
    installFont,
    cleanDownloads,
    refreshInstalledState
  };
});

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

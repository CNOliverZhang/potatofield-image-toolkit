import { promises as fsp } from 'fs';
import { execFile } from 'child_process';
import { join, extname, basename } from 'path';
import { homedir, platform } from 'os';
import { canonicalStyle, familyCandidates, normalizeFontName } from '../shared/fontStyle';

/** 系统字体检测（主进程）
 *
 *  为什么不能只用渲染进程的 queryLocalFonts()：
 *  Chromium 会在进程启动时缓存字体列表，安装新字体后不会刷新，
 *  因此刚装好的字体会一直查不到。这里直接读系统注册表与字体目录，实时可靠。
 *  （导出走主进程 sharp/librsvg，装完即可用；仅渲染进程预览需要重启才生效）
 */

export interface InstalledFont {
  family: string;
  style: string;
}

const FONT_EXTS = ['.ttf', '.otf', '.ttc', '.pfb', '.woff', '.woff2'];

const REG_KEYS = [
  'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
  'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'
];

/** 结尾样式词（用于把 "Arial Bold" 拆成 family=Arial / style=Bold） */
const STYLE_WORDS = [
  'bolditalic', 'semibold', 'extrabold', 'extralight', 'demibold',
  'regular', 'italic', 'oblique', 'bold', 'black', 'heavy', 'light', 'medium', 'thin',
  '粗体', '斜体', '常规', '细体', '标准', '中黑', '特粗', '极粗', '中等'
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 解析 "Aclonica Regular (TrueType)" / "Aclonica__常规" / "微软雅黑" */
function parseFontName(raw: string): InstalledFont {
  let s = String(raw ?? '').trim();
  // 去掉 (TrueType) / (OpenType) / (All res) 之类的类型后缀
  s = s.replace(/\s*\((?:TrueType|OpenType|All res|Version[^)]*)\)\s*$/i, '').trim();
  if (!s) return { family: '', style: '' };
  // 本工具安装的字体文件名格式：族名__样式名
  if (s.includes('__')) {
    const [family, style] = s.split('__');
    return { family: family.trim(), style: (style ?? '').trim() };
  }
  const n = normalizeFontName(s);
  const hit = STYLE_WORDS.filter(
    (w) => n.length > normalizeFontName(w).length && n.endsWith(normalizeFontName(w))
  ).sort((a, b) => normalizeFontName(b).length - normalizeFontName(a).length)[0];
  if (hit) {
    const re = new RegExp(`[\\s\\-_]*${escapeRe(hit)}$`, 'i');
    const family = s.replace(re, '').trim();
    if (family) return { family, style: hit };
  }
  return { family: s, style: '' };
}

function fontDirs(): string[] {
  if (platform() === 'win32') {
    const dirs = [join(process.env.WINDIR || 'C:\\Windows', 'Fonts')];
    if (process.env.LOCALAPPDATA) {
      dirs.push(join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts'));
    }
    return dirs;
  }
  if (platform() === 'darwin') {
    return ['/System/Library/Fonts', '/Library/Fonts', join(homedir(), 'Library', 'Fonts')];
  }
  return ['/usr/share/fonts', join(homedir(), '.fonts')];
}

/** 读取注册表里的字体名（Windows） */
function regQuery(key: string): Promise<string[]> {
  return new Promise((resolve) => {
    execFile('reg', ['query', key], { windowsHide: true, encoding: 'utf8' }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const names: string[] = [];
      for (const line of String(stdout).split(/\r?\n/)) {
        const m = /^\s{2,}(.+?)\s{2,}REG_SZ\s{2,}(.*)$/.exec(line);
        if (m) names.push(m[1].trim());
      }
      resolve(names);
    });
  });
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fsp.readdir(dir);
  } catch {
    return [];
  }
}

let cache: { at: number; list: InstalledFont[] } | null = null;
const CACHE_TTL = 3000;

async function collect(): Promise<InstalledFont[]> {
  const map = new Map<string, InstalledFont>();
  const push = (raw: string) => {
    const f = parseFontName(raw);
    if (!f.family) return;
    const key = `${normalizeFontName(f.family)}|${canonicalStyle(f.style)}`;
    if (!map.has(key)) map.set(key, f);
  };

  if (platform() === 'win32') {
    for (const key of REG_KEYS) {
      for (const name of await regQuery(key)) push(name);
    }
  }
  // 字体目录兜底（用户手动安装的字体未必都写注册表键名）
  for (const dir of fontDirs()) {
    for (const f of await safeReaddir(dir)) {
      if (!FONT_EXTS.includes(extname(f).toLowerCase())) continue;
      push(basename(f, extname(f)));
    }
  }
  return Array.from(map.values());
}

/** 列出系统已安装字体（含本工具刚装的）；force=true 跳过缓存立即重读 */
export async function listInstalledFonts(force = false): Promise<InstalledFont[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL) return cache.list;
  const list = await collect();
  cache = { at: Date.now(), list };
  return list;
}

/** 判断某个字体是否已安装到系统 */
export async function isFontInstalled(family: string, style?: string): Promise<boolean> {
  const list = await listInstalledFonts();
  return matchInstalled(list, family, style);
}

/** 在给定字体列表里匹配（供渲染层复用：拿到列表后本地比对，避免逐项 IPC） */
export function matchInstalled(list: InstalledFont[], family: string, style?: string): boolean {
  const fam = normalizeFontName(family);
  if (!fam) return false;
  const want = canonicalStyle(style);
  const families = familyCandidates(family);
  for (const f of list) {
    if (!families.has(normalizeFontName(f.family))) continue;
    // 样式必须对得上：只装了「极粗」不代表「常规」也已安装
    if (canonicalStyle(f.style) === want) return true;
  }
  return false;
}

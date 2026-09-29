/** 系统已安装字体（Chromium Local Font Access API） */
import { canonicalStyle, familyCandidates, normalizeFontName } from '@shared/fontStyle';

export { canonicalStyle, familyCandidates, normalizeFontName };

export interface LocalFont {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

export interface LocalFontFamily {
  name: string; // 字体族名
  fonts: LocalFont[]; // 族内各样式
}



/** 归一化：小写并去掉空格/连字符/下划线，便于跨语言比对（实现在 @shared/fontStyle） */

/** 是否支持本地字体枚举 */
export function supportsLocalFonts(): boolean {
  return typeof (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts === 'function';
}

/** 枚举系统已安装字体；不支持或失败时返回空数组 */
export async function queryLocalFonts(): Promise<LocalFont[]> {
  const w = window as unknown as {
    queryLocalFonts?: () => Promise<
      { family: string; fullName: string; postscriptName: string; style: string }[]
    >;
  };
  if (typeof w.queryLocalFonts !== 'function') return [];
  try {
    const list = await w.queryLocalFonts();
    return (list ?? []).map((f) => ({
      family: String(f.family ?? ''),
      fullName: String(f.fullName ?? ''),
      postscriptName: String(f.postscriptName ?? ''),
      style: String(f.style ?? '')
    }));
  } catch {
    return [];
  }
}

/** 按字体族聚合，族名排序，族内按样式名排序 */
export function groupLocalFonts(fonts: LocalFont[]): LocalFontFamily[] {
  const map = new Map<string, LocalFont[]>();
  for (const f of fonts) {
    const key = f.family || f.fullName || '未知字体';
    const arr = map.get(key);
    if (arr) arr.push(f);
    else map.set(key, [f]);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
    .map(([name, list]) => ({
      name,
      fonts: list.slice().sort((a, b) => a.style.localeCompare(b.style, 'en'))
    }));
}

/** 判断某个线上字体是否已安装到系统：
 *  先用「族名 + 样式」精确匹配，再回退到仅族名匹配。
 *  数据源可以是渲染进程的 queryLocalFonts 结果，也可以是主进程读到的系统字体列表 */
export function isInstalledLocally(
  familyName: string,
  styleName: string,
  locals: { family: string; style?: string; fullName?: string }[]
): boolean {
  const fam = normalizeFontName(familyName);
  if (!fam) return false;
  const want = canonicalStyle(styleName);
  const families = familyCandidates(familyName); // 兼容「思源宋体」与 Noto Serif SC 这类异名同族

  for (const l of locals) {
    if (!families.has(normalizeFontName(l.family))) continue;
    // 样式必须真正对得上才算已安装（只装了"极粗"不代表"常规"也已安装）
    if (canonicalStyle(l.style) === want) return true;
    // 兼容：某些字体 style 为空、样式信息只体现在 fullName 上（如 fullName = "Aclonica Bold"）
    const full = normalizeFontName(l.fullName ?? '');
    if (full && full.startsWith(fam)) {
      const rest = full.slice(fam.length);
      if (rest && canonicalStyle(rest) === want) return true;
    }
  }
  return false;
}

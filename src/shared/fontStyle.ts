/** 字体名/样式名归一化：主进程与渲染进程共用，
 *  保证「已安装」判定在两侧行为一致 */

/** 归一化：小写并去掉空格/连字符/下划线，便于跨语言比对 */
export function normalizeFontName(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[\s\-_]+/g, '');
}

/** 样式名归一表：中英文各种写法统一到同一个键。
 *  这样线上写的「极粗」能匹配系统里的 "Heavy"，「常规」能匹配空样式或 "Regular"。
 *  键已归一化（小写、去空格/连字符），比对前先 normalizeFontName。 */
export const STYLE_CANON: Record<string, string> = {
  // 常规
  regular: 'regular',
  normal: 'regular',
  book: 'regular',
  roman: 'regular',
  常规: 'regular',
  标准: 'regular',
  正文: 'regular',
  // 斜体
  italic: 'italic',
  oblique: 'italic',
  斜体: 'italic',
  倾斜: 'italic',
  // 粗体
  bold: 'bold',
  粗体: 'bold',
  加粗: 'bold',
  粗: 'bold',
  bolditalic: 'bolditalic',
  boldoblique: 'bolditalic',
  粗斜体: 'bolditalic',
  斜粗: 'bolditalic',
  // 细
  light: 'light',
  细体: 'light',
  细: 'light',
  lightitalic: 'lightitalic',
  细斜: 'lightitalic',
  extralight: 'extralight',
  ultralight: 'extralight',
  超细: 'extralight',
  极细: 'extralight',
  thin: 'thin',
  hairline: 'thin',
  // 中等
  medium: 'medium',
  中等: 'medium',
  中黑: 'medium',
  // 半粗
  semibold: 'semibold',
  demibold: 'semibold',
  半粗: 'semibold',
  中粗: 'semibold',
  // 特粗
  extrabold: 'extrabold',
  ultrabold: 'extrabold',
  特粗: 'extrabold',
  // 极粗（思源系列的 Heavy 即「极粗」）
  black: 'black',
  heavy: 'black',
  ultra: 'black',
  极粗: 'black',
  超粗: 'black'
};

/** 常见字体族的别名：线上用的中文族名与系统里的真实族名往往不同
 *  （如线上「思源宋体」在系统里叫 "Noto Serif SC" / "Source Han Serif SC"）。
 *  值为该族在系统里可能出现的名字（都会再做归一化）。 */
export const FAMILY_ALIASES: Record<string, string[]> = {
  思源宋体: [
    'notoserifsc', 'notoserifcjk', 'sourcehanserifsc', 'sourcehanserifcn',
    'sourcehanseriftc', 'sourcehanserifjp', 'sourcehanserifkr', 'sourcehanserif'
  ],
  思源黑体: [
    'notosanssc', 'notosanscjk', 'sourcehansanssc', 'sourcehansanscn',
    'sourcehansanstc', 'sourcehansansjp', 'sourcehansanskr', 'sourcehansans'
  ],
  微软雅黑: ['microsoftyahei', 'msyh'],
  黑体: ['simhei'],
  宋体: ['simsun'],
  新宋体: ['nsimsun'],
  楷体: ['kaiti', 'stkaiti'],
  仿宋: ['fangsong', 'stfangsong'],
  等线: ['dengxian'],
  苹方: ['pingfangsc', 'pingfang']
};

/** 族名的所有等价候选（含双向别名），用于跨命名匹配 */
export function familyCandidates(name: string): Set<string> {
  const n = normalizeFontName(name);
  const out = new Set<string>([n]);
  const direct = FAMILY_ALIASES[name];
  if (direct) direct.forEach((x) => out.add(normalizeFontName(x)));
  // 反向：传入英文名时也带上同组的其它写法
  for (const [zh, list] of Object.entries(FAMILY_ALIASES)) {
    const norms = list.map(normalizeFontName);
    if (norms.includes(n)) {
      out.add(normalizeFontName(zh));
      norms.forEach((x) => out.add(x));
    }
  }
  return out;
}

/** 样式名归一化：空样式视为常规，未知写法原样返回 */
export function canonicalStyle(style?: string): string {
  const n = normalizeFontName(style ?? '');
  if (!n) return 'regular'; // 系统未标注样式时按常规处理
  return STYLE_CANON[n] ?? n;
}

/** 归一化样式 → CSS 字重数值（italic 等不影响字重的样式按常规处理） */
const WEIGHT_VALUE: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900
};

export function styleWeight(style?: string): number {
  return WEIGHT_VALUE[canonicalStyle(style)] ?? 400;
}

/** 归一化样式 → 中文显示名；也接受字重数值字符串（"700" → 粗体） */
const STYLE_LABELS: Record<string, string> = {
  thin: '超细',
  extralight: '极细',
  light: '细体',
  regular: '常规',
  medium: '中黑',
  semibold: '半粗',
  bold: '粗体',
  extrabold: '特粗',
  black: '极粗',
  italic: '斜体',
  bolditalic: '粗斜体'
};

export function styleLabel(style?: string): string {
  const n = String(style ?? '').trim();
  if (/^\d+$/.test(n)) {
    const hit = Object.entries(WEIGHT_VALUE).find(([, w]) => w === Number(n));
    return hit ? STYLE_LABELS[hit[0]] : n;
  }
  return STYLE_LABELS[canonicalStyle(n)] ?? n;
}

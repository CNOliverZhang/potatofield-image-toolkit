export function readFileBase64(path: string): Promise<string> {
  return window.api.fs.readFileBase64(path);
}

export function writeFileBase64(path: string, base64: string): Promise<void> {
  return window.api.fs.writeFileBase64(path, base64);
}

export function ensureDir(path: string): Promise<void> {
  return window.api.fs.ensureDir(path);
}

export function fileExists(path: string): Promise<boolean> {
  return window.api.fs.exists(path);
}

export function buildOutputPath(defaultDir: string, fileName: string): string {
  const dir = defaultDir.endsWith('/') || defaultDir.endsWith('\\') ? defaultDir : `${defaultDir}/`;
  return `${dir}${fileName}`;
}

/**
 * 计算 full 相对 root 的相对位置，统一使用 '/' 作为分隔符（跨平台安全，Windows 文件系统同样接受）。
 * 当 full 不在 root 下时（理论上扫描不会触发），回退为文件名本身。
 */
export function relativePath(root: string, full: string): string {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const r = norm(root);
  const f = norm(full);
  if (!r || f === r) return '';
  if (f.startsWith(r + '/')) return f.slice(r.length + 1);
  return full.split(/[\\/]/).pop() ?? full;
}

export interface BatchOutputOptions {
  /** 文件名后缀，如 '_watermarked'、'_resized' */
  suffix: string;
  /** 强制输出扩展名（含点），缺省时沿用原文件扩展名 */
  ext?: string;
  /** 是否保持相对目录：将文件按原目录结构还原到保存位置下 */
  keepStructure: boolean;
}

/**
 * 根据批量导入项解析最终输出路径。
 * - 不保持相对目录：扁平输出到 saveDir 下（文件名 + suffix + 扩展名）
 * - 保持相对目录：在 saveDir 下重建 item.rel 所记录的相对子目录结构后输出
 * 返回的字符串内部统一使用 '/' 分隔，Windows 文件系统可正常识别。
 */
export function resolveBatchOutputPath(
  saveDir: string,
  item: { path: string; rel: string },
  opts: BatchOutputOptions
): string {
  const base = item.path.split(/[\\/]/).pop() || 'image';
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const srcExt = dot > 0 ? base.slice(dot) : '';
  const ext = opts.ext ?? srcExt;
  const newBase = stem + opts.suffix + ext;

  if (opts.keepStructure && item.rel) {
    const parts = item.rel.split('/');
    parts.pop(); // 去掉末项文件名，保留子目录
    const subDir = parts.join('/');
    return buildOutputPath(saveDir, subDir ? `${subDir}/${newBase}` : newBase);
  }
  return buildOutputPath(saveDir, newBase);
}

import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { extname, join } from 'path';
import sharp from 'sharp';

/** 应用数据目录：开发模式下 Electron 的 userData 名为 Electron，与打包后不同，统一到产品目录 */
export function appDataDir(): string {
  const base = app.isPackaged
    ? app.getPath('userData')
    : join(app.getPath('appData'), 'potatofield-image-toolkit');
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return base;
}


/**
 * 模板素材（目前是图片水印所用的水印图）的持久化。
 *
 * 为什么不直接存原图路径：用户移动或删除原文件后模板就失效了。
 * 老版本（3.x）的做法是复制到 userData/watermarkImages/，本文件沿用同一思路并做两点改进：
 *   1. 按**内容 hash** 命名 —— 同一张图被多个模板引用时只存一份；
 *   2. 提供删除接口 —— 配合引用计数清理，避免老版本「删模板不删图」的垃圾累积。
 *
 * 注意：老版本的文件目录与新版同在 userData 下（appId 相同），迁移时可直接复用。
 */

/** 素材目录（随用随建） */
function assetsDir(): string {
  const dir = join(appDataDir(), 'template-assets');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 保存素材：内容相同即复用已有文件。
 * @param sourcePath 原图路径（渲染层通过文件选择得到）
 * @returns 存储文件名（模板里只记这个名字，不记绝对路径，便于备份与迁移）
 */
export function saveTemplateAsset(sourcePath: string): { fileName: string } | null {
  try {
    const buf = readFileSync(sourcePath);
    const hash = createHash('sha1').update(buf).digest('hex').slice(0, 16);
    const fileName = `${hash}${extname(sourcePath).toLowerCase()}`;
    const target = join(assetsDir(), fileName);
    if (!existsSync(target)) writeFileSync(target, buf);
    return { fileName };
  } catch {
    return null;
  }
}

/** 解析素材为绝对路径；文件缺失（被用户手动清理）时返回 null，由调用方提示重新选择 */
export function resolveTemplateAsset(fileName: string): string | null {
  const target = join(assetsDir(), fileName);
  return existsSync(target) ? target : null;
}

/**
 * 模板编辑预览用的中性占位图（生成一次后长期复用）。
 *
 * 编辑模板时用户并没有选图，但预览需要一张底图才能体现「位置 / 大小 / 边距」，
 * 因此用一张中间灰渐变图代替：亮色与暗色水印在上面都能看清，也不至于像纯白底那样
 * 把默认白色水印吃掉。
 */
export async function ensurePlaceholderImage(): Promise<string> {
  const target = join(assetsDir(), 'placeholder.png');
  if (existsSync(target)) return target;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a3a3a3" />
      <stop offset="1" stop-color="#6b6b6b" />
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g)" />
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(target);
  return target;
}

/**
 * 删除素材。调用方需先确认没有其它模板引用（按文件名比对即可）。
 */
export function removeTemplateAsset(fileName: string): void {
  try {
    const target = join(assetsDir(), fileName);
    if (existsSync(target)) unlinkSync(target);
  } catch {
    /* 删除失败忽略：最多残留一个文件，不影响功能 */
  }
}

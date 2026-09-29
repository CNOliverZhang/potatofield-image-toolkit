import { reactive } from 'vue';
import type { ImageFormat, ImageProcessOptions } from '@shared/types';
import { useSettingsStore, type DefaultOutputFormat } from '@renderer/stores/settings';

/** 工具的「输出设置」：格式 + 质量。默认值来自设置页的「默认输出」 */
export interface OutputOpts {
  format: DefaultOutputFormat;
  quality: number;
}

export function createOutputOpts(): OutputOpts {
  const s = useSettingsStore();
  return reactive({ format: s.defaultOutput.format, quality: s.defaultOutput.quality });
}

/** 是否有损格式（只有这类格式才需要质量） */
export function isLossy(format: string): boolean {
  return format === 'jpeg' || format === 'webp';
}

/** 传给主进程的输出格式：保持原格式时不传，由 sharp 按原图输出 */
export function outFormat(o: OutputOpts): ImageFormat | undefined {
  return o.format === 'original' ? undefined : (o.format as ImageFormat);
}

/** 传给主进程的质量：仅 JPG / WebP 有意义 */
export function outQuality(format: string, quality: number): number | undefined {
  return isLossy(format) ? quality : undefined;
}

/** 输出文件扩展名：保持原格式时沿用输入文件的扩展名 */
export function outExt(format: string, inputPath: string): string {
  if (format === 'original') {
    const base = inputPath.split(/[\\/]/).pop() ?? '';
    const i = base.lastIndexOf('.');
    return i > 0 ? base.slice(i) : '.png';
  }
  return format === 'jpeg' ? '.jpg' : `.${format}`;
}

/** 组装到 ImageProcessOptions 里 */
export function withOutput(base: ImageProcessOptions, o: OutputOpts): ImageProcessOptions {
  const format = outFormat(o);
  const quality = outQuality(o.format, o.quality);
  if (format) base.format = format;
  if (quality !== undefined) base.quality = quality;
  return base;
}

import sharp from 'sharp';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ImageProcessPayload, ImageProcessResult, ImageProcessOptions } from '../shared/types';

export async function processImage(payload: ImageProcessPayload): Promise<ImageProcessResult> {
  const { op, inputPath, outputPath, options = {}, extra = {} } = payload;
  if (!existsSync(inputPath)) throw new Error(`输入文件不存在: ${inputPath}`);

  switch (op) {
    case 'metadata': {
      const info = await sharp(inputPath).metadata();
      return { info: info as unknown as Record<string, unknown> };
    }
    case 'resize': {
      if (!outputPath) throw new Error('resize 需要 outputPath');
      const { width, height, fit = 'inside', background } = options;
      await sharp(inputPath)
        .resize(width, height, { fit: fit as keyof sharp.FitEnum, background: background ?? '#ffffff' })
        .toFile(outputPath);
      return { outputPath };
    }
    case 'convert': {
      if (!outputPath) throw new Error('convert 需要 outputPath');
      const { format = 'png', quality } = options;
      await sharp(inputPath)
        .toFormat(format as keyof sharp.FormatEnum, quality ? { quality } : {})
        .toFile(outputPath);
      return { outputPath };
    }
    case 'compress': {
      if (!outputPath) throw new Error('compress 需要 outputPath');
      const format = options.format ?? 'webp';
      const quality = options.quality ?? 80;
      await sharp(inputPath)
        .toFormat(format as keyof sharp.FormatEnum, { quality })
        .toFile(outputPath);
      return { outputPath };
    }
    case 'extract': {
      if (!outputPath) throw new Error('extract 需要 outputPath');
      const { left = 0, top = 0, width = 0, height = 0 } = extra as Record<string, number>;
      await sharp(inputPath).extract({ left, top, width, height }).toFile(outputPath);
      return { outputPath };
    }
    case 'append': {
      if (!outputPath) throw new Error('append 需要 outputPath');
      const images = (extra.images as string[]) ?? [];
      const direction = (extra.direction as 'vertical' | 'horizontal') ?? 'vertical';
      if (!images.length) throw new Error('append 需要 images 列表');
      const metas = await Promise.all(images.map((p) => sharp(p).metadata()));
      const widths = metas.map((m) => m.width ?? 0);
      const heights = metas.map((m) => m.height ?? 0);
      const totalW = direction === 'horizontal' ? widths.reduce((a, b) => a + b, 0) : Math.max(...widths);
      const totalH = direction === 'vertical' ? heights.reduce((a, b) => a + b, 0) : Math.max(...heights);
      const composites = images.map((p, i) => ({
        input: p,
        left: direction === 'horizontal' ? widths.slice(0, i).reduce((a, b) => a + b, 0) : 0,
        top: direction === 'vertical' ? heights.slice(0, i).reduce((a, b) => a + b, 0) : 0
      }));
      await sharp({
        create: {
          width: totalW,
          height: totalH,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
      })
        .composite(composites)
        .png()
        .toFile(outputPath);
      return { outputPath };
    }
    case 'watermark': {
      if (!outputPath) throw new Error('watermark 需要 outputPath');
      const base = sharp(inputPath);
      const composite: sharp.OverlayOptions[] = [];
      const type = extra.type as 'text' | 'image';
      if (type === 'text') composite.push(await buildTextWatermark(extra));
      else if (type === 'image') composite.push(await buildImageWatermark(extra));
      await base.composite(composite).toFile(outputPath);
      return { outputPath };
    }
    default:
      throw new Error(`未支持的图像操作: ${op}`);
  }
}

async function buildTextWatermark(extra: Record<string, unknown>): Promise<sharp.OverlayOptions> {
  const text = (extra.text as string) ?? '';
  const fontSize = (extra.fontSize as number) ?? 32;
  const color = (extra.color as string) ?? '#000000';
  const opacity = (extra.opacity as number) ?? 0.5;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fontSize * 12}" height="${fontSize * 1.6}">` +
      `<text x="0" y="${fontSize}" font-size="${fontSize}" fill="${color}" fill-opacity="${opacity}" font-family="sans-serif">${escapeXml(text)}</text>` +
      `</svg>`
  );
  return {
    input: await sharp(svg).png().toBuffer(),
    gravity: (extra.gravity as sharp.Gravity) ?? 'southeast',
    tile: extra.tile as boolean
  };
}

async function buildImageWatermark(extra: Record<string, unknown>): Promise<sharp.OverlayOptions> {
  const watermarkPath = extra.watermarkPath as string;
  const opacity = (extra.opacity as number) ?? 0.5;
  const buf = await sharp(watermarkPath).ensureAlpha().toBuffer();
  return {
    input: buf,
    gravity: (extra.gravity as sharp.Gravity) ?? 'southeast',
    tile: extra.tile as boolean,
    blend: 'over'
  };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;'
  );
}

export function resolveStatic(...segments: string[]): string {
  return join(process.resourcesPath ?? process.cwd(), 'static', ...segments);
}

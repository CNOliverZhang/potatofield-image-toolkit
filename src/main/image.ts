import sharp from 'sharp';
import { existsSync } from 'fs';
import { join } from 'path';
import type {
  ImageProcessPayload,
  ImageProcessResult,
  ImageProcessOptions,
  WatermarkGravity
} from '../shared/types';

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
      const format = options.format;
      const quality = options.quality ?? 80;
      let img = sharp(inputPath);
      if (format) {
        // 指定目标格式：转换并应用质量
        img = img.toFormat(format as keyof sharp.FormatEnum, { quality });
      } else if (quality !== undefined) {
        // 保持原格式：仅对有损格式重新编码以应用质量（png/gif 无损，保持原样）
        const srcFormat = (await sharp(inputPath).metadata()).format;
        if (srcFormat && srcFormat !== 'png' && srcFormat !== 'gif') {
          img = img.toFormat(srcFormat as keyof sharp.FormatEnum, { quality });
        }
      }
      await img.toFile(outputPath);
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
      const composites = await buildWatermarkComposites(inputPath, extra);
      const base = sharp(inputPath).composite(composites);
      if (outputPath) {
        const format = options.format;
        const quality = options.quality;
        let out = base;
        if (format) out = out.toFormat(format as keyof sharp.FormatEnum, quality ? { quality } : {});
        await out.toFile(outputPath);
        return { outputPath };
      }
      // 无 outputPath：返回处理后图像的 buffer，供前端预览
      const buf = await base.png().toBuffer();
      return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    }
    default:
      throw new Error(`未支持的图像操作: ${op}`);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

interface PreparedWatermark {
  buf: Buffer;
  width: number;
  height: number;
}

async function buildWatermarkComposites(
  inputPath: string,
  extra: Record<string, unknown>
): Promise<sharp.OverlayOptions[]> {
  const baseMeta = await sharp(inputPath).metadata();
  const type = extra.type === 'image' ? 'image' : 'text';
  const prepared: PreparedWatermark =
    type === 'text'
      ? await prepareTextWatermark(extra)
      : await prepareImageWatermark(extra, baseMeta);

  const rotation = Number(extra.rotation ?? 0);
  const rad = (Math.abs(rotation) * Math.PI) / 180;
  const fitRad = (w: number, h: number) => ({
    w: Math.round(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) || w,
    h: Math.round(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))) || h
  });

  // 水印（旋转后的外接框）不得超过底图，否则 sharp 合成为报错；超出时等比缩小
  const baseW0 = baseMeta.width ?? 0;
  const baseH0 = baseMeta.height ?? 0;
  let box = fitRad(prepared.width, prepared.height);
  if (baseW0 && baseH0 && (box.w > baseW0 || box.h > baseH0)) {
    const fit = Math.min(baseW0 / box.w, baseH0 / box.h);
    const resized = await sharp(prepared.buf)
      .resize(Math.max(1, Math.round(prepared.width * fit)), Math.max(1, Math.round(prepared.height * fit)))
      .png()
      .toBuffer({ resolveWithObject: true });
    prepared.buf = resized.data;
    prepared.width = resized.info.width;
    prepared.height = resized.info.height;
    box = fitRad(prepared.width, prepared.height);
  }
  const wmW = box.w;
  const wmH = box.h;

  const blend: sharp.OverlayOptions['blend'] = 'over';

  if (extra.tile) {
    const gap = Number(extra.tileGap ?? 40);
    const stepX = wmW + gap;
    const stepY = wmH + gap;
    const baseW = baseMeta.width ?? 0;
    const baseH = baseMeta.height ?? 0;
    const list: sharp.OverlayOptions[] = [];
    for (let y = -wmH; y < baseH + wmH; y += stepY) {
      for (let x = -wmW; x < baseW + wmW; x += stepX) {
        list.push({ input: prepared.buf, left: Math.round(x), top: Math.round(y), blend });
      }
    }
    return list;
  }

  const gravity = String(extra.gravity ?? 'se') as WatermarkGravity;
  const offsetX = Number(extra.offsetX ?? 3);
  const offsetY = Number(extra.offsetY ?? 3);
  const { left, top } = resolvePosition(gravity, baseMeta.width ?? 0, baseMeta.height ?? 0, wmW, wmH, offsetX, offsetY);
  return [{ input: prepared.buf, left, top, blend }];
}

function resolvePosition(
  gravity: WatermarkGravity,
  baseW: number,
  baseH: number,
  wmW: number,
  wmH: number,
  offsetX: number,
  offsetY: number
): { left: number; top: number } {
  // 边距以「占图片宽/高的百分比」换算成像素，避免不同尺寸图片水印相对大小不一
  const hPx = (offsetX / 100) * baseW;
  const vPx = (offsetY / 100) * baseH;
  let left: number;
  let top: number;
  if (gravity === 'center') {
    left = Math.round((baseW - wmW) / 2);
    top = Math.round((baseH - wmH) / 2);
  } else {
    if (gravity.includes('w')) left = Math.round(hPx);
    else if (gravity.includes('e')) left = Math.round(baseW - wmW - hPx);
    else left = Math.round((baseW - wmW) / 2);
    if (gravity.includes('n')) top = Math.round(vPx);
    else if (gravity.includes('s')) top = Math.round(baseH - wmH - vPx);
    else top = Math.round((baseH - wmH) / 2);
  }
  return { left: Math.max(0, left), top: Math.max(0, top) };
}

async function prepareTextWatermark(extra: Record<string, unknown>): Promise<PreparedWatermark> {
  const text = String(extra.text ?? '');
  const fontSize = Number(extra.fontSize ?? 32);
  const color = String(extra.color ?? '#000000');
  const opacity = clamp(Number(extra.opacity ?? 0.5), 0, 1);
  const bold = Boolean(extra.bold);
  const fontFamily = String(extra.fontFamily ?? 'sans-serif');
  const rotation = Number(extra.rotation ?? 0);

  const chars = [...text];
  const cjk = chars.filter((c) => /[一-鿿]/.test(c)).length;
  const others = chars.length - cjk;
  const estW = Math.max(1, Math.ceil(fontSize * (cjk * 1.0 + others * 0.56) * 1.12) + 8);
  const estH = Math.ceil(fontSize * 1.45);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${estW}" height="${estH}">` +
      `<text x="4" y="${Math.round(fontSize * 1.12)}" font-size="${fontSize}" ` +
      `font-family="${escapeXml(fontFamily)}" font-weight="${bold ? 700 : 400}" ` +
      `fill="${color}" fill-opacity="${opacity}">${escapeXml(text)}</text>` +
      `</svg>`
  );

  let img = sharp(svg);
  if (rotation) img = img.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
  return { buf: data, width: info.width, height: info.height };
}

async function prepareImageWatermark(
  extra: Record<string, unknown>,
  baseMeta: sharp.Metadata
): Promise<PreparedWatermark> {
  const wmPath = String(extra.watermarkPath ?? '');
  if (!wmPath || !existsSync(wmPath)) throw new Error('未选择水印图片');
  const opacity = clamp(Number(extra.opacity ?? 0.5), 0, 1);
  const rotation = Number(extra.rotation ?? 0);
  const scale = clamp(Number(extra.scale ?? 0.2), 0.01, 1);

  const baseMin = Math.min(baseMeta.width ?? 0, baseMeta.height ?? 0) || 1000;
  const targetW = Math.max(8, Math.round(baseMin * scale));

  const resized = sharp(wmPath).ensureAlpha().resize(targetW, null, { withoutEnlargement: false });
  const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
  let wm = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  if (rotation) wm = wm.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const out = await wm.png().toBuffer({ resolveWithObject: true });
  return { buf: out.data, width: out.info.width, height: out.info.height };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;'
  );
}

export function resolveStatic(...segments: string[]): string {
  return join(process.resourcesPath ?? process.cwd(), 'static', ...segments);
}

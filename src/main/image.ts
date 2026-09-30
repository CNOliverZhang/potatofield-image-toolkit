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
      const { width, height, fit = 'inside', background, format, quality } = options;
      const pipeline = sharp(inputPath).resize(width, height, { fit: fit as keyof sharp.FitEnum, background: background ?? '#ffffff' });
      // 支持输出格式与质量（PNG 为无损，quality 无意义，仅在有损格式下传入）
      const applyFormat = (p: sharp.Sharp) =>
        format ? p.toFormat(format as keyof sharp.FormatEnum, quality ? { quality } : {}) : p.png();
      if (outputPath) {
        const out = format ? applyFormat(pipeline) : pipeline;
        await out.toFile(outputPath);
        return { outputPath };
      }
      const buf = await applyFormat(pipeline).toBuffer();
      return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    }
    case 'convert': {
      const { format = 'png', quality } = options;
      const pipeline = sharp(inputPath).toFormat(format as keyof sharp.FormatEnum, quality ? { quality } : {});
      if (outputPath) {
        await pipeline.toFile(outputPath);
        return { outputPath };
      }
      const buf = await pipeline.toBuffer();
      return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    }
    case 'compress': {
      const format = options.format;
      const quality = options.quality ?? 80;
      let img = sharp(inputPath);
      if (format) {
        img = img.toFormat(format as keyof sharp.FormatEnum, { quality });
      } else if (quality !== undefined) {
        const srcFormat = (await sharp(inputPath).metadata()).format;
        if (srcFormat && srcFormat !== 'png' && srcFormat !== 'gif') {
          img = img.toFormat(srcFormat as keyof sharp.FormatEnum, { quality });
        }
      }
      if (outputPath) {
        await img.toFile(outputPath);
        return { outputPath };
      }
      const buf = await img.png().toBuffer();
      return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    }
    case 'extract': {
      const opt = options as Record<string, unknown>;
      const rawLeft = Number(opt.left ?? 0);
      const rawTop = Number(opt.top ?? 0);
      const rawWidth = Number(opt.width ?? 0);
      const rawHeight = Number(opt.height ?? 0);
      const meta = await sharp(inputPath).metadata();
      const iw = meta.width ?? 0;
      const ih = meta.height ?? 0;
      const left = Math.max(0, Math.min(Math.round(rawLeft), Math.max(0, iw - 1)));
      const top = Math.max(0, Math.min(Math.round(rawTop), Math.max(0, ih - 1)));
      const maxW = Math.max(1, iw - left);
      const maxH = Math.max(1, ih - top);
      const width = Math.max(1, Math.min(Math.max(1, Math.round(rawWidth)), maxW));
      const height = Math.max(1, Math.min(Math.max(1, Math.round(rawHeight)), maxH));
      const pipeline = sharp(inputPath).extract({ left, top, width, height });
      if (outputPath) {
        const format = opt.format as string | undefined;
        const quality = opt.quality as number | undefined;
        let out = pipeline;
        if (format) out = out.toFormat(format as keyof sharp.FormatEnum, quality ? { quality } : {});
        await out.toFile(outputPath);
        return { outputPath };
      }
      const buf = await pipeline.png().toBuffer();
      return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    }
    case 'append': {
      // 两种调用约定都支持：
      // 1) extra.images + extra.direction
      // 2) inputPath + extra.srcPaths + options.dir（旧写法）
      const listed = (extra.images as string[]) ?? [];
      const images = listed.length
        ? listed
        : [inputPath, ...((extra.srcPaths as string[]) ?? [])].filter((p): p is string => !!p);
      const direction =
        (extra.direction as 'vertical' | 'horizontal') ??
        (options.dir as 'vertical' | 'horizontal') ??
        'vertical';
      if (!images.length) throw new Error('append 需要 images 列表');
      const metas = await Promise.all(images.map((p) => sharp(p).metadata()));
      const n = images.length;
      const originW = metas.map((m) => m.width ?? 0);
      const originH = metas.map((m) => m.height ?? 0);
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      const bg = parseColor((extra.background as string) ?? (options.background as string));
      // 边距：四周留 margin，图与图之间也留 margin；未指定底色时为透明底
      const margin = Math.max(0, Math.round(Number(extra.margin ?? options.margin ?? 0)) || 0);
      // 对齐：横向拼接统一高度、纵向拼接统一宽度（取各图最大值，只放大不缩小，不损失原图细节）
      const targetH = Math.max(...originH);
      const targetW = Math.max(...originW);
      // 对齐后的各图尺寸（未缩放，即真实输出尺寸）
      const full = images.map((_, i) => {
        const w = originW[i];
        const h = originH[i];
        if (direction === 'horizontal') {
          return { w: h > 0 ? Math.round((w * targetH) / h) : w, h: targetH };
        }
        return { w: targetW, h: w > 0 ? Math.round((h * targetW) / w) : h };
      });
      const fullW =
        direction === 'horizontal'
          ? sum(full.map((f) => f.w)) + margin * (n - 1) + margin * 2
          : Math.max(...full.map((f) => f.w)) + margin * 2;
      const fullH =
        direction === 'vertical'
          ? sum(full.map((f) => f.h)) + margin * (n - 1) + margin * 2
          : Math.max(...full.map((f) => f.h)) + margin * 2;

      // 预览缩放：等比缩小整张拼接结果（避免生成/传输 GB 级预览图）。
      // 双约束：长边上限 + 总像素上限，兼顾极端长图（否则长边受限后短边会被压到几十像素）
      const maxDim = Math.max(0, Math.round(Number(extra.maxDimension ?? options.maxDimension ?? 0)) || 0);
      const k = maxDim
        ? Math.min(
            1,
            maxDim / Math.max(fullW, fullH),
            Math.sqrt(PREVIEW_MAX_PIXELS / Math.max(1, fullW * fullH))
          )
        : 1;
      const scaled = full.map((f) => ({
        w: Math.max(1, Math.round(f.w * k)),
        h: Math.max(1, Math.round(f.h * k))
      }));
      const m = Math.round(margin * k);
      const outW =
        direction === 'horizontal'
          ? sum(scaled.map((s) => s.w)) + m * (n - 1) + m * 2
          : Math.max(...scaled.map((s) => s.w)) + m * 2;
      const outH =
        direction === 'vertical'
          ? sum(scaled.map((s) => s.h)) + m * (n - 1) + m * 2
          : Math.max(...scaled.map((s) => s.h)) + m * 2;

      // 超限会直接失败，这里给中文提示
      if (outW * outH > PIXEL_LIMIT) {
        throw new Error(
          `拼接结果过大：${fullW} × ${fullH}（约 ${Math.round((fullW * fullH) / 1e6)} 百万像素），` +
            `超过 ${Math.floor(PIXEL_LIMIT / 1e6)} 百万像素的上限。请减少图片数量或先缩小图片尺寸。`
        );
      }

      // 一次 resize 同时完成「对齐」与「预览缩放」；尺寸未变时直接用原文件，省一次编解码
      const parts = await Promise.all(
        images.map(async (p, i): Promise<{ input: string | Buffer; width: number; height: number }> => {
          const { w, h } = scaled[i];
          if (originW[i] === w && originH[i] === h) return { input: p, width: w, height: h };
          const buf = await sharp(p).resize({ width: w, height: h, fit: 'fill' }).png().toBuffer();
          return { input: buf, width: w, height: h };
        })
      );
      const composites = parts.map((p, i) => ({
        input: p.input,
        left: direction === 'horizontal' ? m + sum(scaled.slice(0, i).map((s) => s.w)) + m * i : m,
        top: direction === 'vertical' ? m + sum(scaled.slice(0, i).map((s) => s.h)) + m * i : m
      }));
      // JPG 不支持透明：未指定底色时按白底合成，否则透明区会变黑
      const needWhite = options.format === 'jpeg' && !bg;
      const pipeline = sharp({
        create: {
          width: Math.max(1, outW),
          height: Math.max(1, outH),
          channels: 4,
          background: bg ?? (needWhite ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 255, g: 255, b: 255, alpha: 0 })
        }
      }).composite(composites);
      // 支持输出格式与质量（PNG 无损，quality 仅在有损格式下传入）
      const applyFormat = (p: sharp.Sharp) =>
        options.format
          ? p.toFormat(options.format as keyof sharp.FormatEnum, options.quality ? { quality: options.quality } : {})
          : p.png();
      if (outputPath) {
        await applyFormat(pipeline).toFile(outputPath);
        return { outputPath, width: fullW, height: fullH };
      }
      const buf = await applyFormat(pipeline).toBuffer();
      return {
        buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
        width: fullW,
        height: fullH
      };
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

/**
 * 把水印合成到指定位置，并裁剪到底图可见范围内。
 * 允许「溢出」（水印比图片大、或部分在图外），但 sharp 要求 overlay 不得大于底图，
 * 因此这里先按可见区域裁剪再合成；完全不可见时返回 null。
 */
async function clipComposite(
  buf: Buffer,
  wmW: number,
  wmH: number,
  leftRaw: number,
  topRaw: number,
  baseW: number,
  baseH: number
): Promise<sharp.OverlayOptions | null> {
  // 钳制：不允许整个水印都在图外。保留至少「水印自身 40%（不少于 4px）」，
  // 只留边缘几像素会正好落在透明边上，看起来仍像没加上水印。
  const keepW = Math.min(wmW, Math.max(4, Math.round(wmW * 0.4)));
  const keepH = Math.min(wmH, Math.max(4, Math.round(wmH * 0.4)));
  const left = clamp(Math.round(leftRaw), -(wmW - keepW), baseW - keepW);
  const top = clamp(Math.round(topRaw), -(wmH - keepH), baseH - keepH);
  const visLeft = Math.max(0, left);
  const visTop = Math.max(0, top);
  const visRight = Math.min(baseW, left + wmW);
  const visBottom = Math.min(baseH, top + wmH);
  const w = visRight - visLeft;
  const h = visBottom - visTop;
  if (w < 1 || h < 1) return null;
  // 完全在图内时无需裁剪
  if (w === wmW && h === wmH) {
    return { input: buf, left, top, blend: 'over' };
  }
  const part = await sharp(buf)
    .extract({ left: visLeft - left, top: visTop - top, width: w, height: h })
    .png()
    .toBuffer();
  return { input: part, left: visLeft, top: visTop, blend: 'over' };
}

async function buildWatermarkComposites(
  inputPath: string,
  extra: Record<string, unknown>
): Promise<sharp.OverlayOptions[]> {
  const baseMeta = await sharp(inputPath).metadata();
  const baseW = baseMeta.width ?? 0;
  const baseH = baseMeta.height ?? 0;
  const type = extra.type === 'image' ? 'image' : 'text';
  const unit: 'percent' | 'pixel' = extra.positionUnit === 'pixel' ? 'pixel' : 'percent';

  // 水印本体：百分比模式下大小按「占图片宽度的百分比」计算，像素模式沿用 px 字号 / 相对短边比例
  const prepared: PreparedWatermark =
    type === 'text'
      ? await prepareTextWatermark(extra, unit === 'percent' ? baseW : 0)
      : await prepareImageWatermark(extra, baseMeta, unit === 'percent' ? baseW : 0);

  // 去掉水印周围的透明留白：边距与「不允许全部在图外」的判定都因此更贴合实际内容
  try {
    const t = await sharp(prepared.buf).trim().png().toBuffer({ resolveWithObject: true });
    if (t.info.width > 0 && t.info.height > 0) {
      prepared.buf = t.data;
      prepared.width = t.info.width;
      prepared.height = t.info.height;
    }
  } catch {
    /* 整图透明时 trim 会失败，忽略并沿用原图 */
  }

  const wmW = prepared.width;
  const wmH = prepared.height;

  if (extra.tile) {
    // 平铺：逐块裁剪，超出的部分由 clipComposite 处理
    const gap = Number(extra.tileGap ?? 40);
    const stepX = wmW + gap;
    const stepY = wmH + gap;
    const list: sharp.OverlayOptions[] = [];
    for (let y = -wmH; y < baseH + wmH; y += stepY) {
      for (let x = -wmW; x < baseW + wmW; x += stepX) {
        const c = await clipComposite(prepared.buf, wmW, wmH, x, y, baseW, baseH);
        if (c) list.push(c);
      }
    }
    return list;
  }

  const gravity = String(extra.gravity ?? 'se') as WatermarkGravity;
  const offsetX = Number(extra.offsetX ?? 3);
  const offsetY = Number(extra.offsetY ?? 3);
  const offsetXPx = Number(extra.offsetXPx ?? 0);
  const offsetYPx = Number(extra.offsetYPx ?? 0);
  const { left, top } = resolvePosition(gravity, baseW, baseH, wmW, wmH, {
    unit,
    percent: { x: offsetX, y: offsetY },
    pixel: { x: offsetXPx, y: offsetYPx }
  });
  const c = await clipComposite(prepared.buf, wmW, wmH, left, top, baseW, baseH);
  return c ? [c] : [];
}

interface WatermarkOffset {
  unit: 'percent' | 'pixel';
  percent: { x: number; y: number };
  pixel: { x: number; y: number };
}

function resolvePosition(
  gravity: WatermarkGravity,
  baseW: number,
  baseH: number,
  wmW: number,
  wmH: number,
  offset: WatermarkOffset
): { left: number; top: number } {
  // 百分比模式：边距 = 占图片宽/高的百分比；像素模式：边距即绝对像素（可为负，表示溢出到图外）
  const hPx =
    offset.unit === 'percent' ? (offset.percent.x / 100) * baseW : offset.pixel.x;
  const vPx =
    offset.unit === 'percent' ? (offset.percent.y / 100) * baseH : offset.pixel.y;
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
  // 不再钳到 [0, ...]：允许溢出，最终由 clipComposite 保证至少 1px 可见
  return { left, top };
}

/**
 * 文字水印。
 * targetWidth > 0 时按「水印整体宽度占图片宽度的百分比」反算字号：
 * 先按当前字号渲染一次量出实际宽度，再按比例缩放字号重新渲染（librsvg 渲染结果为准，比估算准确）。
 */
async function prepareTextWatermark(
  extra: Record<string, unknown>,
  targetWidth = 0
): Promise<PreparedWatermark> {
  const text = String(extra.text ?? '');
  let fontSize = Number(extra.fontSize ?? 32);
  if (targetWidth > 0) {
    const sizePct = clamp(Number(extra.sizePct ?? 20), 1, 500);
    const want = Math.max(1, (targetWidth * sizePct) / 100);
    const probe = await renderTextWatermark(extra, fontSize);
    if (probe.width > 0) {
      fontSize = Math.max(8, Math.round((fontSize * want) / probe.width));
    }
  }
  const rendered = await renderTextWatermark(extra, fontSize);
  return rendered;
}

async function renderTextWatermark(
  extra: Record<string, unknown>,
  fontSize: number
): Promise<PreparedWatermark> {
  const text = String(extra.text ?? '');
  const color = String(extra.color ?? '#000000');
  const opacity = clamp(Number(extra.opacity ?? 0.5), 0, 1);
  const bold = Boolean(extra.bold);
  const fontFamily = String(extra.fontFamily ?? 'sans-serif');
  // 字重优先用显式传入的数值；未传时按旧的 bold 开关推断（兼容历史参数）
  const fontWeight = Math.min(900, Math.max(100, Number(extra.fontWeight ?? (bold ? 700 : 400)) || 400));
  const rotation = Number(extra.rotation ?? 0);

  const chars = [...text];
  const cjk = chars.filter((c) => /[一-鿿]/.test(c)).length;
  const others = chars.length - cjk;
  const estW = Math.max(1, Math.ceil(fontSize * (cjk * 1.0 + others * 0.56) * 1.12) + 8);
  const estH = Math.ceil(fontSize * 1.45);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${estW}" height="${estH}">` +
      `<text x="4" y="${Math.round(fontSize * 1.12)}" font-size="${fontSize}" ` +
      `font-family="${escapeXml(fontFamily)}" font-weight="${fontWeight}" ` +
      `fill="${color}" fill-opacity="${opacity}">${escapeXml(text)}</text>` +
      `</svg>`
  );

  let img = sharp(svg);
  if (rotation) img = img.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  // 裁掉 SVG 画布与旋转产生的透明留白：让「占图片宽度百分比」按实际内容计算
  img = img.trim();
  const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
  return { buf: data, width: info.width, height: info.height };
}

async function prepareImageWatermark(
  extra: Record<string, unknown>,
  baseMeta: sharp.Metadata,
  targetWidth = 0
): Promise<PreparedWatermark> {
  const wmPath = String(extra.watermarkPath ?? '');
  if (!wmPath || !existsSync(wmPath)) throw new Error('未选择水印图片');
  const opacity = clamp(Number(extra.opacity ?? 0.5), 0, 1);
  const rotation = Number(extra.rotation ?? 0);
  const scale = clamp(Number(extra.scale ?? 0.2), 0.01, 1);

  // 百分比模式：宽度 = 图片宽度 × sizePct%；像素模式：沿用「相对原图短边比例」
  const targetW =
    targetWidth > 0
      ? Math.max(8, Math.round((targetWidth * clamp(Number(extra.sizePct ?? 20), 1, 500)) / 100))
      : Math.max(8, Math.round((Math.min(baseMeta.width ?? 0, baseMeta.height ?? 0) || 1000) * scale));

  const resized = sharp(wmPath).ensureAlpha().resize(targetW, null, { withoutEnlargement: false });
  const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
  let wm = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  if (rotation) wm = wm.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  wm = wm.trim();
  const out = await wm.png().toBuffer({ resolveWithObject: true });
  return { buf: out.data, width: out.info.width, height: out.info.height };
}

/** libvips 默认像素上限（约 268MP），超过后无法输出 */
const PIXEL_LIMIT = 268402689;
/** 预览图的最大像素数（仅预览缩放时生效）：兼顾清晰度与 IPC 传输体积 */
const PREVIEW_MAX_PIXELS = 6_000_000;

/** 解析 #rgb / #rrggbb / rgb(...) 颜色；不支持时返回 null（按透明处理） */
function parseColor(input?: string): { r: number; g: number; b: number; alpha: number } | null {
  if (!input) return null;
  const s = String(input).trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6 || /[^0-9a-fA-F]/.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      alpha: 1
    };
  }
  const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), alpha: 1 };
  return null;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;'
  );
}

export function resolveStatic(...segments: string[]): string {
  return join(process.resourcesPath ?? process.cwd(), 'static', ...segments);
}

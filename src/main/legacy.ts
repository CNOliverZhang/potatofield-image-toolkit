import { app } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { TemplateItem, WatermarkParams } from '../shared/types';
import { appDataDir } from './templateAssets';
import { saveTemplateAsset } from './templateAssets';

/**
 * 旧版本（3.x）数据迁移。
 *
 * 老版本用 vuex-electron 的 createPersistedState 把状态写成 userData/vuex.json，
 * 且 appId 与新版完全相同（cn.potatofield.imagetoolkit）—— 因此 userData 是同一目录，
 * 直接读文件即可，不需要跨应用找路径。
 *
 * 迁移范围：watermark.templates（水印）与 globalWatermark.templates（全屏水印，
 * 新版已合并为水印工具的一个选项，差异仅为 tile=true）。
 *
 * 老版字段（实测）与新版对应关系见 mapWatermark 的注释。
 */

/** 老版九宫格位置 → 新版 gravity */
const POSITION_TO_GRAVITY: Record<string, WatermarkParams['gravity']> = {
  'left-top': 'nw',
  top: 'n',
  'right-top': 'ne',
  left: 'w',
  center: 'center',
  right: 'e',
  'left-bottom': 'sw',
  bottom: 's',
  'right-bottom': 'se'
};

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampSize(n: number): number {
  return Math.min(200, Math.max(1, n));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * 老版 relativeFontSize 的单位是「单个字占图片宽度的百分比」，
 * 新版 sizePct 是「整行文字占图片宽度的百分比」—— 两者相差一个字数倍率。
 * 这里按可视字符数换算（忽略 emoji 变体选择符等不占字宽的组合符）。
 */
function textUnits(text: string): number {
  const clean = text.replace(/[\uFE00-\uFE0F\u200D]/g, '');
  return Math.max(1, Array.from(clean).length);
}

/** 老版颜色是 rgba() 字符串：拆出十六进制色值与透明度（新版色值与不透明度分开存） */
function parseColor(value: unknown): { color: string; alpha: number } {
  const raw = String(value ?? 'rgba(255, 255, 255, 1)');
  const nums = raw.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return { color: '#ffffff', alpha: 1 };
  const [r, g, b] = nums.map((n) => Math.round(Number(n)));
  const alpha = nums.length > 3 ? clamp01(Number(nums[3])) : 1;
  const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return { color: hex, alpha };
}

/**
 * 老版一条模板 → 新版参数。
 *
 * 老版没有 type 字段：image 非空即为图片水印，否则为文字水印。
 * 文字水印用 position/offsetX/offsetY/relativeFontSize/color/font；
 * 图片水印用 imagePosition/imageOffsetX/imageOffsetY/imageSize/imageOpacity/imageRotation。
 *
 * 老版的 writingMode / textAlign / lineHeight / letterSpacing / backgroundSize /
 * backgroundColor / textShadow* 在新版没有对应能力，忽略（不影响可用参数）。
 */
function mapWatermark(raw: Record<string, unknown>, tile: boolean, imageField: string): WatermarkParams {
  const isImage = typeof raw.image === 'string' && raw.image.length > 0;
  const { color, alpha } = parseColor(raw.color);
  const gravity = POSITION_TO_GRAVITY[String(isImage ? raw.imagePosition : raw.position)] ?? 'southeast';

  return {
    type: isImage ? 'image' : 'text',
    text: String(raw.text ?? ''),
    fontSize: num(raw.relativeFontSize, 3) > 0 ? 48 : 48, // 新版字号由 sizePct 反算，这里给安全值
    color,
    opacity: isImage ? clamp01(num(raw.imageOpacity, 1)) : alpha,
    bold: false,
    fontFamily: String(raw.font ?? ''),
    rotation: num(isImage ? raw.imageRotation : raw.rotation, 0),
    gravity,
    positionUnit: 'percent',
    offsetX: num(isImage ? raw.imageOffsetX : raw.offsetX, 0),
    offsetY: num(isImage ? raw.imageOffsetY : raw.offsetY, 0),
    sizePct: clampSize(num(raw.relativeFontSize, 3) * textUnits(String(raw.text ?? ''))),
    scale: clamp01(num(raw.imageSize, 10) / 100),
    tile,
    watermarkPath: imageField,
    tileGap: 0,
    format: 'original',
    quality: 90
  } as unknown as WatermarkParams;
}

/** 图片水印：把老版存的水印图收编进新版素材目录，模板只记文件名 */
function collectImage(raw: Record<string, unknown>): string {
  const source = typeof raw.image === 'string' ? raw.image : '';
  if (!source || !existsSync(source)) return '';
  const saved = saveTemplateAsset(source);
  return saved?.fileName ?? '';
}

function toTemplateItem(raw: unknown, tile: boolean): TemplateItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const params = mapWatermark(r, tile, collectImage(r));
  const now = Date.now();
  return {
    id: `legacy-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(r.title ?? '未命名模板'),
    createdAt: now,
    updatedAt: now,
    params: params as unknown as Record<string, unknown>,
    legacy: true
  };
}

/** 读取旧版本模板；无旧数据或读取失败返回空数组 */
export function importLegacyTemplates(): TemplateItem[] {
  try {
    const file = join(appDataDir(), 'vuex.json');
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
      state?: {
        watermark?: { templates?: unknown[] };
        globalWatermark?: { templates?: unknown[] };
      };
    };
    const items: TemplateItem[] = [];
    for (const raw of parsed.state?.watermark?.templates ?? []) {
      const item = toTemplateItem(raw, false);
      if (item) items.push(item);
    }
    for (const raw of parsed.state?.globalWatermark?.templates ?? []) {
      const item = toTemplateItem(raw, true);
      if (item) items.push(item);
    }
    return items;
  } catch {
    return [];
  }
}

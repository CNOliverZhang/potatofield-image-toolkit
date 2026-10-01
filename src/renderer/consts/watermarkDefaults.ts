import type { WatermarkParams } from '@shared/types';
import { createOutputOpts } from '@renderer/composables/useOutputSettings';

/**
 * 水印参数的默认值（单一来源）。
 *
 * 三处使用：水印单图工具页、水印模板编辑窗口、（批量页另有自己的默认值：批量默认保持原格式）。
 * 输出格式/质量默认取设置页的「默认输出」，与其它工具保持一致。
 */
export function defaultWatermarkParams(): WatermarkParams {
  const out = createOutputOpts();
  return {
    type: 'text',
    text: '洋芋田',
    fontSize: 48,
    color: '#ffffff',
    opacity: 0.5,
    bold: true,
    fontFamily: 'sans-serif',
    rotation: 0,
    gravity: 'se',
    positionUnit: 'percent',
    sizePct: 20,
    offsetX: 5,
    offsetY: 5,
    offsetXPx: 20,
    offsetYPx: 20,
    tile: false,
    tileGap: 60,
    watermarkPath: '',
    scale: 0.25,
    format: out.format,
    quality: out.quality
  };
}

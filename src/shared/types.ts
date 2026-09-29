export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'tiff' | 'gif' | 'avif';

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: ImageFormat;
  quality?: number;
  background?: string;
  /** 裁剪区域（op='extract'） */
  left?: number;
  top?: number;
  /** 拼接方向（op='append'） */
  dir?: 'vertical' | 'horizontal';
}

export type ImageProcessOp =
  | 'resize'
  | 'convert'
  | 'compress'
  | 'metadata'
  | 'watermark'
  | 'append'
  | 'extract';

export interface ImageProcessPayload {
  op: ImageProcessOp;
  inputPath: string;
  outputPath?: string;
  options?: ImageProcessOptions;
  extra?: Record<string, unknown>;
}

export interface ImageProcessResult {
  outputPath?: string;
  info?: Record<string, unknown>;
  buffer?: ArrayBuffer;
  /** 读取元数据时返回的完整元数据（op='metadata'） */
  tags?: Record<string, unknown>;
}

export interface SelectFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiSelections?: boolean;
}

export interface UpdaterStatus {
  event: 'checking' | 'available' | 'not-available' | 'progress' | 'downloaded' | 'error';
  data?: unknown;
}

/* ----------------------------- 水印工具 ----------------------------- */

export type WatermarkGravity = 'nw' | 'n' | 'ne' | 'w' | 'center' | 'e' | 'sw' | 's' | 'se';

export interface WatermarkParams {
  type: 'text' | 'image';
  /** 文本内容（type=text） */
  text: string;
  fontSize: number;
  color: string;
  /** 0..1 */
  opacity: number;
  bold: boolean;
  fontFamily: string;
  /** 文字字重（数值字符串，如 "400"/"700"/"900"）；缺省时导出按 bold 推断 */
  fontWeight?: string;
  /** 旋转角度（度） */
  rotation: number;
  gravity: WatermarkGravity;
  /** 水平内边距，占图片宽度百分比（0..100），仅非平铺且定位含左/右时生效 */
  offsetX: number;
  /** 垂直内边距，占图片高度百分比（0..100），仅非平铺且定位含上/下时生效 */
  offsetY: number;
  /** 是否平铺铺满整图 */
  tile: boolean;
  /** 平铺间距（px） */
  tileGap: number;
  /** 水印图片路径（type=image） */
  watermarkPath: string;
  /** 相对原图短边的缩放比例 0..1（type=image） */
  scale: number;
  format: 'original' | 'png' | 'jpeg' | 'webp';
  quality: number;
}

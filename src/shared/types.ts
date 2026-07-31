export interface ImageProcessOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'tiff' | 'gif' | 'avif';
  quality?: number;
  background?: string;
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
  /** 旋转角度（度） */
  rotation: number;
  gravity: WatermarkGravity;
  /** 距边缘的内边距（px），仅非平铺时生效 */
  offset: number;
  /** 是否平铺铺满整图 */
  tile: boolean;
  /** 平铺间距（px） */
  tileGap: number;
  /** 水印图片路径（type=image） */
  watermarkPath: string;
  /** 相对原图短边的缩放比例 0..1（type=image） */
  scale: number;
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
}

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

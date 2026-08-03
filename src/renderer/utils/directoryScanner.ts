import { IMAGE_EXTENSIONS } from './filePicker';

export interface ScanResult {
  fileList: string[];
  errorList: { path: string; error: string }[];
}

/**
 * 批量导入列表中的单条记录。
 * - path: 文件绝对路径（用于读取/预览/处理）
 * - rel: 该文件相对「导入时所选源根目录」的位置（含子目录与文件名）；
 *        通过「选择文件」导入时，没有共同根目录，rel 仅取文件名。
 *   rel 用于在开启「保持相对目录」时，将文件按原目录结构整体还原到保存位置下。
 */
export interface BatchItem {
  path: string;
  rel: string;
}

export async function scanDirectory(dir: string, extensions: string[] = IMAGE_EXTENSIONS): Promise<ScanResult> {
  return window.api.fs.scanDirectory(dir, extensions);
}

export async function scanImageDirectory(dir: string): Promise<ScanResult> {
  return scanDirectory(dir, IMAGE_EXTENSIONS);
}

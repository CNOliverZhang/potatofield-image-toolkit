import { IMAGE_EXTENSIONS } from './filePicker';

export interface ScanResult {
  fileList: string[];
  errorList: { path: string; error: string }[];
}

export async function scanDirectory(dir: string, extensions: string[] = IMAGE_EXTENSIONS): Promise<ScanResult> {
  return window.api.fs.scanDirectory(dir, extensions);
}

export async function scanImageDirectory(dir: string): Promise<ScanResult> {
  return scanDirectory(dir, IMAGE_EXTENSIONS);
}

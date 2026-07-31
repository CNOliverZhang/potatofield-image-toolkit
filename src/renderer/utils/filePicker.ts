import type { SelectFileOptions } from '@shared/types';

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif'];

export async function selectImageFiles(multi = true, defaultPath?: string): Promise<string[] | null> {
  return window.api.dialog.selectFile({
    title: '选择图片',
    defaultPath,
    filters: [{ name: '图片', extensions: IMAGE_EXTENSIONS }],
    multiSelections: multi
  });
}

export async function selectFile(options: SelectFileOptions): Promise<string[] | null> {
  return window.api.dialog.selectFile(options);
}

export async function selectDirectory(defaultPath?: string): Promise<string | null> {
  return window.api.dialog.selectDirectory(defaultPath);
}

import { promises as fsp, existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

export interface ScanResult {
  fileList: string[];
  errorList: { path: string; error: string }[];
}

export async function scanDirectory(root: string, extensions: string[] = []): Promise<ScanResult> {
  const exts = extensions.map((e) => e.toLowerCase().replace(/^\./, ''));
  const fileList: string[] = [];
  const errorList: { path: string; error: string }[] = [];

  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      errorList.push({ path: dir, error: (err as Error).message });
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile()) {
          if (!exts.length || exts.includes(extname(entry.name).toLowerCase().replace(/^\./, ''))) {
            fileList.push(full);
          }
        }
      } catch (err) {
        errorList.push({ path: full, error: (err as Error).message });
      }
    }
  };

  await walk(root);
  return { fileList, errorList };
}

export function readFileBase64(path: string): string {
  const buf = readFileSync(path);
  return buf.toString('base64');
}

export async function writeFileBase64(path: string, base64: string): Promise<void> {
  const buf = Buffer.from(base64, 'base64');
  await fsp.writeFile(path, buf);
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function fileStat(path: string): { size: number; isDirectory: boolean } | null {
  try {
    const s = statSync(path);
    return { size: s.size, isDirectory: s.isDirectory() };
  } catch {
    return null;
  }
}

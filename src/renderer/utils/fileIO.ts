export function readFileBase64(path: string): Promise<string> {
  return window.api.fs.readFileBase64(path);
}

export function writeFileBase64(path: string, base64: string): Promise<void> {
  return window.api.fs.writeFileBase64(path, base64);
}

export function ensureDir(path: string): Promise<void> {
  return window.api.fs.ensureDir(path);
}

export function fileExists(path: string): Promise<boolean> {
  return window.api.fs.exists(path);
}

export function buildOutputPath(defaultDir: string, fileName: string): string {
  const dir = defaultDir.endsWith('/') || defaultDir.endsWith('\\') ? defaultDir : `${defaultDir}/`;
  return `${dir}${fileName}`;
}

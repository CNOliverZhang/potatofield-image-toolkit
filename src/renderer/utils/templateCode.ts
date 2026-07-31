import CryptoJS from 'crypto-js';

const SECRET = 'potatofield-image-toolkit-template';

export function encodeTemplate(obj: unknown): string {
  return CryptoJS.AES.encrypt(JSON.stringify(obj), SECRET).toString();
}

export function decodeTemplate<T = unknown>(code: string): T | null {
  try {
    const bytes = CryptoJS.AES.decrypt(code, SECRET);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

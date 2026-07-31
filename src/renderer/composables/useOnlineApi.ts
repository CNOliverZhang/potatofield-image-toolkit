import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://api.potatofield.cn',
  timeout: 15000
});

export async function getFontList(): Promise<any[]> {
  const { data } = await instance.get('/font_library/font/list');
  return data?.data?.list ?? [];
}

export async function downloadFont(font: { fontFile?: string }): Promise<ArrayBuffer> {
  if (!font.fontFile) throw new Error('字体文件地址缺失');
  const resp = await axios.get(font.fontFile, { responseType: 'arraybuffer' });
  return resp.data as ArrayBuffer;
}

export async function getMessageList(): Promise<any[]> {
  const { data } = await instance.get('/image_toolkit/message/list');
  return data?.data?.list ?? [];
}

export async function getLatestMessage(): Promise<any> {
  const { data } = await instance.get('/image_toolkit/message/latest');
  return data?.data ?? null;
}

export async function getVersions(): Promise<any[]> {
  const { data } = await instance.get('/image_toolkit/version/list');
  return data?.data?.list ?? [];
}

export function getPlatform(): 'win' | 'mac' | 'other' {
  const p = navigator.platform.toLowerCase();
  if (p.includes('win')) return 'win';
  if (p.includes('mac')) return 'mac';
  return 'other';
}

export async function registerClient(payload: {
  identifier: string;
  version: string;
  platform: string;
}): Promise<void> {
  await instance.post('/image_toolkit/client/register', payload);
}

export async function reportUsage(payload: { identifier: string; tool: string }): Promise<void> {
  try {
    await instance.post('/image_toolkit/usage', payload);
  } catch {
    /* noop */
  }
}

import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://api.potatofield.cn',
  timeout: 15000
});

// ── 字体库（/font_library 前缀） ──────────────────────────────

/** 获取在线字体列表 */
export async function getFontList(): Promise<any[]> {
  const { data } = await instance.get('/font_library/font/list');
  return data?.data?.list ?? [];
}

/** 下载字体文件（返回 ArrayBuffer） */
export async function downloadFont(font: { fontFile?: string }): Promise<ArrayBuffer> {
  if (!font.fontFile) throw new Error('字体文件地址缺失');
  const resp = await axios.get(font.fontFile, { responseType: 'arraybuffer' });
  return resp.data as ArrayBuffer;
}

/** 获取随机字体 */
export async function getRandomFont(): Promise<any> {
  const { data } = await instance.get('/font_library/font/random');
  return data?.data ?? null;
}

// ── 图像工具箱（/image_toolkit 前缀） ─────────────────────────

/** 获取消息列表 */
export async function getMessageList(): Promise<any[]> {
  const { data } = await instance.get('/image_toolkit/message/list');
  return data?.data?.list ?? [];
}

/** 获取最新消息 */
export async function getLatestMessage(): Promise<any> {
  const { data } = await instance.get('/image_toolkit/message/latest');
  return data?.data ?? null;
}

/** 获取版本列表 */
export async function getVersions(): Promise<any[]> {
  const { data } = await instance.get('/image_toolkit/version/list');
  return data?.data?.list ?? [];
}

/** 获取最新版本信息 */
export async function getLatestVersion(): Promise<any> {
  const { data } = await instance.get('/image_toolkit/version/latest');
  return data?.data ?? null;
}

/** 获取工具列表 */
export async function getToolList(): Promise<any[]> {
  const { data } = await instance.get('/image_toolkit/tool/list');
  return data?.data?.list ?? [];
}

/**
 * 注册客户端（同时记录一次 usage，无需单独上报端点）
 * identifier 需经 AES 加密且包含 'potatofield'（与老版本兼容）
 */
export async function registerClient(payload: {
  identifier: string;
  version: string;
  platform: string;
}): Promise<void> {
  await instance.post('/image_toolkit/client/register', payload);
}

// ── 工具方法 ──────────────────────────────────────────────────

export function getPlatform(): 'win' | 'mac' | 'other' {
  const p = navigator.platform.toLowerCase();
  if (p.includes('win')) return 'win';
  if (p.includes('mac')) return 'mac';
  return 'other';
}

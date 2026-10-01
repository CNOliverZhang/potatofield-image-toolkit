import { app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import CryptoJS from 'crypto-js';

/**
 * 数据上报（沿用老版本 3.x 的机制）。
 *
 * 老版本在首页挂载时 POST /image_toolkit/client/register，后端据此：
 *   1. 首次出现的 identifier → 新建 client（累计安装数）；
 *   2. 每次调用 → 写一条 ImageToolkit_usage（活跃数按 client 去重统计）。
 *
 * 两个老版本遗留的硬约束（不满足会被后端判为 400）：
 *   1. identifier 的明文必须包含 'potatofield'；
 *   2. identifier 必须用**当前版本号**作为 AES 密钥 —— 后端首次入库前用
 *      AES.decrypt(identifier, version) 校验，密钥不对即 invalid identifier。
 *
 * 放在主进程做的原因：渲染层每个窗口（主窗口 / 独立模板窗口 / 批量窗口）
 * 都会挂载 App.vue，若在那儿上报，开几个窗口就会重复记几条 usage。
 */

const API_BASE = 'https://api.potatofield.cn';

function clientFile(): string {
  return join(app.getPath('userData'), 'client.json');
}

function readStored(): string | null {
  try {
    const file = clientFile();
    if (!existsSync(file)) return null;
    const id = (JSON.parse(readFileSync(file, 'utf8')) as { identifier?: unknown }).identifier;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

function writeStored(identifier: string): void {
  try {
    writeFileSync(clientFile(), JSON.stringify({ identifier }));
  } catch {
    /* 写不进去也只是下次重新生成，不影响使用 */
  }
}

/**
 * 复用老版本（3.x）的 identifier：老版本用 vuex-electron 把状态写成
 * userData/vuex.json，且 appId 与新版相同，所以这里是同一个目录。
 * 复用可以让升级上来的老用户保持同一个身份，不会被重复计成新用户。
 */
function legacyIdentifier(): string | null {
  try {
    const file = join(app.getPath('userData'), 'vuex.json');
    if (!existsSync(file)) return null;
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
      state?: { settings?: { identifier?: unknown } };
    };
    const id = parsed.state?.settings?.identifier;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

/** 生成 identifier：明文含 'potatofield'，AES 密钥为当前版本号（与老版本一致） */
function generateIdentifier(version: string): string {
  return CryptoJS.AES.encrypt(`potatofield${new Date()}${Math.random()}`, version).toString();
}

/** 启动时上报一次；离线或接口异常都静默忽略，不影响软件使用 */
export async function reportUsage(): Promise<void> {
  // 开发模式不上报：避免调试启动污染线上统计数据
  if (!app.isPackaged) {
    console.log('[usage] 开发模式，跳过上报');
    return;
  }
  const version = app.getVersion();
  let identifier = readStored() ?? legacyIdentifier();
  if (!identifier) {
    identifier = generateIdentifier(version);
    writeStored(identifier);
  }
  try {
    await axios.post(
      `${API_BASE}/image_toolkit/client/register`,
      // platform 用 Node 的取值（darwin / win32 / linux），与老版本 os.platform() 一致
      { identifier, version, platform: process.platform },
      { timeout: 15000 }
    );
    console.log('[usage] 上报成功', version, process.platform);
  } catch (err) {
    console.warn('[usage] 上报失败：', err instanceof Error ? err.message : String(err));
  }
}

import { ref } from 'vue';
import { useDialog } from './useDialog';

/**
 * 全局更新流程（单例）。
 *
 * 之前检查更新的状态与弹窗都写在设置页里，导致「启动时的自动检查」无人接住：
 * 主进程 3 秒后 checkForUpdates，发现新版本广播 'available'，但用户停在首页时
 * 设置页并未挂载，提示永远不会出现（只有手动进设置页检查才有反应）。
 * 现在状态与「发现新版本 → 下载 → 安装」的弹窗流程提升到这里，
 * 由 App.vue 在启动时接管；设置页复用同一份状态展示按钮，不再自行订阅。
 */

export type UpdaterPhase = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateInfo {
  version?: string;
  releaseNotes?: unknown;
}

const phase = ref<UpdaterPhase>('idle');
const progress = ref(0);
const availableInfo = ref<UpdateInfo | null>(null);

/** 是否已注册全局监听 */
let started = false;
/**
 * 「已是最新版本 / 检查失败」这类终态提示只在**用户手动检查**时弹出：
 * 启动时的自动检查若每次都弹「当前已是最新版本」，等于每次开机都噪音一次；
 * 失败（典型是离线）同理。手动检查前置位，收到终态后复位。
 */
let announceIdle = false;

/** electron-updater 的 releaseNotes 可能是字符串，也可能是 { note } 数组 */
function releaseNotesText(info: UpdateInfo | null): string {
  const notes = info?.releaseNotes;
  if (!notes) return '';
  if (Array.isArray(notes)) {
    return notes
      .map((item) => (item as { note?: string } | undefined)?.note ?? '')
      .filter(Boolean)
      .join('\n');
  }
  return String(notes);
}

async function promptDownload(): Promise<void> {
  const { confirm } = useDialog();
  const notes = releaseNotesText(availableInfo.value);
  const ok = await confirm(
    `发现新版本 ${availableInfo.value?.version ?? ''}${notes ? `\n\n${notes}` : ''}`,
    '发现新版本'
  );
  if (!ok) {
    phase.value = 'idle';
    return;
  }
  await window.api.updater.download();
}

async function promptInstall(): Promise<void> {
  const { confirm } = useDialog();
  const ok = await confirm('新版本已下载完成，是否退出并安装更新？', '更新就绪');
  if (!ok) {
    phase.value = 'idle';
    return;
  }
  await window.api.updater.quitAndInstall();
}

/** 注册全局更新状态监听（幂等，App.vue 启动时调用一次即可） */
export function startUpdaterWatcher(): void {
  if (started) return;
  started = true;
  const { message } = useDialog();

  window.api.updater.onStatus((status) => {
    const data = status.data as Record<string, unknown> | undefined;
    const prevPhase = phase.value;
    switch (status.event) {
      case 'checking':
        phase.value = 'checking';
        break;
      case 'not-available':
        phase.value = 'idle';
        if (announceIdle) {
          announceIdle = false;
          message('当前已是最新版本', 'success');
        }
        break;
      case 'available':
        availableInfo.value = (data ?? null) as UpdateInfo | null;
        phase.value = 'available';
        void promptDownload();
        break;
      case 'progress':
        phase.value = 'downloading';
        progress.value = Math.round(Number(data?.percent ?? 0));
        break;
      case 'downloaded':
        phase.value = 'downloaded';
        void promptInstall();
        break;
      case 'error':
        phase.value = 'error';
        // 下载中途失败要告知；启动自动检查的失败（典型是离线）保持安静
        if (announceIdle || prevPhase === 'downloading') {
          announceIdle = false;
          message(`更新出错：${data ?? '未知错误'}`, 'error');
        }
        break;
      default:
        break;
    }
  });
}

/** 手动检查（设置页按钮）：与启动自动检查不同，终态要给提示 */
export async function manualCheckForUpdates(): Promise<void> {
  if (phase.value === 'checking' || phase.value === 'downloading') return;
  if (!(await window.api.app.isPackaged())) {
    const { message } = useDialog();
    message('开发模式下不支持检查更新，需打包后运行', 'info');
    return;
  }
  announceIdle = true;
  phase.value = 'checking';
  await window.api.updater.check();
}

/** 供设置页复用的状态与动作 */
export function useUpdaterState() {
  return { phase, progress, availableInfo, promptDownload, promptInstall };
}

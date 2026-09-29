<template>
  <div class="settings">
    <h2>设置</h2>

    <div class="group-title">外观</div>
    <div class="row">
      <span class="label">主题色</span>
      <input
        class="color-input"
        type="color"
        :value="settings.themeColor"
        @input="onColor"
      />
      <span class="value">{{ settings.themeColor }}</span>
    </div>
    <div class="row">
      <span class="label">深色模式</span>
      <fluent-switch
        :checked="settings.darkMode"
        @change="onDark"
      ></fluent-switch>
    </div>

    <div class="group-title">文件</div>
    <div class="row">
      <span class="label">文件默认保存地址</span>
      <fluent-text-field
        class="dir-field"
        :value="settings.defaultSaveDirectory"
        readonly
      ></fluent-text-field>
      <fluent-button appearance="neutral" @click="pickDir">选择</fluent-button>
    </div>

    <div class="group-title">默认输出</div>
    <div class="row">
      <span class="label">输出格式</span>
      <fluent-select class="out-select" :value="settings.defaultOutput.format" @change="onFormat">
        <fluent-option value="original">保持原格式</fluent-option>
        <fluent-option value="png">PNG（无损）</fluent-option>
        <fluent-option value="jpeg">JPG（有损）</fluent-option>
        <fluent-option value="webp">WebP（有损）</fluent-option>
      </fluent-select>
    </div>
    <!-- 默认质量是通用默认值（工具里选 JPG/WebP 时才会用到），因此始终显示 -->
    <div class="row">
      <span class="label">默认质量</span>
      <fluent-slider
        class="out-slider"
        :value="settings.defaultOutput.quality"
        :min="10"
        :max="100"
        :step="1"
        @change="onQuality"
      ></fluent-slider>
      <span class="value">{{ settings.defaultOutput.quality }}%</span>
    </div>
    <p class="hint">作为「改尺寸 / 压缩 / 格式转换 / 切片」等工具新增图片时的初始设置，工具内可单独修改。</p>

    <div class="group-title">关于</div>
    <div class="row">
      <span class="label">版本</span>
      <span class="value">{{ version }}</span>
      <button class="link-btn" @click="onUpdateClick">{{ updateLabel }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { selectDirectory } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';
import type { DefaultOutputFormat } from '@renderer/stores/settings';

const settings = useSettingsStore();
const { confirm, message } = useDialog();
const version = ref('');

/* ───────────────── 检查更新 ───────────────── */
type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

const phase = ref<UpdatePhase>('idle');
const progress = ref(0);
let availableInfo: { version?: string; releaseNotes?: unknown } | null = null;
let packaged = false;
let unsubscribe: (() => void) | null = null;

const updateLabel = computed(() => {
  switch (phase.value) {
    case 'checking':
      return '检查中…';
    case 'available':
      return '下载更新';
    case 'downloading':
      return `下载中 ${progress.value}%`;
    case 'downloaded':
      return '安装更新';
    case 'error':
      return '重试';
    default:
      return '检查更新';
  }
});

/** electron-updater 的 releaseNotes 可能是字符串，也可能是 { note } 数组 */
function releaseNotesText(info: { version?: string; releaseNotes?: unknown } | null): string {
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
  const info = availableInfo;
  const notes = releaseNotesText(info);
  const ok = await confirm(
    `发现新版本 ${info?.version ?? ''}${notes ? `\n\n${notes}` : ''}`,
    '发现新版本'
  );
  if (!ok) {
    phase.value = 'idle';
    return;
  }
  await window.api.updater.download();
}

async function promptInstall(): Promise<void> {
  const ok = await confirm('新版本已下载完成，是否退出并安装更新？', '更新就绪');
  if (!ok) {
    phase.value = 'idle';
    return;
  }
  await window.api.updater.quitAndInstall();
}

function onUpdateClick(): void {
  if (phase.value === 'downloaded') {
    void promptInstall();
    return;
  }
  if (phase.value === 'available') {
    void promptDownload();
    return;
  }
  void checkUpdate();
}

async function checkUpdate(): Promise<void> {
  if (phase.value === 'checking' || phase.value === 'downloading') return;
  // 未打包时 electron-updater 不会真正发起请求（启动日志里会打印 Skip checkForUpdates …），
  // 这里直接给出提示，避免按钮一直停在「检查中…」
  if (!packaged) {
    message('开发模式下不支持检查更新，需打包后运行', 'info');
    return;
  }
  phase.value = 'checking';
  await window.api.updater.check();
}

onMounted(async () => {
  version.value = await window.api.app.version();
  packaged = await window.api.app.isPackaged();
  unsubscribe = window.api.updater.onStatus((status) => {
    const data = status.data as Record<string, unknown> | undefined;
    switch (status.event) {
      case 'checking':
        phase.value = 'checking';
        break;
      case 'not-available':
        phase.value = 'idle';
        message('当前已是最新版本', 'success');
        break;
      case 'available':
        availableInfo = (data ?? null) as { version?: string; releaseNotes?: unknown } | null;
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
        message(`更新出错：${data ?? '未知错误'}`, 'error');
        break;
      default:
        break;
    }
  });
});

onUnmounted(() => unsubscribe?.());

function onColor(e: Event) {
  settings.setThemeColor((e.target as HTMLInputElement).value);
}
function onDark(e: Event) {
  settings.toggleDark(Boolean((e.target as HTMLInputElement).checked));
}
function onFormat(e: Event) {
  settings.setDefaultOutput({ format: (e.target as HTMLInputElement).value as DefaultOutputFormat });
}
function onQuality(e: Event) {
  settings.setDefaultOutput({ quality: Number((e.target as HTMLInputElement).value) });
}
async function pickDir() {
  const dir = await selectDirectory(settings.defaultSaveDirectory || undefined);
  if (dir) settings.setDefaultSaveDirectory(dir);
}
</script>

<style scoped>
.settings {
  max-width: 640px;
}
.group-title {
  margin: calc(var(--design-unit) * 5.5 * 1px) 0 calc(var(--design-unit) * 2 * 1px);
  font-size: 13px;
  font-weight: 600;
  color: var(--neutral-foreground-secondary-rest);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.group-title:first-of-type {
  margin-top: calc(var(--design-unit) * 1 * 1px);
}
.row {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  margin: calc(var(--design-unit) * 3 * 1px) 0;
}
.label {
  width: 140px;
  flex-shrink: 0;
}
.value {
  color: var(--neutral-foreground-secondary-rest);
  font-size: 13px;
  word-break: break-all;
}
.color-input {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px);
  background: none;
  cursor: pointer;
}
.dir-field {
  flex: 1;
}
.out-select {
  width: 220px;
}
.out-slider {
  flex: 1;
}
.hint {
  margin: calc(var(--design-unit) * 1px * 1.5) 0 0;
  font-size: 12px;
  color: var(--neutral-foreground-secondary-rest);
  opacity: 0.8;
}
/* 版本行后面的「检查更新」入口 */
.link-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--accent-base-color);
  font: inherit;
  font-size: 13px;
  padding: 0;
  cursor: pointer;
}
.link-btn:hover {
  text-decoration: underline;
}
</style>

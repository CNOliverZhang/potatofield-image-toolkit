<template>
  <div class="settings">
    <!-- 标签页：与字体工具同一套用法（组件自带指示器不生效，共享指示条自行绘制） -->
    <div ref="tabsWrapEl" class="tabs-wrap">
      <fluent-tabs ref="tabsEl" class="settings-tabs" :activeid="tab" @change="onTabsChange">
        <fluent-tab id="general" :class="{ 'is-active': tab === 'general' }" @click="switchTab('general')">
          通用
        </fluent-tab>
        <fluent-tab id="about" :class="{ 'is-active': tab === 'about' }" @click="switchTab('about')">
          版权信息
        </fluent-tab>
      </fluent-tabs>
      <span class="tab-indicator" :style="indicatorStyle"></span>
    </div>

    <!-- ───────────────── 通用 ───────────────── -->
    <div v-show="tab === 'general'" class="tab-panel">
      <SettingsGroup title="外观">
        <SettingsRow label="主题色">
          <input class="color-input" type="color" :value="settings.themeColor" @input="onColor" />
          <span class="row-val">{{ settings.themeColor }}</span>
        </SettingsRow>
        <SettingsRow label="深色模式">
          <fluent-switch :checked="settings.darkMode" @change="onDark"></fluent-switch>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="文件">
        <SettingsRow label="文件默认保存地址">
          <fluent-text-field
            class="dir-field"
            :value="settings.defaultSaveDirectory"
            readonly
          ></fluent-text-field>
          <fluent-button appearance="neutral" @click="pickDir">选择</fluent-button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="默认输出">
        <SettingsRow label="输出格式">
          <fluent-select class="ctl-md" :value="settings.defaultOutput.format" @change="onFormat">
            <fluent-option value="original">保持原格式</fluent-option>
            <fluent-option value="png">PNG（无损）</fluent-option>
            <fluent-option value="jpeg">JPG（有损）</fluent-option>
            <fluent-option value="webp">WebP（有损）</fluent-option>
          </fluent-select>
        </SettingsRow>
        <!-- 默认质量是通用默认值（工具里选 JPG/WebP 时才会用到），因此始终显示 -->
        <SettingsRow label="默认质量">
          <fluent-slider
            class="ctl-slider"
            :value="settings.defaultOutput.quality"
            :min="10"
            :max="100"
            :step="1"
            @change="onQuality"
          ></fluent-slider>
          <span class="row-val">{{ settings.defaultOutput.quality }}%</span>
        </SettingsRow>
        <SettingsRow label="适用范围" desc="作为「改尺寸 / 压缩 / 格式转换 / 切片」等工具新增图片时的初始设置，工具内可单独修改" />
      </SettingsGroup>

      <SettingsGroup title="系统">
        <SettingsRow label="开机启动">
          <fluent-switch :checked="openAtLogin" @change="onOpenAtLogin"></fluent-switch>
        </SettingsRow>
        <SettingsRow label="界面缩放">
          <fluent-select class="ctl-md" :value="String(zoomFactor)" @change="onZoom">
            <fluent-option value="0.75">75%</fluent-option>
            <fluent-option value="1">100%</fluent-option>
            <fluent-option value="1.25">125%</fluent-option>
            <fluent-option value="1.5">150%</fluent-option>
            <fluent-option value="1.75">175%</fluent-option>
            <fluent-option value="2">200%</fluent-option>
          </fluent-select>
        </SettingsRow>
        <SettingsRow label="说明" desc="界面缩放会作用到所有窗口，用于匹配显示器的尺寸和分辨率" />
      </SettingsGroup>

      <SettingsGroup title="关于">
        <SettingsRow label="版本" :desc="version">
          <button class="link-btn" @click="onUpdateClick">{{ updateLabel }}</button>
        </SettingsRow>
      </SettingsGroup>
    </div>

    <!-- ───────────────── 版权信息 ───────────────── -->
    <div v-show="tab === 'about'" class="tab-panel">
      <div class="intro">
        <img class="intro-logo" src="@renderer/assets/logo.png" alt="logo" />
        <div class="intro-text">
          <div class="intro-title">洋芋田图像工具箱</div>
          <div class="intro-sub">一个专为摄影师设计的图像工具箱</div>
        </div>
        <button class="link-btn" @click="open(SITE_URL)">访问网站</button>
      </div>

      <SettingsGroup title="开发者信息">
        <SettingsRow :label="`Copyright © 2019–${currentYear} 张志毅`">
          <button class="link-btn" @click="copyEmail">联系开发者</button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="开源协议">
        <div class="about-text">
          本程序遵循
          <button class="inline-link" @click="open(REPO_URL)">MIT</button>
          开源许可协议发行，相关资源及源码已托管在 GitHub，您可以点此访问。
        </div>
      </SettingsGroup>

      <SettingsGroup title="相关项目">
        <div class="about-text">本程序的开发过程中使用了下列开源程序和组件：</div>
        <div class="resources">
          <button
            v-for="item in resources"
            :key="item.title"
            class="resource-chip"
            @click="open(item.url)"
          >
            {{ item.title }}
          </button>
        </div>
      </SettingsGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { selectDirectory } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';
import type { DefaultOutputFormat } from '@renderer/stores/settings';

const SITE_URL = 'https://potatofield.cn/imagetoolkit';
const REPO_URL = 'https://github.com/CNOliverZhang/potatofield-image-toolkit';
const DEVELOPER_EMAIL = 'cnoliverzhang@gmail.com';

/** 本程序依赖的开源项目（取自当前 package.json 的实际依赖） */
const resources = [
  { title: 'Electron', url: 'https://github.com/electron/electron' },
  { title: 'electron-builder', url: 'https://github.com/electron-userland/electron-builder' },
  { title: 'electron-vite', url: 'https://github.com/alex8088/electron-vite' },
  { title: 'Vite', url: 'https://github.com/vitejs/vite' },
  { title: '@vitejs/plugin-vue', url: 'https://github.com/vitejs/vite-plugin-vue' },
  { title: 'Vue.js', url: 'https://github.com/vuejs/core' },
  { title: 'Vue Router', url: 'https://github.com/vuejs/router' },
  { title: 'Pinia', url: 'https://github.com/vuejs/pinia' },
  { title: 'pinia-plugin-persistedstate', url: 'https://github.com/prazdevs/pinia-plugin-persistedstate' },
  { title: 'vue-draggable-plus', url: 'https://github.com/Alfred-Skyblue/vue-draggable-plus' },
  { title: 'TypeScript', url: 'https://github.com/microsoft/TypeScript' },
  { title: 'vue-tsc', url: 'https://github.com/vuejs/language-tools' },
  { title: 'Fluent UI Web Components', url: 'https://github.com/microsoft/fluentui' },
  { title: 'Element Plus', url: 'https://github.com/element-plus/element-plus' },
  { title: 'Font Awesome', url: 'https://github.com/FortAwesome/Font-Awesome' },
  { title: 'vue-fontawesome', url: 'https://github.com/FortAwesome/vue-fontawesome' },
  { title: 'sharp', url: 'https://github.com/lovell/sharp' },
  { title: 'cropperjs', url: 'https://github.com/fengyuanchen/cropperjs' },
  { title: 'html2canvas', url: 'https://github.com/niklasvh/html2canvas' },
  { title: 'colorthief', url: 'https://github.com/lokesh/color-thief' },
  { title: 'exifr', url: 'https://github.com/MikeKovarik/exifr' },
  { title: 'crypto-js', url: 'https://github.com/brix/crypto-js' },
  { title: 'axios', url: 'https://github.com/axios/axios' }
];

const settings = useSettingsStore();
const { confirm, message } = useDialog();
const version = ref('');
const currentYear = new Date().getFullYear();

/* ───────────────── 标签页 ───────────────── */
type TabKey = 'general' | 'about';
const tab = ref<TabKey>('general');
const tabsWrapEl = ref<HTMLElement | null>(null);
const tabsEl = ref<HTMLElement | null>(null);
const indicatorStyle = ref({ left: '0px', width: '0px', opacity: '0' });

function updateIndicator(): void {
  const wrap = tabsWrapEl.value;
  const tabs = tabsEl.value;
  if (!wrap || !tabs) return;
  const el = tabs.querySelector(`fluent-tab#${tab.value}`) as HTMLElement | null;
  if (!el) return;
  const wr = wrap.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  indicatorStyle.value = {
    left: `${Math.round(er.left - wr.left)}px`,
    width: `${Math.round(er.width)}px`,
    opacity: '1'
  };
}

/** fluent-tabs 的 change 事件：不同版本 detail 可能是 id 字符串或对象，兼容读取 */
function onTabsChange(e: Event): void {
  const target = e.target as (HTMLElement & { activeid?: string }) | null;
  const detail = (e as CustomEvent).detail as unknown;
  const id =
    (typeof detail === 'string' ? detail : (detail as { id?: string } | null)?.id) ??
    target?.activeid;
  if (id === 'general' || id === 'about') switchTab(id);
}

function switchTab(next: TabKey): void {
  if (tab.value === next) return;
  tab.value = next;
  nextTick(updateIndicator);
}

/* ───────────────── 系统设置 ───────────────── */
const openAtLogin = ref(false);
const zoomFactor = ref(1);

async function onOpenAtLogin(e: Event): Promise<void> {
  const next = Boolean((e.target as HTMLInputElement).checked);
  openAtLogin.value = next;
  await window.api.app.setOpenAtLogin(next);
}

async function onZoom(e: Event): Promise<void> {
  const next = Number((e.target as HTMLInputElement).value);
  zoomFactor.value = next;
  await window.api.app.setZoomFactor(next);
}

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

/* ───────────────── 版权信息页动作 ───────────────── */
async function open(url: string): Promise<void> {
  try {
    await window.api.shell.openExternal(url);
  } catch {
    message('打开浏览器失败，请手动访问：' + url, 'error');
  }
}

async function copyEmail(): Promise<void> {
  try {
    await navigator.clipboard.writeText(DEVELOPER_EMAIL);
    message('已复制邮箱到剪贴板：' + DEVELOPER_EMAIL, 'success');
  } catch {
    message('复制失败，开发者邮箱：' + DEVELOPER_EMAIL, 'warning');
  }
}

/* ───────────────── 外观 / 文件 / 输出 ───────────────── */
function onColor(e: Event): void {
  settings.setThemeColor((e.target as HTMLInputElement).value);
}
function onDark(e: Event): void {
  settings.toggleDark(Boolean((e.target as HTMLInputElement).checked));
}
function onFormat(e: Event): void {
  settings.setDefaultOutput({ format: (e.target as HTMLInputElement).value as DefaultOutputFormat });
}
function onQuality(e: Event): void {
  settings.setDefaultOutput({ quality: Number((e.target as HTMLInputElement).value) });
}
async function pickDir(): Promise<void> {
  const dir = await selectDirectory(settings.defaultSaveDirectory || undefined);
  if (dir) settings.setDefaultSaveDirectory(dir);
}

/* ───────────────── 生命周期 ───────────────── */
onMounted(async () => {
  version.value = await window.api.app.version();
  packaged = await window.api.app.isPackaged();
  openAtLogin.value = await window.api.app.getOpenAtLogin();
  zoomFactor.value = await window.api.app.getZoomFactor();
  nextTick(updateIndicator);
  window.addEventListener('resize', updateIndicator);
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

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator);
  unsubscribe?.();
});
</script>

<style scoped>
.settings {
  max-width: 640px;
}

/* ── 标签页（与字体工具保持一致）── */
.tabs-wrap {
  position: relative;
  flex-shrink: 0;
  margin-bottom: calc(var(--design-unit) * 1 * 1px);
}
.settings-tabs {
  width: auto;
}
.settings-tabs::part(activeIndicator) {
  display: none;
}
.settings-tabs fluent-tab {
  cursor: pointer;
}
.settings-tabs fluent-tab.is-active {
  color: var(--accent-base-color);
}
.tab-indicator {
  position: absolute;
  bottom: 0;
  height: calc(var(--design-unit) * 0.75 * 1px);
  border-radius: calc(var(--design-unit) * 0.375 * 1px);
  background: var(--accent-base-color);
  pointer-events: none;
  transition:
    left 0.24s cubic-bezier(0.33, 0, 0.67, 1),
    width 0.24s cubic-bezier(0.33, 0, 0.67, 1),
    opacity 0.12s ease;
}

.tab-panel {
  padding-top: calc(var(--design-unit) * 1 * 1px);
}

/* 首个分组不需要额外上边距（SettingsGroup 自带组间距） */
.tab-panel :deep(.settings-group:first-of-type) {
  margin-top: 0;
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
  min-width: 0;
}
/* 链接式入口（检查更新 / 访问网站 / 联系开发者） */
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
.inline-link {
  border: none;
  background: transparent;
  color: var(--accent-base-color);
  font: inherit;
  padding: 0;
  cursor: pointer;
}
.inline-link:hover {
  text-decoration: underline;
}

/* ── 版权信息 ── */
.intro {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  margin-bottom: calc(var(--design-unit) * 3 * 1px);
}
.intro-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  flex-shrink: 0;
}
.intro-title {
  font-size: 16px;
  font-weight: 600;
}
.intro-sub {
  margin-top: calc(var(--design-unit) * 0.5 * 1px);
  font-size: 13px;
  color: var(--neutral-foreground-secondary-rest);
}
.about-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--neutral-foreground-secondary-rest);
}
.resources {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--design-unit) * 1 * 1px);
  margin-top: calc(var(--design-unit) * 2 * 1px);
}
.resource-chip {
  border: 1px solid var(--neutral-stroke-rest);
  background: transparent;
  color: var(--neutral-foreground-rest);
  font-size: 12px;
  padding: calc(var(--design-unit) * 0.75 * 1px) calc(var(--design-unit) * 1.5 * 1px);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.resource-chip:hover {
  background: color-mix(in srgb, var(--accent-base-color) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent-base-color) 45%, var(--neutral-stroke-rest));
}
</style>

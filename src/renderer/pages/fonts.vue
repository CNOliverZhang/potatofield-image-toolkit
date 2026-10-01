<template>
  <div class="fonts">
    <div class="toolbar">
      <!-- 组件自带的 activeIndicator 在本环境不生效，这里用共享指示条实现滑动动画 -->
      <div ref="tabsWrapEl" class="tabs-wrap">
        <fluent-tablist ref="tabsEl" class="fs-tabs" :activeid="tab" @change="onTabsChange">
          <fluent-tab id="online" :class="{ 'is-active': tab === 'online' }" @click="switchTab('online')">
            线上字体
          </fluent-tab>
          <fluent-tab id="local" :class="{ 'is-active': tab === 'local' }" @click="switchTab('local')">
            本地字体
          </fluent-tab>
        </fluent-tablist>
        <span class="tab-indicator" :style="indicatorStyle"></span>
      </div>
      <div class="toolbar-actions">
        <fluent-text-input
          class="search"
          :value="keyword"
          :placeholder="tab === 'online' ? '搜索字体族' : '搜索本地字体'"
          @input="onSearch"
        ></fluent-text-input>
        <fluent-button
          v-if="tab === 'online'"
          appearance="neutral"
          :disabled="store.loading || cleaning"
          @click="cleanCache"
        >
          清理缓存
        </fluent-button>
        <fluent-button appearance="primary" :disabled="loading" @click="refresh">
          {{ loading ? '加载中…' : refreshLabel }}
        </fluent-button>
      </div>
    </div>

    <!-- 新装字体需重启应用才能在预览中生效（导出不受影响） -->
    <div v-if="store.pendingRestart > 0" class="notice">
      <span>{{ store.pendingRestart }} 个新安装的字体需重启应用后才能在预览中显示（导出可立即使用）</span>
      <button class="link-btn" @click="relaunch">重启应用</button>
    </div>

    <!-- 线上字体 -->
    <template v-if="tab === 'online'">
      <div v-if="onlineFamilies.length" class="list-wrap">
        <div class="list">
          <template v-for="family in onlineFamilies" :key="family.id">
            <!-- 多字体族：SettingExpander 式可展开卡片 -->
            <section
              v-if="family.fonts.length > 1"
              class="family-card"
              :class="{ expanded: isOpen(family.id) }"
            >
              <button class="family-head" :aria-expanded="isOpen(family.id)" @click="toggle(family.id)">
                <font-awesome-icon icon="font" class="family-icon" />
                <span class="head-text">
                  <span class="family-name">{{ family.name }}</span>
                  <span class="family-sub">{{ familySub(family) }}</span>
                </span>
                <font-awesome-icon icon="chevron-down" class="chev" :class="{ open: isOpen(family.id) }" />
              </button>
              <div class="family-body" :class="{ open: isOpen(family.id) }">
                <div class="body-inner">
                  <div v-for="font in family.fonts" :key="font.id" class="font-row">
                    <span class="font-name">{{ font.name }}</span>
                    <img
                      v-if="font.previewImage"
                      :src="font.previewImage"
                      class="preview"
                      :alt="font.name"
                    />
                    <fluent-button
                      appearance="primary"
                      :disabled="!!store.installed[font.id] || !!store.installing[font.id]"
                      @click="install(font)"
                    >
                      {{ installLabel(font) }}
                    </fluent-button>
                  </div>
                </div>
              </div>
            </section>
            <!-- 单字体族：无子项的设置卡，无展开箭头 -->
            <section v-else-if="family.fonts.length === 1" class="family-card plain">
              <div class="family-head static">
                <font-awesome-icon icon="font" class="family-icon" />
                <span class="head-text">
                  <span class="family-name">{{ family.name }}</span>
                  <span class="family-sub">{{ familySub(family) }}</span>
                </span>
                <img
                  v-if="family.fonts[0].previewImage"
                  :src="family.fonts[0].previewImage"
                  class="preview head-preview"
                  :alt="family.fonts[0].name"
                />
                <fluent-button
                  appearance="primary"
                  :disabled="!!store.installed[family.fonts[0].id] || !!store.installing[family.fonts[0].id]"
                  @click="install(family.fonts[0])"
                >
                  {{ installLabel(family.fonts[0]) }}
                </fluent-button>
              </div>
            </section>
            <!-- 空字体族：仅展示名称 -->
            <section v-else class="family-card plain">
              <div class="family-head static">
                <font-awesome-icon icon="font" class="family-icon" />
                <span class="head-text">
                  <span class="family-name">{{ family.name }}</span>
                  <span class="family-sub">暂无字体</span>
                </span>
              </div>
            </section>
          </template>
        </div>
      </div>
      <div v-else class="empty">
        {{ store.loading ? '加载中…' : '没有匹配的字体族' }}
      </div>
    </template>

    <!-- 本地字体（系统已安装） -->
    <template v-else>
      <div v-if="!store.localSupported" class="empty">
        当前环境不支持读取系统字体列表
      </div>
      <div v-else-if="localFamilies.length" class="list-wrap">
        <div class="list">
          <template v-for="fam in localFamilies" :key="fam.name">
            <section
              v-if="fam.fonts.length > 1"
              class="family-card"
              :class="{ expanded: isOpen(fam.name) }"
            >
              <button class="family-head" :aria-expanded="isOpen(fam.name)" @click="toggle(fam.name)">
                <font-awesome-icon icon="font" class="family-icon" />
                <span class="head-text">
                  <span class="family-name">{{ fam.name }}</span>
                  <span class="family-sub">{{ fam.fonts.length }} 个样式</span>
                </span>
                <font-awesome-icon icon="chevron-down" class="chev" :class="{ open: isOpen(fam.name) }" />
              </button>
              <div class="family-body" :class="{ open: isOpen(fam.name) }">
                <div class="body-inner">
                  <div v-for="f in fam.fonts" :key="f.fullName" class="font-row">
                    <span class="font-name style-name">{{ f.style || '常规' }}</span>
                    <span class="sample" :style="fontStyle(f.family, f.style)">{{ SAMPLE_TEXT }}</span>
                  </div>
                </div>
              </div>
            </section>
            <section v-else class="family-card plain">
              <div class="family-head static">
                <font-awesome-icon icon="font" class="family-icon" />
                <span class="head-text">
                  <span class="family-name">{{ fam.name }}</span>
                  <span class="family-sub">{{ fam.fonts[0]?.style || '常规' }}</span>
                </span>
                <span class="sample head-sample" :style="fontStyle(fam.name, fam.fonts[0]?.style)">
                  {{ SAMPLE_TEXT }}
                </span>
              </div>
            </section>
          </template>
        </div>
      </div>
      <div v-else class="empty">
        {{ store.localLoading ? '读取中…' : '没有匹配的系统字体' }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useFontsStore } from '@renderer/stores/fonts';
import { useDialog } from '@renderer/composables/useDialog';
import type { FontItem, FontFamilyItem } from '@renderer/stores/fonts';
import type { LocalFontFamily } from '@renderer/composables/useLocalFonts';

const SAMPLE_TEXT = '洋芋田 Potatofield 0123';

const store = useFontsStore();
const dialog = useDialog();

type TabKey = 'online' | 'local';
type OpenKey = string | number;

const tab = ref<TabKey>('online');
const keyword = ref('');
const expanded = reactive<Record<string, boolean>>({});
const cleaning = ref(false);
let searchTimer: number | undefined;

const loading = computed(() =>
  tab.value === 'online' ? store.loading : store.localLoading
);
const refreshLabel = computed(() => (tab.value === 'online' ? '刷新字体族' : '刷新本地字体'));

/** 线上列表按关键字过滤（前端过滤，避免每次输入都请求接口） */
const onlineFamilies = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return store.fontFamilies;
  return store.fontFamilies.filter(
    (f) => f.name.toLowerCase().includes(kw) || f.fonts.some((x) => x.name.toLowerCase().includes(kw))
  );
});

const localFamilies = computed<LocalFontFamily[]>(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return store.localFamilies;
  return store.localFamilies.filter((f) => f.name.toLowerCase().includes(kw));
});

/** 族副标题：展示字体数，已安装的给出数量提示 */
function familySub(family: FontFamilyItem): string {
  const total = family.fonts.length;
  const done = family.fonts.filter((f) => store.installed[f.id]).length;
  return done ? `${total} 个字体 · 已安装 ${done}` : `${total} 个字体`;
}

function installLabel(font: FontItem): string {
  if (store.installing[font.id]) return '等待安装…';
  if (store.installed[font.id]) return '已安装';
  return '安装';
}

function fontStyle(family: string, style?: string): Record<string, string> {
  const fam = `"${String(family ?? '').replace(/"/g, '')}"`;
  const s = style ?? '';
  // 字重映射：注意顺序，semibold/extrabold 都含 "bold"，要先判更具体的
  let weight = '400';
  if (/black|extrabold|ultra|特粗|超粗/i.test(s)) weight = '900';
  else if (/semibold|demibold|semi|半粗/i.test(s)) weight = '600';
  else if (/medium|中黑|中等/i.test(s)) weight = '500';
  else if (/light|thin|细/i.test(s)) weight = '300';
  else if (/bold|粗/i.test(s)) weight = '700';
  const italic = /italic|oblique|斜/i.test(s) ? 'italic' : 'normal';
  return { fontFamily: fam, fontWeight: weight, fontStyle: italic };
}

function toggle(id: OpenKey) {
  expanded[String(id)] = !expanded[String(id)];
}
function isOpen(id: OpenKey) {
  return !!expanded[String(id)];
}

/** 标签页指示条：跟随激活项滑动（组件自带指示器在本环境不生效，故自行绘制） */
const tabsWrapEl = ref<HTMLElement | null>(null);
const tabsEl = ref<HTMLElement | null>(null);
const indicatorStyle = ref<{ left: string; width: string; opacity: string }>({
  left: '0px',
  width: '0px',
  opacity: '0' // 首帧位置未算出前先隐藏，避免从原点滑入
});

function updateIndicator() {
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

/** fluent-tablist 的 change 事件：不同版本 detail 可能是 id 字符串或对象，兼容读取 */
function onTabsChange(e: Event) {
  const target = e.target as (HTMLElement & { activeid?: string }) | null;
  const detail = (e as CustomEvent).detail as unknown;
  const id =
    (typeof detail === 'string' ? detail : (detail as { id?: string } | null)?.id) ??
    target?.activeid;
  if (id === 'online' || id === 'local') switchTab(id);
}

function switchTab(next: TabKey) {
  if (tab.value === next) return;
  tab.value = next;
  keyword.value = '';
  if (next === 'local') store.loadLocalFonts();
  else if (!store.fontFamilies.length) store.loadFontFamilies();
}

function refresh() {
  if (tab.value === 'online') store.loadFontFamilies();
  else store.loadLocalFonts();
}

function onSearch(e: Event) {
  keyword.value = (e.target as HTMLInputElement).value;
  // 线上列表支持按关键字请求后端，这里仅本地过滤即可
  if (tab.value === 'online') {
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => store.refreshInstalledState(), 200);
  }
}

async function cleanCache() {
  cleaning.value = true;
  try {
    const n = await store.cleanDownloads();
    dialog.message(n ? `已清理 ${n} 个缓存文件` : '没有可清理的缓存', n ? 'success' : 'info');
  } catch {
    dialog.message('缓存清理失败', 'error');
  } finally {
    cleaning.value = false;
  }
}

async function install(font: FontItem) {
  try {
    const res = await store.installFont(font);
    if (res.ok) {
      dialog.message(`已安装：${font.familyName} ${font.name}，导出时可直接选择`, 'success');
    } else if (res.pending) {
      dialog.message('未检测到安装完成，请在弹出的窗口点击「安装」', 'warning');
    }
  } catch {
    dialog.message('字体安装失败', 'error');
  }
}

function relaunch() {
  window.api.app.relaunch();
}

let tabsObserver: ResizeObserver | null = null;

onMounted(() => {
  // 标签宽度受字体加载影响，需在实际布局后计算指示条位置
  nextTick(updateIndicator);
  window.addEventListener('resize', updateIndicator);
  if (typeof ResizeObserver !== 'undefined' && tabsWrapEl.value) {
    tabsObserver = new ResizeObserver(() => updateIndicator());
    tabsObserver.observe(tabsWrapEl.value);
  }
  store.loadFontFamilies();
  // 预读渲染进程字体列表：用于比对出「已装但预览尚未生效」的字体
  store.loadLocalFonts().catch(() => undefined);
  // 启动兜底：静默清理上次遗留的已安装字体缓存
  store.cleanDownloads().catch(() => undefined);
  // 从字体安装窗口返回时刷新系统字体列表，尽快标记已安装
  window.addEventListener('focus', onWindowFocus);
});
onBeforeUnmount(() => {
  if (searchTimer) window.clearTimeout(searchTimer);
  window.removeEventListener('focus', onWindowFocus);
  window.removeEventListener('resize', updateIndicator);
  tabsObserver?.disconnect();
  tabsObserver = null;
});

function onWindowFocus() {
  store.loadLocalFonts();
}

const listCount = computed(() =>
  tab.value === 'online' ? onlineFamilies.value.length : localFamilies.value.length
);

// 切换标签后指示条滑动到新位置
watch(tab, () => nextTick(updateIndicator));

// 滚动条已不占布局空间，不再需要按列表变化重新计算；listCount 仅用于「共 N 个字体族」展示
</script>

<style scoped>
.fonts {
  display: flex;
  flex-direction: column;
  height: 100%; /* 撑满内容区，使下方列表可独立滚动 */
  min-height: 0;
  gap: calc(var(--design-unit) * 2 * 1px);
}
/* 工具栏固定不滚动，搜索框与按钮靠右 */
.toolbar {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  flex-shrink: 0;
}
/* Fluent 标签页：组件的 activeIndicator 依赖内部激活状态（在本环境不生效），
   隐藏它，改用共享指示条，切换时带滑动动画 */
.tabs-wrap {
  position: relative;
  flex-shrink: 0;
}
.fs-tabs {
  width: auto;
}
.fs-tabs::part(activeIndicator) {
  display: none;
}
.fs-tabs fluent-tab {
  cursor: pointer;
}
.fs-tabs fluent-tab.is-active {
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
.toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2 * 1px);
}
.search {
  width: 220px;
}
/* 滚动区容器 */
.list-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
  /* 抵消内容区右内边距，使滚动条贴靠窗口右缘（卡片仍与工具栏按钮对齐）；
     底部同理延伸到窗口下缘，末尾间距由 .list 的 padding-bottom 补回 */
  margin-right: calc(-1 * var(--content-pad-x));
  margin-bottom: calc(-1 * var(--content-pad-b));
}
/* 仅列表滚动 */
.list {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1px); /* WinUI 设置卡间距 4px */
  /* 右侧内边距使卡片右缘与工具栏按钮对齐（滚动条贴窗口右缘） */
  padding-right: var(--content-pad-x);
  /* 滚到头后的底部间距（与其它页面一致） */
  padding-bottom: var(--content-pad-b);
}
/* 滚动条已改为不占布局空间（见 global.css），无需再按滚动条宽度补偿右内边距 */
/* SettingExpander 式卡片（PowerToys 设置页风格） */
.family-card {
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium); /* WinUI 卡片圆角 4px */
  /* 默认不透明（可展开项默认态、不可展开项、以及子项均不透明） */
  background: var(--app-card);
  overflow: hidden;
  /* 列表是 flex 容器，卡片必须不收缩，否则会被压扁而不产生滚动 */
  flex-shrink: 0;
}
/* 仅可展开项的展开态有极轻微的透明度（对应 WinUI 的活跃态） */
.family-card.expanded {
  background: color-mix(in srgb, var(--app-card) 94%, transparent);
}
.family-head {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2.5 * 1px);
  width: 100%;
  border: none;
  background: transparent;
  color: var(--colorNeutralForeground1);
  /* 标题 20 + 副标题 16 + 间距 2 = 38，上下各 17px → 总高 72px（对应 PowerToys 两行卡） */
  padding: calc(var(--design-unit) * 4.25 * 1px) calc(var(--design-unit) * 3 * 1px);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: background 0.12s ease;
}
.family-head:hover {
  background: var(--colorNeutralBackground1Hover);
}
/* 按压态：轻微的透明度反馈 */
.family-head:active {
  background: color-mix(in srgb, var(--colorNeutralBackground1Hover) 60%, transparent);
}
/* 深色模式交互色：与 WinUI 一致用低亮度白叠加（hover 6% / 按压 4%） */
html[data-theme='dark'] .family-head:hover {
  background: rgba(255, 255, 255, 0.06);
}
html[data-theme='dark'] .family-head:active {
  background: rgba(255, 255, 255, 0.04);
}
html[data-theme='dark'] .font-row:hover {
  background: rgba(255, 255, 255, 0.06);
}
/* 无子项卡片：整行不可展开，不做 hover 高亮 */
.family-head.static {
  cursor: default;
}
.plain .family-head.static:hover {
  background: transparent;
}
.family-icon {
  flex-shrink: 0;
  font-size: calc(var(--design-unit) * 2 * 1px);
  color: var(--app-fg-secondary);
}
.head-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 0.5 * 1px);
  flex: 1;
  min-width: 0;
}
.family-name {
  font-weight: 600;
  font-size: 14px;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.family-sub {
  font-size: 12px;
  line-height: 16px;
  color: var(--app-fg-secondary);
}
.chev {
  flex-shrink: 0;
  font-size: calc(var(--design-unit) * 3 * 1px); /* 12px，与 PowerToys 展开箭头一致 */
  transition: transform 0.18s ease;
  color: var(--app-fg-secondary);
}
.chev.open {
  transform: rotate(180deg);
}
/* 高度过渡动画：grid-template-rows 0fr -> 1fr（高度自适应内容） */
.family-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s ease;
}
.family-body.open {
  grid-template-rows: 1fr;
}
.body-inner {
  overflow: hidden;
}
/* 子项行：分隔线用 Fluent divider 色（比卡片描边淡），缩进对齐标题文本 */
.font-row {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  min-height: calc(var(--design-unit) * 14 * 1px); /* 56px，对应 PowerToys 子项行 */
  padding: calc(var(--design-unit) * 1.5 * 1px) calc(var(--design-unit) * 3 * 1px);
  border-top: 1px solid var(--colorNeutralStroke2);
  /* 图标(2du) + 头部水平内边距(3du) + 间距(2.5du) = 7.5du，与标题文本对齐 */
  padding-left: calc(var(--design-unit) * 7.5 * 1px);
  transition: background 0.12s ease;
}
.font-row:hover {
  background: var(--colorNeutralBackground1Hover);
}
/* 安装按钮统一宽度：否则「安装/已安装」宽度不同，预览图的右缘会随按钮浮动 */
.font-row fluent-button,
.family-head fluent-button {
  min-width: 76px;
}
/* 线上字体预览：接口下发的图片，靠右显示 */
.preview {
  height: 32px;
  max-width: 150px;
  object-fit: contain;
  margin-left: auto;
}
.head-preview {
  height: 32px;
  max-width: 140px;
}
/* 深色模式：下发的预览图是黑色字体，反色为白色以适配深色卡片 */
html[data-theme='dark'] .preview {
  filter: invert(1);
}
.font-name {
  font-size: var(--fontSizeBase200);
  color: var(--app-fg-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
/* 子行样式名固定宽度，预览占余下空间并右对齐 */
.style-name {
  flex: 0 0 96px;
}
.sample {
  flex: 1;
  min-width: 0;
  text-align: right; /* 预览统一靠右（单样式卡与多样式子行一致） */
  font-size: 18px;
  color: var(--colorNeutralForeground1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.head-sample {
  flex: 0 1 auto;
  max-width: 260px;
}
.empty {
  color: var(--app-fg-secondary);
  padding: calc(var(--design-unit) * 6 * 1px) 0;
  font-size: 13px;
}
/* 需重启提示条 */
.notice {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2 * 1px);
  flex-shrink: 0;
  padding: calc(var(--design-unit) * 1.5 * 1px) calc(var(--design-unit) * 3 * 1px);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  background: var(--app-card);
  font-size: 12px;
  color: var(--app-fg-secondary);
}
.notice span {
  flex: 1;
}
.link-btn {
  border: none;
  background: transparent;
  color: var(--accent-base-color);
  font: inherit;
  cursor: pointer;
  padding: 0;
}
</style>

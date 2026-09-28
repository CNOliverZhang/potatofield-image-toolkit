<template>
  <div class="fonts">
    <div class="toolbar">
      <h2>字体管理</h2>
      <div class="toolbar-actions">
        <fluent-text-field
          class="search"
          :value="keyword"
          placeholder="搜索字体族"
          @input="onSearch"
        ></fluent-text-field>
        <fluent-button appearance="accent" :disabled="store.loading" @click="refresh">
          刷新字体族
        </fluent-button>
      </div>
    </div>
    <div v-if="store.fontFamilies.length" class="list-wrap">
      <GradientMask to="top" />
      <div class="list">
        <template v-for="family in store.fontFamilies" :key="family.id">
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
              <span class="family-sub">{{ family.fonts.length }} 个字体</span>
            </span>
            <font-awesome-icon icon="chevron-down" class="chev" :class="{ open: isOpen(family.id) }" />
          </button>
          <div class="family-body" :class="{ open: isOpen(family.id) }">
            <div class="body-inner">
              <div v-for="font in family.fonts" :key="font.id" class="font-row">
                <img v-if="font.previewImage" :src="font.previewImage" class="preview" :alt="font.name" />
                <span class="font-name">{{ font.name }}</span>
                <fluent-button
                  appearance="accent"
                  :disabled="!!store.installed[font.id]"
                  @click="install(font)"
                >
                  {{ store.installed[font.id] ? '已安装' : '安装' }}
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
              <span class="family-sub">1 个字体</span>
            </span>
            <img
              v-if="family.fonts[0].previewImage"
              :src="family.fonts[0].previewImage"
              class="preview head-preview"
              :alt="family.fonts[0].name"
            />
            <fluent-button
              appearance="accent"
              :disabled="!!store.installed[family.fonts[0].id]"
              @click="install(family.fonts[0])"
            >
              {{ store.installed[family.fonts[0].id] ? '已安装' : '安装' }}
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
      <GradientMask to="bottom" />
    </div>
    <div v-else class="empty">{{ store.loading ? '加载中…' : '暂无在线字体，点击上方按钮加载' }}</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useFontsStore } from '@renderer/stores/fonts';
import { useDialog } from '@renderer/composables/useDialog';
import GradientMask from '@renderer/components/GradientMask.vue';
import type { FontItem } from '@renderer/stores/fonts';

const store = useFontsStore();
const dialog = useDialog();

const keyword = ref('');
const expanded = reactive<Record<number, boolean>>({});
let searchTimer: number | undefined;

function toggle(id: number) {
  expanded[id] = !expanded[id];
}
function isOpen(id: number) {
  return !!expanded[id];
}
function refresh() {
  store.loadFontFamilies(keyword.value.trim() || undefined);
}
function onSearch(e: Event) {
  keyword.value = (e.target as HTMLInputElement).value;
  if (searchTimer) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(refresh, 350);
}

onMounted(() => refresh());
onBeforeUnmount(() => {
  if (searchTimer) window.clearTimeout(searchTimer);
});

async function install(font: FontItem) {
  try {
    await store.installFont(font);
    dialog.message(`已安装字体：${font.name}`, 'success');
  } catch {
    dialog.message('字体安装失败', 'error');
  }
}
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
.toolbar h2 {
  margin: 0;
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
/* 滚动区容器：遮罩相对它绝对定位 */
.list-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
/* 仅列表滚动 */
.list {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1px); /* WinUI 设置卡间距 4px */
  /* 上下留出遮罩高度的内边距，使首/末项滚到顶/底时不被遮罩挡住 */
  padding: calc(var(--design-unit) * 7 * 1px) 0;
}
/* SettingExpander 式卡片（PowerToys 设置页风格） */
.family-card {
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px); /* WinUI 卡片圆角 4px */
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
  color: var(--neutral-foreground-rest);
  /* 标题 20 + 副标题 16 + 间距 2 = 38，上下各 17px → 总高 72px（对应 PowerToys 两行卡） */
  padding: calc(var(--design-unit) * 4.25 * 1px) calc(var(--design-unit) * 3 * 1px);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: background 0.12s ease;
}
.family-head:hover {
  background: var(--neutral-fill-hover);
}
/* 按压态：轻微的透明度反馈 */
.family-head:active {
  background: color-mix(in srgb, var(--neutral-fill-hover) 60%, transparent);
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
  color: var(--neutral-foreground-secondary-rest);
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
  color: var(--neutral-foreground-secondary-rest);
}
.chev {
  flex-shrink: 0;
  font-size: calc(var(--design-unit) * 3 * 1px); /* 12px，与 PowerToys 展开箭头一致 */
  transition: transform 0.18s ease;
  color: var(--neutral-foreground-secondary-rest);
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
  border-top: 1px solid var(--neutral-stroke-divider-rest, var(--neutral-stroke-rest));
  /* 图标(2du) + 头部水平内边距(3du) + 间距(2.5du) = 7.5du，与标题文本对齐 */
  padding-left: calc(var(--design-unit) * 7.5 * 1px);
  transition: background 0.12s ease;
}
.font-row:hover {
  background: var(--neutral-fill-hover);
}
.preview {
  height: 32px;
  max-width: 150px;
  object-fit: contain;
}
.head-preview {
  height: 32px;
  max-width: 140px;
}
.font-name {
  flex: 1;
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty {
  color: var(--neutral-foreground-secondary-rest);
  padding: calc(var(--design-unit) * 6 * 1px) 0;
  font-size: 13px;
}
</style>

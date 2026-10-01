<template>
  <aside class="app-sidebar">
    <div class="brand">
      <img class="brand-mark" src="@renderer/assets/logo.png" alt="logo" />
      <span class="brand-name">{{ brand }}</span>
    </div>

    <!-- 侧边导航用 router-link + 自绘态。
         曾试过 Fluent v3 的纵向 tablist，但其内部选中状态只增不清：
         路由驱动的导航下，切换后旧 tab 的 aria-selected 不会被清除，
         多点几次就累积成一堆高亮项 —— 所以退回链接方案。
         hover/选中底色用文字色 color-mix 自绘，保证两主题下都可见
         （最早的 bug 是 hover 用了 Background1Hover，与 --app-bg 同值撞色）。 -->
    <nav class="nav">
      <fluent-tablist
        ref="listEl"
        class="nav-list"
        :class="{ 'is-inactive': !inItems }"
        orientation="vertical"
        :activeid="activeId"
        @change="onChange"
      >
        <fluent-tab
          v-for="item in items"
          :id="item.id"
          :key="item.id"
          class="nav-tab"
          @click="emit('change', item.id)"
        >
          <!-- v3 的 tab 插槽容器是纵向排列，图标与文字必须包进同一个行容器 -->
          <span class="nav-tab-inner">
            <font-awesome-icon :icon="item.icon" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </span>
        </fluent-tab>
      </fluent-tablist>
    </nav>

    <!-- 设置是单选项，不再用 tablist：
         v3 tablist 无论如何都会保留一个选中项（组件会自己画选中指示条），
         单选项放进 tablist 就永远处于选中态。这里改用链接，
         选中态由路由的 active 类决定，样式与 .nav-tab 完全一致 -->
    <div v-if="showSettings" class="sidebar-footer">
      <router-link to="/settings" class="nav-tab" exact-active-class="active">
        <span class="nav-tab-inner">
          <font-awesome-icon :icon="['fas', 'gear']" class="nav-icon" />
          <span class="nav-label">设置</span>
        </span>
      </router-link>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * 通用侧边栏（主窗口的功能导航 / 模板库窗口的模板类型导航共用同一套外观）。
 *
 * 只有两处差异由 props 控制：
 *   - brand：Logo 右侧文字（主窗口是产品名，模板库窗口是「模板列表」）
 *   - showSettings：底部是否有「设置」入口（模板库窗口没有）
 */
import { computed, nextTick, ref, watch } from 'vue';

export interface SidebarItem {
  id: string;
  label: string;
  /** font-awesome 图标名（字符串或 [前缀, 名称]） */
  icon: string | [string, string];
}

const props = withDefaults(
  defineProps<{
    items: SidebarItem[];
    activeId: string;
    brand?: string;
    showSettings?: boolean;
  }>(),
  {
    brand: '洋芋田图像工具箱',
    showSettings: false
  }
);

const emit = defineEmits<{ change: [id: string] }>();

/** 当前激活项不在列表里时，中和掉组件自带的选中样式 */
const inItems = computed(() => props.items.some((item) => item.id === props.activeId));
const listEl = ref<HTMLElement | null>(null);

/** 归一化选中态：以 property 显式对齐（组件的点击路径会自动设值，兜底防残留） */
async function normalizeSelection(): Promise<void> {
  await nextTick();
  const list = listEl.value as (HTMLElement & { activeid?: string }) | null;
  if (!list) return;
  if (list.activeid !== props.activeId) list.activeid = props.activeId;
}

watch(() => props.activeId, () => void normalizeSelection(), { immediate: true });

/** tablist 的 change（方向键切换也会触发）：把 id 交给使用方 */
function onChange(e: Event): void {
  const target = e.target as (HTMLElement & { activeid?: string }) | null;
  const detail = (e as CustomEvent).detail as unknown;
  const id =
    (typeof detail === 'string' ? detail : (detail as { id?: string } | null)?.id) ?? target?.activeid;
  if (id) emit('change', id);
}
</script>

<style scoped>
.app-sidebar {
  width: 232px;
  flex-shrink: 0;
  /* 不再自绘底色：外壳已统一画一层半透明底，
     这里再画一层会叠加变实，导致侧边栏与内容区不同色 */
  background: transparent;
  display: flex;
  flex-direction: column;
  padding: calc(var(--design-unit) * 2 * 1px);
}
.brand {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2.5 * 1px);
  /* 上边距额外加上 --titlebar-inset：macOS 红绿灯会压在窗口左上角，
     不给 Logo 与标题让位就会被遮住 */
  padding: calc(var(--design-unit) * 3 * 1px + var(--titlebar-inset))
    calc(var(--design-unit) * 2.5 * 1px) calc(var(--design-unit) * 4 * 1px);
  font-size: 15px;
  font-weight: 600;
}
.brand-mark {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}
.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 0.5 * 1px);
  overflow-y: auto;
}
.nav-list {
  width: 100%;
}
/* 内容排版自绘（图标 + 文字左对齐、整行可点）；
   切换动画与悬浮态沿用 tablist 原生能力 */
.nav-tab {
  width: 100%;
  display: block;
  padding: calc(var(--design-unit) * 2.25 * 1px) calc(var(--design-unit) * 3 * 1px);
  border-radius: calc(var(--borderRadiusMedium) + var(--design-unit) * 1px / 2);
  color: var(--colorNeutralForeground1);
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background 0.12s ease;
}
.nav-tab-inner {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
}
.nav-tab:hover {
  background: color-mix(in srgb, var(--colorNeutralForeground1) 8%, transparent);
}
/* 选中态：轻量背景 + 强调色文字 + 左侧细条指示 */
.nav-tab[aria-selected='true'] {
  background: color-mix(in srgb, var(--colorNeutralForeground1) 10%, transparent);
  color: var(--accent-base-color);
  font-weight: 500;
}
.nav-tab[aria-selected='true']::before {
  content: '';
  position: absolute;
  left: 0;
  top: calc(var(--design-unit) * 1.75 * 1px);
  bottom: calc(var(--design-unit) * 1.75 * 1px);
  width: 3px;
  border-radius: calc(var(--design-unit) * 0.75 * 1px);
  background: var(--accent-base-color);
}
/* 单选项（设置）：选中态由路由 active 类决定，与 tab 的选中样式保持一致 */
.nav-tab.active {
  background: color-mix(in srgb, var(--colorNeutralForeground1) 10%, transparent);
  color: var(--accent-base-color);
  font-weight: 500;
}
.nav-tab.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: calc(var(--design-unit) * 1.75 * 1px);
  bottom: calc(var(--design-unit) * 1.75 * 1px);
  width: 3px;
  border-radius: calc(var(--design-unit) * 0.75 * 1px);
  background: var(--accent-base-color);
}
/* 分组未命中当前路由时中和选中样式（组件始终会保留一个选中项，无法清空） */
.nav-list.is-inactive .nav-tab[aria-selected='true'] {
  background: transparent;
  color: var(--colorNeutralForeground1);
  font-weight: 400;
}
.nav-list.is-inactive .nav-tab[aria-selected='true']::before {
  display: none;
}
.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 15px;
}
.sidebar-footer {
  padding-top: calc(var(--design-unit) * 1.5 * 1px);
  margin-top: calc(var(--design-unit) * 1.5 * 1px);
}
</style>

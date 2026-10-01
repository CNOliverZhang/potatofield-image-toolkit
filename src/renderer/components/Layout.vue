<template>
  <div class="app-shell">
    <WindowControls :inset="standalone ? 0 : 232" :title="standalone ? pageTitle : ''" />
    <div class="body">
      <aside v-if="!standalone" class="sidebar">
        <div class="brand">
          <img class="brand-mark" src="@renderer/assets/logo.png" alt="logo" />
          <span class="brand-name">洋芋田图像工具箱</span>
        </div>

        <!-- 侧边导航用 router-link + 自绘态。
             曾试过 Fluent v3 的纵向 tablist，但其内部选中状态只增不清：
             路由驱动的导航下，切换后旧 tab 的 aria-selected 不会被清除，
             多点几次就累积成一堆高亮项 —— 所以退回链接方案。
             hover/选中底色用文字色 color-mix 自绘，保证两主题下都可见
             （最早的 bug 是 hover 用了 Background1Hover，与 --app-bg 同值撞色）。 -->
        <nav class="nav">
          <fluent-tablist
            ref="navListEl"
            class="nav-list"
            :class="{ 'is-inactive': !inNav }"
            orientation="vertical"
            :activeid="activeId"
            @change="onNavChange"
          >
            <fluent-tab
              v-for="item in nav"
              :id="item.to"
              :key="item.to"
              class="nav-tab"
              @click="go(item.to)"
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
        <div class="sidebar-footer">
          <router-link to="/settings" class="nav-tab" exact-active-class="active">
            <span class="nav-tab-inner">
              <font-awesome-icon :icon="['fas', 'gear']" class="nav-icon" />
              <span class="nav-label">设置</span>
            </span>
          </router-link>
        </div>
      </aside>

      <main class="content" :class="{ standalone }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WindowControls from './WindowControls.vue';
import { tools } from '@renderer/consts/tools';

const route = useRoute();
const router = useRouter();

// 批量处理等以独立窗口打开的页面（route.meta.standalone）不显示左侧功能导航
const standalone = computed(() => route.meta.standalone === true);
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? '');

watchEffect(() => {
  document.title = standalone.value && pageTitle.value ? `${pageTitle.value} - 洋芋田图像工具箱` : '洋芋田图像工具箱';
});

// 工具项与首页 / 图片输入区共用同一份清单，名称与图标不会不一致
const nav = [
  { to: '/', label: '首页', icon: ['fas', 'house'] as [string, string] },
  ...tools.map((tool) => ({
    to: tool.path,
    label: tool.label,
    icon: ['fas', tool.icon] as [string, string]
  }))
];

/**
 * activeid 永远给一个有效值：路由不在导航区时沿用上一次命中的路由。
 * 传空串会触发 v3 tablist 的「自动选第一个」分支（tablist.base:84），
 * 组件自己接管后与我们的绑定打架 —— 这正是之前累积出多个高亮项的元凶。
 */
const lastNavId = ref('/');
const inNav = computed(() => nav.some((item) => item.to === route.path));
const activeId = computed(() => (inNav.value ? route.path : lastNavId.value));

watch(
  () => route.path,
  (p) => {
    if (nav.some((item) => item.to === p)) lastNavId.value = p;
  },
  { immediate: true }
);

const navListEl = ref<HTMLElement | null>(null);

/** 归一化选中态：以 property 显式对齐（组件的点击路径会自动设值，兜底防残留） */
async function normalizeSelection(): Promise<void> {
  await nextTick();
  const list = navListEl.value as (HTMLElement & { activeid?: string }) | null;
  if (!list) return;
  const id = activeId.value;
  if (list.activeid !== id) list.activeid = id;
}

watch(() => route.path, () => { void normalizeSelection(); }, { immediate: true });

function go(to: string): void {
  if (route.path !== to) router.push(to);
}

/** tablist 的 change（方向键切换也会触发）：按 id 跳转 */
function onNavChange(e: Event): void {
  const id = (e as CustomEvent).detail?.id ?? (e.target as HTMLElement)?.id;
  if (id && nav.some((item) => item.to === id)) go(id);
}
</script>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 圆角与阴影走变量：Windows 模拟 Win11 悬浮窗口，macOS 由窗口自身提供（见 global.css） */
  border-radius: var(--shell-radius);
  overflow: hidden;
  /* Mica 风格背景（纯 CSS 渐变）—— 仅在卡片内部绘制，
     窗口边缘的透明余量由 body padding 提供 */
  background: var(--shell-bg);
  /* 对称柔和阴影：单侧最大延伸 = 6+20 = 26px < --window-pad(28px)，
     四向阴影均完整可见，不再被窗口边界裁切 */
  box-shadow: var(--shell-shadow);
}
/* 注意：不要写 `.app-shell > *` 之类的通配层级规则 ——
   WindowControls 是靠 absolute 定位的标题栏，被覆盖成 relative 会进入文档流并撑出横向滚动 */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
  /* 内容区提升到背景动画层之上（bg-flow 为 z-index:0 的绝对定位层） */
  position: relative;
  z-index: 1;
}
.sidebar {
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
/* 导航项：hover 与选中底色都用文字色 color-mix 自绘 ——
   最早的 bug 是 hover 用 Background1Hover（#f5f5f5）与 --app-bg 同值撞色，
   color-mix 跟随主题文字色，浅色/深色下都保证可见 */
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
/* hover 与选中底色用文字色 color-mix 自绘：
   最早的 bug 是 hover 用 Background1Hover 与 --app-bg 同值撞色 */
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
.content {
  /* 水平内边距变量化：个别页面（如字体管理）用它把滚动区延伸到窗口右缘 */
  --content-pad-x: 32px;
  flex: 1;
  min-width: 0;
  overflow: auto;
  /* 顶部让出悬浮的窗口控制栏；非 Windows 没有自绘按钮，用 --content-pad-top 与下边距对齐 */
  padding: var(--content-pad-top) var(--content-pad-x) 28px;
}
/* 独立窗口：无侧边栏，内容区四周留白略收紧 */
.content.standalone {
  --content-pad-x: 20px;
  padding: 40px var(--content-pad-x) 20px;
}
</style>

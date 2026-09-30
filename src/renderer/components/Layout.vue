<template>
  <div class="app-shell">
    <WindowControls :inset="standalone ? 0 : 232" :title="standalone ? pageTitle : ''" />
    <div class="body">
      <aside v-if="!standalone" class="sidebar">
        <div class="brand">
          <img class="brand-mark" src="@renderer/assets/logo.png" alt="logo" />
          <span class="brand-name">洋芋田图像工具箱</span>
        </div>

        <!-- 侧边导航改用 Fluent v3 的纵向 tablist：
             hover / 选中（含方向键切换）由组件自身提供，不再自绘，
             避免之前 hover 底色与 --app-bg 撞色导致浅色下看不出来的问题 -->
        <nav class="nav">
          <fluent-tablist
            class="nav-list"
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

        <div class="sidebar-footer">
          <!-- v3 的 tablist 始终保留一个选中项（给无效 id 也不例外），
               因此在非设置页时用 is-inactive 中和掉强调色，避免出现两个选中态 -->
          <fluent-tablist
            class="nav-list"
            :class="{ 'is-inactive': route.path !== '/settings' }"
            orientation="vertical"
            activeid="/settings"
            @change="onNavChange"
          >
            <fluent-tab id="/settings" class="nav-tab" @click="go('/settings')">
              <span class="nav-tab-inner">
                <font-awesome-icon :icon="['fas', 'gear']" class="nav-icon" />
                <span class="nav-label">设置</span>
              </span>
            </fluent-tab>
          </fluent-tablist>
        </div>
      </aside>

      <main class="content" :class="{ standalone }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';
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

/** 当前路由对应的 tab id（不匹配的分组传空串，避免出现两个选中态） */
const activeId = computed(() => (nav.some((item) => item.to === route.path) ? route.path : ''));

function go(to: string): void {
  if (route.path !== to) router.push(to);
}

/** tablist 的 change（键盘方向键切换也会触发）：按 id 跳转 */
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
  background: var(--app-bg);
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
  /* 与窗口背景同色（Windows 设置观感），不再用右侧边框做分隔 */
  background: var(--app-bg);
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
/* 纵向 tablist：撑满侧边栏宽度，项之间留出细间隙 */
.nav-list {
  width: 100%;
}
/* hover 与选中态由 fluent-tablist 自身提供（组件内的悬浮底色与选中指示），
   这里只负责内容排版：图标 + 文字左对齐、整行可点 */
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
/* hover 与选中底色自绘在宿主背景上：v3 tablist 的内部态在纵向模式下不明显，
   且用文字色 mix 能保证两主题都可见（不会像之前那样与 --app-bg 撞色） */
.nav-tab:hover {
  background: color-mix(in srgb, var(--colorNeutralForeground1) 8%, transparent);
}
.nav-tab[aria-selected='true'] {
  background: color-mix(in srgb, var(--colorNeutralForeground1) 10%, transparent);
  color: var(--accent-base-color);
  font-weight: 500;
}
/* 选中态左侧细条指示（沿用原设计的轻量指示，不用整块强调色填充） */
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

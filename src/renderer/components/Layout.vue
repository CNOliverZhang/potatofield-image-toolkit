<template>
  <div class="app-shell">
    <WindowControls :inset="standalone ? 0 : 232" :title="standalone ? pageTitle : ''" />
    <div class="body">
      <aside v-if="!standalone" class="sidebar">
        <div class="brand">
          <img class="brand-mark" src="@renderer/assets/logo.png" alt="logo" />
          <span class="brand-name">洋芋田图像工具箱</span>
        </div>

        <nav class="nav">
          <router-link
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            exact-active-class="active"
          >
            <font-awesome-icon :icon="item.icon" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <router-link to="/settings" class="nav-item" exact-active-class="active">
            <font-awesome-icon :icon="['fas', 'gear']" class="nav-icon" />
            <span class="nav-label">设置</span>
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
import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import WindowControls from './WindowControls.vue';
import { tools } from '@renderer/consts/tools';

const route = useRoute();

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
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  padding: calc(var(--design-unit) * 2.25 * 1px) calc(var(--design-unit) * 3 * 1px);
  border-radius: calc(var(--borderRadiusMedium) + var(--design-unit) * 1px / 2);
  color: var(--colorNeutralForeground1);
  cursor: pointer;
  user-select: none;
  transition: background 0.12s ease;
}
.nav-item:hover {
  background: var(--colorNeutralBackground1Hover);
}
/* Fluent 风格选中态：轻量背景 + 强调色文字 + 左侧细条指示，
   不再用整块强调色填充与加粗，避免“刻意、太重” */
.nav-item.active {
  /* v2 的 neutral-fill-stealth-active 极淡（近透明叠加）；v3 的
     colorNeutralBackground1Pressed 明显更重，这里按原观感用 5% 文字色混入 */
  background: color-mix(in srgb, var(--colorNeutralForeground1) 5%, transparent);
  color: var(--accent-base-color);
  font-weight: 500;
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: calc(var(--design-unit) * 1.75 * 1px);
  bottom: calc(var(--design-unit) * 1.75 * 1px);
  width: 3px;
  border-radius: calc(var(--design-unit) * 0.75 * 1px);
  background: var(--accent-base-color);
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

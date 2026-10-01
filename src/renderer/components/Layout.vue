<template>
  <div class="app-shell">
    <WindowControls :inset="standalone ? 0 : 232" :title="standalone ? pageTitle : ''" />
    <div class="body">
      <!-- 侧边栏与主窗口外观完全一致；模板库这类内容型独立窗口也复用它（自带 Logo 与标题） -->
      <AppSidebar v-if="!standalone" :items="nav" :active-id="activeId" show-settings @change="go" />

      <main class="content" :class="{ standalone }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WindowControls from './WindowControls.vue';
import AppSidebar from './AppSidebar.vue';
import { tools } from '@renderer/consts/tools';

const route = useRoute();
const router = useRouter();

// 批量处理等以独立窗口打开的页面（route.meta.standalone）不显示左侧功能导航
const standalone = computed(() => route.meta.standalone === true);
/** 独立窗口的标题栏文字；页面自带侧边栏（有 Logo + 标题）时用 hideTitle 让位，避免重复 */
const pageTitle = computed(() =>
  route.meta.hideTitle ? '' : ((route.meta.title as string | undefined) ?? '')
);

watchEffect(() => {
  document.title = standalone.value && pageTitle.value ? `${pageTitle.value} - 洋芋田图像工具箱` : '洋芋田图像工具箱';
});

// 工具项与首页 / 图片输入区共用同一份清单，名称与图标不会不一致
const nav = [
  { id: '/', label: '首页', icon: ['fas', 'house'] as [string, string] },
  ...tools.map((tool) => ({
    id: tool.path,
    label: tool.label,
    icon: ['fas', tool.icon] as [string, string]
  }))
];

/**
 * activeid 永远给一个有效值：路由不在导航区时沿用上一次命中的路由。
 * 传空串会触发 v3 tablist 的「自动选第一个」分支（tablist.base:84），
 * 组件自己接管后与我们的绑定打架 —— 这正是之前累积出多个高亮项的元凶。
 * 例外：/settings 不属于功能导航（侧边栏底部的「设置」入口自己有选中态），
 * 此时给一个不在 items 里的 id，让 AppSidebar 中和掉功能导航的高亮，
 * 否则「上一次的工具」和「设置」会同时高亮。
 */
const lastNavId = ref('/');
const inNav = computed(() => nav.some((item) => item.id === route.path));
const activeId = computed(() => {
  if (inNav.value) return route.path;
  return route.path === '/settings' ? '/settings' : lastNavId.value;
});

watch(
  () => route.path,
  (p) => {
    if (nav.some((item) => item.id === p)) lastNavId.value = p;
  },
  { immediate: true }
);

function go(to: string): void {
  if (route.path !== to) router.push(to);
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
.content {
  /* 内容区边距：左右取 32；上/下用全局的 --content-pad-top / --content-pad-b
     （Windows 40、macOS 32，定义见 global.css）。所有页面、所有窗口都用这几个变量，
     需要把滚动条/列表延伸到窗口边缘的页面（字体管理、模板列表、设置页）用它们做负 margin 抵扣 */
  --content-pad-x: 32px;
  flex: 1;
  min-width: 0;
  overflow: auto;
  /* 顶部让出悬浮的窗口控制栏；非 Windows 没有自绘按钮，用 --content-pad-top 与下边距对齐 */
  padding: var(--content-pad-top) var(--content-pad-x) var(--content-pad-b);
}
/* 独立窗口：边距与主窗口完全一致（此前独立窗口收紧到 20px，导致各窗口边距不统一）。
   顶部沿用平台默认值（Windows 需让出自绘标题栏，macOS 由系统红绿灯决定） */
.content.standalone {
  padding: var(--content-pad-top) var(--content-pad-x) var(--content-pad-b);
}
</style>

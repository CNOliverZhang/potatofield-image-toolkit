<template>
  <div class="app-shell">
    <WindowControls :inset="standalone ? 0 : 232" :title="standalone ? pageTitle : ''" />
    <div class="body">
      <!-- 侧边栏与主窗口外观完全一致；模板库这类内容型独立窗口也复用它（自带 Logo 与标题） -->
      <AppSidebar v-if="!standalone" :items="nav" :active-id="activeId" show-settings @change="go" />

      <main class="content" :class="{ standalone, 'pad-main': padMain }">
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
// 内容型独立窗口（模板库 / 模板编辑）沿用主窗口的左右边距，
// 而不是独立窗口收紧后的 20px —— 这类页面是「看内容」而非「铺满工具面板」
const padMain = computed(() => route.meta.padMain === true);
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
 */
const lastNavId = ref('/');
const inNav = computed(() => nav.some((item) => item.id === route.path));
const activeId = computed(() => (inNav.value ? route.path : lastNavId.value));

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
  /* 水平内边距变量化：个别页面（如字体管理）用它把滚动区延伸到窗口右缘 */
  --content-pad-x: 32px;
  flex: 1;
  min-width: 0;
  overflow: auto;
  /* 顶部让出悬浮的窗口控制栏；非 Windows 没有自绘按钮，用 --content-pad-top 与下边距对齐 */
  padding: var(--content-pad-top) var(--content-pad-x) 28px;
}
/* 独立窗口：无侧边栏，内容区四周留白略收紧。
   顶边距变量化：模板库这类自带侧边栏的页面要用它把侧边栏拉回窗口顶部 */
.content.standalone {
  --content-pad-x: 20px;
  --content-pad-top: 40px;
  padding: var(--content-pad-top) var(--content-pad-x) 20px;
}
/* 内容型独立窗口（meta.padMain）：左右边距与主窗口一致 */
.content.standalone.pad-main {
  --content-pad-x: 32px;
}
</style>

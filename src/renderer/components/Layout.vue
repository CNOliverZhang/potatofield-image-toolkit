<template>
  <div class="app-shell">
    <!-- 缓慢流动的淡彩背景（GPU 合成动画，仅在 app-shell 内绘制） -->
    <div class="bg-flow" aria-hidden="true">
      <span class="blob b1"></span>
      <span class="blob b2"></span>
      <span class="blob b3"></span>
      <span class="blob b4"></span>
    </div>
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

const route = useRoute();

// 批量处理等以独立窗口打开的页面（route.meta.standalone）不显示左侧功能导航
const standalone = computed(() => route.meta.standalone === true);
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? '');

watchEffect(() => {
  document.title = standalone.value && pageTitle.value ? `${pageTitle.value} - 洋芋田图像工具箱` : '洋芋田图像工具箱';
});

const nav = [
  { to: '/', label: '首页', icon: ['fas', 'house'] as [string, string] },
  { to: '/watermark', label: '水印', icon: ['fas', 'stamp'] as [string, string] },
  { to: '/splicer', label: '拼图', icon: ['fas', 'table-cells-large'] as [string, string] },
  { to: '/cropper', label: '裁剪', icon: ['fas', 'crop-simple'] as [string, string] },
  { to: '/slicer', label: '切片', icon: ['fas', 'border-all'] as [string, string] },
  { to: '/text-to-image', label: '文字转图片', icon: ['fas', 'heading'] as [string, string] },
  { to: '/resizer', label: '改尺寸', icon: ['fas', 'arrows-left-right-to-line'] as [string, string] },
  { to: '/compress', label: '压缩', icon: ['fas', 'compress'] as [string, string] },
  { to: '/convert', label: '格式转换', icon: ['fas', 'arrows-rotate'] as [string, string] },
  { to: '/exif', label: 'EXIF 编辑', icon: ['fas', 'file-lines'] as [string, string] },
  { to: '/palette', label: '色彩提取', icon: ['fas', 'palette'] as [string, string] },
  { to: '/fonts', label: '字体管理', icon: ['fas', 'font'] as [string, string] }
];
</script>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: calc(var(--layer-corner-radius) * 1px + var(--design-unit) * 1px);
  overflow: hidden;
  /* Mica 风格背景（纯 CSS 渐变）—— 仅在卡片内部绘制，
     窗口边缘的透明余量由 body padding 提供 */
  background: var(--neutral-layer-floating);
  /* 对称柔和阴影：单侧最大延伸 = 6+20 = 26px < --window-pad(28px)，
     四向阴影均完整可见，不再被窗口边界裁切 */
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 6px 20px rgba(0, 0, 0, 0.2);
}
/* 注意：只提升内容区，不要写 `.app-shell > *` ——
   WindowControls 是靠 absolute 定位的标题栏，被覆盖成 relative 会进入文档流并撑出横向滚动 */

/* ===== 缓慢流动的淡彩背景 =====
   性能：仅动画 transform（GPU 合成层，不触发重排/重绘）；
   柔边用大半径径向渐变实现，不用 filter: blur（那会每帧重绘） */
.bg-flow {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* clip 不创建滚动容器，彻底避免色块溢出影响外壳布局 */
  overflow: clip;
  contain: paint;
  pointer-events: none;
  --flow-opacity: 0.2;
}
.blob {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  opacity: var(--flow-opacity);
  background: radial-gradient(circle closest-side, var(--blob-c), transparent 72%);
  will-change: transform;
  animation: var(--flow-dur, 64s) ease-in-out infinite alternate;
}
.blob.b1 { --blob-c: #a8c8ff; --flow-dur: 56s; width: 58%; top: -14%; left: -8%; animation-name: flow-a; }
.blob.b2 { --blob-c: #c9b6ff; --flow-dur: 74s; width: 54%; top: 14%; right: -12%; animation-name: flow-b; animation-delay: -18s; }
.blob.b3 { --blob-c: #ffc2da; --flow-dur: 66s; width: 50%; bottom: -16%; left: 16%; animation-name: flow-c; animation-delay: -30s; }
.blob.b4 { --blob-c: #ffdfba; --flow-dur: 88s; width: 44%; bottom: -6%; right: 4%; animation-name: flow-d; animation-delay: -44s; }
@keyframes flow-a { from { transform: translate(-4%, -3%) scale(1); } to { transform: translate(9%, 7%) scale(1.18); } }
@keyframes flow-b { from { transform: translate(5%, 4%) scale(1.1); } to { transform: translate(-8%, -6%) scale(0.94); } }
@keyframes flow-c { from { transform: translate(-6%, 5%) scale(1.05); } to { transform: translate(7%, -5%) scale(0.92); } }
@keyframes flow-d { from { transform: translate(4%, -4%) scale(0.96); } to { transform: translate(-6%, 6%) scale(1.14); } }

/* 深色模式：更暗、更淡的色斑（html[data-theme] 由 useTheme 切换） */
html[data-theme='dark'] .bg-flow {
  --flow-opacity: 0.14;
}
html[data-theme='dark'] .blob.b1 { --blob-c: #1b3358; }
html[data-theme='dark'] .blob.b2 { --blob-c: #2a2050; }
html[data-theme='dark'] .blob.b3 { --blob-c: #3d1a2e; }
html[data-theme='dark'] .blob.b4 { --blob-c: #3a2a10; }

/* 尊重系统"减弱动态效果" */
@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none;
  }
}
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
  /* 半透明底色：让流动的淡彩背景隐约透出（PowerToys 视觉），不用 backdrop-filter 以省资源 */
  background: color-mix(in srgb, var(--neutral-layer-1) 80%, transparent);
  border-right: 1px solid var(--neutral-stroke-rest);
  display: flex;
  flex-direction: column;
  padding: calc(var(--design-unit) * 2 * 1px);
}
.brand {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2.5 * 1px);
  padding: calc(var(--design-unit) * 3 * 1px) calc(var(--design-unit) * 2.5 * 1px) calc(var(--design-unit) * 4 * 1px);
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
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  color: var(--neutral-foreground-rest);
  cursor: pointer;
  user-select: none;
  transition: background 0.12s ease;
}
.nav-item:hover {
  background: var(--neutral-fill-hover);
}
/* Fluent 风格选中态：轻量背景 + 强调色文字 + 左侧细条指示，
   不再用整块强调色填充与加粗，避免“刻意、太重” */
.nav-item.active {
  background: var(--neutral-fill-stealth-active);
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
  border-top: 1px solid var(--neutral-stroke-rest);
  padding-top: calc(var(--design-unit) * 1.5 * 1px);
  margin-top: calc(var(--design-unit) * 1.5 * 1px);
}
.content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  /* 顶部留 40px 让出悬浮的窗口控制栏（32px 按钮 + 余量） */
  padding: 40px 32px 28px;
}
/* 独立窗口：无侧边栏，内容区四周留白略收紧 */
.content.standalone {
  padding: 40px 20px 20px;
}
</style>

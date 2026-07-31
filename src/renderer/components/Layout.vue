<template>
  <div class="app-shell">
    <WindowControls />
    <div class="body">
      <aside class="sidebar">
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

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import WindowControls from './WindowControls.vue';

const nav = [
  { to: '/', label: '首页', icon: ['fas', 'house'] as [string, string] },
  { to: '/watermark', label: '水印', icon: ['fas', 'stamp'] as [string, string] },
  { to: '/global-watermark', label: '全局水印', icon: ['fas', 'images'] as [string, string] },
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
  border-radius: 12px;
  overflow: hidden;
  /* Mica 风格背景（纯 CSS 渐变）—— 仅在卡片内部绘制，
     窗口边缘的透明余量由 body padding 提供 */
  background: var(--neutral-layer-floating);
  /* 对称柔和阴影：单侧最大延伸 = 6+20 = 26px < --window-pad(28px)，
     四向阴影均完整可见，不再被窗口边界裁切 */
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 6px 20px rgba(0, 0, 0, 0.2);
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sidebar {
  width: 232px;
  flex-shrink: 0;
  background: var(--neutral-layer-1);
  border-right: 1px solid var(--neutral-stroke-rest);
  display: flex;
  flex-direction: column;
  padding: 8px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px 16px;
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
  gap: 2px;
  overflow-y: auto;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 6px;
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
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 3px;
  background: var(--accent-base-color);
}
.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 15px;
}
.sidebar-footer {
  border-top: 1px solid var(--neutral-stroke-rest);
  padding-top: 6px;
  margin-top: 6px;
}
.content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  /* 顶部留 40px 让出悬浮的窗口控制栏（32px 按钮 + 余量） */
  padding: 40px 32px 28px;
}
</style>

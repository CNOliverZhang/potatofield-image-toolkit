<template>
  <div class="app-shell">
    <WindowControls />
    <div class="body">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">
            <font-awesome-icon :icon="['fas', 'warehouse']" />
          </span>
          <span class="brand-name">洋芋田图像工具箱</span>
        </div>

        <nav class="nav">
          <router-link
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            active-class="active"
          >
            <font-awesome-icon :icon="item.icon" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <router-link to="/settings" class="nav-item" active-class="active">
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
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.22);
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sidebar {
  width: 232px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
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
  color: var(--accent);
  font-size: 18px;
}
.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 6px;
  color: var(--text-color);
  cursor: pointer;
  user-select: none;
}
.nav-item:hover {
  background: var(--hover-bg);
}
.nav-item.active {
  background: var(--active-bg);
  color: var(--accent);
  font-weight: 600;
}
.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 15px;
}
.sidebar-footer {
  border-top: 1px solid var(--border-color);
  padding-top: 6px;
  margin-top: 6px;
}
.content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 28px 32px;
}
</style>

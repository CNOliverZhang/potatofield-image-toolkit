<template>
  <div class="layout">
    <WindowControls />
    <div class="body">
      <aside class="sidebar">
        <div class="logo">图像工具箱</div>
        <el-menu :default-active="activePath" router class="menu">
          <el-menu-item v-for="item in tools" :key="item.path" :index="item.path">
            <font-awesome-icon :icon="item.icon" class="menu-icon" />
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </aside>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import WindowControls from './WindowControls.vue';

const route = useRoute();
const activePath = computed(() => route.path);

const tools = [
  { path: '/', label: '首页', icon: ['fas', 'house'] },
  { path: '/watermark', label: '加水印', icon: ['fas', 'stamp'] },
  { path: '/global-watermark', label: '全屏水印', icon: ['fas', 'fill-drip'] },
  { path: '/splicer', label: '长图拼接', icon: ['fas', 'bars-staggered'] },
  { path: '/cropper', label: '裁剪', icon: ['fas', 'crop'] },
  { path: '/slicer', label: '分割', icon: ['fas', 'grip'] },
  { path: '/text-to-image', label: '富文本制图', icon: ['fas', 'paragraph'] },
  { path: '/resizer', label: '尺寸调整', icon: ['fas', 'arrows-alt'] },
  { path: '/compress', label: '压缩', icon: ['fas', 'compress'] },
  { path: '/convert', label: '格式转换', icon: ['fas', 'repeat'] },
  { path: '/exif', label: 'EXIF 读取', icon: ['fas', 'circle-info'] },
  { path: '/palette', label: '色彩提取', icon: ['fas', 'palette'] },
  { path: '/fonts', label: '字体管理', icon: ['fas', 'font'] },
  { path: '/settings', label: '设置', icon: ['fas', 'gear'] }
];
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sidebar {
  width: 180px;
  flex-shrink: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}
.logo {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--main-color);
}
.menu {
  border-right: none;
  background: transparent;
  flex: 1;
}
.menu-icon {
  margin-right: 8px;
  width: 16px;
}
.content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px;
}
</style>

<template>
  <div class="home">
    <div class="grid">
      <div v-for="tool in tools" :key="tool.path" class="card" @click="go(tool.path)">
        <font-awesome-icon :icon="tool.icon" class="card-icon" />
        <div class="card-label">{{ tool.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const tools = [
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
  { path: '/fonts', label: '字体管理', icon: ['fas', 'font'] }
];

function go(path: string) {
  router.push(path);
}
</script>

<style scoped>
.home {
  max-width: 900px;
  margin: 0 auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}
.card {
  background: var(--neutral-layer-2);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: 10px;
  padding: 22px 12px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-base-color);
}
.card-icon {
  font-size: 26px;
  color: var(--accent-base-color);
  margin-bottom: 10px;
}
.card-label {
  font-size: 14px;
}
</style>

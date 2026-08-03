<template>
  <div class="home">
    <div class="grid">
      <div v-for="tool in tools" :key="tool.path" class="card" @click="go(tool.path)">
        <font-awesome-icon :icon="tool.icon" class="card-icon" />
        <div class="card-label">{{ tool.label }}</div>
        <button
          v-if="tool.batchRoute"
          class="card-batch"
          @click.stop="goBatch(tool)"
        >
          批量处理
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

interface ToolEntry {
  path: string;
  label: string;
  icon: [string, string];
  batchRoute?: string;
}

const router = useRouter();

const tools: ToolEntry[] = [
  { path: '/watermark', label: '加水印', icon: ['fas', 'stamp'], batchRoute: '/watermark/batch' },
  { path: '/global-watermark', label: '全屏水印', icon: ['fas', 'fill-drip'], batchRoute: '/global-watermark/batch' },
  { path: '/splicer', label: '长图拼接', icon: ['fas', 'bars-staggered'] },
  { path: '/cropper', label: '裁剪', icon: ['fas', 'crop'] },
  { path: '/slicer', label: '分割', icon: ['fas', 'grip'] },
  { path: '/text-to-image', label: '富文本制图', icon: ['fas', 'paragraph'] },
  { path: '/resizer', label: '尺寸调整', icon: ['fas', 'arrows-alt'], batchRoute: '/resizer/batch' },
  { path: '/compress', label: '压缩', icon: ['fas', 'compress'], batchRoute: '/compress/batch' },
  { path: '/convert', label: '格式转换', icon: ['fas', 'repeat'], batchRoute: '/convert/batch' },
  { path: '/exif', label: 'EXIF 读取', icon: ['fas', 'circle-info'] },
  { path: '/palette', label: '色彩提取', icon: ['fas', 'palette'] },
  { path: '/fonts', label: '字体管理', icon: ['fas', 'font'] }
];

function go(path: string) {
  router.push(path);
}

function goBatch(tool: ToolEntry) {
  if (!tool.batchRoute) return;
  window.api.window.open({
    route: tool.batchRoute,
    key: 'batch' + tool.path.replace(/\//g, '-'),
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680
  });
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
  gap: calc(var(--design-unit) * 4 * 1px);
}
.card {
  background: var(--neutral-layer-2);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--layer-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  padding: calc(var(--design-unit) * 5.5 * 1px) calc(var(--design-unit) * 3 * 1px);
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
  position: relative;
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-base-color);
}
.card-icon {
  font-size: 26px;
  color: var(--accent-base-color);
  margin-bottom: calc(var(--design-unit) * 2.5 * 1px);
}
.card-label {
  font-size: 14px;
}
.card-batch {
  margin-top: calc(var(--design-unit) * 2.5 * 1px);
  border: 1px solid var(--neutral-stroke-rest);
  background: transparent;
  color: var(--accent-base-color);
  font-size: var(--type-ramp-minus-2-font-size);
  padding: calc(var(--design-unit) * 1 * 1px) calc(var(--design-unit) * 2.5 * 1px);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  cursor: pointer;
  transition: background 0.12s ease;
}
.card-batch:hover {
  background: var(--neutral-fill-hover);
}
</style>

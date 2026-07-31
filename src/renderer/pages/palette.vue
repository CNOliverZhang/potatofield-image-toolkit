<template>
  <div class="palette">
    <h2>色彩提取</h2>
    <el-button type="primary" @click="selectImage">选择图片</el-button>
    <div v-if="imagePath" class="preview">
      <img ref="imgRef" :src="imgSrc" crossorigin="anonymous" @load="extract" />
    </div>
    <div v-if="colors.length" class="swatches">
      <div
        v-for="(c, i) in colors"
        :key="i"
        class="swatch"
        :style="{ background: c }"
        :title="c"
        @click="copy(c)"
      >
        <span class="hex">{{ c }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ColorThief from 'colorthief';
import { selectImageFiles } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';

const dialog = useDialog();
const imgRef = ref<HTMLImageElement | null>(null);
const imagePath = ref('');
const colors = ref<string[]>([]);

const imgSrc = computed(() => (imagePath.value ? `file://${imagePath.value}` : ''));

async function selectImage() {
  const files = await selectImageFiles(false);
  if (!files || !files.length) return;
  imagePath.value = files[0];
  colors.value = [];
}

function extract() {
  if (!imgRef.value) return;
  try {
    const thief = new ColorThief();
    const palette = thief.getPalette(imgRef.value, 10);
    colors.value = palette.map(
      ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    );
  } catch {
    dialog.message('提取失败，请换一张图片', 'error');
  }
}

function copy(color: string) {
  navigator.clipboard?.writeText(color);
  dialog.message(`已复制 ${color}`, 'success');
}
</script>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.preview img {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.swatch {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 6px;
  border: 1px solid var(--border-color);
}
.hex {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.7);
  padding: 1px 4px;
  border-radius: 4px;
  color: #333;
}
</style>

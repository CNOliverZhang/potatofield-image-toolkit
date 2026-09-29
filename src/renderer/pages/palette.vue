<template>
  <!-- 与其他工具页同一套布局类（.tool + .controls-pane），保证左右分栏宽度一致 -->
  <div class="tool">
    <!-- 左：统一图片选择/预览组件（含「重新选择」） -->
    <ImagePicker
      :src="imgSrc"
      :name="fileName"
      icon="palette"
      hint="选择一张图片以提取主要色彩"
      @pick="selectImage"
      @load="onImgLoad"
    />

    <!-- 右：控制面板 -->
    <aside class="controls-pane">
      <div class="controls-body palette-body">
      <div class="side-head">
        <h2>色彩提取</h2>
        <label class="field">
          <span class="field-label">色彩数量</span>
          <fluent-select :value="String(count)" @change="onCount">
            <fluent-option v-for="n in 10" :key="n" :value="String(n)">{{ n }}</fluent-option>
          </fluent-select>
        </label>
      </div>

      <!-- 色卡：按数量自适应网格，占满剩余高度，页面不产生滚动 -->
      <div
        v-if="colors.length"
        class="swatches"
        :style="{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }"
      >
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
        <div v-else class="placeholder">
          {{ imagePath ? '提取中…' : '选择图片后自动提取主要色彩' }}
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ColorThief from 'colorthief';
import { selectImageFiles } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';
import ImagePicker from '@renderer/components/ImagePicker.vue';

const dialog = useDialog();
const imgRef = ref<HTMLImageElement | null>(null);
const imagePath = ref('');
const colors = ref<string[]>([]);
const count = ref(8);
const imgLoaded = ref(false);

const imgSrc = computed(() => (imagePath.value ? `file://${imagePath.value}` : ''));
const fileName = computed(() => imagePath.value.split(/[\\/]/).pop() ?? '');
/** 列数随数量变化，保证网格始终填满且不溢出 */
const gridCols = computed(() => (count.value <= 1 ? 1 : count.value <= 4 ? 2 : count.value <= 9 ? 3 : 4));

function toHex(c: [number, number, number]): string {
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

async function selectImage() {
  const files = await selectImageFiles(false);
  if (!files || !files.length) return;
  imagePath.value = files[0];
  colors.value = [];
  imgLoaded.value = false;
}

/** 预览图加载完成：拿到 img 元素供 ColorThief 读取像素 */
function onImgLoad(el: HTMLImageElement) {
  imgRef.value = el ?? null;
  imgLoaded.value = true;
  extract();
}

function extract() {
  if (!imgRef.value || !imgLoaded.value) return;
  try {
    const thief = new ColorThief();
    if (count.value === 1) {
      // 单色时取主色，getPalette 在数量为 1 时行为不稳定
      colors.value = [toHex(thief.getColor(imgRef.value) as [number, number, number])];
      return;
    }
    const palette = thief.getPalette(imgRef.value, count.value) as [number, number, number][];
    colors.value = palette.map(toHex);
  } catch {
    dialog.message('提取失败，请换一张图片', 'error');
  }
}

function onCount(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  if (!v) return;
  count.value = v;
  if (imgLoaded.value) extract(); // 已加载过图片时立即按新数量重新提取
}

watch(count, () => {
  if (imgLoaded.value) extract();
});

function copy(color: string) {
  navigator.clipboard?.writeText(color);
  dialog.message(`已复制 ${color}`, 'success');
}
</script>

<style scoped>
/* 右栏：沿用全局 controls-body（宽度/间距与其它工具页一致），但整页不滚动 */
.palette-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 3 * 1px);
  overflow: hidden;
}
.side-head {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 2 * 1px);
  flex-shrink: 0;
}
.side-head h2 {
  margin: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1 * 1px);
}
.field-label {
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
}
.swatches {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-auto-rows: 1fr;
  gap: calc(var(--design-unit) * 2.5 * 1px);
}
.swatch {
  min-height: 0;
  min-width: 0;
  border-radius: calc(var(--layer-corner-radius) * 1px);
  border: 1px solid var(--neutral-stroke-rest);
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: calc(var(--design-unit) * 1.5 * 1px);
  overflow: hidden;
  transition: transform 0.12s ease;
}
.swatch:hover {
  transform: translateY(calc(var(--design-unit) * -0.5 * 1px));
}
.hex {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.72);
  padding: 1px calc(var(--design-unit) * 1 * 1px);
  border-radius: calc(var(--control-corner-radius) * 1px);
  color: #333;
}
.placeholder {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--neutral-foreground-secondary-rest);
  border: 1px dashed var(--neutral-stroke-rest);
  border-radius: calc(var(--layer-corner-radius) * 1px);
}
</style>

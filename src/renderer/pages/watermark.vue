<template>
  <div class="watermark-tool">
    <!-- 预览区 -->
    <section class="preview-pane">
      <div v-if="!inputPath" class="dropzone">
        <font-awesome-icon icon="image" class="dz-icon" />
        <p>选择一张图片开始添加水印</p>
        <fluent-button appearance="accent" @click="pickImage">选择图片</fluent-button>
      </div>
      <template v-else>
        <div class="preview-stage">
          <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
        </div>
        <div class="preview-bar">
          <span class="fname">{{ inputName }}</span>
          <fluent-button appearance="neutral" @click="pickImage">重新选择</fluent-button>
        </div>
      </template>
    </section>

    <!-- 参数面板 -->
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="batch-entry">
          <fluent-button appearance="neutral" @click="openBatch">
            <font-awesome-icon icon="layer-group" /> 批量处理
          </fluent-button>
        </div>
        <WatermarkControls v-model="params" />
        <div class="controls-footer">
          <fluent-button appearance="accent" class="save-btn" :disabled="processing" @click="save">
            {{ processing ? '处理中…' : '保存水印图片' }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onBeforeUnmount } from 'vue';
import type { WatermarkParams } from '@shared/types';
import { selectImageFiles, selectDirectory } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';
import WatermarkControls from '@renderer/components/WatermarkControls.vue';

const { message } = useDialog();

const inputPath = ref('');
const inputName = ref('');
const previewUrl = ref('');
const processing = ref(false);
let previewTimer: number | undefined;

function defaultParams(): WatermarkParams {
  return {
    type: 'text',
    text: '洋芋田',
    fontSize: 48,
    color: '#ffffff',
    opacity: 0.5,
    bold: true,
    fontFamily: 'sans-serif',
    rotation: 0,
    gravity: 'se',
    offsetX: 5,
    offsetY: 5,
    tile: false,
    tileGap: 60,
    watermarkPath: '',
    scale: 0.25,
    format: 'original',
    quality: 90
  };
}

const params = reactive<WatermarkParams>(defaultParams());

async function pickImage() {
  const files = await selectImageFiles(false);
  if (!files || !files.length) return;
  inputPath.value = files[0];
  inputName.value = inputPath.value.split(/[\\/]/).pop() || '';
  updatePreview();
}

function schedulePreview() {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(updatePreview, 220);
}

async function updatePreview() {
  if (!inputPath.value) return;
  if (params.type === 'image' && !params.watermarkPath) return;
  try {
    const res = await window.api.image.process({
      op: 'watermark',
      inputPath: inputPath.value,
      extra: { ...params } as unknown as Record<string, unknown>
    });
    if (res.buffer) {
      const blob = new Blob([res.buffer], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = url;
    }
  } catch (err) {
    message('预览失败：' + (err as Error).message, 'error');
  }
}

function extFor(fmt: WatermarkParams['format']): string {
  if (fmt === 'original') {
    const dot = inputPath.value.lastIndexOf('.');
    return dot > 0 ? inputPath.value.slice(dot) : '.png';
  }
  return fmt === 'jpeg' ? '.jpg' : fmt === 'webp' ? '.webp' : '.png';
}

async function save() {
  if (!inputPath.value) return;
  if (params.type === 'image' && !params.watermarkPath) {
    message('请先选择水印图片', 'warning');
    return;
  }
  const dir = await selectDirectory();
  if (!dir) return;
  const base = inputPath.value.split(/[\\/]/).pop() || 'image';
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const name = stem + '_watermarked' + extFor(params.format);
  const outputPath = dir + (dir.endsWith('/') || dir.endsWith('\\') ? '' : '\\') + name;
  processing.value = true;
  try {
    await window.api.image.process({
      op: 'watermark',
      inputPath: inputPath.value,
      outputPath,
      options: { format: params.format === 'original' ? undefined : params.format, quality: params.quality },
      extra: { ...params } as unknown as Record<string, unknown>
    });
    message('已保存到：' + name, 'success');
    window.api.shell.showItemInFolder(outputPath);
  } catch (err) {
    message('保存失败：' + (err as Error).message, 'error');
  } finally {
    processing.value = false;
  }
}

function openBatch() {
  window.api.window.open({
    route: '/watermark/batch',
    key: 'batch-watermark',
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680
  });
}

watch(params, schedulePreview, { deep: true });

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  if (previewTimer) window.clearTimeout(previewTimer);
});
</script>

<style scoped>
.watermark-tool {
  display: flex;
  gap: calc(var(--design-unit) * 1px * 6);
  height: 100%;
  min-height: 0;
  margin-bottom: calc(var(--design-unit) * 1px * -4);
}
.preview-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--neutral-fill-hover);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--layer-corner-radius) * 1px);
  overflow: hidden;
}
.dropzone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--design-unit) * 1px * 3.5);
  color: var(--neutral-foreground-secondary-rest);
}
.dz-icon {
  font-size: calc(var(--design-unit) * 1px * 11.5);
  opacity: 0.5;
}
.preview-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--design-unit) * 1px);
  background-color: var(--neutral-layer-1);
  background-image: linear-gradient(45deg, var(--neutral-layer-3) 25%, transparent 25%),
    linear-gradient(-45deg, var(--neutral-layer-3) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--neutral-layer-3) 75%),
    linear-gradient(-45deg, transparent 75%, var(--neutral-layer-3) 75%);
  background-size: calc(var(--design-unit) * 1px * 5) calc(var(--design-unit) * 1px * 5);
  background-position: 0 0, 0 calc(var(--design-unit) * 1px * 2.5),
    calc(var(--design-unit) * 1px * 2.5) calc(var(--design-unit) * 1px * -2.5),
    calc(var(--design-unit) * 1px * -2.5) 0;
}
.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 calc(var(--design-unit) * 1px * 0.5) calc(var(--design-unit) * 1px * 3) rgba(0, 0, 0, 0.18);
}
.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--design-unit) * 1px * 3);
  padding: calc(var(--design-unit) * 1px * 2.5) calc(var(--design-unit) * 1px * 3.5);
  border-top: 1px solid var(--neutral-stroke-rest);
  background: var(--neutral-layer-2);
}
.fname {
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.controls-pane {
  width: 340px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-right: -32px;
}
.controls-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 calc(var(--design-unit) * 1px * 6) 0 0;
}
.batch-entry {
  position: sticky;
  top: 0;
  z-index: 2;
  padding-bottom: calc(var(--design-unit) * 1px * 2.5);
  margin-bottom: calc(var(--design-unit) * 1px * 2);
  background: linear-gradient(to bottom, var(--neutral-layer-1) 75%, transparent);
}
.batch-entry fluent-button {
  width: 100%;
}
.controls-footer {
  position: sticky;
  bottom: 0;
  isolation: isolate;
}
.controls-footer::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--design-unit) * 1px * 8);
  top: calc(var(--design-unit) * 1px * -7);
  background: linear-gradient(to top, var(--neutral-layer-1), transparent);
  pointer-events: none;
  z-index: -1;
}
.save-btn {
  width: 100%;
}
</style>

<template>
  <div class="batch-tool">
    <BatchImportPanel v-model="files" v-model:selected="selected" class="import-col" />

    <section class="preview-pane">
      <div v-if="!selected" class="dropzone">
        <font-awesome-icon icon="images" class="dz-icon" />
        <p>从左侧导入图片，点击列表项预览</p>
      </div>
      <template v-else>
        <div class="preview-stage">
          <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
        </div>
        <div class="preview-bar">
          <span class="fname">{{ selectedName }}</span>
        </div>
      </template>
    </section>

    <aside class="controls-pane">
      <div class="controls-body">
        <WatermarkControls v-model="params" :lock-tile="lockTile" />
        <SaveLocationSetting v-model="saveDir" v-model:keepRelative="keepRelative" />
        <div class="controls-footer">
          <fluent-button v-if="processing" appearance="neutral" class="save-btn" @click="cancel">
            取消（已完成 {{ progress.done }}/{{ progress.total }}）
          </fluent-button>
          <fluent-button v-else appearance="accent" class="save-btn" @click="run">
            开始批量处理 ({{ files.length }})
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onBeforeUnmount, computed } from 'vue';
import type { WatermarkParams } from '@shared/types';
import type { BatchItem } from '@renderer/utils/directoryScanner';
import { useDialog } from '@renderer/composables/useDialog';
import { outExt } from '@renderer/composables/useOutputSettings';
import { useBatchRunner } from '@renderer/composables/useBatchRunner';
import { useSettingsStore } from '@renderer/stores/settings';
import BatchImportPanel from '@renderer/components/BatchImportPanel.vue';
import WatermarkControls from '@renderer/components/WatermarkControls.vue';
import SaveLocationSetting from '@renderer/components/SaveLocationSetting.vue';

defineProps<{ lockTile?: boolean }>();

const { message } = useDialog();
const settings = useSettingsStore();

const files = ref<BatchItem[]>([]);
const keepRelative = ref(false);
const selected = ref('');
const params = reactive<WatermarkParams>(defaultParams());
const saveDir = ref(settings.defaultSaveDirectory || settings.recentSaveDirs[0] || '');
const previewUrl = ref('');

let previewTimer: number | undefined;

const selectedName = computed(() => (selected.value ? selected.value.split(/[\\/]/).pop() : ''));

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
    positionUnit: 'percent',
    sizePct: 20,
    offsetX: 5,
    offsetY: 5,
    offsetXPx: 20,
    offsetYPx: 20,
    tile: false,
    tileGap: 60,
    watermarkPath: '',
    scale: 0.25,
    format: 'original',
    quality: 90
  };
}

function extFor(fmt: WatermarkParams['format']): string {
  return fmt === 'jpeg' ? '.jpg' : fmt === 'webp' ? '.webp' : '.png';
}

function clearPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
}

async function updatePreview() {
  const path = selected.value;
  if (!path) {
    clearPreview();
    return;
  }
  if (params.type === 'image' && !params.watermarkPath) {
    clearPreview();
    return;
  }
  try {
    const res = await window.api.image.process({
      op: 'watermark',
      inputPath: path,
      extra: { ...params } as unknown as Record<string, unknown>
    });
    if (res.buffer) {
      const blob = new Blob([res.buffer], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      clearPreview();
      previewUrl.value = url;
    }
  } catch (err) {
    message('预览失败：' + (err as Error).message, 'error');
  }
}

function schedulePreview() {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(updatePreview, 220);
}

watch([params, selected], schedulePreview, { deep: true });

/** 批量执行：统一走 useBatchRunner（覆盖策略 / 取消 / 进度 / 打开输出文件） */
const { processing, progress, run, cancel } = useBatchRunner({
  files,
  saveDir,
  keepRelative,
  op: 'watermark',
  suffix: '_watermarked',
  // 保持原格式时沿用各自输入图的扩展名
  extOf: (item) => (params.format === 'original' ? undefined : outExt(params.format, item.path)),
  validate: () =>
    params.type === 'image' && !params.watermarkPath ? '请先选择水印图片' : null,
  prepare: () => ({
    options: {
      format: params.format === 'original' ? undefined : params.format,
      quality: params.quality
    },
    extra: { ...params } as unknown as Record<string, unknown>
  })
});

onBeforeUnmount(() => {
  clearPreview();
  if (previewTimer) window.clearTimeout(previewTimer);
});
</script>

<style scoped>
.batch-tool {
  display: flex;
  flex-direction: row;
  gap: calc(var(--design-unit) * 1px * 5);
  height: 100%;
  min-height: 0;
  margin-bottom: calc(var(--design-unit) * 1px * -4);
  overflow: hidden;
}
.import-col {
  width: calc(var(--design-unit) * 1px * 70);
  flex-shrink: 0;
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
  display: block;
  gap: 0;
}
.controls-footer {
  position: sticky;
  bottom: 0;
  isolation: isolate;
  padding: 0;
}
.save-btn {
  width: 100%;
}
</style>

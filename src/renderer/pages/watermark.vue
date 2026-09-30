<template>
  <div class="watermark-tool">
    <!-- 预览区（统一组件：未选图为占位框，选图后预览 + 「重新选择」） -->
    <ImagePicker
      :src="previewUrl || inputSrc"
      :name="inputName"
      icon="stamp"
      hint="选择一张图片开始添加水印"
      @pick="pickImage"
    />

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
          <fluent-button appearance="primary" class="save-btn" :disabled="processing || !inputPath" @click="save">
            {{ processing ? '处理中…' : '保存水印图片' }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue';
import type { WatermarkParams } from '@shared/types';
import { selectImageFiles } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';
import { createOutputOpts } from '@renderer/composables/useOutputSettings';
import { useSingleTool } from '@renderer/composables/useSingleTool';
import WatermarkControls from '@renderer/components/WatermarkControls.vue';
import ImagePicker from '@renderer/components/ImagePicker.vue';

const { message } = useDialog();
/** 与其它单图工具一致：保存时再选目录 */
const { inputPath, inputName, previewUrl, processing, runSave } = useSingleTool();

/** 原图地址：作为水印预览生成前的兜底显示，避免选图后出现空白 */
const inputSrc = computed(() => (inputPath.value ? `file://${inputPath.value}` : ''));
let previewTimer: number | undefined;

function defaultParams(): WatermarkParams {
  // 输出格式/质量默认取设置页「默认输出」（与其它工具一致）
  const out = createOutputOpts();
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
    format: out.format,
    quality: out.quality
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
  if (params.type === 'image' && !params.watermarkPath) {
    message('请先选择水印图片', 'warning');
    return;
  }
  // 与其它单图工具一致：走 runSave（先选目录再处理，提示与错误处理统一）
  await runSave(
    (stem) => stem + '_watermarked' + extFor(params.format),
    async (outputPath) => {
      await window.api.image.process({
        op: 'watermark',
        inputPath: inputPath.value,
        outputPath,
        options: {
          format: params.format === 'original' ? undefined : params.format,
          quality: params.quality
        },
        extra: { ...params } as unknown as Record<string, unknown>
      });
    }
  );
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
  background: var(--colorNeutralBackground1Hover);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge);
  overflow: hidden;
}
.dropzone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--design-unit) * 1px * 3.5);
  color: var(--app-fg-secondary);
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
  background-color: var(--colorNeutralBackground1);
  background-image: linear-gradient(45deg, var(--colorNeutralBackground3) 25%, transparent 25%),
    linear-gradient(-45deg, var(--colorNeutralBackground3) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--colorNeutralBackground3) 75%),
    linear-gradient(-45deg, transparent 75%, var(--colorNeutralBackground3) 75%);
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
  border-top: 1px solid var(--colorNeutralStroke1);
  background: var(--colorNeutralBackground2);
}
.fname {
  font-size: var(--fontSizeBase200);
  color: var(--app-fg-secondary);
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
/* .batch-entry 顶部渐变与 .controls-footer::before 渐隐由 global.css 统一提供 */
.batch-entry fluent-button {
  width: 100%;
}
.controls-footer {
  position: sticky;
  bottom: 0;
  isolation: isolate;
  /* v3 的 select .control 自带 z-index:1，吸底 footer 必须更高，否则滚动时控件会盖在按钮上 */
  z-index: 10;
  padding: 0;
}
.save-btn {
  width: 100%;
}
</style>

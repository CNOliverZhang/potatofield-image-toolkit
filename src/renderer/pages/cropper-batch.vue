<template>
  <div class="batch-tool">
    <BatchImportPanel v-model="files" v-model:selected="selected" class="import-col" />

    <section class="preview-pane">
      <div v-if="!selected" class="dropzone">
        <font-awesome-icon icon="crop" class="dz-icon" />
        <p>从左侧导入图片，点击列表项预览裁剪效果</p>
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
        <!-- 裁剪参数：与单图裁剪共用同一组件（批量无画布） -->
        <CropControls
          :region="region"
          :meta="selectedMeta"
          v-model:unit="unit"
          v-model:ratio="ratio"
          v-model:position="position"
          @change="schedulePreview"
        />
        <p class="hint">
          区域以当前选中图为基准；尺寸不同的图片按「{{ unit === 'px' ? '固定像素并裁剪到图片范围内' : '百分比等比换算' }}」处理。
        </p>

        <!-- 输出设置：与单图裁剪一致 -->
        <SettingsGroup title="输出设置">
          <SettingsRow label="格式">
            <fluent-select class="ctl-md" :value="out.format" @change="onFormat">
              <fluent-option value="original">保持原格式</fluent-option>
              <fluent-option value="png">PNG（无损）</fluent-option>
              <fluent-option value="jpeg">JPG（有损）</fluent-option>
              <fluent-option value="webp">WebP（有损）</fluent-option>
            </fluent-select>
          </SettingsRow>
          <SettingsRow v-if="lossy" label="质量">
            <fluent-slider class="ctl-slider" :value="out.quality" :min="10" :max="100" :step="1" @change="out.quality = evNum($event)"></fluent-slider>
            <span class="row-val">{{ out.quality }}</span>
          </SettingsRow>
        </SettingsGroup>

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
import { reactive, ref, watch, computed, onBeforeUnmount } from 'vue';
import type { BatchItem } from '@renderer/utils/directoryScanner';
import { useDialog } from '@renderer/composables/useDialog';
import { useSettingsStore } from '@renderer/stores/settings';
import { evNum } from '@renderer/composables/useSingleTool';
import {
  createOutputOpts,
  isLossy,
  outExt,
  withOutput,
  type OutputOpts
} from '@renderer/composables/useOutputSettings';
import { clampRegionToImage, scaleRegionToImage, type CropMeta } from '@renderer/composables/useCropGeometry';
import { useBatchRunner } from '@renderer/composables/useBatchRunner';
import BatchImportPanel from '@renderer/components/BatchImportPanel.vue';
import CropControls from '@renderer/components/CropControls.vue';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';
import SaveLocationSetting from '@renderer/components/SaveLocationSetting.vue';

const { message } = useDialog();
const settings = useSettingsStore();

const files = ref<BatchItem[]>([]);
const selected = ref('');
const saveDir = ref(settings.defaultSaveDirectory || settings.recentSaveDirs[0] || '');
const keepRelative = ref(false);
const previewUrl = ref('');

const region = reactive({ left: 0, top: 0, width: 0, height: 0 });
const unit = ref<'px' | 'ratio'>('px');
const ratio = ref('free');
/** 与单图一致：默认左上角基准 */
const position = ref('nw');

/** 输出格式/质量：默认取设置页「默认输出」 */
const out: OutputOpts = createOutputOpts();
const lossy = computed(() => isLossy(out.format));
function onFormat(e: Event) {
  out.format = (e.target as HTMLInputElement).value as OutputOpts['format'];
}

const selectedMeta = ref<CropMeta | null>(null);

const selectedName = computed(() => (selected.value ? selected.value.split(/[\\/]/).pop() : ''));

let previewTimer: number | undefined;

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
  const r = fitTo(path, selectedMeta.value?.width ?? 0, selectedMeta.value?.height ?? 0);
  if (!r) {
    clearPreview();
    return;
  }
  try {
    const res = await window.api.image.process({
      op: 'extract',
      inputPath: path,
      options: { ...r, ...withOutput({}, out) }
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

/** 把裁剪区域适配到目标图：像素模式钳到图内，比例模式按百分比换算 */
function fitTo(path: string, iw: number, ih: number) {
  return unit.value === 'ratio'
    ? scaleRegionToImage(region, selectedMeta.value, iw, ih)
    : clampRegionToImage(region, iw, ih);
}

async function fetchSelectedMeta() {
  if (!selected.value) {
    selectedMeta.value = null;
    return;
  }
  try {
    const res = await window.api.image.process({ op: 'metadata', inputPath: selected.value });
    const m = res.info as unknown as CropMeta;
    selectedMeta.value = { width: m.width || 0, height: m.height || 0 };
    // 首次拿到尺寸时给一个「整图」的初始区域（与单图的居中 60% 接近，批量取整图更可控）
    if (!region.width || !region.height) {
      region.left = 0;
      region.top = 0;
      region.width = selectedMeta.value.width;
      region.height = selectedMeta.value.height;
    }
  } catch {
    selectedMeta.value = null;
  }
}

watch(selected, async () => {
  await fetchSelectedMeta();
  schedulePreview();
}, { immediate: true });
watch(region, schedulePreview, { deep: true });

/** 批量执行：统一走 useBatchRunner（覆盖策略 / 取消 / 进度 / 打开输出文件） */
const { processing, progress, run, cancel } = useBatchRunner({
  files,
  saveDir,
  keepRelative,
  op: 'extract',
  suffix: '_cropped',
  extOf: (item) => (out.format === 'original' ? undefined : outExt(out.format, item.path)),
  prepare: async (item) => {
    const res = await window.api.image.process({ op: 'metadata', inputPath: item.path });
    const m = res.info as unknown as CropMeta;
    const iw = m.width || 0;
    const ih = m.height || 0;
    // 区域按当前单位适配到这张图；图片太小裁不出则跳过
    const r = fitTo(item.path, iw, ih);
    if (!r) return { skip: `图片尺寸 ${iw}×${ih} 小于裁剪区域，已跳过` };
    return { options: { ...r, ...withOutput({}, out) } };
  }
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
}
.group {
  margin-bottom: calc(var(--design-unit) * 1px * 5.5);
}
.group-title {
  display: block;
  font-size: var(--type-ramp-minus-1-font-size);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--neutral-foreground-secondary-rest);
  margin-bottom: calc(var(--design-unit) * 1px * 2.5);
}
.field {
  display: block;
  margin-bottom: calc(var(--design-unit) * 1px * 3.5);
}
.field.row {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 3);
}
.field-label {
  display: block;
  font-size: var(--type-ramp-minus-1-font-size);
  margin-bottom: calc(var(--design-unit) * 1px * 1.5);
  color: var(--neutral-foreground-rest);
}
.field-label em {
  font-style: normal;
  color: var(--neutral-foreground-secondary-rest);
  font-weight: 500;
}
.controls-footer {
  position: sticky;
  bottom: 0;
  isolation: isolate;
}
/* footer 渐隐遮罩由 global.css 的 .controls-footer::before 统一提供 */
.save-btn {
  width: 100%;
}
.q-val {
  width: 36px;
  flex-shrink: 0;
  text-align: right;
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
}
.hint {
  margin: 0 0 calc(var(--design-unit) * 1px * 3);
  font-size: 11px;
  line-height: 1.5;
  color: var(--neutral-foreground-secondary-rest);
}
</style>

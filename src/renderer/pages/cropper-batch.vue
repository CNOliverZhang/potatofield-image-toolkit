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
        <div class="group">
          <span class="group-title">裁剪区域（像素）</span>
          <div class="field row">
            <span class="field-label">比例预设</span>
            <fluent-select :value="ratio" @change="onRatio">
              <fluent-option value="free">自由</fluent-option>
              <fluent-option value="1:1">1:1</fluent-option>
              <fluent-option value="4:3">4:3</fluent-option>
              <fluent-option value="16:9">16:9</fluent-option>
              <fluent-option value="3:2">3:2</fluent-option>
              <fluent-option value="2:3">2:3</fluent-option>
            </fluent-select>
          </div>
          <div class="field row" v-if="ratio !== 'free'">
            <span class="field-label">位置</span>
            <fluent-select :value="position" @change="onPosition">
              <fluent-option value="center">居中</fluent-option>
              <fluent-option value="nw">左上</fluent-option>
              <fluent-option value="ne">右上</fluent-option>
              <fluent-option value="sw">左下</fluent-option>
              <fluent-option value="se">右下</fluent-option>
            </fluent-select>
          </div>
          <div class="field row">
            <span class="field-label">X（左）</span>
            <fluent-number-field :value="region.left" min="0" @input="region.left = evNum($event)">px</fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">Y（上）</span>
            <fluent-number-field :value="region.top" min="0" @input="region.top = evNum($event)">px</fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">宽度</span>
            <fluent-number-field :value="region.width" min="1" @input="region.width = evNum($event)">px</fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">高度</span>
            <fluent-number-field :value="region.height" min="1" @input="region.height = evNum($event)">px</fluent-number-field>
          </div>
          <fluent-button appearance="neutral" @click="useFull">使用整图</fluent-button>
        </div>

        <SaveLocationSetting v-model="saveDir" v-model:keepRelative="keepRelative" />

        <div class="controls-footer">
          <fluent-button appearance="accent" class="save-btn" :disabled="processing || files.length === 0" @click="run">
            {{ processing ? `处理中 ${progress.done}/${progress.total}` : `开始批量处理 (${files.length})` }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, onBeforeUnmount } from 'vue';
import { resolveBatchOutputPath, ensureDir } from '@renderer/utils/fileIO';
import type { BatchItem } from '@renderer/utils/directoryScanner';
import { useDialog } from '@renderer/composables/useDialog';
import { useSettingsStore } from '@renderer/stores/settings';
import { evNum } from '@renderer/composables/useSingleTool';
import BatchImportPanel from '@renderer/components/BatchImportPanel.vue';
import SaveLocationSetting from '@renderer/components/SaveLocationSetting.vue';

interface Meta {
  width: number;
  height: number;
}

const { message } = useDialog();
const settings = useSettingsStore();

const files = ref<BatchItem[]>([]);
const selected = ref('');
const saveDir = ref(settings.defaultSaveDirectory || settings.recentSaveDirs[0] || '');
const keepRelative = ref(false);
const previewUrl = ref('');
const processing = ref(false);
const progress = reactive({ done: 0, total: 0 });

const region = reactive({ left: 0, top: 0, width: 0, height: 0 });
const ratio = ref('free');
const position = ref('center');

const RATIOS: Record<string, [number, number]> = {
  '1:1': [1, 1],
  '4:3': [4, 3],
  '16:9': [16, 9],
  '3:2': [3, 2],
  '2:3': [2, 3]
};

const selectedMeta = ref<Meta | null>(null);

const selectedName = computed(() => (selected.value ? selected.value.split(/[\\/]/).pop() : ''));

function onRatio(e: Event) {
  ratio.value = (e.target as HTMLInputElement).value;
  applyPreset();
}
function onPosition(e: Event) {
  position.value = (e.target as HTMLInputElement).value;
  applyPreset();
}

function applyPreset() {
  if (!selectedMeta.value || ratio.value === 'free') return;
  const [rw, rh] = RATIOS[ratio.value];
  const iw = selectedMeta.value.width;
  const ih = selectedMeta.value.height;
  let w = iw;
  let h = (iw * rh) / rw;
  if (h > ih) {
    h = ih;
    w = (ih * rw) / rh;
  }
  let left = 0;
  let top = 0;
  if (position.value === 'center') {
    left = (iw - w) / 2;
    top = (ih - h) / 2;
  } else {
    if (position.value === 'ne' || position.value === 'se') left = iw - w;
    else if (position.value === 'nw' || position.value === 'sw') left = 0;
    else left = (iw - w) / 2;
    if (position.value === 'sw' || position.value === 'se') top = ih - h;
    else if (position.value === 'nw' || position.value === 'ne') top = 0;
    else top = (ih - h) / 2;
  }
  region.left = Math.round(left);
  region.top = Math.round(top);
  region.width = Math.round(w);
  region.height = Math.round(h);
}

function useFull() {
  if (!selectedMeta.value) return;
  ratio.value = 'free';
  region.left = 0;
  region.top = 0;
  region.width = selectedMeta.value.width;
  region.height = selectedMeta.value.height;
}

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
  try {
    const res = await window.api.image.process({
      op: 'extract',
      inputPath: path,
      options: { left: region.left, top: region.top, width: region.width, height: region.height }
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

async function fetchSelectedMeta() {
  if (!selected.value) {
    selectedMeta.value = null;
    return;
  }
  try {
    const res = await window.api.image.process({ op: 'metadata', inputPath: selected.value });
    const m = res.info as unknown as Meta;
    selectedMeta.value = { width: m.width || 0, height: m.height || 0 };
    useFull();
  } catch {
    selectedMeta.value = null;
  }
}

watch(selected, async () => {
  await fetchSelectedMeta();
  schedulePreview();
}, { immediate: true });
watch(region, schedulePreview, { deep: true });

async function run() {
  if (!files.value.length) {
    message('请先导入图片', 'warning');
    return;
  }
  if (!saveDir.value) {
    message('请先设置保存位置', 'warning');
    return;
  }
  processing.value = true;
  progress.done = 0;
  progress.total = files.value.length;
  let ok = 0;
  for (const item of files.value) {
    try {
      const res = await window.api.image.process({ op: 'metadata', inputPath: item.path });
      const m = res.info as unknown as Meta;
      const iw = m.width || 0;
      const ih = m.height || 0;
      const w = Math.max(1, Math.min(region.width, iw));
      const h = Math.max(1, Math.min(region.height, ih));
      const left = Math.max(0, Math.min(region.left, Math.max(0, iw - w)));
      const top = Math.max(0, Math.min(region.top, Math.max(0, ih - h)));
      const out = resolveBatchOutputPath(saveDir.value, item, {
        suffix: '_cropped',
        ext: undefined,
        keepStructure: keepRelative.value
      });
      if (keepRelative.value && item.rel.includes('/')) {
        await ensureDir(out.substring(0, out.lastIndexOf('/')));
      }
      await window.api.image.process({
        op: 'extract',
        inputPath: item.path,
        outputPath: out,
        options: { left, top, width: w, height: h }
      });
      ok++;
    } catch (e) {
      const base = item.path.split(/[\\/]/).pop() || 'image';
      message('失败 ' + base + '：' + (e as Error).message, 'error');
    }
    progress.done++;
  }
  processing.value = false;
  message(`批量裁剪完成：${ok}/${files.value.length} 张成功`, 'success');
  if (ok > 0) {
    window.api.shell.showItemInFolder(
      resolveBatchOutputPath(saveDir.value, files.value[0], {
        suffix: '_cropped',
        ext: undefined,
        keepStructure: keepRelative.value
      })
    );
  }
}

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
.controls-footer::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--design-unit) * 1px * 8);
  top: calc(var(--design-unit) * 1px * -7);
  background: linear-gradient(to top, color-mix(in srgb, var(--neutral-layer-floating) 90%, transparent), transparent);
  pointer-events: none;
  z-index: -1;
}
.save-btn {
  width: 100%;
}
</style>

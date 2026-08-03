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
        <div class="group">
          <span class="group-title">{{ config[tool].title }}设置</span>

          <template v-if="tool === 'resizer'">
            <div class="field row">
              <span class="field-label">宽度</span>
              <fluent-number-field :value="opts.width" @input="opts.width = evNum($event)">px</fluent-number-field>
            </div>
            <div class="field row">
              <span class="field-label">高度（0=按比例）</span>
              <fluent-number-field :value="opts.height" @input="opts.height = evNum($event)">px</fluent-number-field>
            </div>
            <label class="field">
              <span class="field-label">适配方式</span>
              <fluent-select :value="opts.fit" @change="opts.fit = evVal($event) as ImageProcessOptions['fit']">
                <fluent-option value="inside">等比缩放</fluent-option>
                <fluent-option value="cover">裁剪填充</fluent-option>
                <fluent-option value="fill">拉伸</fluent-option>
              </fluent-select>
            </label>
          </template>

          <template v-else-if="tool === 'compress'">
            <label class="field">
              <span class="field-label">格式</span>
              <fluent-select :value="opts.format || 'original'" @change="opts.format = evVal($event) === 'original' ? undefined : (evVal($event) as ImageFormat)">
                <fluent-option value="original">原格式</fluent-option>
                <fluent-option value="jpeg">JPG</fluent-option>
                <fluent-option value="png">PNG</fluent-option>
                <fluent-option value="webp">WebP</fluent-option>
              </fluent-select>
            </label>
            <div class="field">
              <span class="field-label">质量 <em>{{ opts.quality }}%</em></span>
              <fluent-slider :value="opts.quality" :min="10" :max="100" :step="1" @change="opts.quality = evNum($event)"></fluent-slider>
            </div>
          </template>

          <template v-else-if="tool === 'convert'">
            <label class="field">
              <span class="field-label">目标格式</span>
              <fluent-select :value="opts.format || 'png'" @change="opts.format = evVal($event) as ImageFormat">
                <fluent-option value="png">PNG</fluent-option>
                <fluent-option value="jpeg">JPG</fluent-option>
                <fluent-option value="webp">WebP</fluent-option>
              </fluent-select>
            </label>
          </template>
        </div>

        <SaveLocationSetting v-model="saveDir" />

        <div class="controls-footer">
          <fluent-button appearance="accent" class="save-btn" :disabled="processing" @click="run">
            {{ processing ? `处理中 ${progress.done}/${progress.total}` : `开始批量处理 (${files.length})` }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onBeforeUnmount, computed } from 'vue';
import type { ImageProcessOptions } from '@shared/types';
import { buildOutputPath } from '@renderer/utils/fileIO';
import { useDialog } from '@renderer/composables/useDialog';
import { useSettingsStore } from '@renderer/stores/settings';
import BatchImportPanel from '@renderer/components/BatchImportPanel.vue';
import SaveLocationSetting from '@renderer/components/SaveLocationSetting.vue';

type ToolKey = 'resizer' | 'compress' | 'convert';
type ImageFormat = 'png' | 'jpeg' | 'webp';

const props = defineProps<{ tool: ToolKey }>();

const config: Record<ToolKey, { title: string; op: 'resize' | 'compress' | 'convert'; suffix: string }> = {
  resizer: { title: '尺寸调整', op: 'resize', suffix: '_resized' },
  compress: { title: '压缩', op: 'compress', suffix: '_compressed' },
  convert: { title: '格式转换', op: 'convert', suffix: '_converted' }
};

const { message } = useDialog();
const settings = useSettingsStore();

const files = ref<string[]>([]);
const selected = ref('');
const saveDir = ref(settings.defaultSaveDirectory || settings.recentSaveDirs[0] || '');
const previewUrl = ref('');
const processing = ref(false);
const progress = reactive({ done: 0, total: 0 });
const opts = reactive({
  width: 800,
  height: 0,
  fit: 'inside' as ImageProcessOptions['fit'],
  format: undefined as ImageFormat | undefined,
  quality: 80
});

let previewTimer: number | undefined;

const selectedName = computed(() => (selected.value ? selected.value.split(/[\\/]/).pop() : ''));

function evVal(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
function evNum(e: Event): number {
  return Number((e.target as HTMLInputElement).value);
}

function buildOptions(): ImageProcessOptions {
  const o: ImageProcessOptions = {};
  if (props.tool === 'resizer') {
    if (opts.width) o.width = opts.width;
    if (opts.height) o.height = opts.height;
    o.fit = opts.fit;
  } else if (props.tool === 'compress') {
    if (opts.format) o.format = opts.format;
    o.quality = opts.quality;
  } else if (props.tool === 'convert') {
    o.format = opts.format;
  }
  return o;
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
  try {
    const res = await window.api.image.process({
      op: config[props.tool].op,
      inputPath: path,
      options: buildOptions()
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

watch([opts, selected], schedulePreview, { deep: true });

async function run() {
  if (!files.value.length) {
    message('请先导入图片', 'warning');
    return;
  }
  if (!saveDir.value) {
    message('请先设置保存位置', 'warning');
    return;
  }
  if (props.tool === 'convert' && !opts.format) {
    message('请选择目标格式', 'warning');
    return;
  }
  processing.value = true;
  progress.done = 0;
  progress.total = files.value.length;
  let ok = 0;
  for (const f of files.value) {
    const base = f.split(/[\\/]/).pop() || 'image';
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const inExt = dot > 0 ? base.slice(dot) : '';
    let outExt = inExt;
    if (props.tool === 'convert' && opts.format) outExt = '.' + opts.format;
    else if (props.tool === 'compress' && opts.format) outExt = '.' + opts.format;
    const out = buildOutputPath(saveDir.value, stem + config[props.tool].suffix + outExt);
    try {
      await window.api.image.process({
        op: config[props.tool].op,
        inputPath: f,
        outputPath: out,
        options: buildOptions()
      });
      ok++;
    } catch (e) {
      message('失败 ' + base + '：' + (e as Error).message, 'error');
    }
    progress.done++;
  }
  processing.value = false;
  message(`批量处理完成：${ok}/${files.value.length} 张成功`, 'success');
  if (ok > 0) {
    window.api.shell.showItemInFolder(
      buildOutputPath(saveDir.value, files.value[0].split(/[\\/]/).pop() || 'image')
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
  gap: calc(var(--design-unit) * 1px * 5);
  height: 100%;
  min-height: 0;
  margin-bottom: calc(var(--design-unit) * 1px * -4);
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
  background: linear-gradient(to top, var(--neutral-layer-1), transparent);
  pointer-events: none;
  z-index: -1;
}
.save-btn {
  width: 100%;
}
</style>

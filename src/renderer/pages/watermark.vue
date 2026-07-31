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
      <div class="seg">
        <button :class="['seg-btn', { active: params.type === 'text' }]" @click="params.type = 'text'">
          文字水印
        </button>
        <button :class="['seg-btn', { active: params.type === 'image' }]" @click="params.type = 'image'">
          图片水印
        </button>
      </div>

      <!-- 文字水印 -->
      <div v-if="params.type === 'text'" class="group">
        <span class="group-title">基础设置</span>
        <label class="field">
          <span class="field-label">文本内容</span>
          <fluent-text-field :value="params.text" @input="params.text = evVal($event)"></fluent-text-field>
        </label>
        <div class="field">
          <span class="field-label">字号 <em>{{ params.fontSize }}px</em></span>
          <fluent-slider
            :value="params.fontSize"
            :min="8"
            :max="200"
            :step="1"
            @change="params.fontSize = evNum($event)"
          ></fluent-slider>
        </div>
        <div class="field row">
          <span class="field-label">颜色</span>
          <input class="color" type="color" :value="params.color" @input="params.color = evVal($event)" />
        </div>
        <div class="field row">
          <span class="field-label">加粗</span>
          <label class="chk">
            <fluent-checkbox :checked="params.bold" @change="params.bold = evChk($event)"></fluent-checkbox>
          </label>
        </div>
        <label class="field">
          <span class="field-label">字体</span>
          <fluent-select :value="params.fontFamily" @change="params.fontFamily = evVal($event)">
            <fluent-option v-for="f in FONTS" :key="f.value" :value="f.value">{{ f.label }}</fluent-option>
          </fluent-select>
        </label>
      </div>

      <!-- 图片水印 -->
      <div v-else class="group">
        <span class="group-title">基础设置</span>
        <div class="field">
          <span class="field-label">水印图片</span>
          <div class="wm-pick">
            <button class="link-btn" @click="pickWatermarkImage">选择图片</button>
            <span v-if="params.watermarkPath" class="wm-name">{{ params.watermarkPath.split(/[\\/]/).pop() }}</span>
            <span v-else class="muted">未选择</span>
          </div>
        </div>
        <div class="field">
          <span class="field-label">大小 <em>{{ Math.round(params.scale * 100) }}%</em></span>
          <fluent-slider
            :value="params.scale * 100"
            :min="5"
            :max="100"
            :step="1"
            @change="params.scale = evNum($event) / 100"
          ></fluent-slider>
        </div>
      </div>
      <!-- 模式 -->
      <div class="group">
        <span class="group-title">样式及内容</span>
        <label class="field">
          <span class="field-label">水印模式</span>
          <fluent-select :value="params.tile ? 'tile' : 'single'" @change="params.tile = evVal($event) === 'tile'">
            <fluent-option value="single">单个模式</fluent-option>
            <fluent-option value="tile">平铺模式</fluent-option>
          </fluent-select>
        </label>
        <!-- 平铺时整块位置概念无意义，仅保留平铺开关与旋转 -->
        <div class="field" v-if="!params.tile">
          <span class="field-label">定位基准</span>
          <div class="pos-grid">
            <button
              v-for="p in POSITIONS"
              :key="p.g"
              :class="['pos-cell', { active: params.gravity === p.g }]"
              :title="p.label"
              @click="params.gravity = p.g"
            ></button>
          </div>
        </div>
        <div v-if="!params.tile && showHMargin" class="field">
          <span class="field-label">横向边距 <em>{{ params.offsetX }}%</em></span>
          <fluent-slider
            :value="params.offsetX"
            :min="0"
            :max="50"
            :step="1"
            @change="params.offsetX = evNum($event)"
          ></fluent-slider>
        </div>
        <div v-if="!params.tile && showVMargin" class="field">
          <span class="field-label">纵向边距 <em>{{ params.offsetY }}%</em></span>
          <fluent-slider
            :value="params.offsetY"
            :min="0"
            :max="50"
            :step="1"
            @change="params.offsetY = evNum($event)"
          ></fluent-slider>
        </div>
        <div class="field">
          <span class="field-label">旋转 <em>{{ params.rotation }}°</em></span>
          <fluent-slider
            :value="params.rotation"
            :min="-180"
            :max="180"
            :step="1"
            @change="params.rotation = evNum($event)"
          ></fluent-slider>
        </div>
      </div>

      <!-- 样式 -->
      <div class="group">
        <div class="field">
          <span class="field-label">不透明度 <em>{{ Math.round(params.opacity * 100) }}%</em></span>
          <fluent-slider
            :value="params.opacity * 100"
            :min="0"
            :max="100"
            :step="1"
            @change="params.opacity = evNum($event) / 100"
          ></fluent-slider>
        </div>
      </div>

      <!-- 输出 -->
      <div class="group">
        <span class="group-title">输出设置</span>
        <label class="field">
          <span class="field-label">格式</span>
          <fluent-select :value="params.format" @change="params.format = evVal($event) as 'png' | 'jpeg' | 'webp'">
            <fluent-option value="png">PNG（无损）</fluent-option>
            <fluent-option value="jpeg">JPG（有损）</fluent-option>
            <fluent-option value="webp">WebP（有损）</fluent-option>
          </fluent-select>
        </label>
        <div v-if="params.format !== 'png'" class="field">
          <span class="field-label">质量 <em>{{ params.quality }}%</em></span>
          <fluent-slider
            :value="params.quality"
            :min="10"
            :max="100"
            :step="1"
            @change="params.quality = evNum($event)"
          ></fluent-slider>
        </div>
      </div>
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
import { reactive, ref, watch, computed, onBeforeUnmount } from 'vue';
import type { WatermarkParams, WatermarkGravity } from '@shared/types';
import { selectImageFiles, selectDirectory } from '@renderer/utils/filePicker';
import { useDialog } from '@renderer/composables/useDialog';

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
    format: 'png',
    quality: 90
  };
}

const params = reactive<WatermarkParams>(defaultParams());

const FONTS = [
  { label: '无衬线', value: 'sans-serif' },
  { label: '衬线', value: 'serif' },
  { label: '等宽', value: 'monospace' },
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: '黑体', value: 'SimHei' }
];

const POSITIONS: { g: WatermarkGravity; label: string }[] = [
  { g: 'nw', label: '左上' },
  { g: 'n', label: '上' },
  { g: 'ne', label: '右上' },
  { g: 'w', label: '左' },
  { g: 'center', label: '居中' },
  { g: 'e', label: '右' },
  { g: 'sw', label: '左下' },
  { g: 's', label: '下' },
  { g: 'se', label: '右下' }
];

// 定位含左/右时不依赖纵向中心，显示横向边距；含上/下时显示纵向边距
const showHMargin = computed(() => /[we]/.test(params.gravity));
const showVMargin = computed(() => /[ns]/.test(params.gravity));

function evVal(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
function evNum(e: Event): number {
  return Number((e.target as HTMLInputElement).value);
}
function evChk(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

async function pickImage() {
  const files = await selectImageFiles(false);
  if (!files || !files.length) return;
  inputPath.value = files[0];
  inputName.value = inputPath.value.split(/[\\/]/).pop() || '';
  updatePreview();
}

async function pickWatermarkImage() {
  const files = await selectImageFiles(false);
  if (!files || !files.length) return;
  params.watermarkPath = files[0];
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
  const sep = dir.endsWith('/') || dir.endsWith('\\') ? '' : '\\';
  const outputPath = dir + sep + name;
  processing.value = true;
  try {
    await window.api.image.process({
      op: 'watermark',
      inputPath: inputPath.value,
      outputPath,
      options: { format: params.format, quality: params.quality },
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
  /* 抵消 .content 下边距，让左右下边缘平齐、滚动条接近贴底 */
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
  background-image:
    linear-gradient(45deg, var(--neutral-layer-3) 25%, transparent 25%),
    linear-gradient(-45deg, var(--neutral-layer-3) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--neutral-layer-3) 75%),
    linear-gradient(-45deg, transparent 75%, var(--neutral-layer-3) 75%);
  background-size: calc(var(--design-unit) * 1px * 5) calc(var(--design-unit) * 1px * 5);
  background-position: 0 0, 0 calc(var(--design-unit) * 1px * 2.5), calc(var(--design-unit) * 1px * 2.5) calc(var(--design-unit) * 1px * -2.5), calc(var(--design-unit) * 1px * -2.5) 0;
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
  /* 抵消 .content 的右边距(32px)，让滚动条贴右窗边 */
  margin-right: -32px;
}
.controls-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 calc(var(--design-unit) * 1px * 6) 0 0;
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
.seg {
  display: flex;
  background: var(--neutral-fill-hover);
  border-radius: calc(var(--layer-corner-radius) * 1px);
  padding: calc(var(--design-unit) * 1px * 0.75);
  margin-bottom: calc(var(--design-unit) * 1px * 4.5);
}
.seg-btn {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--neutral-foreground-rest);
  padding: calc(var(--design-unit) * 1px * 2) 0;
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  cursor: pointer;
  font-size: var(--type-ramp-minus-1-font-size);
  transition: all 0.12s ease;
}
.seg-btn.active {
  background: var(--accent-base-color);
  color: #fff;
  box-shadow: 0 1px calc(var(--design-unit) * 1px) rgba(0, 0, 0, 0.18);
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
.color {
  width: calc(var(--design-unit) * 1px * 11);
  height: calc(var(--design-unit) * 1px * 7.5);
  padding: 0;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px);
  background: none;
  cursor: pointer;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 1.5);
  font-size: var(--type-ramp-minus-1-font-size);
}
.pos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: calc(var(--design-unit) * 1px * 1.5);
  width: 132px;
  margin-bottom: calc(var(--design-unit) * 1px * 2.5);
}
.pos-cell {
  aspect-ratio: 1;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.12s ease;
}
.pos-cell::after {
  content: '';
  position: absolute;
  width: calc(var(--design-unit) * 1px * 1.75);
  height: calc(var(--design-unit) * 1px * 1.75);
  border-radius: 50%;
  background: var(--neutral-foreground-secondary-rest);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.4;
}
.pos-cell.active {
  border-color: var(--accent-base-color);
  background: var(--accent-base-color);
}
.pos-cell.active::after {
  background: #fff;
  opacity: 0.95;
}
.wm-pick {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 2.5);
}
.link-btn {
  border: 1px solid var(--neutral-stroke-rest);
  background: transparent;
  color: var(--accent-base-color);
  padding: calc(var(--design-unit) * 1px * 1.5) calc(var(--design-unit) * 1px * 3);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  cursor: pointer;
  font-size: var(--type-ramp-minus-1-font-size);
}
.link-btn:hover {
  background: var(--neutral-fill-hover);
}
.wm-name {
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}
.muted {
  color: var(--neutral-foreground-secondary-rest);
  font-size: var(--type-ramp-minus-1-font-size);
}
.save-btn {
  width: 100%;
}
</style>

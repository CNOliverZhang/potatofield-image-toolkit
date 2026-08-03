<template>
  <div class="wm-controls">
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

    <!-- 样式及内容 -->
    <div class="group">
      <span class="group-title">样式及内容</span>
      <label class="field" v-if="!lockTile">
        <span class="field-label">水印模式</span>
        <fluent-select
          :value="params.tile ? 'tile' : 'single'"
          @change="params.tile = evVal($event) === 'tile'"
        >
          <fluent-option value="single">单个模式</fluent-option>
          <fluent-option value="tile">平铺模式</fluent-option>
        </fluent-select>
      </label>
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
        <fluent-select
          :value="params.format"
          @change="params.format = evVal($event) as 'original' | 'png' | 'jpeg' | 'webp'"
        >
          <fluent-option value="original">保持原格式</fluent-option>
          <fluent-option value="png">PNG（无损）</fluent-option>
          <fluent-option value="jpeg">JPG（有损）</fluent-option>
          <fluent-option value="webp">WebP（有损）</fluent-option>
        </fluent-select>
      </label>
      <div v-if="params.format === 'jpeg' || params.format === 'webp'" class="field">
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WatermarkParams, WatermarkGravity } from '@shared/types';
import { selectImageFiles } from '@renderer/utils/filePicker';

const params = defineModel<WatermarkParams>({ required: true });
defineProps<{ lockTile?: boolean }>();

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

const showHMargin = computed(() => /[we]/.test(params.value.gravity));
const showVMargin = computed(() => /[ns]/.test(params.value.gravity));

function evVal(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
function evNum(e: Event): number {
  return Number((e.target as HTMLInputElement).value);
}
function evChk(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

async function pickWatermarkImage() {
  const files = await selectImageFiles(false);
  if (!files || !files.length) return;
  params.value.watermarkPath = files[0];
}
</script>

<style scoped>
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
</style>

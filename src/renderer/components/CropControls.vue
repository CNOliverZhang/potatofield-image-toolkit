<template>
  <SettingsGroup title="裁剪区域">
    <SettingsRow label="单位">
      <fluent-select class="ctl-md" :value="unit" @change="onUnit">
        <fluent-option value="px">像素</fluent-option>
        <fluent-option value="ratio">比例</fluent-option>
      </fluent-select>
    </SettingsRow>
    <SettingsRow label="比例预设">
      <fluent-select class="ctl-md" :value="ratio" @change="onRatio">
        <fluent-option value="free">自由</fluent-option>
        <fluent-option value="1:1">1:1</fluent-option>
        <fluent-option value="4:3">4:3</fluent-option>
        <fluent-option value="16:9">16:9</fluent-option>
        <fluent-option value="3:2">3:2</fluent-option>
        <fluent-option value="2:3">2:3</fluent-option>
      </fluent-select>
    </SettingsRow>
    <!-- 定位基准：决定裁剪框可移动的方向，两种单位下都生效 -->
    <SettingsRow label="定位基准">
      <div class="pos-grid">
        <button
          v-for="p in CROP_POSITIONS"
          :key="p.g"
          :class="['pos-cell', { active: position === p.g }]"
          :title="p.label"
          @click="onGravity(p.g)"
        ></button>
      </div>
    </SettingsRow>

    <!-- 像素模式：直接输入像素值 -->
    <template v-if="unit === 'px'">
      <SettingsRow label="X（左）">
        <fluent-number-field
          class="ctl-num"
          :value="fieldValue('left')"
          min="0"
          :max="maxOf('left')"
          :step="1"
          @input="onField('left', $event)"
        ><span slot="end">px</span></fluent-number-field>
      </SettingsRow>
      <SettingsRow label="Y（上）">
        <fluent-number-field
          class="ctl-num"
          :value="fieldValue('top')"
          min="0"
          :max="maxOf('top')"
          :step="1"
          @input="onField('top', $event)"
        ><span slot="end">px</span></fluent-number-field>
      </SettingsRow>
      <SettingsRow label="宽度">
        <fluent-number-field
          class="ctl-num"
          :value="fieldValue('width')"
          min="1"
          :max="maxOf('width')"
          :step="1"
          @input="onField('width', $event)"
        ><span slot="end">px</span></fluent-number-field>
      </SettingsRow>
      <SettingsRow label="高度">
        <fluent-number-field
          class="ctl-num"
          :value="fieldValue('height')"
          min="1"
          :max="maxOf('height')"
          :step="1"
          @input="onField('height', $event)"
        ><span slot="end">px</span></fluent-number-field>
      </SettingsRow>
    </template>

    <!-- 比例模式：边距与尺寸百分比 -->
    <template v-else>
      <SettingsRow v-if="showHMargin" label="横向边距">
        <fluent-slider
          class="ctl-slider"
          :value="offsetXPct"
          :min="0"
          :max="offsetXMaxPct"
          :step="1"
          @change="onOffsetX"
        ></fluent-slider>
        <span class="row-val">{{ offsetXPct }}%</span>
      </SettingsRow>
      <SettingsRow v-if="showVMargin" label="纵向边距">
        <fluent-slider
          class="ctl-slider"
          :value="offsetYPct"
          :min="0"
          :max="offsetYMaxPct"
          :step="1"
          @change="onOffsetY"
        ></fluent-slider>
        <span class="row-val">{{ offsetYPct }}%</span>
      </SettingsRow>
      <SettingsRow label="宽度">
        <fluent-slider
          class="ctl-slider"
          :value="widthPct"
          :min="1"
          :max="100"
          :step="1"
          @change="onSizePct('width', $event)"
        ></fluent-slider>
        <span class="row-val">{{ widthPct }}%</span>
      </SettingsRow>
      <SettingsRow label="高度">
        <fluent-slider
          class="ctl-slider"
          :value="heightPct"
          :min="1"
          :max="100"
          :step="1"
          @change="onSizePct('height', $event)"
        ></fluent-slider>
        <span class="row-val">{{ heightPct }}%</span>
      </SettingsRow>
    </template>

    <SettingsRow label="快捷操作">
      <fluent-button appearance="neutral" @click="useFull">使用整图</fluent-button>
    </SettingsRow>
    <SettingsRow v-if="showCanvasHint" label="提示" desc="在预览区可直接拖拽、缩放裁剪框" />
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  CROP_POSITIONS,
  applyRatioPreset,
  clampRegion,
  hAlignOf,
  pctOf,
  vAlignOf,
  type CropMeta,
  type CropRegion,
  type HAlign,
  type VAlign
} from '@renderer/composables/useCropGeometry';
import { evNum, evVal } from '@renderer/composables/useSingleTool';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';

type RegionKey = 'left' | 'top' | 'width' | 'height';

const props = defineProps<{
  /** 裁剪区域（父级 reactive 对象，直接读写） */
  region: CropRegion;
  /** 当前参考图的尺寸（用于百分比换算与范围约束） */
  meta: CropMeta | null;
  /** 单图有 cropper 画布：比例预设交给画布处理，并显示拖拽提示 */
  useCanvas?: boolean;
}>();

const unit = defineModel<'px' | 'ratio'>('unit', { default: 'px' });
const ratio = defineModel<string>('ratio', { default: 'free' });
const position = defineModel<string>('position', { default: 'nw' });

/** 区域变化通知父级（同步画布 / 刷新预览） */
const emit = defineEmits<{ change: [] }>();

const showCanvasHint = computed(() => !!props.useCanvas);
const hAlign = computed<HAlign>(() => hAlignOf(position.value));
const vAlign = computed<VAlign>(() => vAlignOf(position.value));
const showHMargin = computed(() => hAlign.value !== 'center');
const showVMargin = computed(() => vAlign.value !== 'middle');

const widthPct = computed(() => (props.meta ? pctOf(props.region.width, props.meta.width) : 0));
const heightPct = computed(() => (props.meta ? pctOf(props.region.height, props.meta.height) : 0));
const offsetXMaxPct = computed(() => Math.max(0, 100 - widthPct.value));
const offsetYMaxPct = computed(() => Math.max(0, 100 - heightPct.value));
const offsetXPct = computed(() => {
  if (!props.meta || !props.meta.width) return 0;
  const m = props.meta.width;
  const raw =
    hAlign.value === 'right' ? m - props.region.left - props.region.width : props.region.left;
  return pctOf(raw, m);
});
const offsetYPct = computed(() => {
  if (!props.meta || !props.meta.height) return 0;
  const m = props.meta.height;
  const raw =
    vAlign.value === 'bottom' ? m - props.region.top - props.region.height : props.region.top;
  return pctOf(raw, m);
});

/** 给定字段对应的原图基准尺寸 */
function dimOf(key: RegionKey): number {
  if (!props.meta) return 1;
  return key === 'left' || key === 'width' ? props.meta.width : props.meta.height;
}
function maxOf(key: RegionKey): number {
  return dimOf(key);
}
function fieldValue(key: RegionKey): number {
  const v = props.region[key];
  if (unit.value === 'px') return Math.round(v);
  return Math.round((v / dimOf(key)) * 1000) / 1000;
}

function changed() {
  clampRegion(props.region, props.meta);
  emit('change');
}

function onField(key: RegionKey, e: Event) {
  const raw = evNum(e);
  props.region[key] = unit.value === 'px' ? raw : raw * dimOf(key);
  changed();
}

function onUnit(e: Event) {
  unit.value = evVal(e) === 'ratio' ? 'ratio' : 'px';
}

function onRatio(e: Event) {
  ratio.value = evVal(e);
  // 无画布（批量）时按预设直接算出区域；有画布时交给 cropper 锁定宽高比
  if (!props.useCanvas) applyRatioPreset(props.region, props.meta, ratio.value, position.value);
  changed();
}

/** 切换定位基准：居中方向的轴自动居中 */
function onGravity(g: string) {
  position.value = g;
  if (props.meta) {
    if (hAlign.value === 'center') {
      props.region.left = Math.round((props.meta.width - props.region.width) / 2);
    }
    if (vAlign.value === 'middle') {
      props.region.top = Math.round((props.meta.height - props.region.height) / 2);
    }
  }
  changed();
}

/** 横向边距（百分比，相对定位基准所在边） */
function onOffsetX(e: Event) {
  if (!props.meta) return;
  const m = props.meta.width;
  const off = Math.round((m * evNum(e)) / 100);
  props.region.left = hAlign.value === 'right' ? m - props.region.width - off : off;
  changed();
}

/** 纵向边距（百分比，相对定位基准所在边） */
function onOffsetY(e: Event) {
  if (!props.meta) return;
  const m = props.meta.height;
  const off = Math.round((m * evNum(e)) / 100);
  props.region.top = vAlign.value === 'bottom' ? m - props.region.height - off : off;
  changed();
}

/** 宽/高百分比：按定位基准保持对应边不动 */
function onSizePct(key: 'width' | 'height', e: Event) {
  if (!props.meta) return;
  const pct = evNum(e);
  if (key === 'width') {
    const m = props.meta.width;
    const newW = Math.max(1, Math.round((m * pct) / 100));
    const right = props.region.left + props.region.width;
    if (hAlign.value === 'right') props.region.left = right - newW;
    else if (hAlign.value === 'center') {
      props.region.left = Math.round(props.region.left + (props.region.width - newW) / 2);
    }
    props.region.width = newW;
  } else {
    const m = props.meta.height;
    const newH = Math.max(1, Math.round((m * pct) / 100));
    const bottom = props.region.top + props.region.height;
    if (vAlign.value === 'bottom') props.region.top = bottom - newH;
    else if (vAlign.value === 'middle') {
      props.region.top = Math.round(props.region.top + (props.region.height - newH) / 2);
    }
    props.region.height = newH;
  }
  changed();
}

function useFull() {
  if (!props.meta) return;
  ratio.value = 'free';
  props.region.left = 0;
  props.region.top = 0;
  props.region.width = props.meta.width;
  props.region.height = props.meta.height;
  changed();
}
</script>

<style scoped>
/* 定位基准九宫格（与水印工具同尺寸） */
.pos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: calc(var(--design-unit) * 1px * 1.5);
  width: calc(var(--design-unit) * 1px * 30); /* 120px */
  flex-shrink: 0;
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
</style>

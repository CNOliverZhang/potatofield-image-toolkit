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
    <SettingsGroup v-if="params.type === 'text'" title="基础设置">
      <SettingsRow label="文本内容">
        <fluent-text-field class="ctl-lg" :value="params.text" @input="params.text = evVal($event)"></fluent-text-field>
      </SettingsRow>
      <SettingsRow label="颜色">
        <input class="color" type="color" :value="params.color" @input="params.color = evVal($event)" />
      </SettingsRow>
      <SettingsRow label="不透明度">
        <fluent-slider class="ctl-slider" :value="params.opacity * 100" :min="0" :max="100" :step="1" @change="params.opacity = evNum($event) / 100"></fluent-slider>
        <span class="row-val">{{ Math.round(params.opacity * 100) }}%</span>
      </SettingsRow>
      <SettingsRow label="字体">
        <FontSelect class="ctl-lg" v-model="params.fontFamily" :options="fontOptions" placeholder="选择字体" />
      </SettingsRow>
      <SettingsRow label="字重">
        <fluent-select class="ctl-md" :value="weightValue" @change="onWeight">
          <fluent-option v-for="w in weightOptions" :key="w.value" :value="w.value">{{ w.label }}</fluent-option>
        </fluent-select>
      </SettingsRow>
    </SettingsGroup>

    <!-- 图片水印 -->
    <SettingsGroup v-else title="基础设置">
      <SettingsRow label="水印图片">
        <div class="wm-pick">
          <button class="link-btn" @click="pickWatermarkImage">选择图片</button>
          <span v-if="params.watermarkPath" class="wm-name">{{ params.watermarkPath.split(/[\\/]/).pop() }}</span>
          <span v-else class="muted">未选择</span>
        </div>
      </SettingsRow>
      <SettingsRow label="不透明度">
        <fluent-slider class="ctl-slider" :value="params.opacity * 100" :min="0" :max="100" :step="1" @change="params.opacity = evNum($event) / 100"></fluent-slider>
        <span class="row-val">{{ Math.round(params.opacity * 100) }}%</span>
      </SettingsRow>
    </SettingsGroup>

    <!-- 样式和位置 -->
    <SettingsGroup title="样式和位置">
      <SettingsRow v-if="!lockTile" label="水印模式">
        <fluent-select class="ctl-md" :value="params.tile ? 'tile' : 'single'" @change="params.tile = evVal($event) === 'tile'">
          <fluent-option value="single">单个模式</fluent-option>
          <fluent-option value="tile">平铺模式</fluent-option>
        </fluent-select>
      </SettingsRow>

      <!-- 位置基准：位置单位 + 定位基准（相关设置折叠为一组） -->
      <SettingsCollapse v-if="!params.tile" label="位置基准" desc="位置单位与定位方向">
        <SettingsRow label="位置">
          <fluent-select class="ctl-md" :value="positionUnit" @change="onUnit">
            <fluent-option value="percent">百分比相对位置</fluent-option>
            <fluent-option value="pixel">绝对像素位置</fluent-option>
          </fluent-select>
        </SettingsRow>
        <SettingsRow label="定位基准">
          <div class="pos-grid">
            <button
              v-for="p in POSITIONS"
              :key="p.g"
              :class="['pos-cell', { active: params.gravity === p.g }]"
              :title="p.label"
              @click="params.gravity = p.g"
            ></button>
          </div>
        </SettingsRow>
      </SettingsCollapse>

      <!-- 大小 -->
      <SettingsRow :label="sizeLabel">
        <fluent-slider v-if="!sizeAsInput" class="ctl-slider" :value="sizeValue" :min="sizeMin" :max="sizeMax" :step="1" @change="onSize"></fluent-slider>
        <fluent-number-field v-else class="ctl-num" :value="params.fontSize" :min="8" :max="400" :step="1" @input="params.fontSize = evNum($event)"><span slot="end">px</span></fluent-number-field>
        <span v-if="!sizeAsInput" class="row-val">{{ sizeText }}</span>
      </SettingsRow>

      <!-- 边距设置 -->
      <SettingsCollapse v-if="!params.tile" label="边距设置" desc="水印到定位边的距离">
        <SettingsRow v-if="showHMargin" label="横向边距">
          <fluent-slider v-if="isPercent" class="ctl-slider" :value="params.offsetX" :min="0" :max="100" :step="1" @change="params.offsetX = evNum($event)"></fluent-slider>
          <fluent-number-field v-else class="ctl-num" :value="params.offsetXPx ?? 0" :step="1" @input="params.offsetXPx = evNum($event)"><span slot="end">px</span></fluent-number-field>
          <span class="row-val">{{ isPercent ? params.offsetX + '%' : (params.offsetXPx ?? 0) + 'px' }}</span>
        </SettingsRow>
        <SettingsRow v-if="showVMargin" label="纵向边距">
          <fluent-slider v-if="isPercent" class="ctl-slider" :value="params.offsetY" :min="0" :max="100" :step="1" @change="params.offsetY = evNum($event)"></fluent-slider>
          <fluent-number-field v-else class="ctl-num" :value="params.offsetYPx ?? 0" :step="1" @input="params.offsetYPx = evNum($event)"><span slot="end">px</span></fluent-number-field>
          <span class="row-val">{{ isPercent ? params.offsetY + '%' : (params.offsetYPx ?? 0) + 'px' }}</span>
        </SettingsRow>
        <SettingsRow v-if="!isPercent" label="提示" desc="边距可为负值，让水印溢出到图片外；但不会整个都在图外" />
      </SettingsCollapse>

      <SettingsRow label="旋转">
        <fluent-slider class="ctl-slider" :value="params.rotation" :min="-180" :max="180" :step="1" @change="params.rotation = evNum($event)"></fluent-slider>
        <span class="row-val">{{ params.rotation }}°</span>
      </SettingsRow>
    </SettingsGroup>

    <!-- 输出设置 -->
    <SettingsGroup title="输出设置">
      <SettingsRow label="格式">
        <fluent-select class="ctl-md" :value="params.format" @change="params.format = evVal($event) as 'original' | 'png' | 'jpeg' | 'webp'">
          <fluent-option value="original">保持原格式</fluent-option>
          <fluent-option value="png">PNG（无损）</fluent-option>
          <fluent-option value="jpeg">JPG（有损）</fluent-option>
          <fluent-option value="webp">WebP（有损）</fluent-option>
        </fluent-select>
      </SettingsRow>
      <SettingsRow v-if="params.format === 'jpeg' || params.format === 'webp'" label="质量">
        <fluent-slider class="ctl-slider" :value="params.quality" :min="10" :max="100" :step="1" @change="params.quality = evNum($event)"></fluent-slider>
        <span class="row-val">{{ params.quality }}%</span>
      </SettingsRow>
    </SettingsGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { WatermarkParams, WatermarkGravity } from '@shared/types';
import { selectImageFiles } from '@renderer/utils/filePicker';
import { queryLocalFonts, groupLocalFonts, supportsLocalFonts } from '@renderer/composables/useLocalFonts';
import { familyCandidates, canonicalStyle, styleWeight, styleLabel } from '@shared/fontStyle';
import FontSelect from '@renderer/components/FontSelect.vue';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';
import SettingsCollapse from '@renderer/components/settings/SettingsCollapse.vue';

const params = defineModel<WatermarkParams>({ required: true });
defineProps<{ lockTile?: boolean }>();

const BASE_FONTS = [
  { label: '无衬线', value: 'sans-serif' },
  { label: '衬线', value: 'serif' },
  { label: '等宽', value: 'monospace' }
];

/** 系统已安装字体（按族名），异步加载，不阻塞面板渲染 */
const systemFonts = ref<string[]>([]);
/** 族名候选（归一化）→ 该族在系统里的样式列表，供字重选择器使用 */
const localStyles = ref<Record<string, string[]>>({});

onMounted(async () => {
  if (!supportsLocalFonts()) return;
  try {
    const fonts = await queryLocalFonts();
    systemFonts.value = groupLocalFonts(fonts).map((f) => f.name);
    const map: Record<string, string[]> = {};
    for (const fam of groupLocalFonts(fonts)) {
      const styles = fam.fonts.map((f) => f.style).filter(Boolean);
      for (const key of familyCandidates(fam.name)) {
        map[key] = [...(map[key] ?? []), ...styles];
      }
    }
    localStyles.value = map;
  } catch {
    systemFonts.value = [];
  }
});

/** 字重选项：优先取所选字体在系统里的真实样式；查不到（如通用族）时给一组固定字重 */
const weightOptions = computed<{ value: string; label: string }[]>(() => {
  const cands = familyCandidates(params.value.fontFamily);
  const seen = new Set<string>();
  const opts: { value: string; label: string }[] = [];
  for (const key of cands) {
    for (const s of localStyles.value[key] ?? []) {
      const value = String(styleWeight(s));
      if (seen.has(value)) continue;
      seen.add(value);
      opts.push({ value, label: styleLabel(s) });
    }
  }
  if (opts.length) return opts;
  return [300, 400, 500, 600, 700, 900].map((v) => ({ value: String(v), label: styleLabel(String(v)) }));
});

/** 当前选中值；字体切换后原字重不在选项里时回落到常规 */
const weightValue = computed(() => {
  const cur = params.value.fontWeight ?? (params.value.bold ? '700' : '400');
  return weightOptions.value.some((o) => o.value === cur) ? cur : '400';
});

function onWeight(e: Event) {
  const v = evVal(e);
  params.value.fontWeight = v;
  params.value.bold = Number(v) >= 600; // 同步旧的加粗标记，兼容历史逻辑
}

/** 下拉选项：通用族 + 系统已安装字体 */
const fontOptions = computed(() => [
  ...BASE_FONTS,
  ...systemFonts.value.map((name) => ({ label: name, value: name }))
]);

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

/** 位置单位：percent=相对百分比，pixel=绝对像素 */
const positionUnit = computed<'percent' | 'pixel'>(() =>
  params.value.positionUnit === 'pixel' ? 'pixel' : 'percent'
);
const isPercent = computed(() => positionUnit.value === 'percent');

function onUnit(e: Event) {
  params.value.positionUnit = evVal(e) === 'pixel' ? 'pixel' : 'percent';
}

/**
 * 大小控件：
 * - 百分比模式：文字/图片统一为「水印宽度占图片宽度的百分比」
 * - 像素模式：文字为字号 px 输入框，图片为相对原图短边的比例滑块
 */
const sizeLabel = computed(() => {
  if (isPercent.value) return '水印宽度';
  return params.value.type === 'text' ? '字号' : '大小';
});
/** 像素模式的文字水印：字号用 px 输入框（图片水印仍用比例滑块） */
const sizeAsInput = computed(() => !isPercent.value && params.value.type === 'text');
const sizeValue = computed(() =>
  isPercent.value
    ? Math.round(params.value.sizePct ?? 20)
    : params.value.type === 'text'
      ? params.value.fontSize
      : Math.round(params.value.scale * 100)
);
const sizeMin = computed(() => (isPercent.value ? 1 : params.value.type === 'text' ? 8 : 5));
const sizeMax = computed(() => (isPercent.value ? 200 : params.value.type === 'text' ? 200 : 100));
const sizeText = computed(() =>
  isPercent.value
    ? `${sizeValue.value}% 图宽`
    : params.value.type === 'text'
      ? `${params.value.fontSize}px`
      : `${Math.round(params.value.scale * 100)}%`
);

function onSize(e: Event) {
  const v = evNum(e);
  if (isPercent.value) params.value.sizePct = v;
  else params.value.scale = v / 100;
}

function evVal(e: Event): string {
  return (e.target as HTMLInputElement).value;
}
function evNum(e: Event): number {
  return Number((e.target as HTMLInputElement).value);
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
.color {
  width: calc(var(--design-unit) * 1px * 11);
  height: calc(var(--design-unit) * 1px * 7.5);
  padding: 0;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px);
  background: none;
  cursor: pointer;
}
.pos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: calc(var(--design-unit) * 1px * 1.5);
  width: 120px;
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
  max-width: 100%;
}
.link-btn {
  border: 1px solid var(--neutral-stroke-rest);
  background: transparent;
  color: var(--accent-base-color);
  padding: calc(var(--design-unit) * 1px * 1.5) calc(var(--design-unit) * 1px * 3);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  cursor: pointer;
  font-size: var(--type-ramp-minus-1-font-size);
  flex-shrink: 0;
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
  max-width: 110px;
}
.muted {
  color: var(--neutral-foreground-secondary-rest);
  font-size: var(--type-ramp-minus-1-font-size);
}
</style>

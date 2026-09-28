<template>
  <div class="tool">
    <section class="preview-pane">
      <div v-if="!inputPath" class="dropzone">
        <font-awesome-icon icon="crop" class="dz-icon" />
        <p>选择一张图片开始裁剪</p>
        <fluent-button appearance="accent" @click="onPick">选择图片</fluent-button>
      </div>
      <template v-else>
        <div class="preview-stage">
          <div ref="cropperBoxEl" class="cropper-box">
            <img
              ref="imgEl"
              :key="inputPath"
              :src="originalUrl"
              class="src-img"
              alt="预览"
              @load="onImgLoad"
            />
          </div>
        </div>
        <div class="preview-bar">
          <span class="fname">{{ inputName }}</span>
          <fluent-button appearance="neutral" @click="onPick">重新选择</fluent-button>
        </div>
      </template>
    </section>
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="batch-entry">
          <fluent-button appearance="neutral" @click="goBatch">
            <font-awesome-icon icon="layer-group" /> 批量裁剪
          </fluent-button>
        </div>
        <div class="group">
          <span class="group-title">裁剪区域</span>
          <div class="field row">
            <span class="field-label">单位</span>
            <fluent-select :value="unit" @change="onUnit">
              <fluent-option value="px">像素</fluent-option>
              <fluent-option value="ratio">比例</fluent-option>
            </fluent-select>
          </div>
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
          <!-- 定位基准：像素/比例两种模式下都可用，决定裁剪框可移动的方向 -->
          <div class="field">
            <span class="field-label">定位基准</span>
            <div class="pos-grid">
              <button
                v-for="p in POSITIONS"
                :key="p.g"
                :class="['pos-cell', { active: position === p.g }]"
                :title="p.label"
                @click="onGravity(p.g)"
              ></button>
            </div>
          </div>
          <!-- 像素模式：直接输入像素值 -->
          <template v-if="unit === 'px'">
            <div class="field row">
              <span class="field-label">X（左）</span>
              <fluent-number-field
                :value="fieldValue('left')"
                min="0"
                :max="maxOf('left')"
                :step="1"
                @input="onField('left', $event)"
              >px</fluent-number-field>
            </div>
            <div class="field row">
              <span class="field-label">Y（上）</span>
              <fluent-number-field
                :value="fieldValue('top')"
                min="0"
                :max="maxOf('top')"
                :step="1"
                @input="onField('top', $event)"
              >px</fluent-number-field>
            </div>
            <div class="field row">
              <span class="field-label">宽度</span>
              <fluent-number-field
                :value="fieldValue('width')"
                min="1"
                :max="maxOf('width')"
                :step="1"
                @input="onField('width', $event)"
              >px</fluent-number-field>
            </div>
            <div class="field row">
              <span class="field-label">高度</span>
              <fluent-number-field
                :value="fieldValue('height')"
                min="1"
                :max="maxOf('height')"
                :step="1"
                @input="onField('height', $event)"
              >px</fluent-number-field>
            </div>
          </template>

          <!-- 比例模式：定位基准 + 边距/尺寸百分比进度条（与水印工具一致） -->
          <template v-else>
            <div v-if="showHMargin" class="field">
              <span class="field-label">横向边距 <em>{{ offsetXPct }}%</em></span>
              <fluent-slider
                :value="offsetXPct"
                :min="0"
                :max="offsetXMaxPct"
                :step="1"
                @change="onOffsetX"
              ></fluent-slider>
            </div>
            <div v-if="showVMargin" class="field">
              <span class="field-label">纵向边距 <em>{{ offsetYPct }}%</em></span>
              <fluent-slider
                :value="offsetYPct"
                :min="0"
                :max="offsetYMaxPct"
                :step="1"
                @change="onOffsetY"
              ></fluent-slider>
            </div>
            <div class="field">
              <span class="field-label">宽度 <em>{{ widthPct }}%</em></span>
              <fluent-slider
                :value="widthPct"
                :min="1"
                :max="100"
                :step="1"
                @change="onSizePct('width', $event)"
              ></fluent-slider>
            </div>
            <div class="field">
              <span class="field-label">高度 <em>{{ heightPct }}%</em></span>
              <fluent-slider
                :value="heightPct"
                :min="1"
                :max="100"
                :step="1"
                @change="onSizePct('height', $event)"
              ></fluent-slider>
            </div>
          </template>
          <fluent-button appearance="neutral" @click="useFull">使用整图</fluent-button>
          <p class="hint">提示：在预览区可直接拖拽、缩放裁剪框。</p>
        </div>
      </div>
      <div class="controls-footer">
        <fluent-button appearance="accent" class="save-btn" :disabled="processing" @click="onSave">
          {{ processing ? '处理中…' : '保存图片' }}
        </fluent-button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useSingleTool, evNum, evVal, extOf } from '@renderer/composables/useSingleTool';

const { inputPath, inputName, processing, pickImage, runSave } = useSingleTool();

interface Meta {
  width: number;
  height: number;
}
type RegionKey = 'left' | 'top' | 'width' | 'height';

const meta = ref<Meta | null>(null);
const ratio = ref('free');
const position = ref('nw'); // 默认左上角基准：两轴都可自由拖动（避免初始即锁死）
const unit = ref<'px' | 'ratio'>('px');
const region = reactive({ left: 0, top: 0, width: 0, height: 0 });

/** 定位基准（九宫格），与水印工具保持一致 */
const POSITIONS: { g: string; label: string }[] = [
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

const hAlign = computed(() => {
  const g = position.value;
  if (g === 'nw' || g === 'w' || g === 'sw') return 'left';
  if (g === 'ne' || g === 'e' || g === 'se') return 'right';
  return 'center';
});
const vAlign = computed(() => {
  const g = position.value;
  if (g === 'nw' || g === 'n' || g === 'ne') return 'top';
  if (g === 'sw' || g === 's' || g === 'se') return 'bottom';
  return 'middle';
});
const showHMargin = computed(() => hAlign.value !== 'center');
const showVMargin = computed(() => vAlign.value !== 'middle');

/** 比例模式的百分比显示值 */
const widthPct = computed(() =>
  meta.value && meta.value.width ? Math.round((region.width / meta.value.width) * 100) : 0
);
const heightPct = computed(() =>
  meta.value && meta.value.height ? Math.round((region.height / meta.value.height) * 100) : 0
);
const offsetXPct = computed(() => {
  if (!meta.value || !meta.value.width) return 0;
  const m = meta.value.width;
  const raw = hAlign.value === 'right' ? m - region.left - region.width : region.left;
  return Math.max(0, Math.round((raw / m) * 100));
});
const offsetYPct = computed(() => {
  if (!meta.value || !meta.value.height) return 0;
  const m = meta.value.height;
  const raw = vAlign.value === 'bottom' ? m - region.top - region.height : region.top;
  return Math.max(0, Math.round((raw / m) * 100));
});
const offsetXMaxPct = computed(() => Math.max(0, 100 - widthPct.value));
const offsetYMaxPct = computed(() => Math.max(0, 100 - heightPct.value));

const imgEl = ref<HTMLImageElement | null>(null);
const cropperBoxEl = ref<HTMLElement | null>(null);
const originalUrl = ref('');

let cropper: Cropper | null = null;
let cropperReady = false;
let syncing = false;
let boxResizeObserver: ResizeObserver | null = null;
let initTimer: number | null = null;
let lastInitSize = { w: 0, h: 0 };
let refitAttempts = 0;

/** 等容器尺寸稳定后再（重新）初始化 cropper。
 *  图片加载完成时容器（右侧面板/弹性布局）往往还没稳定，此时初始化会让 cropper
 *  按错误的中间尺寸缩放画布；画布溢出容器后裁剪框会被钳死、无法拖动/缩放。
 *  注意：不能靠派发 resize 事件修正——restore:true 时 cropper 的 resize() 会还原画布尺寸。 */
function scheduleCropperInit(delay = 120) {
  if (initTimer) window.clearTimeout(initTimer);
  initTimer = window.setTimeout(() => {
    initTimer = null;
    if (!imgEl.value) return;
    if (cropper) {
      syncRegionFromCropper(); // 重建前保留当前裁剪区域
      cropper.destroy();
      cropper = null;
    }
    cropperReady = false;
    initCropper();
  }, delay);
}

/** 监听裁剪容器尺寸变化：变化后重建 cropper，按新尺寸重新适配画布 */
function setupBoxObserver() {
  const el = cropperBoxEl.value;
  if (!el || typeof ResizeObserver === 'undefined') return;
  let lastW = 0;
  let lastH = 0;
  let first = true; // 首次回调仅记录尺寸
  boxResizeObserver?.disconnect();
  boxResizeObserver = new ResizeObserver((entries) => {
    const r = entries[0]?.contentRect;
    if (!r) return;
    const changed = Math.abs(r.width - lastW) > 1 || Math.abs(r.height - lastH) > 1;
    lastW = r.width;
    lastH = r.height;
    if (first) {
      first = false;
      return;
    }
    if (changed) scheduleCropperInit();
  });
  boxResizeObserver.observe(el);
}

/** 校验画布是否适配容器；若仍溢出且容器尺寸已变化，按新尺寸重建（限次防死循环） */
function ensureCanvasFitted() {
  if (!cropper) return;
  const c = cropper.getCanvasData();
  const cont = cropper.getContainerData();
  const overflow = c.width > cont.width * 1.02 || c.height > cont.height * 1.02;
  if (!overflow) {
    refitAttempts = 0;
    return;
  }
  const el = cropperBoxEl.value;
  const cur = el
    ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }
    : lastInitSize;
  const containerChanged = Math.abs(cur.w - lastInitSize.w) > 1 || Math.abs(cur.h - lastInitSize.h) > 1;
  if (containerChanged && refitAttempts < 3) {
    refitAttempts++;
    scheduleCropperInit(60);
  }
}

const RATIOS: Record<string, [number, number]> = {
  '1:1': [1, 1],
  '4:3': [4, 3],
  '16:9': [16, 9],
  '3:2': [3, 2],
  '2:3': [2, 3]
};

function mimeOf(path: string): string {
  const ext = extOf(path).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'image/png';
}

async function fetchMeta(): Promise<void> {
  if (!inputPath.value) return;
  const res = await window.api.image.process({ op: 'metadata', inputPath: inputPath.value });
  const m = res.info as unknown as Meta;
  meta.value = { width: m.width || 0, height: m.height || 0 };
}

/** 钳制裁剪区域，确保不越界、不溢出（像素模式的核心边界保护，比例模式同样适用） */
function clampRegion() {
  if (!meta.value) return;
  const iw = meta.value.width;
  const ih = meta.value.height;
  region.width = Math.min(Math.max(1, Math.round(region.width)), Math.max(1, iw));
  region.height = Math.min(Math.max(1, Math.round(region.height)), Math.max(1, ih));
  region.left = Math.min(Math.max(0, Math.round(region.left)), Math.max(0, iw - region.width));
  region.top = Math.min(Math.max(0, Math.round(region.top)), Math.max(0, ih - region.height));
}

/** 给定字段对应的原图基准尺寸（left/width 用宽，top/height 用高） */
function dimOf(key: RegionKey): number {
  if (!meta.value) return 1;
  return key === 'left' || key === 'width' ? meta.value.width : meta.value.height;
}
function maxOf(key: RegionKey): number {
  return dimOf(key);
}

/** 控件显示值：像素模式显示整数像素，比例模式显示 0~1 的小数 */
function fieldValue(key: RegionKey): number {
  const v = region[key];
  if (unit.value === 'px') return Math.round(v);
  return Math.round((v / dimOf(key)) * 1000) / 1000;
}

/** 控件输入：像素模式直接存像素；比例模式按基准尺寸换算成像素 */
function onField(key: RegionKey, e: Event) {
  const raw = evNum(e);
  region[key] = unit.value === 'px' ? raw : raw * dimOf(key);
  clampRegion();
  applyRegionToCropper();
}

function onUnit(e: Event) {
  unit.value = evVal(e) === 'ratio' ? 'ratio' : 'px';
}

/** 按定位基准锁定被约束的轴：居中方向的轴不允许移动（只能缩放）。
 *  返回是否发生了修正。 */
function enforceAnchors(): boolean {
  if (!meta.value) return false;
  const m = meta.value;
  let changed = false;
  if (hAlign.value === 'center') {
    const wantLeft = Math.round((m.width - region.width) / 2);
    if (region.left !== wantLeft) {
      region.left = wantLeft;
      changed = true;
    }
  }
  if (vAlign.value === 'middle') {
    const wantTop = Math.round((m.height - region.height) / 2);
    if (region.top !== wantTop) {
      region.top = wantTop;
      changed = true;
    }
  }
  return changed;
}

/** 两个方向都居中时直接禁止移动裁剪框（避免拖拽后被拉回的抖动） */
function updateMovable() {
  if (!cropper) return;
  const fixed = hAlign.value === 'center' && vAlign.value === 'middle';
  cropper.options.cropBoxMovable = !fixed;
}

/** 按定位基准重新计算裁剪框位置（保持当前尺寸；居中基准时移到中心） */
function applyGravity() {
  if (!meta.value) return;
  const m = meta.value;
  if (hAlign.value === 'center') region.left = Math.round((m.width - region.width) / 2);
  if (vAlign.value === 'middle') region.top = Math.round((m.height - region.height) / 2);
  clampRegion();
  applyRegionToCropper();
}

/** 切换定位基准 */
function onGravity(g: string) {
  position.value = g;
  updateMovable();
  applyGravity();
}

/** 横向边距（百分比，相对定位基准所在边） */
function onOffsetX(e: Event) {
  if (!meta.value) return;
  const m = meta.value.width;
  const off = Math.round((m * evNum(e)) / 100);
  region.left = hAlign.value === 'right' ? m - region.width - off : off;
  clampRegion();
  applyRegionToCropper();
}

/** 纵向边距（百分比，相对定位基准所在边） */
function onOffsetY(e: Event) {
  if (!meta.value) return;
  const m = meta.value.height;
  const off = Math.round((m * evNum(e)) / 100);
  region.top = vAlign.value === 'bottom' ? m - region.height - off : off;
  clampRegion();
  applyRegionToCropper();
}

/** 宽/高百分比：按定位基准保持对应边不动 */
function onSizePct(key: 'width' | 'height', e: Event) {
  if (!meta.value) return;
  const pct = evNum(e);
  if (key === 'width') {
    const m = meta.value.width;
    const newW = Math.max(1, Math.round((m * pct) / 100));
    const right = region.left + region.width; // 原右边界
    if (hAlign.value === 'right') region.left = right - newW; // 保持右边界
    else if (hAlign.value === 'center') region.left = Math.round(region.left + (region.width - newW) / 2);
    region.width = newW;
  } else {
    const m = meta.value.height;
    const newH = Math.max(1, Math.round((m * pct) / 100));
    const bottom = region.top + region.height; // 原下边界
    if (vAlign.value === 'bottom') region.top = bottom - newH; // 保持下边界
    else if (vAlign.value === 'middle') region.top = Math.round(region.top + (region.height - newH) / 2);
    region.height = newH;
  }
  clampRegion();
  applyRegionToCropper();
}

function onRatio(e: Event) {
  ratio.value = evVal(e);
  // 仅锁定宽高比，由 cropper 自行按当前裁剪框调整为该比例，保持可拖动
  applyAspect();
}
/** 初始裁剪区域：居中、约为原图的 60%，避免锚点贴边难以拖动 */
function initRegion() {
  if (!meta.value) return;
  const iw = meta.value.width;
  const ih = meta.value.height;
  const w = Math.max(1, Math.round(iw * 0.6));
  const h = Math.max(1, Math.round(ih * 0.6));
  region.left = Math.round((iw - w) / 2);
  region.top = Math.round((ih - h) / 2);
  region.width = w;
  region.height = h;
  applyRegionToCropper();
}

function useFull() {
  if (!meta.value) return;
  ratio.value = 'free';
  applyAspect(); // 先取消宽高比锁定，否则整图会被旧比例约束掉
  region.left = 0;
  region.top = 0;
  region.width = meta.value.width;
  region.height = meta.value.height;
  applyRegionToCropper();
}

function buildOptions() {
  return { left: region.left, top: region.top, width: region.width, height: region.height };
}

async function onPick() {
  if (await pickImage()) {
    refitAttempts = 0;
    await fetchMeta();
    initRegion();
    const b64 = await window.api.fs.readFileBase64(inputPath.value);
    originalUrl.value = `data:${mimeOf(inputPath.value)};base64,${b64}`;
  }
}

async function onSave() {
  clampRegion();
  await runSave(
    (stem) => `${stem}_cropped${extOf(inputPath.value)}`,
    async (outputPath) => {
      await window.api.image.process({
        op: 'extract',
        inputPath: inputPath.value,
        outputPath,
        options: buildOptions()
      });
    }
  );
}

const goBatch = () => window.api.window.open({
  route: '/cropper/batch',
  key: 'batch-cropper',
  width: 1280,
  height: 820,
  minWidth: 1024,
  minHeight: 680
});

/* ===================== cropper.js 交互预览 ===================== */
function onImgLoad() {
  if (!imgEl.value) return;
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  cropperReady = false;
  // 等容器尺寸稳定后再初始化（容器此刻通常还在重排），避免画布按中间尺寸缩放而溢出
  scheduleCropperInit();
}

function initCropper() {
  if (!imgEl.value || cropper) return;
  setupBoxObserver();
  const boxEl = cropperBoxEl.value;
  lastInitSize = boxEl
    ? { w: Math.round(boxEl.getBoundingClientRect().width), h: Math.round(boxEl.getBoundingClientRect().height) }
    : { w: 0, h: 0 };
  cropper = new Cropper(imgEl.value, {
    viewMode: 1, // 裁剪框不允许超出画布
    dragMode: 'none', // 禁止在画布上拖拽（不平移图片、不新建框），只允许调整裁剪框
    autoCrop: true,
    autoCropArea: 0.6, // 仅决定初始视觉占比，最终由 ready 里的 initRegion 覆盖
    background: true,
    guides: true,
    center: true,
    highlight: false,
    movable: false, // 禁止平移图片（避免影响定位）
    zoomable: false, // 禁止缩放图片
    zoomOnWheel: false, // 禁止滚轮缩放
    zoomOnTouch: false, // 禁止触摸缩放
    scalable: false, // 禁止翻转缩放
    cropBoxMovable: true, // 裁剪框可移动
    cropBoxResizable: true, // 裁剪框可缩放
    toggleDragModeOnDblclick: false,
    responsive: true,
    restore: true,
    ready() {
      cropperReady = true;
      updateMovable(); // 按当前定位基准决定是否允许移动裁剪框
      applyAspect();
      // 重建时保留用户已有的裁剪区域；仅首次初始化用 60% 居中区域
      if (region.width > 0 && region.height > 0) applyRegionToCropper();
      else initRegion();
      ensureCanvasFitted();
    },
    crop() {
      syncRegionFromCropper();
    }
  });
}

/** 拖拽/缩放裁剪框后，把 cropper 的自然像素坐标同步回 region */
function syncRegionFromCropper() {
  if (!cropper || syncing) return;
  const d = cropper.getData(true); // 返回原始图像坐标系（与 sharp extract 一致）
  syncing = true;
  region.left = Math.round(d.x);
  region.top = Math.round(d.y);
  region.width = Math.round(d.width);
  region.height = Math.round(d.height);
  // 拖拽后按定位基准把被锁定的轴拉回（居中方向不可移动）
  const corrected = enforceAnchors();
  syncing = false;
  if (corrected) applyRegionToCropper();
}

/** 把 region 同步到 cropper 裁剪框 */
function applyRegionToCropper() {
  if (!cropper || !cropperReady || syncing) return;
  syncing = true;
  cropper.setData({
    x: region.left,
    y: region.top,
    width: region.width,
    height: region.height
  });
  syncing = false;
}

function applyAspect() {
  if (!cropper) return;
  cropper.setAspectRatio(ratio.value === 'free' ? NaN : RATIOS[ratio.value][0] / RATIOS[ratio.value][1]);
}

watch(ratio, () => applyAspect());

onBeforeUnmount(() => {
  if (initTimer) {
    window.clearTimeout(initTimer);
    initTimer = null;
  }
  boxResizeObserver?.disconnect();
  boxResizeObserver = null;
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
});
</script>

<style scoped>
.preview-stage {
  position: relative;
}
.cropper-box {
  position: absolute;
  inset: 0;
}
.src-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
}
.hint {
  margin: calc(var(--design-unit) * 1px * 2) 0 0;
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
}
/* 定位基准九宫格（与水印工具一致） */
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
</style>

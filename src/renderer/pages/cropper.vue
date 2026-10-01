<template>
  <div class="tool">
    <ImagePicker
      :src="originalUrl"
      :name="inputName"
      icon="crop"
      hint="选择一张图片开始裁剪"
      @pick="onPick"
    >
      <!-- cropper.js 需要挂载在真实 img 上，这里自定义预览主体 -->
      <template #stage>
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
      </template>
    </ImagePicker>
    <aside class="controls-pane">
      <div class="batch-entry">
        <fluent-button appearance="neutral" @click="goBatch">
          <font-awesome-icon icon="layer-group" /> 批量裁剪
        </fluent-button>
      </div>
      <div class="controls-body">
        <!-- 裁剪参数：与批量裁剪共用同一组件（单图额外带 cropper.js 画布） -->
        <CropControls
          :region="region"
          :meta="meta"
          use-canvas
          v-model:unit="unit"
          v-model:ratio="ratio"
          v-model:position="position"
          @change="onRegionChange"
        />
        <!-- 输出设置（与水印工具一致） -->
        <SettingsGroup title="输出设置">
          <SettingsRow label="格式">
            <app-select class="ctl-md" :value="format" @change="onFormat">
              <fluent-option value="original">保持原格式</fluent-option>
              <fluent-option value="png">PNG（无损）</fluent-option>
              <fluent-option value="jpeg">JPG（有损）</fluent-option>
              <fluent-option value="webp">WebP（有损）</fluent-option>
            </app-select>
          </SettingsRow>
          <SettingsRow v-if="format === 'jpeg' || format === 'webp'" label="质量">
            <fluent-slider
              class="ctl-slider"
              :value="quality"
              :min="10"
              :max="100"
              :step="1"
              @change="onQuality"
            ></fluent-slider>
            <span class="row-val">{{ quality }}%</span>
          </SettingsRow>
        </SettingsGroup>
      </div>
      <!-- footer 必须位于 controls-body 内部，才能继承其右侧内边距（与水印工具一致） -->
      <div class="controls-footer">
        <fluent-button appearance="primary" class="save-btn" :disabled="processing || !inputPath" @click="onSave">
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
import { clampRegion, hAlignOf, vAlignOf } from '@renderer/composables/useCropGeometry';
import ImagePicker from '@renderer/components/ImagePicker.vue';
import CropControls from '@renderer/components/CropControls.vue';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';
import AppSelect from '@renderer/components/AppSelect.vue';

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
const format = ref<'original' | 'png' | 'jpeg' | 'webp'>('original');
const quality = ref(90);

/** 定位基准对应的对齐方式（与批量裁剪共用换算） */
const hAlign = computed(() => hAlignOf(position.value));
const vAlign = computed(() => vAlignOf(position.value));

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

/** 裁剪参数变化（来自共享控件）：同步到 cropper 画布 */
function onRegionChange() {
  applyRegionToCropper();
}

function onFormat(e: Event) {
  format.value = evVal(e) as 'original' | 'png' | 'jpeg' | 'webp';
}
function onQuality(e: Event) {
  quality.value = evNum(e);
}

/** 输出扩展名：跟随所选格式 */
function outExt(): string {
  if (format.value === 'original') return extOf(inputPath.value);
  return format.value === 'jpeg' ? '.jpg' : format.value === 'webp' ? '.webp' : '.png';
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

function buildOptions() {
  return {
    left: region.left,
    top: region.top,
    width: region.width,
    height: region.height,
    format: format.value === 'original' ? undefined : format.value,
    quality: format.value === 'jpeg' || format.value === 'webp' ? quality.value : undefined
  };
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
  clampRegion(region, meta.value);
  await runSave(
    (stem) => `${stem}_cropped${outExt()}`,
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
  font-size: var(--fontSizeBase200);
  color: var(--app-fg-secondary);
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
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: calc(var(--borderRadiusMedium) + var(--design-unit) * 1px / 2);
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
  background: var(--app-fg-secondary);
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

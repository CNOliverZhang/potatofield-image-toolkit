<template>
  <div class="tool">
    <!-- 左：拼接结果预览（长图可切换「适应 / 1:1」并滚动查看） -->
    <section class="preview-pane">
      <div v-if="!previewUrl" class="dropzone">
        <font-awesome-icon icon="images" class="dz-icon" />
        <p>导入 2 张以上图片后显示拼接预览</p>
      </div>
      <template v-else>
        <!-- 滚轮=移动图片（横向拼接横移、纵向拼接纵移），缩放由下方滑块控制 -->
        <div
          ref="stageEl"
          class="preview-stage"
          :class="{ panning }"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <img
            ref="imgEl"
            :src="previewUrl"
            class="preview-img"
            :style="imgStyle"
            alt="拼接预览"
            draggable="false"
            @load="onImgLoad"
          />
        </div>
        <div class="preview-bar">
          <span class="fname">{{ resultSize }}</span>
          <span class="zoom-val">{{ Math.round(displayScale * 100) }}%</span>
        </div>
        <fluent-slider
          class="zoom-slider"
          :value="scaleT"
          min="0"
          max="100"
          title="缩放（最小完整显示、最大铺满预览区）"
          @change="onScale"
        ></fluent-slider>
      </template>
    </section>

    <!-- 右：图片列表（可调序）+ 拼接设置 -->
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="group">
          <span class="group-title">图片（{{ files.length }}，按列表顺序拼接）</span>
          <div class="import-actions">
            <fluent-button appearance="accent" @click="chooseFiles">选择文件</fluent-button>
            <fluent-button appearance="neutral" @click="scanFolder">扫描文件夹</fluent-button>
          </div>
          <div class="file-list">
            <div v-if="!files.length" class="list-empty">尚未导入图片</div>
            <div
              v-for="(f, i) in files"
              :key="f.path"
              class="file-item"
              :class="{ dragging: dragIndex === i, 'drop-target': dropIndex === i }"
              draggable="true"
              @dragstart="onDragStart(i)"
              @dragover.prevent="onDragOver(i)"
              @dragleave="dropIndex = -1"
              @drop.prevent="onDrop(i)"
              @dragend="onDragEnd"
            >
              <span class="grip" title="拖动调整顺序">⋮⋮</span>
              <span class="idx">{{ i + 1 }}</span>
              <span class="name" :title="f.path">{{ f.path.split(/[\\/]/).pop() }}</span>
              <button class="mini" :disabled="i === 0" title="上移" @click="move(i, -1)">↑</button>
              <button class="mini" :disabled="i === files.length - 1" title="下移" @click="move(i, 1)">
                ↓
              </button>
              <button class="mini danger" title="移除" @click="remove(i)">×</button>
            </div>
          </div>
          <p class="hint">拖动条目可调整拼接顺序</p>
        </div>

        <div class="group">
          <span class="group-title">拼接方式</span>
          <label class="field">
            <span class="field-label">排列方向</span>
            <fluent-select :value="direction" @change="onDirection">
              <fluent-option value="vertical">纵向（上下拼接）</fluent-option>
              <fluent-option value="horizontal">横向（左右拼接）</fluent-option>
            </fluent-select>
          </label>
          <div class="field row">
            <span class="field-label">添加边距</span>
            <fluent-checkbox :checked="useMargin" @change="useMargin = evChk($event)"></fluent-checkbox>
          </div>
          <div v-if="useMargin" class="field row">
            <span class="field-label">边距宽度</span>
            <fluent-number-field
              :value="margin"
              min="0"
              max="500"
              @input="margin = evNum($event)"
            ><span slot="end">px</span></fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">添加底色</span>
            <fluent-checkbox :checked="useBg" @change="useBg = evChk($event)"></fluent-checkbox>
          </div>
          <div v-if="useBg" class="field row">
            <span class="field-label">底色</span>
            <input class="color" type="color" :value="bgColor" @input="onColor" />
            <span class="color-val">{{ bgColor }}</span>
          </div>
        </div>

        <!-- footer 必须位于 controls-body 内部，才能继承其右侧内边距（与水印工具一致） -->
        <div class="controls-footer">
          <fluent-button appearance="accent" class="save-btn" :disabled="files.length < 2 || processing" @click="run">
            {{ processing ? '处理中…' : '开始拼接' }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import { selectImageFiles, selectDirectory } from '@renderer/utils/filePicker';
import { scanImageDirectory, type BatchItem } from '@renderer/utils/directoryScanner';
import { relativePath } from '@renderer/utils/fileIO';
import { useDialog } from '@renderer/composables/useDialog';
import { evChk, evNum, evVal, useSingleTool } from '@renderer/composables/useSingleTool';

const { message } = useDialog();
/** 复用单图工具的保存流程：点击保存时选择目录，输出一张图片 */
const { inputPath, processing, runSave } = useSingleTool();

const files = ref<BatchItem[]>([]);
const direction = ref<'vertical' | 'horizontal'>('vertical');
const useMargin = ref(false);
const margin = ref(20);
const useBg = ref(false);
const bgColor = ref('#ffffff');

/** 拖拽排序状态 */
const dragIndex = ref(-1);
const dropIndex = ref(-1);

const previewUrl = ref('');
const imgEl = ref<HTMLImageElement | null>(null);
const stageEl = ref<HTMLElement | null>(null);
const natural = reactive({ w: 0, h: 0 });
/** 预览区可视尺寸 */
const view = reactive({ w: 0, h: 0 });
/** 缩放：0=完整显示(contain)，100=铺满预览区(cover) */
const scaleT = ref(0);
/** 平移偏移（像素）。横向拼接只用 x、纵向拼接只用 y，另一轴恒为 0 以保持居中 */
const offset = reactive({ x: 0, y: 0 });
const panning = ref(false);
let panStart = { x: 0, y: 0, ox: 0, oy: 0 };
let previewTimer: number | undefined;
let lastUrl = '';
let ro: ResizeObserver | undefined;

const resultSize = computed(() => (natural.w && natural.h ? `拼接结果 ${natural.w} × ${natural.h}` : '拼接预览'));

/** contain 缩放：完整显示 */
const fitScale = computed(() => {
  if (!natural.w || !natural.h || !view.w || !view.h) return 1;
  return Math.min(view.w / natural.w, view.h / natural.h);
});
/** cover 缩放：铺满预览区 */
const fillScale = computed(() => {
  if (!natural.w || !natural.h || !view.w || !view.h) return 1;
  return Math.max(view.w / natural.w, view.h / natural.h);
});
/** 相对 contain 的放大倍数（1 ~ cover/contain） */
const relScale = computed(() => {
  const base = fitScale.value || 1;
  return 1 + (fillScale.value / base - 1) * (scaleT.value / 100);
});
/** 相对原图的实际显示倍率（仅用于显示百分比） */
const displayScale = computed(() => fitScale.value * relScale.value);
/** 基础渲染尺寸 = contain 尺寸，再用 transform 放大，避免大图按原始像素渲染 */
const baseSize = computed(() => ({
  w: Math.round(natural.w * fitScale.value),
  h: Math.round(natural.h * fitScale.value)
}));
/** 各轴可平移的最大距离 */
const maxOffset = computed(() => ({
  x: Math.max(0, (baseSize.value.w * relScale.value - view.w) / 2),
  y: Math.max(0, (baseSize.value.h * relScale.value - view.h) / 2)
}));

const imgStyle = computed(() => ({
  width: `${baseSize.value.w}px`,
  height: `${baseSize.value.h}px`,
  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${relScale.value})`,
  transition: panning.value ? 'none' : 'transform 0.1s ease-out'
}));

/** 横向拼接：始终垂直居中，只允许左右移动；纵向拼接反之 */
function setOffset(nx: number, ny: number) {
  const m = maxOffset.value;
  const clamp = (v: number, lim: number) => Math.min(lim, Math.max(-lim, v));
  if (direction.value === 'horizontal') {
    offset.x = clamp(nx, m.x);
    offset.y = 0;
  } else {
    offset.x = 0;
    offset.y = clamp(ny, m.y);
  }
}

/** 滚轮=移动图片：横向拼接横移，纵向拼接纵移 */
function onWheel(e: WheelEvent) {
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (direction.value === 'horizontal') setOffset(offset.x - d, 0);
  else setOffset(0, offset.y - d);
}

function onPointerDown(e: PointerEvent) {
  panning.value = true;
  panStart = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
}
function onPointerMove(e: PointerEvent) {
  if (!panning.value) return;
  setOffset(panStart.ox + (e.clientX - panStart.x), panStart.oy + (e.clientY - panStart.y));
}
function onPointerUp() {
  panning.value = false;
}

function onScale(e: Event) {
  scaleT.value = Number((e.target as HTMLInputElement).value);
  setOffset(offset.x, offset.y); // 缩放后重新夹紧偏移
}

/** 图片尺寸或预览区尺寸变化后，把偏移夹回合法范围 */
function measureView() {
  if (stageEl.value) {
    view.w = stageEl.value.clientWidth;
    view.h = stageEl.value.clientHeight;
  }
  setOffset(offset.x, offset.y);
}

function revoke(url: string) {
  if (url) URL.revokeObjectURL(url);
}

function dedupe(list: BatchItem[]): BatchItem[] {
  const seen = new Set<string>();
  return list.filter((it) => (seen.has(it.path) ? false : (seen.add(it.path), true)));
}

async function chooseFiles() {
  const res = await selectImageFiles(true);
  if (!res) return;
  files.value = dedupe([...files.value, ...res.map((p) => ({ path: p, rel: p.split(/[\\/]/).pop() ?? p }))]);
}

async function scanFolder() {
  const d = await selectDirectory();
  if (!d) return;
  const r = await scanImageDirectory(d);
  const paths = [...r.fileList, ...r.errorList.map((e) => e.path)];
  if (!paths.length) return;
  files.value = dedupe([...files.value, ...paths.map((p) => ({ path: p, rel: relativePath(d, p) }))]);
}

/** 预览与导出共用的拼接参数 */
function appendExtra() {
  return {
    images: files.value.map((f) => f.path),
    direction: direction.value,
    margin: useMargin.value ? margin.value : 0,
    background: useBg.value ? bgColor.value : ''
  };
}

/** 调整拼接顺序（按钮方式） */
function move(i: number, delta: number) {
  const next = files.value.slice();
  const j = i + delta;
  if (j < 0 || j >= next.length) return;
  [next[i], next[j]] = [next[j], next[i]];
  files.value = next;
}

/** 拖拽排序 */
function onDragStart(i: number) {
  dragIndex.value = i;
}
function onDragOver(i: number) {
  if (dragIndex.value >= 0 && i !== dragIndex.value) dropIndex.value = i;
}
function onDrop(i: number) {
  const from = dragIndex.value;
  if (from < 0 || from === i) return;
  const next = files.value.slice();
  const [item] = next.splice(from, 1);
  next.splice(i, 0, item);
  files.value = next;
  dragIndex.value = -1;
  dropIndex.value = -1;
}
function onDragEnd() {
  dragIndex.value = -1;
  dropIndex.value = -1;
}

function remove(i: number) {
  files.value = files.value.filter((_, idx) => idx !== i);
}

function onColor(e: Event) {
  bgColor.value = (e.target as HTMLInputElement).value;
}

function onDirection(e: Event) {
  direction.value = evVal(e) as 'vertical' | 'horizontal';
}

function onImgLoad() {
  if (imgEl.value) {
    natural.w = imgEl.value.naturalWidth;
    natural.h = imgEl.value.naturalHeight;
  }
  measureView();
}

/** 生成拼接预览（无 outputPath 时主进程返回 buffer） */
async function refresh() {
  if (files.value.length < 2) {
    revoke(previewUrl.value);
    previewUrl.value = '';
    return;
  }
  try {
    const res = await window.api.image.process({
      op: 'append',
      inputPath: files.value[0].path,
      extra: appendExtra()
    });
    if (res.buffer) {
      const url = URL.createObjectURL(new Blob([res.buffer], { type: 'image/png' }));
      revoke(lastUrl);
      lastUrl = url;
      previewUrl.value = url;
    }
  } catch {
    revoke(previewUrl.value);
    previewUrl.value = '';
  }
}

function schedulePreview(delay = 500) {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(refresh, delay);
}

/** 预览区尺寸随窗口变化，需重新计算 contain/cover 与平移边界 */
watch(previewUrl, async () => {
  await nextTick();
  measureView();
  ro?.disconnect();
  if (stageEl.value) {
    ro = new ResizeObserver(() => measureView());
    ro.observe(stageEl.value);
  }
});

watch(
  [files, direction, useMargin, margin, useBg, bgColor],
  () => {
    // 供保存流程推导默认文件名/目录
    inputPath.value = files.value[0]?.path ?? '';
    schedulePreview();
  },
  { deep: true }
);

/** 单图输出：点击后选择保存位置，拼接为一张图片 */
async function run() {
  if (files.value.length < 2) {
    message('请至少导入 2 张图片', 'warning');
    return;
  }
  await runSave(
    (stem) => `${stem}_spliced.png`,
    async (outputPath) => {
      await window.api.image.process({
        op: 'append',
        inputPath: files.value[0].path,
        outputPath,
        extra: appendExtra()
      });
    }
  );
}

onBeforeUnmount(() => {
  ro?.disconnect();
  if (previewTimer) window.clearTimeout(previewTimer);
  revoke(previewUrl.value);
  revoke(lastUrl);
});
</script>

<style scoped>
/* 图片列表：可拖动调节顺序，因此每项带序号 + 上移/下移 */
.import-actions {
  display: flex;
  gap: calc(var(--design-unit) * 2 * 1px);
  margin-bottom: calc(var(--design-unit) * 2.5 * 1px);
}
.import-actions fluent-button {
  flex: 1;
}
.file-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1.5 * 1px);
  max-height: 320px;
  overflow-y: auto;
  padding-right: calc(var(--design-unit) * 1px);
}
.list-empty {
  color: var(--neutral-foreground-secondary-rest);
  font-size: var(--type-ramp-minus-1-font-size);
  text-align: center;
  padding: calc(var(--design-unit) * 4 * 1px) 0;
}
.file-item {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1 * 1px);
  padding: calc(var(--design-unit) * 1.5 * 1px) calc(var(--design-unit) * 2 * 1px);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  background: var(--neutral-layer-1);
  cursor: grab;
}
/* 拖拽排序的视觉反馈 */
.file-item.dragging {
  opacity: 0.4;
  cursor: grabbing;
}
.file-item.drop-target {
  border-color: var(--accent-base-color);
  box-shadow: inset 0 0 0 1px var(--accent-base-color);
}
.grip {
  flex-shrink: 0;
  color: var(--neutral-foreground-secondary-rest);
  font-size: 12px;
  letter-spacing: -2px;
  cursor: grab;
}
.hint {
  margin-top: calc(var(--design-unit) * 1.5 * 1px);
  font-size: 11px;
  color: var(--neutral-foreground-secondary-rest);
  opacity: 0.8;
}
.color {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px);
  background: none;
  cursor: pointer;
}
.color-val {
  font-size: 11px;
  color: var(--neutral-foreground-secondary-rest);
}
.idx {
  flex-shrink: 0;
  width: calc(var(--design-unit) * 5 * 1px);
  font-size: 11px;
  color: var(--neutral-foreground-secondary-rest);
  text-align: center;
}
.name {
  flex: 1;
  min-width: 0;
  font-size: var(--type-ramp-minus-1-font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mini {
  flex-shrink: 0;
  width: calc(var(--design-unit) * 5 * 1px);
  height: calc(var(--design-unit) * 5 * 1px);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px);
  background: transparent;
  color: var(--neutral-foreground-rest);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.mini:disabled {
  opacity: 0.35;
  cursor: default;
}
.mini.danger:hover {
  color: var(--accent-base-color);
  border-color: var(--accent-base-color);
}
/* 预览区：滚轮/拖动平移，缩放由下方滑块控制（不出现滚动条） */
.preview-stage {
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.preview-stage.panning {
  cursor: grabbing;
}
/* 覆盖全局预览图的 contain 约束：这里用固定尺寸 + transform 控制显示 */
.preview-img {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  max-height: none;
  object-fit: fill;
}
.zoom-slider {
  flex-shrink: 0;
  width: 100%;
  margin-top: calc(var(--design-unit) * 0.5 * 1px);
}
.zoom-ctl {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1.5 * 1px);
  flex-shrink: 0;
}
.zoom-btn {
  border: 1px solid var(--neutral-stroke-rest);
  background: transparent;
  color: var(--neutral-foreground-rest);
  font-size: 12px;
  padding: calc(var(--design-unit) * 0.75 * 1px) calc(var(--design-unit) * 2 * 1px);
  border-radius: calc(var(--control-corner-radius) * 1px);
  cursor: pointer;
}
.zoom-btn.sel {
  border-color: var(--accent-base-color);
  color: var(--accent-base-color);
}
.zoom-val {
  font-size: 11px;
  color: var(--neutral-foreground-secondary-rest);
  min-width: 38px;
  text-align: right;
}
</style>

<template>
  <div class="tool">
    <ImagePicker
      :src="previewUrl"
      :name="inputName"
      icon="table-cells"
      hint="选择一张图片开始分割"
      @pick="onPick"
    />
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="group">
          <span class="group-title">分割网格</span>
          <div class="field row">
            <span class="field-label">行数</span>
            <fluent-number-field :value="rows" min="1" max="50" @input="rows = evNum($event)">行</fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">列数</span>
            <fluent-number-field :value="cols" min="1" max="50" @input="cols = evNum($event)">列</fluent-number-field>
          </div>
          <p class="hint" v-if="meta">原图尺寸：{{ meta.width }} × {{ meta.height }}，将分为 {{ rows }} × {{ cols }} 块</p>
        </div>
        <div class="group">
          <span class="group-title">输出设置</span>
          <label class="field">
            <span class="field-label">格式</span>
            <fluent-select :value="out.format" @change="onFormat">
              <fluent-option value="original">保持原格式</fluent-option>
              <fluent-option value="png">PNG（无损）</fluent-option>
              <fluent-option value="jpeg">JPG（有损）</fluent-option>
              <fluent-option value="webp">WebP（有损）</fluent-option>
            </fluent-select>
          </label>
          <div v-if="lossy" class="field row">
            <span class="field-label">质量</span>
            <fluent-slider
              :value="out.quality"
              :min="10"
              :max="100"
              :step="1"
              @change="out.quality = evNum($event)"
            ></fluent-slider>
            <span class="q-val">{{ out.quality }}</span>
          </div>
        </div>
        <!-- footer 必须位于 controls-body 内部，才能继承其右侧内边距（与水印工具一致） -->
        <div class="controls-footer">
          <fluent-button appearance="accent" class="save-btn" :disabled="processing || !inputPath" @click="onSave">
            {{ processing ? `处理中 ${progress}…` : '分割并保存' }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSingleTool, evNum, extOf } from '@renderer/composables/useSingleTool';
import {
  createOutputOpts,
  isLossy,
  outExt,
  withOutput,
  type OutputOpts
} from '@renderer/composables/useOutputSettings';
import type { DefaultOutputFormat } from '@renderer/stores/settings';
import ImagePicker from '@renderer/components/ImagePicker.vue';
import { selectDirectory } from '@renderer/utils/filePicker';
import { buildOutputPath } from '@renderer/utils/fileIO';
import { useDialog } from '@renderer/composables/useDialog';

const { message } = useDialog();
const { inputPath, inputName, previewUrl, processing, pickImage, schedulePreview } = useSingleTool();

interface Meta {
  width: number;
  height: number;
}
const meta = ref<Meta | null>(null);
const rows = ref(2);
const cols = ref(2);
const progress = ref(0);

/** 输出格式/质量：默认取设置页的「默认输出」 */
const out: OutputOpts = createOutputOpts();
const lossy = computed(() => isLossy(out.format));

function onFormat(e: Event) {
  out.format = (e.target as HTMLInputElement).value as DefaultOutputFormat;
}

async function fetchMeta(): Promise<void> {
  if (!inputPath.value) return;
  const res = await window.api.image.process({ op: 'metadata', inputPath: inputPath.value });
  const m = res.info as unknown as Meta;
  meta.value = { width: m.width || 0, height: m.height || 0 };
}

function tileRegions() {
  if (!meta.value) return [];
  const iw = meta.value.width;
  const ih = meta.value.height;
  const tw = Math.floor(iw / cols.value);
  const th = Math.floor(ih / rows.value);
  const out: { ri: number; ci: number; left: number; top: number; width: number; height: number }[] = [];
  for (let ri = 0; ri < rows.value; ri++) {
    for (let ci = 0; ci < cols.value; ci++) {
      const left = ci * tw;
      const top = ri * th;
      const width = ci === cols.value - 1 ? iw - left : tw;
      const height = ri === rows.value - 1 ? ih - top : th;
      out.push({ ri: ri + 1, ci: ci + 1, left, top, width, height });
    }
  }
  return out;
}

async function refresh(): Promise<ArrayBuffer | undefined> {
  if (!inputPath.value) return undefined;
  const tiles = tileRegions();
  if (!tiles.length) return undefined;
  const t = tiles[0];
  const res = await window.api.image.process({
    op: 'extract',
    inputPath: inputPath.value,
    options: { left: t.left, top: t.top, width: t.width, height: t.height }
  });
  return res.buffer;
}

async function onPick() {
  if (await pickImage()) {
    await fetchMeta();
    schedulePreview(refresh);
  }
}

async function onSave() {
  if (!inputPath.value || !meta.value) {
    message('请先选择图片', 'warning');
    return;
  }
  const dir = await selectDirectory();
  if (!dir) return;
  const base = inputPath.value.split(/[\\/]/).pop() || 'image';
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const tiles = tileRegions();
  processing.value = true;
  progress.value = 0;
  try {
    for (const t of tiles) {
      const name = `${stem}_r${t.ri}c${t.ci}${outExt(out.format, inputPath.value)}`;
      const outputPath = buildOutputPath(dir, name);
      await window.api.image.process({
        op: 'extract',
        inputPath: inputPath.value,
        outputPath,
        options: withOutput(
          { left: t.left, top: t.top, width: t.width, height: t.height },
          out
        )
      });
      progress.value++;
    }
    message(`分割完成，共 ${tiles.length} 块`, 'success');
    try {
      window.api.shell.showItemInFolder(buildOutputPath(dir, `${stem}_r1c1${extOf(inputPath.value)}`));
    } catch {
      /* ignore */
    }
  } catch (err) {
    message('处理失败：' + (err as Error).message, 'error');
  } finally {
    processing.value = false;
  }
}
</script>

<style scoped>
.batch-tool .import-panel {
  height: auto;
  max-height: 340px;
}
</style>

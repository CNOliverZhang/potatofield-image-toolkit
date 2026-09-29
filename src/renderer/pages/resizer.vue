<template>
  <div class="tool">
    <ImagePicker
      :src="previewUrl"
      :name="inputName"
      hint="选择一张图片开始调整尺寸"
      @pick="onPick"
    />
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="batch-entry">
          <fluent-button appearance="neutral" @click="goBatch">
            <font-awesome-icon icon="layer-group" /> 批量调整尺寸
          </fluent-button>
        </div>
        <div class="group">
          <span class="group-title">尺寸设置</span>
          <div class="field row">
            <span class="field-label">宽度</span>
            <fluent-number-field :value="opts.width" min="1" @input="opts.width = evNum($event)"><span slot="end">px</span></fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">高度（0=按比例）</span>
            <fluent-number-field :value="opts.height" min="0" @input="opts.height = evNum($event)"><span slot="end">px</span></fluent-number-field>
          </div>
          <label class="field">
            <span class="field-label">适配方式</span>
            <fluent-select
              :value="opts.fit"
              @change="opts.fit = evVal($event) as ImageProcessOptions['fit']"
            >
              <fluent-option value="inside">等比缩放（inside）</fluent-option>
              <fluent-option value="cover">裁剪填充（cover）</fluent-option>
              <fluent-option value="fill">拉伸（fill）</fluent-option>
              <fluent-option value="contain">包含（contain）</fluent-option>
              <fluent-option value="outside">外部（outside）</fluent-option>
            </fluent-select>
          </label>
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
          <fluent-button appearance="accent" class="save-btn" :disabled="processing" @click="onSave">
            {{ processing ? '处理中…' : '保存图片' }}
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { ImageProcessOptions } from '@shared/types';
import { useSingleTool, evVal, evNum } from '@renderer/composables/useSingleTool';
import {
  createOutputOpts,
  isLossy,
  outExt,
  withOutput,
  type OutputOpts
} from '@renderer/composables/useOutputSettings';
import type { DefaultOutputFormat } from '@renderer/stores/settings';
import ImagePicker from '@renderer/components/ImagePicker.vue';

const { inputPath, inputName, previewUrl, processing, pickImage, schedulePreview, runSave } =
  useSingleTool();

const opts = reactive({
  width: 800,
  height: 0,
  fit: 'inside' as ImageProcessOptions['fit']
});

/** 输出格式/质量：默认取设置页的「默认输出」 */
const out: OutputOpts = createOutputOpts();
const lossy = computed(() => isLossy(out.format));

function onFormat(e: Event) {
  out.format = (e.target as HTMLInputElement).value as DefaultOutputFormat;
}

function buildOptions(): ImageProcessOptions {
  const o: ImageProcessOptions = { fit: opts.fit };
  if (opts.width > 0) o.width = opts.width;
  if (opts.height > 0) o.height = opts.height;
  return withOutput(o, out);
}

async function refresh(): Promise<ArrayBuffer | undefined> {
  if (!inputPath.value) return undefined;
  const res = await window.api.image.process({
    op: 'resize',
    inputPath: inputPath.value,
    options: buildOptions()
  });
  return res.buffer;
}

async function onPick() {
  if (await pickImage()) schedulePreview(refresh);
}

async function onSave() {
  await runSave(
    (stem) => `${stem}_resized${outExt(out.format, inputPath.value)}`,
    async (outputPath) => {
      await window.api.image.process({
        op: 'resize',
        inputPath: inputPath.value,
        outputPath,
        options: buildOptions()
      });
    }
  );
}

const goBatch = () => window.api.window.open({
  route: '/resizer/batch',
  key: 'batch-resizer',
  width: 1280,
  height: 820,
  minWidth: 1024,
  minHeight: 680
});

watch(opts, () => schedulePreview(refresh), { deep: true });
</script>

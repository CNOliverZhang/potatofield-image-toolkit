<template>
  <div class="tool">
    <ImagePicker
      :src="previewUrl"
      :name="inputName"
      icon="repeat"
      hint="选择一张图片开始格式转换"
      @pick="onPick"
    />
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="batch-entry">
          <fluent-button appearance="neutral" @click="goBatch">
            <font-awesome-icon icon="layer-group" /> 批量转换
          </fluent-button>
        </div>
        <div class="group">
          <span class="group-title">转换设置</span>
          <label class="field">
            <span class="field-label">目标格式</span>
            <fluent-select :value="opts.format" @change="opts.format = evVal($event) as ImageFormat">
              <fluent-option value="png">PNG</fluent-option>
              <fluent-option value="jpeg">JPEG</fluent-option>
              <fluent-option value="webp">WebP</fluent-option>
            </fluent-select>
          </label>
          <div v-if="lossy" class="field row">
            <span class="field-label">质量</span>
            <fluent-slider
              :value="opts.quality"
              :min="10"
              :max="100"
              :step="1"
              @change="opts.quality = evNum($event)"
            ></fluent-slider>
            <span class="q-val">{{ opts.quality }}</span>
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
import type { ImageFormat } from '@shared/types';
import { useSingleTool, evVal, evNum, extOf } from '@renderer/composables/useSingleTool';
import { isLossy, outExt, outQuality } from '@renderer/composables/useOutputSettings';
import ImagePicker from '@renderer/components/ImagePicker.vue';

const { inputPath, inputName, previewUrl, processing, pickImage, schedulePreview, runSave } =
  useSingleTool();

const opts = reactive({
  format: 'png' as ImageFormat,
  quality: 90
});

const lossy = computed(() => isLossy(opts.format));

async function refresh(): Promise<ArrayBuffer | undefined> {
  if (!inputPath.value) return undefined;
  const res = await window.api.image.process({
    op: 'convert',
    inputPath: inputPath.value,
    options: { format: opts.format, quality: outQuality(opts.format, opts.quality) }
  });
  return res.buffer;
}

async function onPick() {
  if (await pickImage()) schedulePreview(refresh);
}

async function onSave() {
  await runSave(
    (stem) => `${stem}_converted${outExt(opts.format, inputPath.value)}`,
    async (outputPath) => {
      await window.api.image.process({
        op: 'convert',
        inputPath: inputPath.value,
        outputPath,
        options: { format: opts.format, quality: outQuality(opts.format, opts.quality) }
      });
    }
  );
}

const goBatch = () => window.api.window.open({
  route: '/convert/batch',
  key: 'batch-convert',
  width: 1280,
  height: 820,
  minWidth: 1024,
  minHeight: 680
});

watch(opts, () => schedulePreview(refresh), { deep: true });
</script>

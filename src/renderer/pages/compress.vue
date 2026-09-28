<template>
  <div class="tool">
    <section class="preview-pane">
      <div v-if="!inputPath" class="dropzone">
        <font-awesome-icon icon="image" class="dz-icon" />
        <p>选择一张图片开始压缩</p>
        <fluent-button appearance="accent" @click="onPick">选择图片</fluent-button>
      </div>
      <template v-else>
        <div class="preview-stage">
          <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
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
            <font-awesome-icon icon="layer-group" /> 批量压缩
          </fluent-button>
        </div>
        <div class="group">
          <span class="group-title">压缩设置</span>
          <label class="field">
            <span class="field-label">输出格式</span>
            <fluent-select :value="opts.format" @change="opts.format = evVal($event) as ImageFormat | 'original'">
              <fluent-option value="original">保持原格式</fluent-option>
              <fluent-option value="jpeg">JPEG</fluent-option>
              <fluent-option value="png">PNG</fluent-option>
              <fluent-option value="webp">WebP</fluent-option>
            </fluent-select>
          </label>
          <div class="field row">
            <span class="field-label">质量</span>
            <fluent-slider
              style="flex: 1"
              :value="opts.quality"
              min="1"
              max="100"
              step="1"
              @change="opts.quality = evNum($event)"
            ></fluent-slider>
            <span style="width: 36px; text-align: right">{{ opts.quality }}</span>
          </div>
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
import { reactive, watch } from 'vue';
import type { ImageFormat, ImageProcessOptions } from '@shared/types';
import { useSingleTool, evVal, evNum, extOf } from '@renderer/composables/useSingleTool';

const { inputPath, inputName, previewUrl, processing, pickImage, schedulePreview, runSave } =
  useSingleTool();

const opts = reactive({
  format: 'original' as ImageFormat | 'original',
  quality: 80
});

function buildOptions(): ImageProcessOptions {
  const o: ImageProcessOptions = {};
  if (opts.format !== 'original') o.format = opts.format;
  o.quality = opts.quality;
  return o;
}

async function refresh(): Promise<ArrayBuffer | undefined> {
  if (!inputPath.value) return undefined;
  const res = await window.api.image.process({
    op: 'compress',
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
    (stem) =>
      opts.format === 'original' ? `${stem}${extOf(inputPath.value)}` : `${stem}_compressed.${opts.format}`,
    async (outputPath) => {
      await window.api.image.process({
        op: 'compress',
        inputPath: inputPath.value,
        outputPath,
        options: buildOptions()
      });
    }
  );
}

const goBatch = () => window.api.window.open({
  route: '/compress/batch',
  key: 'batch-compress',
  width: 1280,
  height: 820,
  minWidth: 1024,
  minHeight: 680
});

watch(opts, () => schedulePreview(refresh), { deep: true });
</script>

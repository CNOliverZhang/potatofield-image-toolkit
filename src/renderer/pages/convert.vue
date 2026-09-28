<template>
  <div class="tool">
    <section class="preview-pane">
      <div v-if="!inputPath" class="dropzone">
        <font-awesome-icon icon="image" class="dz-icon" />
        <p>选择一张图片开始格式转换</p>
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
import type { ImageFormat } from '@shared/types';
import { useSingleTool, evVal, extOf } from '@renderer/composables/useSingleTool';

const { inputPath, inputName, previewUrl, processing, pickImage, schedulePreview, runSave } =
  useSingleTool();

const opts = reactive({
  format: 'png' as ImageFormat
});

async function refresh(): Promise<ArrayBuffer | undefined> {
  if (!inputPath.value) return undefined;
  const res = await window.api.image.process({
    op: 'convert',
    inputPath: inputPath.value,
    options: { format: opts.format }
  });
  return res.buffer;
}

async function onPick() {
  if (await pickImage()) schedulePreview(refresh);
}

async function onSave() {
  await runSave(
    (stem) => `${stem}_converted.${opts.format}`,
    async (outputPath) => {
      await window.api.image.process({
        op: 'convert',
        inputPath: inputPath.value,
        outputPath,
        options: { format: opts.format }
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

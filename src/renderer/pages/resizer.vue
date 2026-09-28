<template>
  <div class="tool">
    <section class="preview-pane">
      <div v-if="!inputPath" class="dropzone">
        <font-awesome-icon icon="image" class="dz-icon" />
        <p>选择一张图片开始调整尺寸</p>
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
            <font-awesome-icon icon="layer-group" /> 批量调整尺寸
          </fluent-button>
        </div>
        <div class="group">
          <span class="group-title">尺寸设置</span>
          <div class="field row">
            <span class="field-label">宽度</span>
            <fluent-number-field :value="opts.width" min="1" @input="opts.width = evNum($event)">px</fluent-number-field>
          </div>
          <div class="field row">
            <span class="field-label">高度（0=按比例）</span>
            <fluent-number-field :value="opts.height" min="0" @input="opts.height = evNum($event)">px</fluent-number-field>
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
import type { ImageProcessOptions } from '@shared/types';
import { useSingleTool, evVal, evNum, extOf } from '@renderer/composables/useSingleTool';

const { inputPath, inputName, previewUrl, processing, pickImage, schedulePreview, runSave } =
  useSingleTool();

const opts = reactive({
  width: 800,
  height: 0,
  fit: 'inside' as ImageProcessOptions['fit']
});

function buildOptions(): ImageProcessOptions {
  const o: ImageProcessOptions = { fit: opts.fit };
  if (opts.width > 0) o.width = opts.width;
  if (opts.height > 0) o.height = opts.height;
  return o;
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
    (stem) => `${stem}_resized${extOf(inputPath.value)}`,
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

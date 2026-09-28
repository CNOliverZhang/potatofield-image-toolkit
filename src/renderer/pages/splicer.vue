<template>
  <div class="batch-tool">
    <div class="batch-tool-head">
      <span class="title">长图拼接</span>
      <span class="desc">将多张图片按顺序拼接为一张</span>
    </div>
    <BatchImportPanel v-model="files" v-model:selected="selected" />
    <div class="batch-tool-body">
      <div class="group">
        <span class="group-title">拼接方式</span>
        <label class="field">
          <span class="field-label">排列方向</span>
          <fluent-select
            :value="direction"
            @change="direction = evVal($event) as 'vertical' | 'horizontal'"
          >
            <fluent-option value="vertical">纵向（上下拼接）</fluent-option>
            <fluent-option value="horizontal">横向（左右拼接）</fluent-option>
          </fluent-select>
        </label>
      </div>
      <SaveLocationSetting v-model="dir" v-model:keep-relative="keepRelative" />
    </div>
    <div class="batch-tool-foot">
      <span class="progress-text" v-if="processing">拼接中…</span>
      <fluent-button appearance="accent" :disabled="!files.length || processing" @click="run">
        {{ processing ? '处理中…' : '开始拼接' }}
      </fluent-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BatchImportPanel from '@renderer/components/BatchImportPanel.vue';
import SaveLocationSetting from '@renderer/components/SaveLocationSetting.vue';
import { useDialog } from '@renderer/composables/useDialog';
import { buildOutputPath } from '@renderer/utils/fileIO';
import { evVal, extOf } from '@renderer/composables/useSingleTool';
import type { BatchItem } from '@renderer/utils/directoryScanner';

const { message } = useDialog();
const files = ref<BatchItem[]>([]);
const selected = ref('');
const dir = ref('');
const keepRelative = ref(false);
const direction = ref<'vertical' | 'horizontal'>('vertical');
const processing = ref(false);

async function run() {
  if (files.value.length < 2 || !dir.value) {
    message('请至少导入 2 张图片并选择保存位置', 'warning');
    return;
  }
  processing.value = true;
  try {
    const first = files.value[0].path;
    const rest = files.value.slice(1).map((i) => i.path);
    const base = first.split(/[\\/]/).pop() || 'image';
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const name = `${stem}_spliced${extOf(first)}`;
    const outputPath = buildOutputPath(dir.value, name);
    await window.api.image.process({
      op: 'append',
      inputPath: first,
      extra: { srcPaths: rest },
      outputPath,
      options: { dir: direction.value }
    });
    message('拼接完成', 'success');
    try {
      window.api.shell.showItemInFolder(outputPath);
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

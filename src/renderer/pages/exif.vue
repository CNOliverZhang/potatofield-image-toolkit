<template>
  <div class="tool">
    <section class="preview-pane">
      <div v-if="!inputPath" class="dropzone">
        <font-awesome-icon icon="file-image" class="dz-icon" />
        <p>选择一张图片读取 EXIF / 元数据</p>
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
        <div class="meta-table" v-if="entries.length">
          <div class="meta-row" v-for="e in entries" :key="e.key">
            <span class="meta-key">{{ e.key }}</span>
            <span class="meta-val">{{ e.value }}</span>
          </div>
          <p class="hint" v-if="exifEntries.length">— 以下为 EXIF 原始字段 —</p>
          <div class="meta-row" v-for="e in exifEntries" :key="'exif-' + e.key">
            <span class="meta-key">{{ e.key }}</span>
            <span class="meta-val">{{ e.value }}</span>
          </div>
        </div>
      </template>
    </section>
    <aside class="controls-pane">
      <div class="controls-body">
        <div class="group">
          <span class="group-title">说明</span>
          <p class="hint">
            本工具读取图片的元数据（格式、尺寸、色彩空间等）以及嵌入的 EXIF 信息（如拍摄时间、相机型号、GPS 等）。
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSingleTool } from '@renderer/composables/useSingleTool';

const { inputPath, inputName, previewUrl, pickImage, schedulePreview } = useSingleTool();

const entries = ref<{ key: string; value: string }[]>([]);
const exifEntries = ref<{ key: string; value: string }[]>([]);

function flatten(obj: Record<string, unknown>, prefix = ''): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v as Record<string, unknown>, key));
    } else if (Array.isArray(v)) {
      out.push({ key, value: JSON.stringify(v) });
    } else {
      out.push({ key, value: String(v) });
    }
  }
  return out;
}

async function onPick() {
  if (await pickImage()) {
    schedulePreview(async () => {
      const res = await window.api.image.process({ op: 'metadata', inputPath: inputPath.value });
      const tags = (res.info || {}) as Record<string, unknown>;
      const exif = (tags.exif as Record<string, unknown>) || {};
      const base = { ...tags };
      delete base.exif;
      entries.value = flatten(base);
      exifEntries.value = flatten(exif, 'exif');
      return undefined;
    });
  }
}
</script>

<style scoped>
.meta-table {
  margin-top: 18px;
  width: 100%;
  max-width: 720px;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--layer-corner-radius) * 1px);
  overflow: auto;
  max-height: calc(100vh - 240px);
  background: var(--neutral-layer-2);
}
.meta-row {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--neutral-stroke-rest);
  font-size: var(--type-ramp-minus-1-font-size);
}
.meta-row:last-child {
  border-bottom: none;
}
.meta-key {
  flex: 0 0 200px;
  color: var(--neutral-foreground-secondary-rest);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-val {
  flex: 1;
  color: var(--neutral-foreground-rest);
  word-break: break-all;
}
</style>

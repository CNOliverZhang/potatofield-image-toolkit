<template>
  <div class="tool">
    <ImagePicker
      :src="previewUrl || inputSrc"
      :name="inputName"
      icon="file-image"
      hint="选择一张图片读取 EXIF / 元数据"
      @pick="onPick"
    />
    <aside class="controls-pane">
      <div class="controls-body">
        <!-- 读取到的元数据放在右栏，与左侧预览构成左右布局 -->
        <div v-if="entries.length" class="group">
          <span class="group-title">元数据</span>
          <div class="meta-table">
            <div class="meta-row" v-for="e in entries" :key="e.key">
              <span class="meta-key">{{ e.key }}</span>
              <span class="meta-val">{{ e.value }}</span>
            </div>
          </div>
        </div>
        <div v-if="exifEntries.length" class="group">
          <span class="group-title">EXIF 原始字段</span>
          <div class="meta-table">
            <div class="meta-row" v-for="e in exifEntries" :key="'exif-' + e.key">
              <span class="meta-key">{{ e.key }}</span>
              <span class="meta-val">{{ e.value }}</span>
            </div>
          </div>
        </div>
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
import { computed, ref } from 'vue';
import { useSingleTool } from '@renderer/composables/useSingleTool';
import ImagePicker from '@renderer/components/ImagePicker.vue';

const { inputPath, inputName, previewUrl, pickImage, schedulePreview } = useSingleTool();

/** 本工具只读取元数据、不生成预览图，因此预览直接用原图 */
const inputSrc = computed(() => (inputPath.value ? `file://${inputPath.value}` : ''));

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
/* 元数据表现在放在右栏（340px），按窄栏调整：字段名列宽收窄、表格不自带滚动 */
.meta-table {
  width: 100%;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--layer-corner-radius) * 1px);
  background: var(--neutral-layer-2);
  overflow: hidden;
}
.meta-row {
  display: flex;
  gap: calc(var(--design-unit) * 2 * 1px);
  padding: calc(var(--design-unit) * 1.5 * 1px) calc(var(--design-unit) * 2.5 * 1px);
  border-bottom: 1px solid var(--neutral-stroke-rest);
  font-size: var(--type-ramp-minus-1-font-size);
}
.meta-row:last-child {
  border-bottom: none;
}
.meta-key {
  flex: 0 0 45%;
  min-width: 0;
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

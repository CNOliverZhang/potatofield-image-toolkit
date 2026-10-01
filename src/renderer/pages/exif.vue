<template>
  <div class="tool">
    <ImagePicker
      :src="previewUrl || inputSrc"
      :name="inputName"
      icon="circle-info"
      hint="选择一张图片读取 EXIF / 元数据"
      @pick="onPick"
    />
    <!-- 右栏整列不滚动：标题与卡片常驻，滚动条只在「元数据」卡片内部 -->
    <aside class="controls-pane">
      <div class="controls-body">
        <SettingsGroup class="meta-group" title="元数据" :count="totalCount || undefined">
          <div class="meta-scroll">
            <template v-if="sections.length">
              <div v-for="s in sections" :key="s.title" class="meta-block">
                <div class="meta-block-title">{{ s.title }}</div>
                <div class="meta-row" v-for="e in s.entries" :key="s.title + e.label">
                  <span class="meta-key">{{ e.label }}</span>
                  <span class="meta-val">{{ e.value }}</span>
                </div>
              </div>
            </template>
            <p v-else class="meta-empty">
              {{ inputPath ? '读取中…' : '选择图片后显示文件与拍摄信息' }}
            </p>
          </div>
        </SettingsGroup>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { MetaSection } from '@shared/types';
import { useSingleTool } from '@renderer/composables/useSingleTool';
import ImagePicker from '@renderer/components/ImagePicker.vue';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';

const { inputPath, inputName, previewUrl, pickImage, schedulePreview } = useSingleTool();

/** 本工具只读取元数据、不生成预览图，因此预览直接用原图 */
const inputSrc = computed(() => (inputPath.value ? `file://${inputPath.value}` : ''));

const sections = ref<MetaSection[]>([]);
const totalCount = computed(() =>
  sections.value.reduce((n, s) => n + s.entries.length, 0)
);

async function onPick() {
  if (await pickImage()) {
    schedulePreview(async () => {
      sections.value = [];
      const res = await window.api.image.process({ op: 'metadata', inputPath: inputPath.value });
      // 只展示主进程筛好的「摄影 / 设计关注」字段
      sections.value = res.meta?.sections ?? [];
      return undefined;
    });
  }
}
</script>

<style scoped>
/* 右栏整列不可滚动：元数据卡片撑起剩余高度，滚动发生在其内部 */
.controls-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.meta-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}
/* sg-card 撑满并在内部滚动 */
.meta-group :deep(.sg-card) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.meta-scroll {
  padding: calc(var(--design-unit) * 1.5 * 1px) calc(var(--design-unit) * 2.5 * 1px);
}
.meta-block + .meta-block {
  margin-top: calc(var(--design-unit) * 2 * 1px);
  border-top: 1px solid var(--colorNeutralStroke2);
  padding-top: calc(var(--design-unit) * 2 * 1px);
}
.meta-block-title {
  margin-bottom: calc(var(--design-unit) * 1 * 1px);
  font-size: var(--fontSizeBase100);
  font-weight: 600;
  color: var(--app-fg-secondary);
}
.meta-row {
  display: flex;
  gap: calc(var(--design-unit) * 2 * 1px);
  padding: calc(var(--design-unit) * 0.75 * 1px) 0;
  font-size: var(--fontSizeBase200);
}
.meta-key {
  flex: 0 0 45%;
  min-width: 0;
  color: var(--app-fg-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-val {
  flex: 1;
  min-width: 0;
  color: var(--colorNeutralForeground1);
  word-break: break-all;
}
.meta-empty {
  margin: 0;
  padding: calc(var(--design-unit) * 2 * 1px) 0;
  font-size: var(--fontSizeBase200);
  color: var(--app-fg-secondary);
}
</style>

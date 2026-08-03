<template>
  <div class="import-panel">
    <div class="import-head">
      <span class="import-title">导入图片</span>
      <span class="import-count">{{ modelValue.length }}</span>
    </div>
    <div class="import-actions">
      <fluent-button appearance="accent" @click="chooseFiles">选择文件</fluent-button>
      <fluent-button appearance="neutral" @click="scanFolder">扫描文件夹</fluent-button>
    </div>
    <div class="import-list">
      <div v-if="!modelValue.length" class="import-empty">尚未导入图片</div>
      <div
        v-for="p in modelValue"
        :key="p"
        :class="['import-item', { active: p === selected }]"
        @click="select(p)"
      >
        <span class="item-name" :title="p">{{ p.split(/[\\/]/).pop() }}</span>
        <button class="item-remove" @click.stop="remove(p)" title="移除">×</button>
      </div>
    </div>
    <div class="import-foot" v-if="modelValue.length">
      <span class="foot-text">已选：{{ selected ? selected.split(/[\\/]/).pop() : '无' }}</span>
      <button class="link-btn" @click="clear">清空</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { selectImageFiles, selectDirectory } from '@renderer/utils/filePicker';
import { scanImageDirectory } from '@renderer/utils/directoryScanner';

const props = defineProps<{ modelValue: string[]; selected: string }>();
const emit = defineEmits<{ 'update:modelValue': [string[]]; 'update:selected': [string] }>();

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}

async function chooseFiles() {
  const res = await selectImageFiles(true);
  if (!res) return;
  emit('update:modelValue', dedupe([...props.modelValue, ...res]));
}

async function scanFolder() {
  const dir = await selectDirectory();
  if (!dir) return;
  const r = await scanImageDirectory(dir);
  const paths = [...r.fileList, ...r.errorList.map((e) => e.path)];
  if (!paths.length) return;
  emit('update:modelValue', dedupe([...props.modelValue, ...paths]));
}

function remove(p: string) {
  emit('update:modelValue', props.modelValue.filter((x) => x !== p));
  if (props.selected === p) emit('update:selected', '');
}

function clear() {
  emit('update:modelValue', []);
  emit('update:selected', '');
}

function select(p: string) {
  emit('update:selected', p);
}
</script>

<style scoped>
.import-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: var(--neutral-layer-2);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--layer-corner-radius) * 1px);
  padding: calc(var(--design-unit) * 1px * 3);
}
.import-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: calc(var(--design-unit) * 1px * 2.5);
}
.import-title {
  font-size: var(--type-ramp-base-font-size);
  font-weight: 600;
}
.import-count {
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
  background: var(--neutral-fill-hover);
  border-radius: calc(var(--control-corner-radius) * 1px);
  padding: calc(var(--design-unit) * 1px * 0.5) calc(var(--design-unit) * 1px * 2);
}
.import-actions {
  display: flex;
  gap: calc(var(--design-unit) * 1px * 2);
  margin-bottom: calc(var(--design-unit) * 1px * 3);
}
.import-actions fluent-button {
  flex: 1;
}
.import-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1px * 1.5);
  padding-right: calc(var(--design-unit) * 1px);
}
.import-empty {
  color: var(--neutral-foreground-secondary-rest);
  font-size: var(--type-ramp-minus-1-font-size);
  text-align: center;
  padding: calc(var(--design-unit) * 1px * 6) 0;
}
.import-item {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 2);
  padding: calc(var(--design-unit) * 1px * 2) calc(var(--design-unit) * 1px * 2.5);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  cursor: pointer;
  background: var(--neutral-layer-1);
  transition: border-color 0.12s ease;
}
.import-item:hover {
  border-color: var(--accent-base-color);
}
.import-item.active {
  border-color: var(--accent-base-color);
  background: var(--neutral-fill-hover);
}
.item-name {
  flex: 1;
  min-width: 0;
  font-size: var(--type-ramp-minus-1-font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-remove {
  border: none;
  background: transparent;
  color: var(--neutral-foreground-secondary-rest);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.item-remove:hover {
  color: var(--accent-base-color);
}
.import-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--design-unit) * 1px * 2);
  margin-top: calc(var(--design-unit) * 1px * 2.5);
  padding-top: calc(var(--design-unit) * 1px * 2.5);
  border-top: 1px solid var(--neutral-stroke-rest);
}
.foot-text {
  flex: 1;
  min-width: 0;
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-btn {
  border: 1px solid var(--neutral-stroke-rest);
  background: transparent;
  color: var(--accent-base-color);
  padding: calc(var(--design-unit) * 1px * 1) calc(var(--design-unit) * 1px * 2.5);
  border-radius: calc(var(--control-corner-radius) * 1px + var(--design-unit) * 1px / 2);
  cursor: pointer;
  font-size: var(--type-ramp-minus-1-font-size);
}
.link-btn:hover {
  background: var(--neutral-fill-hover);
}
</style>

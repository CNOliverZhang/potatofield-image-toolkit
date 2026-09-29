<template>
  <div class="settings">
    <h2>设置</h2>

    <div class="group-title">外观</div>
    <div class="row">
      <span class="label">主题色</span>
      <input
        class="color-input"
        type="color"
        :value="settings.themeColor"
        @input="onColor"
      />
      <span class="value">{{ settings.themeColor }}</span>
    </div>
    <div class="row">
      <span class="label">深色模式</span>
      <fluent-switch
        :checked="settings.darkMode"
        @change="onDark"
      ></fluent-switch>
    </div>

    <div class="group-title">文件</div>
    <div class="row">
      <span class="label">文件默认保存地址</span>
      <fluent-text-field
        class="dir-field"
        :value="settings.defaultSaveDirectory"
        readonly
      ></fluent-text-field>
      <fluent-button appearance="neutral" @click="pickDir">选择</fluent-button>
    </div>

    <div class="group-title">默认输出</div>
    <div class="row">
      <span class="label">输出格式</span>
      <fluent-select class="out-select" :value="settings.defaultOutput.format" @change="onFormat">
        <fluent-option value="original">保持原格式</fluent-option>
        <fluent-option value="png">PNG（无损）</fluent-option>
        <fluent-option value="jpeg">JPG（有损）</fluent-option>
        <fluent-option value="webp">WebP（有损）</fluent-option>
      </fluent-select>
    </div>
    <!-- 默认质量是通用默认值（工具里选 JPG/WebP 时才会用到），因此始终显示 -->
    <div class="row">
      <span class="label">默认质量 <em class="value">{{ settings.defaultOutput.quality }}%</em></span>
      <fluent-slider
        class="out-slider"
        :value="settings.defaultOutput.quality"
        :min="10"
        :max="100"
        :step="1"
        @change="onQuality"
      ></fluent-slider>
    </div>
    <p class="hint">作为「改尺寸 / 压缩 / 格式转换 / 切片」等工具新增图片时的初始设置，工具内可单独修改。</p>

    <div class="group-title">关于</div>
    <div class="row">
      <span class="label">设备标识</span>
      <span class="value">{{ identifier }}</span>
    </div>
    <div class="row">
      <span class="label">版本</span>
      <span class="value">{{ version }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { selectDirectory } from '@renderer/utils/filePicker';
import type { DefaultOutputFormat } from '@renderer/stores/settings';

const settings = useSettingsStore();
const identifier = ref('');
const version = ref('');

onMounted(async () => {
  identifier.value = settings.ensureIdentifier();
  version.value = await window.api.app.version();
});

function onColor(e: Event) {
  settings.setThemeColor((e.target as HTMLInputElement).value);
}
function onDark(e: Event) {
  settings.toggleDark(Boolean((e.target as HTMLInputElement).checked));
}
function onFormat(e: Event) {
  settings.setDefaultOutput({ format: (e.target as HTMLInputElement).value as DefaultOutputFormat });
}
function onQuality(e: Event) {
  settings.setDefaultOutput({ quality: Number((e.target as HTMLInputElement).value) });
}
async function pickDir() {
  const dir = await selectDirectory(settings.defaultSaveDirectory || undefined);
  if (dir) settings.setDefaultSaveDirectory(dir);
}
</script>

<style scoped>
.settings {
  max-width: 640px;
}
.group-title {
  margin: calc(var(--design-unit) * 5.5 * 1px) 0 calc(var(--design-unit) * 2 * 1px);
  font-size: 13px;
  font-weight: 600;
  color: var(--neutral-foreground-secondary-rest);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.group-title:first-of-type {
  margin-top: calc(var(--design-unit) * 1 * 1px);
}
.row {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  margin: calc(var(--design-unit) * 3 * 1px) 0;
}
.label {
  width: 140px;
  flex-shrink: 0;
}
.value {
  color: var(--neutral-foreground-secondary-rest);
  font-size: 13px;
  word-break: break-all;
}
.color-input {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px);
  background: none;
  cursor: pointer;
}
.dir-field {
  flex: 1;
}
.out-select {
  width: 220px;
}
.out-slider {
  flex: 1;
}
.hint {
  margin: calc(var(--design-unit) * 1px * 1.5) 0 0;
  font-size: 12px;
  color: var(--neutral-foreground-secondary-rest);
  opacity: 0.8;
}
</style>

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
  margin: 22px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--neutral-foreground-secondary-rest);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.group-title:first-of-type {
  margin-top: 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
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
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
.dir-field {
  flex: 1;
}
</style>

<template>
  <div class="settings">
    <h2>设置</h2>

    <el-divider>外观</el-divider>
    <div class="row">
      <span class="label">主题色</span>
      <el-color-picker :model-value="settings.themeColor" @change="onColor" />
      <span class="value">{{ settings.themeColor }}</span>
    </div>
    <div class="row">
      <span class="label">深色模式</span>
      <el-switch :model-value="settings.darkMode" @change="onDark" />
    </div>

    <el-divider>文件</el-divider>
    <div class="row">
      <span class="label">文件默认保存地址</span>
      <el-input :model-value="settings.defaultSaveDirectory" readonly style="flex: 1" />
      <el-button @click="pickDir">选择</el-button>
    </div>

    <el-divider>关于</el-divider>
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

function onColor(color: string | null) {
  if (color) settings.setThemeColor(color);
}
function onDark(val: string | number | boolean) {
  settings.toggleDark(Boolean(val));
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
  color: var(--text-secondary);
  font-size: 13px;
  word-break: break-all;
}
</style>

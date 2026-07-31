<template>
  <div class="window-controls">
    <span class="title">洋芋田图像工具箱</span>
    <div class="caption">
      <button class="cap-btn" title="最小化" @click="minimize">
        <font-awesome-icon :icon="['fas', 'window-minimize']" />
      </button>
      <button class="cap-btn" title="最大化" @click="toggleMax">
        <font-awesome-icon :icon="['fas', maximized ? 'window-restore' : 'window-maximize']" />
      </button>
      <button class="cap-btn cap-close" title="关闭" @click="close">
        <font-awesome-icon :icon="['fas', 'xmark']" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const maximized = ref(false);

onMounted(async () => {
  try {
    maximized.value = await window.api.window.isMaximized();
  } catch {
    maximized.value = false;
  }
});

function minimize() {
  window.api.window.minimize();
}
async function toggleMax() {
  window.api.window.maximize();
  // 简单回显：下一次查询修正状态（覆盖双击标题栏等外部最大化）
  setTimeout(async () => {
    try {
      maximized.value = await window.api.window.isMaximized();
    } catch {
      /* ignore */
    }
  }, 120);
}
function close() {
  window.api.window.close();
}
</script>

<style scoped>
.window-controls {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 6px 0 14px;
  -webkit-app-region: drag;
  background: transparent;
  border-bottom: 1px solid var(--border-color);
}
.title {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
  user-select: none;
}
.caption {
  display: flex;
  -webkit-app-region: no-drag;
}
.cap-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.cap-btn:hover {
  background: var(--hover-bg);
}
.cap-close:hover {
  background: #c42b1c;
  color: #fff;
}
</style>

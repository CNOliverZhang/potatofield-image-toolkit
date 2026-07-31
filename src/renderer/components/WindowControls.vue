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
import { useWindowState } from '../composables/useWindowState';

const { maximized, toggleMax } = useWindowState();

function minimize() {
  window.api.window.minimize();
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
  margin-left: auto;
  -webkit-app-region: no-drag;
}
.cap-btn {
  width: 46px;
  height: 32px;
  -webkit-app-region: no-drag;
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

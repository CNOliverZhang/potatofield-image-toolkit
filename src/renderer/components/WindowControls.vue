<template>
  <div class="window-controls">
    <font-awesome-icon :icon="['far', 'window-minimize']" class="ctrl-btn" title="最小化" @click="minimize" />
    <font-awesome-icon :icon="['far', 'square']" class="ctrl-btn" title="最大化" @click="maximize" />
    <font-awesome-icon icon="xmark" class="ctrl-btn close" title="关闭" @click="close" />
  </div>
</template>

<script setup lang="ts">
function minimize() {
  window.api.window.minimize();
}
function maximize() {
  window.api.window.maximize();
}
function close() {
  window.api.window.close();
}
</script>

<style scoped>
.window-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  height: 32px;
  -webkit-app-region: drag;
  background: var(--glass-bg-strong);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}
.ctrl-btn {
  -webkit-app-region: no-drag;
  cursor: pointer;
  color: var(--text-color);
  font-size: 13px;
}
.ctrl-btn:hover {
  color: var(--main-color);
}
.ctrl-btn.close:hover {
  color: #f56c6c;
}
</style>

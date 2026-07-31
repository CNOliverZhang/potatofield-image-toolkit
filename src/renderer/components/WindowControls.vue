<template>
  <div class="window-controls">
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
  /* 悬浮在内容区右上角，不占布局高度，使左侧边栏可顶到窗口顶部 */
  position: absolute;
  top: 0;
  left: 232px; /* 从侧边栏右缘起，不遮挡侧边栏 */
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0;
  background: transparent;
  /* 该栏整体可拖拽窗口；按钮区在拖拽区之外，确保可点击 */
  -webkit-app-region: drag;
  z-index: 20;
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
  color: var(--neutral-foreground-rest);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: background 0.1s ease;
}
.cap-btn:hover {
  background: var(--neutral-fill-hover);
}
.cap-btn:active {
  background: rgba(0, 0, 0, 0.12);
}
.cap-close:hover {
  background: #c42b1c;
  color: #fff;
}
.cap-close:active {
  background: #a91e10;
  color: #fff;
}
</style>

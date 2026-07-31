<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type">
        <font-awesome-icon :icon="iconOf(t.type)" class="toast-icon" />
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ui } from '@renderer/composables/ui';
import type { ToastType } from '@renderer/composables/ui';

function iconOf(type: ToastType) {
  switch (type) {
    case 'success':
      return ['fas', 'circle-check'];
    case 'error':
      return ['fas', 'circle-xmark'];
    case 'warning':
      return ['fas', 'triangle-exclamation'];
    default:
      return ['fas', 'circle-info'];
  }
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: calc(var(--design-unit) * 8 * 1px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 2.5 * 1px);
  z-index: 9999;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2.5 * 1px);
  min-width: 200px;
  max-width: 420px;
  padding: calc(var(--design-unit) * 3 * 1px) calc(var(--design-unit) * 4 * 1px);
  border-radius: calc(var(--layer-corner-radius) * 1px);
  background: var(--neutral-layer-1);
  border: 1px solid var(--neutral-stroke-rest);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  color: var(--neutral-foreground-rest);
  font-size: 14px;
}
.toast-icon {
  font-size: 16px;
}
.toast.success .toast-icon {
  color: #13a10e;
}
.toast.error .toast-icon {
  color: #d13438;
}
.toast.warning .toast-icon {
  color: #c19c00;
}
.toast.info .toast-icon {
  color: var(--accent-base-color);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>

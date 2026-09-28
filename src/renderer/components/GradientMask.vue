<template>
  <div class="gradient-mask" :class="to === 'bottom' ? 'to-bottom' : 'to-top'" aria-hidden="true"></div>
</template>

<script setup lang="ts">
/** 滚动容器两端的渐隐遮罩（绝对定位覆盖层，不占布局空间）。
 *  用法：放在 position:relative 的滚动区容器内；
 *  容器内的滚动列表需留出等高的上下内边距，避免首/末项被遮罩挡住。 */
withDefaults(defineProps<{ to?: 'top' | 'bottom' }>(), { to: 'top' });
</script>

<style scoped>
.gradient-mask {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--mask-h, calc(var(--design-unit) * 7 * 1px));
  pointer-events: none;
  z-index: 2;
}
.gradient-mask.to-top {
  top: 0;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--app-bg) 90%, transparent), transparent);
}
.gradient-mask.to-bottom {
  bottom: 0;
  background: linear-gradient(to top, color-mix(in srgb, var(--app-bg) 90%, transparent), transparent);
}
</style>

<template>
  <div class="settings-row" :class="{ clickable }" @click="clickable && $emit('click')">
    <div class="sr-main">
      <span class="sr-label">{{ label }}</span>
      <span v-if="desc" class="sr-desc">{{ desc }}</span>
    </div>
    <div v-if="$slots.default" class="sr-control">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 设置行：左 label（可带描述），右控件。
 * 控件宽度建议用全局类 ctl-lg / ctl-md / ctl-num / ctl-slider。
 */
withDefaults(defineProps<{ label: string; desc?: string; clickable?: boolean }>(), {
  desc: '',
  clickable: false
});
defineEmits<{ click: [] }>();
</script>

<style scoped>
/* 独立设置项 = 一张卡片（与字体管理的字体族卡同尺寸：内容 38 + 上下各 17 = 72px） */
.settings-row {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 3); /* 12px */
  min-height: calc(var(--design-unit) * 1px * 18); /* 72px */
  padding: calc(var(--design-unit) * 1px * 4.25) calc(var(--design-unit) * 1px * 3); /* 17px 12px */
  background: var(--app-card);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px); /* 4px */
}
.settings-row.clickable {
  cursor: pointer;
}
.settings-row.clickable:hover {
  background: var(--neutral-fill-hover);
}
.sr-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 0.5 * 1px);
}
.sr-label {
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sr-desc {
  font-size: 11px;
  color: var(--neutral-foreground-secondary-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sr-control {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 62%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: calc(var(--design-unit) * 1px * 2);
}
</style>

<template>
  <div class="settings-collapse">
    <button class="sc-head" type="button" @click="open = !open">
      <div class="sr-main">
        <span class="sr-label">{{ label }}</span>
        <span v-if="desc" class="sr-desc">{{ desc }}</span>
      </div>
      <font-awesome-icon :icon="open ? 'chevron-up' : 'chevron-down'" class="sc-chev" />
    </button>
    <div v-show="open" class="sc-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

/** 可折叠设置行：标题行点击展开/收起，子内容放 SettingsRow（子行不限高） */
const props = withDefaults(defineProps<{ label: string; desc?: string; defaultOpen?: boolean }>(), {
  desc: '',
  defaultOpen: true
});
const open = ref(props.defaultOpen);
</script>

<style scoped>
/* 控件组 = 一张卡片，标题行高度与字体族卡一致（72px），展开后子项为子项行高（56px） */
.settings-collapse {
  display: flex;
  flex-direction: column;
  background: var(--app-card);
  border: 1px solid var(--neutral-stroke-rest);
  border-radius: calc(var(--control-corner-radius) * 1px); /* 4px */
  overflow: hidden;
}
.sc-head {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 3); /* 12px */
  width: 100%;
  min-height: calc(var(--design-unit) * 1px * 18); /* 72px */
  padding: calc(var(--design-unit) * 1px * 4.25) calc(var(--design-unit) * 1px * 3); /* 17px 12px */
  border: none;
  background: transparent;
  color: var(--neutral-foreground-rest);
  cursor: pointer;
  text-align: left;
}
.sc-head:hover {
  background: var(--neutral-fill-hover);
}
/* 子项：降级为卡内行（56px + 分隔线），不再各自成卡 */
.sc-body :deep(.settings-row) {
  min-height: calc(var(--design-unit) * 1px * 14); /* 56px */
  padding: calc(var(--design-unit) * 1px * 1.5) calc(var(--design-unit) * 1px * 3); /* 6px 12px */
  background: transparent;
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--neutral-stroke-divider-rest, var(--neutral-stroke-rest));
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
}
.sr-desc {
  font-size: 11px;
  color: var(--neutral-foreground-secondary-rest);
}
.sc-chev {
  font-size: 12px;
  color: var(--neutral-foreground-secondary-rest);
}
.sc-body {
  display: flex;
  flex-direction: column;
}
</style>

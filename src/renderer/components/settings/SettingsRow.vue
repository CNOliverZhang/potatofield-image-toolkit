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
 *
 * 「主项 / 子项」层级用 SettingsCollapse（主项是一张卡，子项是卡内的行），
 * 本组件不再提供 sub 形态 —— 之前用负 margin 把两张卡拼在一起，观感与主项-子项不一致。
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
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium); /* 4px */
}
.settings-row.clickable {
  cursor: pointer;
}
.settings-row.clickable:hover {
  background: var(--colorNeutralBackground1Hover);
}
.sr-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 0.5 * 1px);
}
.sr-label {
  font-size: var(--fontSizeBase200);
  color: var(--colorNeutralForeground1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sr-desc {
  font-size: 11px;
  color: var(--app-fg-secondary);
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

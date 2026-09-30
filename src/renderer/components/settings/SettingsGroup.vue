<template>
  <section class="settings-group">
    <h4 v-if="title" class="sg-title">
      {{ title }}
      <span v-if="count !== undefined" class="sg-count">{{ count }}</span>
    </h4>
    <div class="sg-card">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string; count?: number | string }>(), {
  title: '',
  count: undefined
});
</script>

<style scoped>
/* Windows 设置风格分组：标题 + 一张圆角卡片（与字体管理卡片同一套数值）
   - 组间距 22px（与全局 .group 一致）
   - 卡片圆角 4px、1px 边框、背景 --app-card
   - 行之间用 border-top 分隔（见 SettingsRow） */
.settings-group {
  margin-bottom: calc(var(--design-unit) * 1px * 5.5);
}
.sg-title {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 2);
  margin: 0 0 calc(var(--design-unit) * 1px * 2.5);
  font-size: var(--type-ramp-base-font-size);
  font-weight: 600;
  color: var(--neutral-foreground-rest);
}
/* 数量徽标（导入图片数等） */
.sg-count {
  font-size: var(--type-ramp-minus-1-font-size);
  font-weight: 400;
  color: var(--neutral-foreground-secondary-rest);
  background: var(--neutral-fill-hover);
  border-radius: calc(var(--control-corner-radius) * 1px);
  padding: calc(var(--design-unit) * 1px * 0.5) calc(var(--design-unit) * 1px * 2);
}
/* 组内是「卡片列表」：每个设置项/控件组各自是一张卡，卡间距 4px（与字体管理字体族卡一致） */
.sg-card {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1px); /* 4px */
}
</style>

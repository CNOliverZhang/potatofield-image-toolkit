<template>
  <div class="settings-collapse">
    <!-- 头部 = 主项：左侧 label/desc（点击展开收起），右侧 control 插槽（可选），最右 chevron。
         control 单独放一个容器并阻止冒泡，避免点控件时误触发折叠 -->
    <div class="sc-head">
      <!-- 带控件的主项不可折叠（也不显示 chevron）：控件本身就是主要操作，收起会挡住设置入口 -->
      <component :is="collapsible ? 'button' : 'div'" class="sc-toggle" @click="toggle">
        <div class="sr-main">
          <span class="sr-label">{{ label }}</span>
          <span v-if="desc" class="sr-desc">{{ desc }}</span>
        </div>
      </component>
      <div v-if="$slots.control" class="sc-control" @click.stop>
        <slot name="control" />
      </div>
      <button v-if="collapsible" class="sc-chev-btn" type="button" :aria-label="open ? '收起' : '展开'" @click="toggle">
        <font-awesome-icon :icon="open ? 'chevron-up' : 'chevron-down'" class="sc-chev" />
      </button>
    </div>
    <div v-show="isOpen" class="sc-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue';

/**
 * 可折叠设置行（主项 + 子项）：与水印工具的「位置基准」同款。
 * - 头部是主项：可带 desc，可通过 #control 插槽放控件（select / 按钮 / 开关等）
 * - 子项放默认插槽，用 SettingsRow 即可（自动降级为卡内行：56px + hairline 分隔）
 * - **带 #control 的主项恒展开、不显示 chevron**：控件本身就是主要操作，
 *   允许收起会把格式/类型这类关键设置藏起来；不带控件的纯分组（如「裁剪位置」「位置基准」）仍可折叠
 */
const props = withDefaults(defineProps<{ label: string; desc?: string; defaultOpen?: boolean }>(), {
  desc: '',
  defaultOpen: true
});

const slots = useSlots();
/** 是否有主项控件 */
const hasControl = computed(() => !!slots.control);
/** 只有无控件的主项才可折叠 */
const collapsible = computed(() => !hasControl.value);
const open = ref(props.defaultOpen);
const isOpen = computed(() => (collapsible.value ? open.value : true));

function toggle() {
  if (collapsible.value) open.value = !open.value;
}
</script>

<style scoped>
/* 控件组 = 一张卡片，标题行高度与字体族卡一致（72px），展开后子项为子项行高（56px） */
.settings-collapse {
  display: flex;
  flex-direction: column;
  background: var(--app-card);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium); /* 4px */
  overflow: hidden;
}
.sc-head {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 3); /* 12px */
  width: 100%;
  min-height: calc(var(--design-unit) * 1px * 18); /* 72px */
  padding: calc(var(--design-unit) * 1px * 4.25) calc(var(--design-unit) * 1px * 3); /* 17px 12px */
}
.sc-toggle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--colorNeutralForeground1);
  padding: 0;
  text-align: left;
}
/* 只有可折叠（无控件）的主项才是按钮：可点、有 hover 反馈 */
button.sc-toggle {
  cursor: pointer;
}
.sc-head:has(button.sc-toggle):hover {
  background: var(--colorNeutralBackground1Hover);
}
/* 主项控件：与 SettingsRow 的控件区同一套约束 */
.sc-control {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 62%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: calc(var(--design-unit) * 1px * 2);
}
.sc-chev-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--app-fg-secondary);
  cursor: pointer;
  padding: calc(var(--design-unit) * 1px) calc(var(--design-unit) * 0.5 * 1px);
  display: flex;
  align-items: center;
}
/* 子项：降级为卡内行（56px + 分隔线），不再各自成卡 */
.sc-body :deep(.settings-row) {
  min-height: calc(var(--design-unit) * 1px * 14); /* 56px */
  padding: calc(var(--design-unit) * 1px * 1.5) calc(var(--design-unit) * 1px * 3); /* 6px 12px */
  background: transparent;
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--colorNeutralStroke2);
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
}
.sr-desc {
  font-size: 11px;
  color: var(--app-fg-secondary);
}
.sc-chev {
  font-size: 12px;
  color: var(--app-fg-secondary);
}
.sc-body {
  display: flex;
  flex-direction: column;
}
</style>

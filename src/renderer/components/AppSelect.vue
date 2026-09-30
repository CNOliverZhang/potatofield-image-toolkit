<script setup lang="ts">
/**
 * fluent-dropdown 的受控封装（替代 Fluent v2 的 fluent-select）。
 *
 * v3 与 v2 的两个结构性差异，都在这里适配：
 *  1. v3 的 dropdown 内部必须包一层 <fluent-listbox>（v2 的 select 把 option 直接作为子元素）；
 *  2. dropdown.value setter 依赖「已连接」的 options，Vue 挂载时属性先于子元素就绪，
 *     直接写 :value 初始渲染会丢失 —— 这里延后用 property 赋值并带重试兜底。
 *
 * 用法与 v2 的 fluent-select 一致：
 *   <app-select class="ctl-md" :value="x" @change="x = evVal($event)">
 *     <fluent-option value="a">A</fluent-option>
 *   </app-select>
 */
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{ value?: string }>();
const emit = defineEmits<{ (e: 'change', ev: Event): void }>();

const el = ref<{ value?: string } | null>(null);

watch(
  () => props.value,
  async () => {
    await nextTick();
    const dd = el.value;
    if (!dd) return;
    // listbox/options 就绪前赋值会被静默忽略（selectOption 空转），用 rAF 重试直到生效
    const trySet = (attempt = 0) => {
      dd.value = props.value;
      if (dd.value !== props.value && attempt < 20) {
        requestAnimationFrame(() => trySet(attempt + 1));
      }
    };
    trySet();
  },
  { immediate: true }
);
</script>

<template>
  <fluent-dropdown ref="el" @change="emit('change', $event)">
    <fluent-listbox>
      <slot />
    </fluent-listbox>
  </fluent-dropdown>
</template>

<style scoped>
/* v3 的焦点环挂在 :focus-within 上（鼠标选择后也触发），外圈是纯黑描边，
   v2 没有这个效果 —— 通过覆盖组件消费的焦点色令牌去掉；
   展开时的主题色下划线（control::after）保留作为焦点指示 */
fluent-dropdown {
  --colorStrokeFocus1: transparent;
  --colorStrokeFocus2: transparent;
}
/* v3 展开时把 listbox 变为 position:fixed 但 z-index 为 auto，
   DOM 靠后的任何定位元素（后面的卡片/按钮）都会画在弹层上面；
   这里抬高弹层层级（v2 时代的 popup 行为） */
fluent-listbox {
  z-index: 1000;
}
</style>

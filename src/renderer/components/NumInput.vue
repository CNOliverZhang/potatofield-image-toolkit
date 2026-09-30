<script setup lang="ts">
/**
 * 数字输入框（替代 Fluent v2 的 fluent-number-field，v3 已无该组件）。
 * 用原生 <input type="number"> 保证步进按钮与数字键盘行为，
 * 外观对齐 fluent-text-input；使用方式与原 number-field 一致：
 *   <num-input class="ctl-num" :value="x" :min :max :step @input="x = evNum($event)">
 *     <span slot="end">px</span>
 *   </num-input>
 * 除 class 外的所有属性（value/min/max/step/disabled 等）与事件监听
 * 通过 $attrs 透传到内部 input；默认插槽渲染为框内右侧后缀。
 */
defineOptions({ inheritAttrs: false });
</script>

<template>
  <span class="num-input-wrap">
    <input type="number" v-bind="$attrs" />
    <slot />
  </span>
</template>

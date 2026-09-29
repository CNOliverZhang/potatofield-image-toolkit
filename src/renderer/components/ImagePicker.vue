<template>
  <!-- 统一的图片选择/预览区：未选图时占位、选图后在同一个框内预览并带「重新选择」。
       样式复用 global.css 的 .preview-pane / .dropzone / .preview-stage / .preview-bar -->
  <section class="preview-pane">
    <div v-if="!src" class="dropzone" @click="emit('pick')">
      <font-awesome-icon icon="image" class="dz-icon" />
      <p>{{ hint }}</p>
      <fluent-button appearance="accent" @click.stop="emit('pick')">选择图片</fluent-button>
    </div>
    <template v-else>
      <div class="preview-stage">
        <img :src="src" class="preview-img" alt="预览" @load="onLoad" />
      </div>
      <div class="preview-bar">
        <span class="fname">{{ name }}</span>
        <fluent-button appearance="neutral" @click="emit('pick')">重新选择</fluent-button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  /** 预览图地址（为空则显示占位框） */
  src?: string;
  /** 底部显示的文件名 */
  name?: string;
  /** 占位提示文案 */
  hint?: string;
}>();

const emit = defineEmits<{
  pick: [];
  /** 图片加载完成，回传 img 元素（供色彩提取等需要直接读像素的场景使用） */
  load: [HTMLImageElement];
}>();

function onLoad(e: Event) {
  emit('load', e.target as HTMLImageElement);
}
</script>

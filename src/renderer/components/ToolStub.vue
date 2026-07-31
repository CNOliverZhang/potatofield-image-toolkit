<template>
  <div class="stub">
    <font-awesome-icon icon="hammer" class="icon" />
    <h2>{{ name }}</h2>
    <p>该工具将在后续会话中实现（参照 PLANNING.md 分阶段计划）。</p>
    <p class="hint">基础能力（文件选择、目录扫描、图像主进程处理、主题/持久化）已就绪，可作为实现模板。</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<style scoped>
.stub {
  text-align: center;
  padding: calc(var(--design-unit) * 15 * 1px) calc(var(--design-unit) * 5 * 1px);
  color: var(--neutral-foreground-secondary-rest);
}
.icon {
  font-size: 40px;
  color: var(--accent-base-color);
  margin-bottom: calc(var(--design-unit) * 3 * 1px);
}
.hint {
  font-size: 12px;
  max-width: 420px;
  margin: calc(var(--design-unit) * 3 * 1px) auto 0;
}
</style>

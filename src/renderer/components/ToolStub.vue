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
  padding: 60px 20px;
  color: var(--text-secondary);
}
.icon {
  font-size: 40px;
  color: var(--main-color);
  margin-bottom: 12px;
}
.hint {
  font-size: 12px;
  max-width: 420px;
  margin: 12px auto 0;
}
</style>

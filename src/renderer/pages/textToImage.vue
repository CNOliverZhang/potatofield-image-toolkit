<template>
  <div class="rte-page">
    <font-awesome-icon icon="paragraph" class="icon" />
    <h2>洋芋田富文本编辑器</h2>
    <p>「文字转图片」已独立为「洋芋田富文本编辑器」，请前往网页版继续使用。</p>
    <fluent-button appearance="accent" @click="openSite"
      >打开富文本编辑器</fluent-button
    >
    <p class="hint">将在默认浏览器中打开 {{ SITE_URL }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useDialog } from "@renderer/composables/useDialog";

const SITE_URL = "https://potatofield.cn/richtexteditor";
const { confirm, message } = useDialog();

async function openSite(): Promise<void> {
  try {
    await window.api.shell.openExternal(SITE_URL);
  } catch {
    message("打开浏览器失败，请手动访问：" + SITE_URL, "error");
  }
}

onMounted(async () => {
  const ok = await confirm(
    "「文字转图片」已独立为「洋芋田富文本编辑器」，是否前往官网打开？",
    "工具已独立",
  );
  if (ok) await openSite();
});
</script>

<style scoped>
.rte-page {
  /* 撑满内容区并垂直居中（内容区由 .content 提供确定高度与内边距） */
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: calc(var(--design-unit) * 5 * 1px);
  color: var(--neutral-foreground-secondary-rest);
}
.icon {
  font-size: 40px;
  color: var(--accent-base-color);
  margin-bottom: calc(var(--design-unit) * 3 * 1px);
}
h2 {
  margin: 0 0 calc(var(--design-unit) * 2 * 1px);
  font-size: var(--type-ramp-plus-1-font-size);
  color: var(--neutral-foreground-rest);
}
p {
  margin: 0 0 calc(var(--design-unit) * 3 * 1px);
  font-size: var(--type-ramp-minus-1-font-size);
}
.hint {
  margin-top: calc(var(--design-unit) * 3 * 1px);
  font-size: 12px;
}
</style>

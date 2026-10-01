<template>
  <div class="home">
    <section v-for="group in groups" :key="group.name" class="group">
      <div class="group-head">
        <span class="group-bar"></span>
        <h2 class="group-title">{{ group.name }}</h2>
        <span class="group-count">{{ group.items.length }}</span>
      </div>

      <div class="grid">
        <div
          v-for="tool in group.items"
          :key="tool.path"
          class="card"
          @click="go(tool.path)"
        >
          <div class="card-head">
            <span class="card-icon">
              <font-awesome-icon :icon="['fas', tool.icon]" />
            </span>
            <span class="card-title">{{ tool.label }}</span>
          </div>
          <div class="card-desc">{{ tool.desc }}</div>
          <div v-if="tool.batchRoute || tool.templateRoute" class="card-foot">
            <fluent-button
              v-if="tool.batchRoute"
              appearance="primary"
              size="small"
              shape="circular"
              class="card-batch"
              @click.stop="goBatch(tool)"
            >
              批量处理
            </fluent-button>
            <fluent-button
              v-if="tool.templateRoute"
              appearance="primary"
              size="small"
              shape="circular"
              class="card-batch"
              @click.stop="goTemplates(tool)"
            >
              模板管理
            </fluent-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { tools, toolGroups, type ToolEntry } from "@renderer/consts/tools";

const router = useRouter();

const groups = computed(() =>
  toolGroups
    .map((name) => ({
      name,
      items: tools.filter((tool) => tool.group === name),
    }))
    .filter((group) => group.items.length > 0),
);

function go(path: string) {
  router.push(path);
}

function goTemplates(tool: ToolEntry) {
  if (!tool.templateRoute) return;
  window.api.window.open({
    route: tool.templateRoute,
    key: tool.templateRoute
  });
}

function goBatch(tool: ToolEntry) {
  if (!tool.batchRoute) return;
  window.api.window.open({
    route: tool.batchRoute,
    key: "batch" + tool.path.replace(/\//g, "-"),
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
  });
}
</script>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
}

/* ── 分组 ── */
.group {
  margin-bottom: calc(var(--design-unit) * 4 * 1px);
}
.group:last-child {
  margin-bottom: 0;
}
.group-head {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1.5 * 1px);
  margin-bottom: calc(var(--design-unit) * 2 * 1px);
}
/* 左侧细条与侧边栏选中态的指示条同款，保持视觉语言一致 */
.group-bar {
  width: 3px;
  height: 14px;
  border-radius: calc(var(--design-unit) * 0.75 * 1px);
  background: var(--accent-base-color);
}
.group-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--app-fg-secondary);
}
.group-count {
  font-size: 12px;
  color: var(--app-fg-secondary);
  opacity: 0.7;
}

/* ── 工具卡片（图标与名称同行，整体紧凑）── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: calc(var(--design-unit) * 1.5 * 1px);
}
.card {
  display: flex;
  flex-direction: column;
  /* 定高：没有批量按钮的卡片不会塌陷，整行卡片高度一致 */
  height: 120px;
  overflow: hidden;
  background: var(--app-card);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: calc(var(--borderRadiusXLarge) + var(--design-unit) * 1px / 2);
  padding: calc(var(--design-unit) * 2 * 1px)
    calc(var(--design-unit) * 2.5 * 1px);
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}
.card:hover {
  transform: translateY(-1px);
  border-color: color-mix(
    in srgb,
    var(--accent-base-color) 55%,
    var(--colorNeutralStroke1)
  );
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.09);
}
.card-head {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1.5 * 1px);
}
/* 图标放进强调色圆角底块，比裸图标更有「应用磁贴」的层次 */
.card-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(var(--borderRadiusMedium) + var(--design-unit) * 1px);
  background: color-mix(in srgb, var(--accent-base-color) 12%, transparent);
  color: var(--accent-base-color);
  font-size: 14px;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card-desc {
  margin: calc(var(--design-unit) * 4 * 1px) 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--app-fg-secondary);
  /* 描述最多两行，避免个别卡片被撑高导致整行参差 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 按钮贴底，卡片内上方留白由高度与描述间距决定，不会显得窒息 */
.card-foot {
  margin-top: auto;
  display: flex;
  /* Fluent 的水平间距令牌（小），保证两个入口之间有稳定间隙 */
  gap: var(--spacingHorizontalS, 8px);
}
.card-batch {
  align-self: flex-start;
  min-width: auto;
  font-size: var(--fontSizeBase200);
}
</style>

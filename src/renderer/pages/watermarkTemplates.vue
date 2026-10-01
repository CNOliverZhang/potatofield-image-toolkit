<template>
  <div class="tpl-page">
    <header class="tpl-head">
      <h1>水印模板</h1>
      <span v-if="items.length" class="tpl-count">{{ items.length }} 个</span>
      <fluent-button class="tpl-new" appearance="primary" size="small" @click="openEditor()">
        <font-awesome-icon icon="plus" /> 新建模板
      </fluent-button>
    </header>

    <p v-if="!items.length" class="tpl-empty">
      还没有水印模板。点「新建模板」从空白开始，或在水印工具中调好参数后点「存为模板」。
    </p>

    <ul v-else class="tpl-list">
      <li v-for="item in items" :key="item.id" class="tpl-item">
        <img v-if="thumb(item)" class="tpl-thumb" :src="thumb(item)" alt="" />
        <div class="tpl-main">
          <div class="tpl-title">
            {{ item.name }}
            <span v-if="item.legacy" class="tpl-tag">旧版</span>
          </div>
          <div class="tpl-summary">{{ describe(item) }}</div>
        </div>
        <div class="tpl-actions">
          <fluent-button appearance="primary" size="small" @click="apply(item)">应用</fluent-button>
          <fluent-button size="small" @click="openEditor(item)">编辑</fluent-button>
          <fluent-button size="small" @click="rename(item)">重命名</fluent-button>
          <fluent-button size="small" @click="remove(item)">删除</fluent-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@renderer/stores/settings';
import { useDialog } from '@renderer/composables/useDialog';
import type { TemplateItem, WatermarkParams } from '@shared/types';

const settings = useSettingsStore();
const router = useRouter();
const { alert, confirm, message, prompt } = useDialog();

const items = computed(() => settings.templates.watermark ?? []);
const thumbs = ref<Record<string, string>>({});

/** 图片水印的缩略图：按需解析素材路径 */
function thumb(item: TemplateItem): string {
  const p = item.params as Partial<WatermarkParams>;
  return p.type === 'image' && p.watermarkPath ? thumbs.value[p.watermarkPath] ?? '' : '';
}

/** 位置短名 */
const GRAVITY_TEXT: Record<string, string> = {
  nw: '左上', n: '上', ne: '右上',
  w: '左', center: '居中', e: '右',
  sw: '左下', s: '下', se: '右下'
};

/** 卡片摘要：类型 · 位置 · 大小 · 不透明度（+ 文字水印的字体） */
function describe(item: TemplateItem): string {
  const p = item.params as Partial<WatermarkParams>;
  const parts: string[] = [p.type === 'image' ? '图片' : '文字'];
  parts.push(GRAVITY_TEXT[p.gravity ?? 'se'] ?? '右下');
  parts.push(p.type === 'image' ? `大小 ${Math.round((p.scale ?? 0) * 100)}%` : `宽度 ${Math.round(p.sizePct ?? 0)}%`);
  parts.push(`不透明度 ${Math.round((p.opacity ?? 1) * 100)}%`);
  if (p.type !== 'image' && p.fontFamily) parts.push(p.fontFamily);
  return parts.join(' · ');
}

/** 应用：载入到水印工具并停留在该页 */
function apply(item: TemplateItem): void {
  // 必须传纯对象：Pinia 的响应式 Proxy 无法被 IPC 结构化克隆（会报 could not be cloned）
  void window.api.template.apply({
    params: JSON.parse(JSON.stringify(item.params)) as Record<string, unknown>,
    templateId: item.id
  });
  message('已在水印工具中应用该模板', 'success');
}

/**
 * 编辑 / 新建：开独立编辑窗口。
 * 参数暂存在主进程（跨窗口共享 localStorage 有同步延迟，会丢数据），
 * 窗口 key 带模板 id，避免复用已打开窗口时把新参数丢掉。
 */
async function openEditor(item?: TemplateItem): Promise<void> {
  await window.api.template.setEditing({
    tool: 'watermark',
    id: item?.id ?? '',
    name: item?.name ?? '',
    params: item ? (JSON.parse(JSON.stringify(item.params)) as Record<string, unknown>) : null
  });
  window.api.window.open({
    route: '/watermark/templates/edit',
    key: `watermark-template-editor-${item?.id ?? 'new'}`,
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620
  });
}

async function rename(item: TemplateItem): Promise<void> {
  // Electron 下 window.prompt 不可用，统一走自绘输入对话框
  const name = await prompt('输入新的模板名称', '重命名模板', item.name);
  if (name === null) return;
  if (!name.trim()) {
    message('模板名称不能为空', 'warning');
    return;
  }
  await settings.updateTemplate('watermark', item.id, { name: name.trim() });
}

async function remove(item: TemplateItem): Promise<void> {
  const ok = await confirm(`确定删除模板「${item.name}」吗？删除后不可恢复。`, '删除模板');
  if (!ok) return;
  const p = item.params as Partial<WatermarkParams>;
  await settings.removeTemplate('watermark', item.id);
  // 素材清理：没有其它模板引用同一张图时才删
  if (p.type === 'image' && p.watermarkPath) {
    const stillUsed = (settings.templates.watermark ?? []).some(
      (t) => (t.params as Partial<WatermarkParams>).watermarkPath === p.watermarkPath
    );
    if (!stillUsed) await window.api.template.removeAsset(p.watermarkPath);
  }
}

/**
 * 图片水印缩略图：素材文件名 → 绝对路径，再由主进程缩放成 96px 转 blob URL。
 * 不用 file:// 直读：渲染进程加载 file 子资源会被拦（表现为裂图），
 * 且大图在列表里整张解码也不划算 —— 与拼图列表的缩略图做法保持一致。
 */
async function loadThumbs(): Promise<void> {
  for (const item of items.value) {
    const p = item.params as Partial<WatermarkParams>;
    if (p.type !== 'image' || !p.watermarkPath || thumbs.value[p.watermarkPath]) continue;
    const full = await window.api.template.resolveAsset(p.watermarkPath);
    if (!full) continue;
    try {
      const res = await window.api.image.process({
        op: 'resize',
        inputPath: full,
        options: { width: 96, fit: 'inside' }
      });
      if (res.buffer) {
        thumbs.value[p.watermarkPath] = URL.createObjectURL(
          new Blob([res.buffer], { type: 'image/png' })
        );
      }
    } catch {
      /* 缩略图失败不影响列表与模板使用 */
    }
  }
}

onMounted(async () => {
  // 模板库由主进程持有，先拉一次
  await settings.loadTemplates();
  // 首次运行：导入旧版本（3.x）模板
  if (!settings.legacyImported) {
    const legacy = await window.api.template.importLegacy();
    for (const item of legacy) {
      await settings.addTemplate('watermark', item.name, item.params, true);
    }
    await settings.markLegacyImported();
    if (legacy.length) await alert(`已从旧版本导入 ${legacy.length} 个水印模板。`, '导入完成');
  }
  await loadThumbs();
});

// 编辑窗口保存后模板库经广播更新，缩略图需要跟着补
watch(items, () => void loadThumbs());

onBeforeUnmount(() => {
  for (const url of Object.values(thumbs.value)) URL.revokeObjectURL(url);
});
</script>

<style scoped>
.tpl-page {
  max-width: 760px;
}
.tpl-head {
  display: flex;
  align-items: baseline;
  gap: calc(var(--design-unit) * 2 * 1px);
  margin-bottom: calc(var(--design-unit) * 4 * 1px);
}
.tpl-head h1 {
  margin: 0;
  font-size: var(--fontSizeBase500);
  font-weight: 600;
}
.tpl-count,
.tpl-summary {
  color: var(--app-fg-secondary);
  font-size: var(--fontSizeBase200);
}
.tpl-new {
  margin-left: auto;
  align-self: center;
}
.tpl-empty {
  color: var(--app-fg-secondary);
  line-height: 1.7;
}
.tpl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 2 * 1px);
}
.tpl-item {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 3 * 1px);
  padding: calc(var(--design-unit) * 3 * 1px);
  background: var(--app-card);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
}
.tpl-thumb {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}
.tpl-main {
  flex: 1;
  min-width: 0;
}
.tpl-title {
  font-weight: 500;
  margin-bottom: calc(var(--design-unit) * 0.5 * 1px);
}
.tpl-tag {
  margin-left: calc(var(--design-unit) * 1px);
  padding: 0 calc(var(--design-unit) * 1.5 * 1px);
  border-radius: var(--borderRadiusSmall);
  background: var(--colorNeutralBackground1Hover);
  color: var(--app-fg-secondary);
  font-size: var(--fontSizeBase100);
}
.tpl-actions {
  display: flex;
  gap: calc(var(--design-unit) * 1px);
  flex-shrink: 0;
}
</style>

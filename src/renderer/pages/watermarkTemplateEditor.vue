<template>
  <TemplateEditor
    v-model:name="name"
    :preview-url="previewUrl"
    preview-tip="预览生成中…"
    preview-hint="示例图预览 · 仅用于查看水印的位置与大小"
    :saving="saving"
    @save="save"
    @save-as="saveAs"
    @cancel="cancel"
  >
    <!-- 参数控件：直接复用水印工具的参数面板 -->
    <template #controls>
      <WatermarkControls v-model="params" />
    </template>
  </TemplateEditor>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { WatermarkParams } from '@shared/types';
import { useDialog } from '@renderer/composables/useDialog';
import { useSettingsStore } from '@renderer/stores/settings';
import { defaultWatermarkParams } from '@renderer/consts/watermarkDefaults';
import TemplateEditor from '@renderer/components/template/TemplateEditor.vue';
import WatermarkControls from '@renderer/components/WatermarkControls.vue';

/**
 * 水印模板编辑窗口（独立窗口）。
 *
 * 页面本身只负责水印特有的部分：预览渲染、素材持久化、保存逻辑；
 * 布局与三个底部按钮由通用组件 TemplateEditor 提供。
 */
const settings = useSettingsStore();
const { message, prompt } = useDialog();

const params = reactive<WatermarkParams>(defaultWatermarkParams());
const name = ref('新模板');
/** 编辑已有模板时的 id；为空表示新建 */
const editingId = ref('');
const saving = ref(false);
const previewUrl = ref('');
const placeholder = ref('');

let previewTimer: number | undefined;

function clearPreview(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
}

/**
 * 水印图片路径 → 可直接读取的绝对路径。
 * 模板里存的是素材文件名（userData/template-assets 下），需要解析；
 * 用户在编辑时新选的图是原始路径，直接可用。
 */
async function resolveWatermarkPath(p: string): Promise<string | null> {
  if (!p) return null;
  if (/[\\/]/.test(p)) return p;
  return await window.api.template.resolveAsset(p);
}

async function updatePreview(): Promise<void> {
  if (!placeholder.value) return;
  if (params.type === 'image' && !params.watermarkPath) {
    clearPreview();
    return;
  }
  const extra = { ...params } as unknown as Record<string, unknown>;
  if (params.type === 'image') {
    const full = await resolveWatermarkPath(params.watermarkPath);
    if (!full) {
      clearPreview();
      message('水印图片素材已丢失，请重新选择', 'warning');
      return;
    }
    extra.watermarkPath = full;
  }
  try {
    const res = await window.api.image.process({
      op: 'watermark',
      inputPath: placeholder.value,
      extra
    });
    if (!res.buffer) return;
    const blob = new Blob([res.buffer], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    clearPreview();
    previewUrl.value = url;
  } catch (err) {
    message('预览失败：' + (err as Error).message, 'error');
  }
}

function schedulePreview(): void {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => void updatePreview(), 220);
}

/**
 * 生成要存进模板的参数：图片水印先把水印图存为素材（内容 hash 命名 + 复用），
 * 模板只记文件名，避免用户移动/删除原图后模板失效。
 */
async function buildStoredParams(): Promise<WatermarkParams | null> {
  // 去掉响应式代理，保证存储与广播都是纯对象
  const plain = JSON.parse(JSON.stringify(params)) as WatermarkParams;
  if (plain.type !== 'image' || !plain.watermarkPath) return plain;
  const full = await resolveWatermarkPath(plain.watermarkPath);
  if (!full) {
    message('水印图片素材已丢失，请重新选择水印图片', 'warning');
    return null;
  }
  const saved = await window.api.template.saveAsset(full);
  if (!saved) {
    message('水印图片保存失败，请重新选择水印图片', 'error');
    return null;
  }
  plain.watermarkPath = saved.fileName;
  return plain;
}

async function save(): Promise<void> {
  const title = name.value.trim();
  if (!title) {
    message('请填写模板名称', 'warning');
    return;
  }
  saving.value = true;
  try {
    const stored = await buildStoredParams();
    if (!stored) return;
    if (editingId.value) {
      await settings.updateTemplate('watermark', editingId.value, { name: title, params: stored });
    } else {
      const item = await settings.addTemplate('watermark', title, stored);
      if (item) editingId.value = item.id;
    }
    message(`已保存模板「${title}」`, 'success');
    window.api.window.close();
  } finally {
    saving.value = false;
  }
}

/** 另存为新模板：保存后窗口不关闭，继续编辑新模板 */
async function saveAs(): Promise<void> {
  const input = await prompt('为新模板输入名称', '另存模板', `${name.value} 副本`);
  if (input === null) return;
  const title = input.trim() || `${name.value} 副本`;
  saving.value = true;
  try {
    const stored = await buildStoredParams();
    if (!stored) return;
    const item = await settings.addTemplate('watermark', title, stored);
    if (item) editingId.value = item.id;
    name.value = title;
    message(`已另存为「${title}」`, 'success');
  } finally {
    saving.value = false;
  }
}

function cancel(): void {
  window.api.window.close();
}

onMounted(async () => {
  // 与列表页的约定：参数暂存在主进程（跨窗口共享 localStorage 有延迟，会丢数据）
  const payload = await window.api.template.takeEditing();
  if (payload?.params) Object.assign(params, payload.params as Partial<WatermarkParams>);
  editingId.value = payload?.id ?? '';
  name.value = payload?.name ?? '新模板';

  try {
    placeholder.value = await window.api.template.placeholder();
    await updatePreview();
  } catch (err) {
    message('预览初始化失败：' + (err as Error).message, 'error');
  }
});

watch(params, schedulePreview, { deep: true });

onBeforeUnmount(() => {
  clearPreview();
  if (previewTimer) window.clearTimeout(previewTimer);
});
</script>

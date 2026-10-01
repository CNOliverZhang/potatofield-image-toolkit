<template>
  <div class="tpl-editor">
    <!-- 左侧：模板效果预览（由使用方提供渲染结果，通常基于中性占位图，不依赖用户图片） -->
    <section class="preview-pane">
      <div class="preview-stage">
        <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="模板预览" />
        <span v-else class="preview-tip">{{ previewTip || '预览生成中…' }}</span>
      </div>
      <div class="preview-bar">
        <span class="fname">{{ previewHint }}</span>
      </div>
    </section>

    <!-- 右侧：模板名称 + 使用方的参数控件 + 三个底部按钮 -->
    <aside class="controls-pane">
      <div class="controls-body">
        <SettingsGroup title="模板">
          <SettingsRow label="模板名称">
            <fluent-text-input
              class="ctl-lg"
              :value="name"
              placeholder="给模板起个名字"
              @input="onName"
            ></fluent-text-input>
          </SettingsRow>
        </SettingsGroup>

        <slot name="controls" />

      </div>
      <div class="controls-footer">
        <div class="foot-btns">
          <fluent-button
            appearance="primary"
            class="foot-main"
            :disabled="saving || !canSave"
            @click="emit('save')"
          >
            {{ saving ? '保存中…' : '保存模板' }}
          </fluent-button>
          <fluent-button appearance="neutral" :disabled="saving" @click="emit('save-as')">
            另存模板
          </fluent-button>
          <fluent-button appearance="neutral" :disabled="saving" @click="emit('cancel')">
            取消
          </fluent-button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
/**
 * 通用模板编辑页（独立窗口形态）。
 *
 * 抽出来的原因：以后其它工具（长图拼接等）也会有自己的模板，布局完全一致 ——
 * 左侧预览、右侧参数控件、底部「保存 / 另存 / 取消」。
 * 使用方只需提供：预览渲染结果（previewUrl）、参数控件（#controls 插槽）、保存逻辑。
 */
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';

withDefaults(
  defineProps<{
    name: string;
    /** 预览图 blob URL；为空时显示 previewTip */
    previewUrl?: string;
    /** 无预览时的占位文案 */
    previewTip?: string;
    /** 预览区底部说明 */
    previewHint?: string;
    saving?: boolean;
    /** 保存按钮是否可用（如必填项未填） */
    canSave?: boolean;
  }>(),
  {
    previewUrl: '',
    previewTip: '',
    previewHint: '',
    saving: false,
    canSave: true
  }
);

const emit = defineEmits<{
  'update:name': [value: string];
  save: [];
  'save-as': [];
  cancel: [];
}>();

function onName(e: Event): void {
  emit('update:name', (e.target as HTMLInputElement).value);
}
</script>

<style scoped>
/* 左右两栏固定：不给负边距，也不让子元素顶出容器，避免出现横向滚动 */
.tpl-editor {
  display: flex;
  gap: calc(var(--design-unit) * 1px * 6);
  height: 100%;
  min-height: 0;
}
.preview-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--colorNeutralBackground1Hover);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge);
  overflow: hidden;
}
.preview-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--design-unit) * 1px);
  background-color: var(--colorNeutralBackground1);
  background-image: linear-gradient(45deg, var(--colorNeutralBackground3) 25%, transparent 25%),
    linear-gradient(-45deg, var(--colorNeutralBackground3) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--colorNeutralBackground3) 75%),
    linear-gradient(-45deg, transparent 75%, var(--colorNeutralBackground3) 75%);
  background-size: calc(var(--design-unit) * 1px * 5) calc(var(--design-unit) * 1px * 5);
  background-position: 0 0, 0 calc(var(--design-unit) * 1px * 2.5),
    calc(var(--design-unit) * 1px * 2.5) calc(var(--design-unit) * 1px * -2.5),
    calc(var(--design-unit) * 1px * -2.5) 0;
}
.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 calc(var(--design-unit) * 1px * 0.5) calc(var(--design-unit) * 1px * 3) rgba(0, 0, 0, 0.18);
}
.preview-tip {
  color: var(--app-fg-secondary);
  font-size: var(--fontSizeBase200);
}
.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--design-unit) * 1px * 3);
  padding: calc(var(--design-unit) * 1px * 2.5) calc(var(--design-unit) * 1px * 3.5);
  border-top: 1px solid var(--colorNeutralStroke1);
  background: var(--colorNeutralBackground2);
}
.fname {
  font-size: var(--fontSizeBase200);
  color: var(--app-fg-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.controls-pane {
  width: 340px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.controls-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
/* footer 已移出滚动区（.controls-pane 的固定子项），样式统一走 global.css */
.foot-btns {
  display: flex;
  gap: calc(var(--design-unit) * 1px * 2);
}
.foot-main {
  flex: 1;
}
</style>

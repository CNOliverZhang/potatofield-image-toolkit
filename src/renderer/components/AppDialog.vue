<template>
  <fluent-dialog :hidden="!ui.dialog.visible" modal class="app-dialog">
    <div class="dlg">
      <h3 v-if="ui.dialog.title" class="dlg-title">{{ ui.dialog.title }}</h3>
      <p class="dlg-msg">{{ ui.dialog.message }}</p>
      <!-- 输入型：Electron 下 window.prompt 不可用，统一走自绘对话框 -->
      <fluent-text-input
        v-if="ui.dialog.type === 'prompt'"
        ref="inputEl"
        class="dlg-input"
        :value="inputValue"
        :placeholder="ui.dialog.input?.placeholder ?? ''"
        @input="inputValue = ($event.target as HTMLInputElement).value"
        @keydown.enter="submitInput()"
      ></fluent-text-input>
      <div class="dlg-actions">
        <!-- 多选一：按传入动作渲染 -->
        <template v-if="ui.dialog.type === 'choose'">
          <fluent-button
            v-for="a in ui.dialog.actions ?? []"
            :key="a.value"
            :appearance="a.appearance ?? 'neutral'"
            @click="closeDialog(a.value)"
          >
            {{ a.label }}
          </fluent-button>
        </template>
        <template v-else>
          <fluent-button
            v-if="ui.dialog.type === 'confirm' || ui.dialog.type === 'prompt'"
            appearance="neutral"
            @click="closeDialog(null)"
          >
            取消
          </fluent-button>
          <fluent-button v-if="ui.dialog.type === 'prompt'" appearance="primary" @click="submitInput()">
            确定
          </fluent-button>
          <fluent-button
            v-if="ui.dialog.type !== 'prompt'"
            appearance="primary"
            @click="closeDialog(true)"
          >
            确定
          </fluent-button>
        </template>
      </div>
    </div>
  </fluent-dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { ui, closeDialog } from '@renderer/composables/ui';

/** prompt 的输入值：每次打开时按传入初值重置 */
const inputValue = ref('');
const inputEl = ref<HTMLElement | null>(null);

watch(
  () => ui.dialog.visible,
  async (visible) => {
    if (!visible) return;
    inputValue.value = ui.dialog.input?.value ?? '';
    await nextTick();
    // 焦点落到输入框并全选，方便直接覆盖重命名；延后一帧等 dialog 完成显示
    window.setTimeout(() => {
      const el = inputEl.value as (HTMLElement & { select?: () => void }) | null;
      el?.focus();
      el?.select?.();
    }, 30);
  }
);

/** 确定：回传输入值（去空格后为空时仍回传空串，由调用方决定是否提示） */
function submitInput(): void {
  closeDialog(inputValue.value.trim());
}
</script>

<style scoped>
/*
 * fluent-dialog 未注册（见 fluent.ts：define-all 会把它一起注册，这里保持「未注册标签 + 自绘样式」）。
 * 未注册标签按普通元素渲染，会落进文档流、被排到页面末尾并把页面顶上去 ——
 * 因此这里自己实现遮罩层：固定定位铺满视口 + 居中卡片。
 * 注意：作者样式的 display 会盖掉 UA 的 [hidden]{display:none}（.app-dialog 的 flex），
 * 所以必须显式写一条 [hidden] 规则，否则对话框永远可见。
 */
.app-dialog {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--design-unit) * 6 * 1px);
  background: rgba(0, 0, 0, 0.32);
}
.app-dialog[hidden] {
  display: none;
}
.dlg {
  min-width: 320px;
  max-width: 460px;
  padding: calc(var(--design-unit) * 6 * 1px);
  background: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  border-radius: var(--borderRadiusXLarge);
  border: 1px solid var(--colorNeutralStroke1);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
}
.dlg-title {
  margin: 0 0 calc(var(--design-unit) * 2 * 1px);
  font-size: 18px;
}
.dlg-msg {
  margin: 0 0 calc(var(--design-unit) * 5 * 1px);
  color: var(--app-fg-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
}
.dlg-input {
  width: 100%;
  margin-bottom: calc(var(--design-unit) * 5 * 1px);
}
.dlg-actions {
  display: flex;
  justify-content: flex-end;
  gap: calc(var(--design-unit) * 2.5 * 1px);
}
</style>

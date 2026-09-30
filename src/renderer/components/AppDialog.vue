<template>
  <fluent-dialog :hidden="!ui.dialog.visible" modal class="app-dialog">
    <div class="dlg">
      <h3 v-if="ui.dialog.title" class="dlg-title">{{ ui.dialog.title }}</h3>
      <p class="dlg-msg">{{ ui.dialog.message }}</p>
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
            v-if="ui.dialog.type === 'confirm'"
            appearance="neutral"
            @click="closeDialog(false)"
          >
            取消
          </fluent-button>
          <fluent-button appearance="primary" @click="closeDialog(true)">确定</fluent-button>
        </template>
      </div>
    </div>
  </fluent-dialog>
</template>

<script setup lang="ts">
import { ui, closeDialog } from '@renderer/composables/ui';
</script>

<style scoped>
.app-dialog::part(control) {
  border-radius: var(--borderRadiusXLarge);
  border: 1px solid var(--colorNeutralStroke1);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
}
.dlg {
  min-width: 320px;
  max-width: 460px;
  padding: calc(var(--design-unit) * 6 * 1px);
  background: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
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
.dlg-actions {
  display: flex;
  justify-content: flex-end;
  gap: calc(var(--design-unit) * 2.5 * 1px);
}
</style>

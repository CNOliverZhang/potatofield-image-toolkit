<template>
  <fluent-dialog :hidden="!ui.dialog.visible" modal class="app-dialog">
    <div class="dlg">
      <h3 v-if="ui.dialog.title" class="dlg-title">{{ ui.dialog.title }}</h3>
      <p class="dlg-msg">{{ ui.dialog.message }}</p>
      <div class="dlg-actions">
        <fluent-button
          v-if="ui.dialog.type === 'confirm'"
          appearance="neutral"
          @click="closeDialog(false)"
        >
          取消
        </fluent-button>
        <fluent-button appearance="accent" @click="closeDialog(true)">确定</fluent-button>
      </div>
    </div>
  </fluent-dialog>
</template>

<script setup lang="ts">
import { ui, closeDialog } from '@renderer/composables/ui';
</script>

<style scoped>
.app-dialog::part(control) {
  border-radius: 8px;
  border: 1px solid var(--neutral-stroke-rest);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
}
.dlg {
  min-width: 320px;
  max-width: 460px;
  padding: 24px;
  background: var(--neutral-layer-1);
  color: var(--neutral-foreground-rest);
}
.dlg-title {
  margin: 0 0 8px;
  font-size: 18px;
}
.dlg-msg {
  margin: 0 0 20px;
  color: var(--neutral-foreground-secondary-rest);
  line-height: 1.5;
  white-space: pre-wrap;
}
.dlg-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

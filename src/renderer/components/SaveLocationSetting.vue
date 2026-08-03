<template>
  <div class="save-loc">
    <div class="group-title">保存位置</div>
    <div class="loc-current">
      <span class="loc-path" :title="modelValue">{{ modelValue || '未设置' }}</span>
      <fluent-button appearance="neutral" @click="choose">选择文件夹</fluent-button>
    </div>

    <div v-if="settings.recentSaveDirs.length" class="loc-recent">
      <div class="loc-recent-title">常用位置</div>
      <div class="loc-recent-row">
        <fluent-select
          ref="selectEl"
          class="loc-select"
          :title="pending"
          @change="pending = evVal($event)"
        >
          <fluent-option v-for="d in settings.recentSaveDirs" :key="d" :value="d" :title="d">
            {{ d }}
          </fluent-option>
        </fluent-select>
        <fluent-button
          appearance="neutral"
          class="loc-apply"
          :disabled="!canApply"
          title="将所选常用位置设为当前保存位置"
          @click="apply"
        >
          应用
        </fluent-button>
      </div>
    </div>

    <div class="loc-keep">
      <div class="loc-keep-text">
        <span class="loc-keep-label">保持相对目录</span>
        <span class="loc-keep-hint">按导入时的目录结构整体保存</span>
      </div>
      <fluent-switch
        class="loc-keep-switch"
        :checked="props.keepRelative ?? false"
        @change="emit('update:keepRelative', evChk($event))"
      ></fluent-switch>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { selectDirectory } from '@renderer/utils/filePicker';

const settings = useSettingsStore();
const props = defineProps<{ modelValue: string; keepRelative?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [string]; 'update:keepRelative': [boolean] }>();

function evChk(e: Event): boolean {
  return (e.target as unknown as { checked: boolean }).checked;
}

// 下拉框中「待应用」的选项，与当前生效的保存位置解耦，需点击「应用」才写回
const pending = ref('');
const selectEl = ref<(HTMLElement & { value: string }) | null>(null);

const canApply = computed(() => !!pending.value && pending.value !== props.modelValue);

function evVal(e: Event): string {
  return (e.target as HTMLInputElement).value;
}

// fluent-select 的 value 需在 option 渲染完成后由 DOM 赋值，纯属性绑定会因时序丢失
async function syncSelect() {
  await nextTick();
  if (selectEl.value && selectEl.value.value !== pending.value) {
    selectEl.value.value = pending.value;
  }
}

// 常用位置列表变动时，保证 pending 始终指向一个有效项（优先当前保存位置）
watch(
  [() => settings.recentSaveDirs, () => props.modelValue],
  ([list, current]) => {
    if (list.includes(pending.value)) return;
    pending.value = list.includes(current) ? current : (list[0] ?? '');
  },
  { immediate: true }
);

watch([pending, () => settings.recentSaveDirs], syncSelect);
onMounted(syncSelect);

async function choose() {
  const dir = await selectDirectory();
  if (!dir) return;
  emit('update:modelValue', dir);
  settings.addRecentSaveDir(dir);
  pending.value = dir;
}

function apply() {
  if (!canApply.value) return;
  emit('update:modelValue', pending.value);
}
</script>

<style scoped>
.save-loc {
  margin-bottom: calc(var(--design-unit) * 1px * 5.5);
}
.group-title {
  display: block;
  font-size: var(--type-ramp-minus-1-font-size);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--neutral-foreground-secondary-rest);
  margin-bottom: calc(var(--design-unit) * 1px * 2.5);
}
.loc-current {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 2);
  margin-bottom: calc(var(--design-unit) * 1px * 3);
}
.loc-path {
  flex: 1;
  min-width: 0;
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-secondary-rest);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loc-recent {
  display: flex;
  flex-direction: column;
  gap: calc(var(--design-unit) * 1px * 1.5);
  margin-bottom: calc(var(--design-unit) * 1px * 3);
}
.loc-recent-title {
  font-size: var(--type-ramp-minus-2-font-size);
  color: var(--neutral-foreground-secondary-rest);
}
.loc-recent-row {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1px * 1.5);
}
.loc-select {
  flex: 1;
  min-width: 0;
}
/* 长路径在收起态与展开列表中均省略号截断，避免撑破面板 */
.loc-select::part(control),
.loc-select::part(selected-value) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loc-select::part(listbox) {
  max-height: 220px;
  max-width: 420px;
}
.loc-apply {
  flex-shrink: 0;
}
.loc-keep {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--design-unit) * 1px * 2);
  margin-top: calc(var(--design-unit) * 1px * 3);
  margin-bottom: calc(var(--design-unit) * 1px * 3);
}
.loc-keep-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.loc-keep-label {
  font-size: var(--type-ramp-minus-1-font-size);
  color: var(--neutral-foreground-rest);
}
.loc-keep-hint {
  font-size: var(--type-ramp-minus-2-font-size);
  color: var(--neutral-foreground-secondary-rest);
}
</style>

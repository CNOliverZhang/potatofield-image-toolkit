<template>
  <SettingsGroup title="保存位置">
    <SettingsRow label="当前位置" :desc="modelValue || '未设置'">
      <fluent-button appearance="neutral" @click="choose">选择文件夹</fluent-button>
    </SettingsRow>

    <SettingsRow v-if="settings.recentSaveDirs.length" label="常用位置">
      <app-select
        ref="selectEl"
        class="loc-select"
        :title="pending"
        @change="pending = evVal($event)"
      >
        <fluent-option v-for="d in settings.recentSaveDirs" :key="d" :value="d" :title="d">
          {{ d }}
        </fluent-option>
      </app-select>
      <fluent-button
        appearance="neutral"
        class="loc-apply"
        :disabled="!canApply"
        title="将所选常用位置设为当前保存位置"
        @click="apply"
      >
        应用
      </fluent-button>
    </SettingsRow>

    <SettingsRow label="保持相对目录" desc="按导入时的目录结构整体保存">
      <fluent-switch
        :checked="props.keepRelative ?? false"
        @change="emit('update:keepRelative', evChk($event))"
      ></fluent-switch>
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useSettingsStore } from '@renderer/stores/settings';
import { selectDirectory } from '@renderer/utils/filePicker';
import SettingsGroup from '@renderer/components/settings/SettingsGroup.vue';
import SettingsRow from '@renderer/components/settings/SettingsRow.vue';
import AppSelect from '@renderer/components/AppSelect.vue';

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

// fluent-dropdown 的 value 需在 option 渲染完成后由 DOM 赋值，纯属性绑定会因时序丢失
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
.loc-select {
  flex: 1;
  min-width: 0;
}
/* v2 的 select 有 ::part(control/selected-value/listbox) 可覆盖内部结构；
   v3 的 dropdown 未暴露这些 part，长路径截断改由容器限制宽度 +
   下拉列表自身的弹出定位处理（若实测仍有撑破，再考虑回到自绘下拉） */
.loc-select {
  overflow: hidden;
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
  font-size: var(--fontSizeBase200);
  color: var(--colorNeutralForeground1);
}
.loc-keep-hint {
  font-size: var(--fontSizeBase100);
  color: var(--app-fg-secondary);
}
</style>

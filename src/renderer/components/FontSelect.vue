<template>
  <div class="font-select">
    <button
      ref="triggerEl"
      type="button"
      class="fs-trigger"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="fs-value" :style="fontStyle(modelValue)">{{ displayLabel }}</span>
      <font-awesome-icon icon="chevron-down" class="fs-chev" :class="{ open }" />
    </button>

    <!-- 面板挂到 body：避免被右侧控制区的滚动容器裁剪 -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="fs-panel"
        :style="panelStyle"
        @keydown.esc.prevent="close"
      >
        <div class="fs-search">
          <font-awesome-icon icon="magnifying-glass" class="fs-search-icon" />
          <input
            ref="searchEl"
            v-model="kw"
            class="fs-search-input"
            placeholder="搜索字体"
            @keydown.stop
          />
        </div>
        <!-- overscroll-behavior: contain 阻止滚动穿透到下层控制区 -->
        <div ref="listEl" class="fs-list">
          <div
            v-for="o in filtered"
            :key="o.value"
            class="fs-option"
            :class="{ active: o.value === modelValue }"
            @click="select(o.value)"
          >
            <span class="fs-option-label" :style="fontStyle(o.value)">{{ o.label }}</span>
          </div>
          <div v-if="!filtered.length" class="fs-empty">无匹配字体</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';

const props = defineProps<{
  modelValue: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const open = ref(false);
const kw = ref('');
const triggerEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const PANEL_H = 300;
/** 面板固定宽度：不随触发器/字体名长短变化 */
const PANEL_W = 280;

/** 常见中文字体别名：系统里的族名多为英文（Microsoft YaHei / SimSun），
 *  直接搜"雅黑""宋体"会搜不到，这里做一次别名扩展 */
const SEARCH_ALIASES: Record<string, string[]> = {
  雅黑: ['Microsoft YaHei'],
  微软雅黑: ['Microsoft YaHei'],
  宋体: ['SimSun', 'NSimSun'],
  新宋体: ['NSimSun'],
  黑体: ['SimHei'],
  楷体: ['KaiTi'],
  仿宋: ['FangSong'],
  等线: ['DengXian'],
  隶书: ['LiSu'],
  幼圆: ['YouYuan'],
  // 思源系列在系统里的名字是 Noto/Source Han，直接搜中文名搜不到
  思源: ['思源宋体', '思源黑体', 'noto', 'source han'],
  思源宋体: ['noto serif', 'source han serif'],
  思源黑体: ['noto sans', 'source han sans'],
  苹方: ['pingfang']
};

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase();
  if (!k) return props.options;
  const terms = [k, ...(SEARCH_ALIASES[k] ?? []).map((t) => t.toLowerCase())];
  return props.options.filter((o) => {
    const label = o.label.toLowerCase();
    const value = o.value.toLowerCase();
    return terms.some((t) => label.includes(t) || value.includes(t));
  });
});

const displayLabel = computed(() => {
  const hit = props.options.find((o) => o.value === props.modelValue);
  return hit ? hit.label : props.modelValue || props.placeholder || '选择字体';
});

/** 用字体本身渲染字体名；通用族（sans-serif 等）不加引号 */
function fontStyle(family: string): Record<string, string> {
  const f = String(family ?? '');
  const generic = /^(sans-serif|serif|monospace|cursive|fantasy|system-ui)$/i.test(f);
  return { fontFamily: generic ? f : `"${f.replace(/"/g, '')}"` };
}

async function toggle() {
  if (open.value) {
    close();
    return;
  }
  const el = triggerEl.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const below = window.innerHeight - r.bottom;
  // 下方空间不足时向上弹出
  const top = below > PANEL_H + 8 ? r.bottom + 4 : Math.max(8, r.top - PANEL_H - 4);
  // 靠右时向左收，避免面板飘出窗口被截断
  const left = Math.min(Math.max(8, r.left), window.innerWidth - PANEL_W - 8);
  panelStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${PANEL_W}px`,
    maxHeight: `${PANEL_H}px`
  };
  open.value = true;
  kw.value = '';
  await nextTick();
  searchEl.value?.focus();
  document.addEventListener('mousedown', onDocMouseDown, true);
  window.addEventListener('resize', close);
  document.addEventListener('keydown', onKeyDown);
}

function select(value: string) {
  emit('update:modelValue', value);
  close();
}

function close() {
  open.value = false;
  document.removeEventListener('mousedown', onDocMouseDown, true);
  window.removeEventListener('resize', close);
  document.removeEventListener('keydown', onKeyDown);
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

function onDocMouseDown(e: MouseEvent) {
  const target = e.target as Node;
  if (triggerEl.value?.contains(target)) return;
  if (panelEl.value?.contains(target)) return;
  close();
}

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown, true);
  window.removeEventListener('resize', close);
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<style scoped>
.font-select {
  position: relative;
  /* 宽度由使用方的 ctl-* 类控制（此处 width:100% 会以更高优先级覆盖 ctl-lg，导致宽度随字体名变化） */
}
.fs-trigger {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 2 * 1px);
  width: 100%;
  min-height: calc(var(--design-unit) * 8 * 1px);
  padding: 0 calc(var(--design-unit) * 2.5 * 1px);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  background: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  font: inherit;
  font-size: var(--fontSizeBase300);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.fs-trigger:hover {
  background: var(--neutral-fill-input-hover, var(--colorNeutralBackground1Hover));
}
.fs-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}
.fs-chev {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--app-fg-secondary);
  transition: transform 0.18s ease;
}
.fs-chev.open {
  transform: rotate(180deg);
}
/* 面板（挂到 body，fixed 定位） */
.fs-panel {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  background: var(--colorNeutralBackground1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.fs-search {
  display: flex;
  align-items: center;
  gap: calc(var(--design-unit) * 1.5 * 1px);
  flex-shrink: 0;
  padding: calc(var(--design-unit) * 1.5 * 1px) calc(var(--design-unit) * 2.5 * 1px);
  border-bottom: 1px solid var(--neutral-stroke-divider-rest, var(--colorNeutralStroke1));
}
.fs-search-icon {
  font-size: 11px;
  color: var(--app-fg-secondary);
}
.fs-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--colorNeutralForeground1);
  font: inherit;
  font-size: 13px;
}
.fs-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain; /* 关键：滚到边界时不带动下层滚动 */
  padding: calc(var(--design-unit) * 1px) 0;
}
.fs-option {
  display: flex;
  align-items: center;
  min-height: calc(var(--design-unit) * 7 * 1px);
  padding: 0 calc(var(--design-unit) * 2.5 * 1px);
  cursor: pointer;
  font-size: 15px;
  transition: background 0.1s ease;
}
.fs-option:hover {
  background: var(--colorNeutralBackground1Hover);
}
.fs-option.active {
  background: color-mix(in srgb, var(--accent-base-color) 16%, transparent);
}
html[data-theme='dark'] .fs-option:hover {
  background: rgba(255, 255, 255, 0.06);
}
.fs-option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fs-empty {
  padding: calc(var(--design-unit) * 3 * 1px);
  text-align: center;
  font-size: 12px;
  color: var(--app-fg-secondary);
}
</style>

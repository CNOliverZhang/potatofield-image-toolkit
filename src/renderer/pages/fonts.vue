<template>
  <div class="fonts">
    <h2>字体管理</h2>
    <el-button type="primary" :loading="store.loading" @click="store.loadOnlineFonts()">
      刷新在线字体库
    </el-button>
    <div v-if="store.onlineFonts.length" class="list">
      <div v-for="font in store.onlineFonts" :key="font.id" class="item">
        <img v-if="font.previewImage" :src="font.previewImage" class="preview" />
        <div class="meta">
          <div class="name">{{ font.name }}</div>
        </div>
        <el-button
          size="small"
          :type="store.installed[font.id] ? 'success' : 'primary'"
          @click="install(font)"
        >
          {{ store.installed[font.id] ? '已安装' : '安装' }}
        </el-button>
      </div>
    </div>
    <el-empty v-else description="暂无在线字体，点击上方按钮加载" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useFontsStore } from '@renderer/stores/fonts';
import { useDialog } from '@renderer/composables/useDialog';
import type { FontItem } from '@renderer/stores/fonts';

const store = useFontsStore();
const dialog = useDialog();

onMounted(() => store.loadOnlineFonts());

async function install(font: FontItem) {
  try {
    await store.installFont(font);
    dialog.message(`已安装字体：${font.name}`, 'success');
  } catch {
    dialog.message('字体安装失败', 'error');
  }
}
</script>

<style scoped>
.fonts {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.preview {
  height: 36px;
  max-width: 120px;
  object-fit: contain;
}
.meta {
  flex: 1;
}
.name {
  font-weight: 600;
}
</style>

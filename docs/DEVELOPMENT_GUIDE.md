# 开发规范与统一约定

> 适用范围：本仓库后续所有开发维护。
> 最后更新：2026-09-29（单图处理阶段收尾）

---

## 1. 可复用资产（优先复用，禁止复制粘贴重写）

### 1.1 组件（`src/renderer/components/`）

| 组件 | 用途 | 使用者 |
|---|---|---|
| `BatchImportPanel.vue` | 批量导入面板（选择文件 / 扫描文件夹 / 列表 / 清空） | 全部批量工具 |
| `SaveLocationSetting.vue` | 保存位置 + 常用位置 + 保持相对目录 | 全部批量工具 |
| `BatchTool.vue` | 批量工具壳（resizer / compress / convert） | 3 个批量工具 |
| `WatermarkControls.vue` | 水印参数面板（含 `lockTile`、输出设置） | 水印单图 + 批量 + 全屏水印 |
| `ImagePicker.vue` | 单图工具的选图/预览占位 | 单图工具 |
| `FontSelect.vue` | 字体选择器（搜索 + 按字体本身渲染 + 滚动不穿透） | 水印工具 |
| `AppDialog.vue` / `ToastHost.vue` | 全局对话框 / Toast | 全局 |
| `Layout.vue` / `WindowControls.vue` | 外壳与无边框窗口控制 | 全局 |
| `ToolStub.vue` | 未实现工具占位 | 临时 |

### 1.2 组合式函数（`src/renderer/composables/`）

| 函数 | 用途 |
|---|---|
| `useSingleTool.ts` | 单图工具通用逻辑：选图、防抖预览、`runSave(buildName, runFn)`（**先选目录再处理**）、`evVal/evNum/evChk/extOf` |
| `useOutputSettings.ts` | 输出格式 + 质量：`createOutputOpts()` / `isLossy` / `outExt` / `withOutput` |
| `useDialog.ts` | `message` / `alert` / `confirm` |
| `useLocalFonts.ts` | 系统字体枚举、按族聚合、已安装判定 |
| `useOnlineApi.ts` | 在线接口（字体库、公告、版本、客户端注册） |
| `useTheme.ts` | 深色模式 + 主题色（跨窗口同步） |

### 1.3 工具层

`utils/filePicker.ts`（选文件/目录）、`utils/directoryScanner.ts`（异步递归扫描，返回 fileList + errorList）、`utils/fileIO.ts`（`buildOutputPath` / `resolveBatchOutputPath` / `relativePath` / `ensureDir`）。

### 1.4 主进程

`src/main/image.ts` 是**唯一**的图像处理入口（op 白名单）；`fs.ts`、`ipc.ts`、`windows.ts`、`updater.ts`、`fonts.ts`（系统字体实时检测）。

---

## 2. 分层与调用链规范

1. **渲染进程不碰 fs / sharp / shell**：一律通过 `window.api.*`（preload 暴露）。
2. 新增主进程能力时，必须同步**四处**：
   - `src/main/ipc.ts` 注册 `ipcMain.handle`
   - `src/preload/index.ts` 暴露方法
   - `src/shared/api-types.ts` 声明类型
   - （涉及图像处理时）`src/shared/types.ts` 的 `ImageProcessOp` / `ImageProcessOptions` / `ImageProcessResult`
3. 新增图像 op 时：`main/image.ts` 的 switch 增加分支，并同步 `shared/types.ts` 的 op 联合类型与 `ImageProcessOptions` 字段（**漏字段会导致 TS2339**）。
4. 预览统一走「无 `outputPath` → 主进程返回 buffer」；导出统一走「带 `outputPath` → 落盘」。

---

## 3. 样式规范

- 颜色一律用 Fluent 设计令牌：`--neutral-foreground-rest`、`--neutral-layer-1/2`、`--neutral-stroke-rest`、`--accent-base-color` 等，禁止硬编码色值（取色器除外）。
- 尺寸一律 token 化：`padding/margin/gap` 用 `calc(var(--design-unit) * N * 1px)`，圆角用 `--control-corner-radius` / `--layer-corner-radius`。
- 字号用 `--type-ramp-*-font-size`。
- 布局硬约束（面板宽高、图标尺寸）、`box-shadow`、`transform`、1px 边框可保留具体像素。
- 覆盖全局样式（如 `.preview-stage` / `.preview-img`）时在本页 `<style scoped>` 内覆盖，不要改 `global.css` 影响其它工具。

---

## 4. 用户在需求中明确的统一性要求（必须遵守）

| # | 要求 | 落地情况 |
|---|---|---|
| 1 | 单图工具**处理完成后再选择保存位置**（不做常驻的保存位置设置） | 拼图已从「保存位置设置」改为 `runSave`；与水印等单图工具一致 |
| 2 | 拼图预览：**滚轮=移动**（横向拼接横移、纵向拼接纵移），**不得用滚轮缩放** | 已实现，`@wheel.prevent` → `setOffset` |
| 3 | 拼图预览：**缩放由预览区下方滑块控制**，最小=contain、最大=cover | `fluent-slider`，`scaleT: 0→contain, 100→cover` |
| 4 | 拼图预览：横向拼接**始终垂直居中**、纵向拼接**始终水平居中**，任何缩放/移动下都不变 | `setOffset()` 强制另一轴为 0 |
| 5 | 拼图：**横向等高、纵向等宽**（取最大值，只放大不缩小） | 主进程 append 已实现 |
| 6 | 拼图支持：是否有边距、边距宽度、是否有底色、底色颜色 | 已实现（默认关闭，关闭时透明底） |
| 7 | 图片列表：容器 + 边框，**与批量工具左侧文件列表同款** | `.file-panel` 对齐 `BatchImportPanel` 视觉 |
| 8 | 右侧控制区**整体不滚动**，列表撑起高度，**列表内部滚动** | `.controls-body` 改为 flex column + `overflow:hidden`；`.file-list` 内部 `overflow-y:auto` |
| 9 | 拖拽 item 加高 + **迷你预览图**，能看出拖的是哪张 | 40×40 缩略图（主进程 sharp 生成 96px 再转 blob URL，按路径缓存并 revoke） |
| 10 | 拖拽用手感好的成熟方案 | `vue-draggable-plus`（SortableJS）：`forceFallback` + `fallbackOnBody` + `animation 220` + `handle='.grip'` |
| 11 | 手柄图标必须可见 | 内联 SVG 六点 grip（不要只用 3px 的 CSS 点，也不要依赖图标名解析） |
| 12 | 字体选择器：支持搜索、按字体本身渲染、展开后上下滚动不触发外层滚动 | `FontSelect.vue`（Teleport 到 body + `overscroll-behavior: contain`），搜索支持中文别名（雅黑→Microsoft YaHei 等） |
| 13 | 字体管理 UI 用 Fluent 官方组件（tablist） | `fluent-tabs` / `fluent-tab`（注意：需自绑 `@click` 驱动切换） |
| 14 | 输出设置（格式 + 质量）统一走 `useOutputSettings` | 拼图已接入；其余工具差异见 `TOOL_CONSISTENCY.md` |
| 15 | 文案统一 | 「文字转图片」→「富文本编辑器」（首页 + 侧边栏） |

---

## 5. 开发过程中确立的技术约定

### 5.1 图像处理

- **大图必须考虑两件事**：① 预览要等比缩放（长边 ≤10000 且总像素 ≤6MP），避免生成/传输 GB 级预览；② 输出像素不得超过 libvips 上限 268402689（超限必须给中文提示并禁用保存按钮）。
- 真实输出尺寸由主进程通过 `ImageProcessResult.width/height` 返回，**不要拿预览图尺寸当真实尺寸显示**。
- JPG 不支持透明：任何 op 输出 jpeg 时，透明底必须兜底为白色，否则透明区变黑。
- 拼接对齐时的 resize 用 `fit:'fill'`（尺寸已按比例算好，避免 1px 舍入误差导致缝隙）。

### 5.2 字体

- 导出侧：文本水印走 SVG `font-family` → librsvg **能直接命中系统字体**（中英文均已实测），**不需要传字体文件路径**。
- 预览侧：CSS `font-family` 同样可用；但 **Chromium 的 `queryLocalFonts()` 有进程级缓存**，装新字体后不刷新（需重启），所以：
  - 「是否已安装」的判定**必须走主进程实时检测**（注册表 + 字体目录），不要用渲染进程枚举结果；
  - 装完即可导出使用；预览要重启才生效 → 页面上给出「需重启」提示与重启入口。
- 字体安装流程：下载到 `appData/fonts/downloads/` → `shell.openPath` 调起系统安装器 → 轮询主进程检测 → 命中即标记已安装并**删除缓存文件**。

### 5.3 预览交互

- 预览区默认 `overflow:hidden`，不依赖滚动条；滚轮/拖动平移，缩放用滑块。
- `contain`/`cover` 随预览区尺寸变化重算（`ResizeObserver`），并把平移偏移夹回合法范围。
- 图片基础渲染尺寸按 contain 计算，再用 `transform: scale()` 放大 —— 避免大图按原始像素渲染。

### 5.4 批量

- 批量导入一律用 `BatchImportPanel`，保存位置一律用 `SaveLocationSetting`。
- 循环串行 `for...of`，单张失败要 toast 提示并继续，进度显示在按钮文案。
- 「保持相对目录」输出用 `resolveBatchOutputPath`，结束后打开的文件也必须用同一函数算（否则指向不存在的路径）。

---

## 6. 新增工具的检查清单

1. 页面放在 `src/renderer/pages/`，路由加到 `router/index.ts`（独立窗口加 `meta: { standalone: true, title }`）。
2. 入口加到 `pages/index.vue` 卡片与 `components/Layout.vue` 侧边栏（**两边文案必须一致**）。
3. 单图工具：用 `useSingleTool` + `ImagePicker`；批量工具：用 `BatchImportPanel` + `SaveLocationSetting`。
4. 需要输出设置就用 `createOutputOpts()`，并用 `outExt` / `withOutput`。
5. 涉及大图：预览传 `maxDimension`，并处理像素超限提示。
6. 处理完：`message(..., 'success')` + `shell.showItemInFolder`。
7. 样式走 §3 令牌；不要复制其它页面的 run() 逻辑，先考虑抽象。

---

## 7. 验证方式

- 构建：`npm run build`（vite，不做类型检查）；类型检查另跑 `npx vue-tsc --noEmit`。
- 运行时验证：以 `--remote-debugging-port=9223` 启动，用 chrome-devtools/electron-cdt MCP 在页面上下文里直接调用 `window.api.*` 做端到端实测（本轮所有结论：字体命中、拼接对齐、像素上限、预览缩放、拖拽组件挂载，都是这样实测出来的，而不是靠推断）。
- 无法自动化的部分（真实文件选择对话框、鼠标拖拽手感）请在结论中明确标注「需人工实测」，不要声称已验证。

# 工具一致性梳理（单图 vs 批量 · 批量导入导出）

> 梳理时间：2026-09-29 · 用于确认「是否统一、怎么处理」
> 说明：本文只做**现状梳理与建议**，标 `❓待确认` 的项需你拍板后再改。

---

## 0. 工具与形态一览

| 工具 | 单图页 | 批量形态 | 批量实现 |
|---|---|---|---|
| 加水印 | `pages/watermark.vue` | `pages/watermark-batch.vue` | `components/WatermarkBatchView.vue`（独立窗口） |
| 全屏水印 | 复用 watermark（lockTile） | `global-watermark-batch` | `WatermarkBatchView.vue` |
| 尺寸调整 | `pages/resizer.vue` | `pages/resizer-batch.vue` | `components/BatchTool.vue` |
| 压缩 | `pages/compress.vue` | `pages/compress-batch.vue` | `components/BatchTool.vue` |
| 格式转换 | `pages/convert.vue` | `pages/convert-batch.vue` | `components/BatchTool.vue` |
| 裁剪 | `pages/cropper.vue` | `pages/cropper-batch.vue` | 独立实现（不走 BatchTool） |
| 长图拼接 | `pages/splicer.vue` | 无（语义上单张输出） | — |
| 分割 | `pages/slicer.vue` | 无 | — |
| EXIF / 色彩提取 / 字体管理 | `exif.vue` / `palette.vue` / `fonts.vue` | 无 | — |
| 富文本制图 | `pages/textToImage.vue` | 无 | 已独立为「洋芋田富文本编辑器」 |

架构注记：`resizer/compress/convert` 的批量共用 `BatchTool.vue`；`cropper-batch` 与 `watermark-batch` 各有一份自己的 `run()`，三份循环逻辑约 60% 重复。

---

## 1. 单图 vs 批量：功能参数与控件差异

### 1.1 水印 —— ✅ 基本一致

单图与批量共用 `WatermarkControls.vue`，默认值逐字段相同（文本、字号 48、颜色、字体、旋转、九宫格定位、边距、平铺、不透明度、水印图缩放、输出格式/质量）。

- 差异：`WatermarkControls` 的 `lockTile` prop 仅批量侧暴露；单图页顶部多一个「批量处理」入口按钮。
- 结论：**无需处理**。

### 1.2 裁剪 —— ❗差异较大

| 项 | 单图 `cropper.vue` | 批量 `cropper-batch.vue` | 状态 |
|---|---|---|---|
| 单位切换 | 有（px / ratio） | 无 | ❓待确认 |
| 定位方式 | 九宫格「定位基准」（默认 nw） | 下拉「位置」（center/nw/ne/sw/se，默认 center） | ❓待确认（默认值也不同） |
| 比例模式百分比控件 | 有（横/纵边距%、宽%、高%） | 无 | ❓待确认 |
| 画布拖拽交互 | 有 | 无 | ❓待确认 |
| 宽高输入 max 约束 | 有 | 无 | ❓待确认 |
| 输出设置（格式/质量） | 有 | **无** | ❓建议补齐 |

建议：批量侧补齐「输出设置」；其余交互差异若属有意简化（批量无需可视化微调）可保留，但**定位默认值应统一**（建议都默认 center 或都默认 nw）。

### 1.3 尺寸调整 —— ❗差异

| 项 | 单图 | 批量 |
|---|---|---|
| 适配方式 | 5 项（inside/cover/fill/contain/outside，带英文标注） | 3 项（等比缩放/裁剪填充/拉伸） |
| 宽/高输入 | 有 min 约束 | 无 min 约束 |
| 输出设置 | 有 | **无** |

建议：适配方式的**取值范围**需统一（批量缺 `contain`/`outside` 会让同样参数在两个形态下行为不同）；输出设置补齐。

### 1.4 压缩 —— ❗轻微差异

| 项 | 单图 | 批量 |
|---|---|---|
| 字段名/文案 | 「输出格式」，选项写 **JPEG** | 「格式」，选项写 **JPG** |
| 质量滑块下限 | min=1 | min=10 |
| 默认值 | original / 80 | original / 80 |

建议：文案统一为「JPG」（与输出扩展名一致）；质量下限统一（建议 10，避免 1 这种无意义值）。

### 1.5 格式转换 —— ❗差异

| 项 | 单图 | 批量 |
|---|---|---|
| 默认值 | `png`（硬编码，未读设置页默认值） | `undefined`（`opts.format \|\| 'png'` 仅显示层兜底） |
| 质量控件 | 有（90，仅 lossy 显示） | **无**（`buildOptions` 不传 quality） |
| 输出扩展名 | `.jpg` | `.jpeg` |
| 运行前校验 | 无 | 有（未选格式时拦截） |

建议：① 扩展名统一（`.jpg`）；② 批量补质量控件；③ 单图默认值改为读设置页 `defaultOutput`（与其它工具一致）；④ 批量保留「必选校验」，单图因有默认值可不加。

### 1.6 输出设置（格式/质量）总览

| 工具 | 单图 | 批量 | 默认值来源 |
|---|---|---|---|
| 水印 | ✅ | ✅ | 硬编码 original/90 |
| 裁剪 | ✅ | ❌ | `createOutputOpts()` |
| 尺寸调整 | ✅ | ❌ | `createOutputOpts()` |
| 压缩 | ✅（合并在压缩设置） | ❌ | 硬编码 original/80 |
| 格式转换 | ✅ | ❌ | 硬编码 png/90 |
| 分割 | ✅ | — | `createOutputOpts()` |
| 长图拼接 | ✅（本轮新增） | — | `createOutputOpts()` |

❓**待确认**：是否要求「所有工具的输出设置默认值都取自设置页『默认输出』」？目前只有裁剪/尺寸/分割/拼接是，其余四处硬编码。建议统一为 `createOutputOpts()`。

---

## 2. 批量工具：导入 / 导出 / 处理逻辑差异

### 2.1 导入 —— ✅ 已统一

5 个批量工具全部复用 `BatchImportPanel`：

- 导入方式：选择文件（多选）/ 扫描文件夹，一致
- `rel` 生成：选文件=文件名；扫文件夹=`relativePath(dir, p)`，一致
- 去重：按 path，一致
- 保存位置：`SaveLocationSetting`（选文件夹 + 常用位置 + 保持相对目录），一致

❗**共同缺陷**：扫描返回的 `errorList`（损坏/不支持的文件）被**静默混入**待处理列表，错误原因丢弃，直到运行时才逐张报错（`BatchImportPanel.vue:55`）。
❓是否改为「导入时提示 N 个文件无法读取，并询问是否跳过」？建议做。

### 2.2 导出 —— ❗有差异，含 2 处缺陷

| 工具 | 文件名后缀 | 扩展名规则 | 子目录 | 结束后打开的文件 |
|---|---|---|---|---|
| resizer | `_resized` | 恒沿用原扩展名 | keepRelative 时 ensureDir | ❌ `buildOutputPath(saveDir, 原文件名)` |
| compress | `_compressed` | 选了格式才换 | 同上 | ❌ 同上 |
| convert | `_converted` | 强制按目标格式 | 同上 | ❌ 同上 |
| cropper | `_cropped` | 恒沿用原扩展名 | 同上 | ✅ `resolveBatchOutputPath(...)` |
| watermark | `_watermarked` | original→输入扩展名，否则按格式 | 同上 | ❌ `buildOutputPath(...)` |

❗**缺陷 1（建议直接修）**：`BatchTool.vue:232-236` / `WatermarkBatchView.vue:180` 结束后「打开所在文件夹」用的是 `buildOutputPath(saveDir, 原文件名)` —— **没加后缀、也没加相对子目录**，keepRelative 时指向不存在的文件。cropper 用 `resolveBatchOutputPath` 是对的。建议统一。

❗**缺陷 2（建议直接修）**：jpeg 扩展名两处各写一套（`.jpg` vs `.jpeg`）。建议统一为 `.jpg`（`useOutputSettings.outExt` 已是 `.jpg`）。

❓**待确认：同名覆盖**。目前全部静默覆盖（无序号、无确认），`fileIO.ts` 的 `fileExists` 已定义但批量流程从未调用。是否在批量场景加「已存在则自动加序号 / 运行前提示将覆盖 N 个文件」？

### 2.3 处理逻辑 —— 基本一致，小差异

| 项 | 现状 |
|---|---|
| 循环 | 全部 `for...of` 串行 await |
| 进度 | 仅按钮文案「处理中 done/total」 |
| 单张失败 | catch 后 toast 提示并继续 |
| 取消 | 全部不支持 |
| cropper 额外 | 循环内多一次 `metadata` IPC；缺少裁剪区域合法性校验；按钮额外禁用 `files.length===0` |
| 文案 | 「批量裁剪完成」vs「批量处理完成」 |

建议：抽取 `useBatchRunner(files, saveDir, keepRelative, { op, suffix, extOf, buildOptions })` 统一循环/进度/ensureDir/错误处理/打开输出文件，各工具只提供 op 与参数构造。这样也顺带修掉上面两个缺陷。❓是否现在就做这次重构？

---

## 3. 汇总：需要你拍板的清单

| # | 事项 | 我的建议 |
|---|---|---|
| 1 | 输出设置默认值是否全部改为读设置页「默认输出」 | 是（统一 `createOutputOpts()`） |
| 2 | 批量工具是否都补齐「输出设置」 | 是（至少 resizer/compress/convert/cropper） |
| 3 | 裁剪批量是否补齐单位/比例/九宫格等交互 | 保留简化，但**默认值统一**（定位默认 center） |
| 4 | 尺寸调整「适配方式」取值范围是否统一为 5 项 | 是 |
| 5 | 压缩质量下限 1 vs 10、JPG/JPEG 文案 | 统一 10 / 统一 JPG |
| 6 | 格式转换：批量补质量、扩展名统一 `.jpg`、默认值读设置 | 是 |
| 7 | 两个已确认缺陷（打开文件夹路径、jpeg 扩展名） | 直接修 |
| 8 | 扫描到的损坏文件是否导入时提示并跳过 | 是 |
| 9 | 批量同名覆盖是否加保护 | 建议加「自动加序号」或运行前提示 |
| 10 | 是否重构出 `useBatchRunner` 消除三份重复 run() | 建议做（含 7） |
| 11 | 批量是否需要「取消 / 中断」 | 建议加（大批量时有用） |

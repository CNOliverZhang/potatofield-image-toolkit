# 进度跟踪（跨会话）

最后更新：**2026-09-29 · 会话 N（单图处理收尾 + 一致性梳理）**
> 本轮产出三份文档，后续会话请先读 `PLANNING.md` + `PROGRESS.md` + `docs/` 下三份：
> - `docs/TOOL_CONSISTENCY.md` —— 单图 vs 批量、批量导入导出的差异与待确认清单
> - `docs/LEGACY_COMPARISON.md` —— 新老版本实现/表现/性能对比
> - `docs/DEVELOPMENT_GUIDE.md` —— 统一组件、既有约定、开发维护规范

## 本轮（2026-09-30）已完成：Windows 设置风格控件体系（进行中）
- [x] 新建设置组件体系 `components/settings/`：`SettingsGroup`（分组标题 + 卡片容器）、`SettingsRow`（左 label 右控件）、`SettingsCollapse`（可折叠行，子行不限高）
- [x] 行分隔用「卡片背景=分隔线色 + 行间 1px 间隙」实现；行背景 `--app-card`，hover 高亮
- [x] 全局控件宽度类：`ctl-lg`（200px）/ `ctl-md`（160px）/ `ctl-num`（110px）/ `ctl-slider`（弹性）/ `row-val`
- [x] 水印工具已迁移：三个分组卡片化；「位置基准」（位置单位 + 定位基准九宫格）、「边距设置」（横向/纵向）为默认展开的折叠组；旋转等独立设置为不可折叠行
- [x] 按钮禁用：所有单图工具保存按钮在未选图时禁用；批量工具在列表为空时禁用
- [ ] 待推广：裁剪/尺寸/压缩/转换/分割/拼接/EXIF/色彩/字体管理/设置页/批量参数区（组件已就绪，逐工具迁移即可）

## 本轮（2026-09-30）已完成：水印位置与大小模型改造
- [x] 位置支持两种单位：百分比相对位置 / 绝对像素位置
- [x] 百分比模式：大小为「水印整体宽度占图片宽度的百分比」（按渲染实测宽度反算字号，实测 10/20/50/100% 精确命中）
- [x] 像素模式：字号维持 px、图片水印维持相对短边比例；边距改为 px 输入框（可为负）
- [x] 允许溢出：水印比图大或部分在图外均可（合成前按可见区域裁剪，替代原先「超出就等比缩小」的旧逻辑）
- [x] 不允许全部在图外：位置钳到至少保留水印自身 40%（不少于 4px）可见
- [x] 水印渲染后 trim 掉透明留白（百分比与边距判定才准确）
- [x] 分组调整：「样式及内容」→「样式和位置」；字号/大小移入并置于横向边距之上；不透明度移入「基础设置」置于颜色之后

## 本轮（2026-09-30）已完成：批量工具统一

- [x] 新建 `useBatchRunner`：三个批量实现（BatchTool / WatermarkBatchView / cropper-batch）的 run() 统一，消除约 60% 重复代码
- [x] 覆盖策略：开始前预检同名文件，弹窗三选一「自动重命名（`a_1.png` 依次避让）/ 覆盖 / 取消」；无冲突不弹窗
- [x] 中途取消：处理中按钮变「取消」，已完成文件保留、不回滚
- [x] 对话框扩展多选一：`ui.ts` 加 `DialogAction` + `type:'choose'`，`useDialog.choose()`，`AppDialog.vue` 按 actions 渲染
- [x] 批量与单图对齐：尺寸调整适配方式补 5 项 + min 约束；压缩文案/质量范围统一；格式转换补质量、默认 png、扩展名 `.jpg`；裁剪完全对齐
- [x] 裁剪参数抽出 `CropControls.vue` + `useCropGeometry.ts`，单图（带 cropper.js 画布）与批量（无画布）共用
- [x] 批量裁剪越界处理：像素模式按图片裁剪并钳位、不足 1px 跳过并提示；比例模式按百分比换算
- [x] 输出设置默认值统一读设置页「默认输出」（compress / convert / cropper / watermark 四处原为硬编码）
- [x] 水印单图改用 `runSave`（与其它单图工具一致的保存流程与提示）
- [x] 两处缺陷修复：批量结束后打开的文件改用真实输出路径（原指向不存在的路径）；jpeg 扩展名统一 `.jpg`
- [x] `BatchImportPanel`：扫描到的损坏文件不再混入列表，改为导入时提示并跳过

## 本轮（2026-09-29）已完成：单图处理收尾
- [x] 字体管理改造：双 Tab（线上字体 / 系统已安装字体，基于 `queryLocalFonts`）
- [x] 线上字体「安装到系统」：`shell.openPath` 调起系统字体安装器；**已安装判定改由主进程实时检测**（`main/fonts.ts` 读注册表 + 字体目录），绕开 Chromium 字体枚举缓存；安装成功即删除下载缓存 + 启动兜底清理 + 手动「清理缓存」入口
- [x] 水印工具接入系统字体（字体选择器支持搜索、按字体本身渲染、中文字体别名搜索、滚动不穿透）
- [x] 字体管理 Tab 改用 Fluent 官方 `fluent-tabs`
- [x] 长图拼接：横向等高 / 纵向等宽对齐；可选边距（宽度）+ 可选底色（颜色），默认关闭（透明底）
- [x] 长图拼接：拖拽排序（`vue-draggable-plus`）、item 缩略图、列表面板化（与批量工具同款）、控制区不滚动 + 列表内部滚动
- [x] 长图拼接：预览改为「滚轮=移动、底部滑块=缩放（contain↔cover）」，横向拼接始终垂直居中、纵向始终水平居中
- [x] 长图拼接：保存改为单图流程（点按钮后选目录，输出一张，`xxx_spliced.ext`）+ 输出格式/质量设置
- [x] 大图加固：预览等比缩放（长边 ≤10000 且 ≤6MP，避免生成/传输 GB 级预览）；像素上限（268MP）中文提示 + 超限禁用保存；真实输出尺寸由主进程返回
- [x] 「文字转图片」改为引导页：进入即弹窗告知已独立为「洋芋田富文本编辑器」，可跳转 https://potatofield.cn/richtexteditor ；首页/侧边栏文案统一为「富文本编辑器」
- [x] 梳理并输出三份文档（一致性 / 老版本对比 / 开发规范）
- [x] 压测：240MP 拼接 10.4s、RSS 145MB；276MP 触发上限快速失败（详见 `docs/LEGACY_COMPARISON.md` §6）


## 已完成
- [x] 老项目完整分析（架构、12 工具、在线接口、更新兼容）
- [x] `PLANNING.md` 编写
- [x] 新项目目录 `potatofield-image-toolkit/` git init（分支 main）
- [x] 技术栈选型确定（electron-vite + Vue3 + Pinia + Element Plus + sharp 主进程）
- [x] 项目骨架文件：package.json / tsconfig / electron.vite.config / electron-builder 配置
- [x] 主进程骨架：index.ts / windows.ts / ipc.ts / updater.ts / image.ts / fs.ts
- [x] preload 骨架
- [x] renderer 核心：main.ts / App.vue / router / stores(settings,fonts,messages) / composables(useTheme,useOnlineApi,useDialog) / utils(filePicker,directoryScanner,fileIO,templateCode) / components(WindowControls,Layout,ToolStub) / index / settings / fonts / palette
- [x] 示范工具 palette.vue（色彩提取）实现完整链路
- [x] 11 个工具占位页
- [x] 注册为 `Potatofield` 大仓 submodule（已正确提交，gitlink 入 index；分支 main，SHA 3757c65）

## 本轮（2026-07-31 后续）已完成
- [x] 水印边距改造：单像素 `offset` → 横/纵双百分比 `offsetX`/`offsetY`（`shared/types.ts` / `main/image.ts` / `watermark.vue`），按 gravity 条件显隐
- [x] sharp `composite` 浮点坐标修复（`resolvePosition` 非居中分支加 `Math.round`）
- [x] 全站样式系统化迁移到 Fluent UI 设计令牌：颜色全部走 UI 库变量；清理 `global.css` 内自定义变量与暗色块，明暗主题由 Fluent `baseLayerLuminance` 经 JS 驱动
- [x] 左上角 logo 由 font-awesome 图标替换为资源图片（`renderer/assets/logo.png`，`Layout.vue` 改用 `<img>`）
- [x] 组件像素值 token 化：所有 `padding`/`margin`/`gap` 与圆角 `border-radius` 改用 `--design-unit` / `--layer-corner-radius` / `--control-corner-radius`（无单位令牌使用处乘 `1px`）；布局硬约束、图片/图标尺寸、`box-shadow`、`font-size`、1px 边框、`transform`、`letter-spacing` 保留

## 本轮（2026-08-03）已完成：批量处理独立窗口
- [x] 窗口机制打通：主进程 `windows.ts` 已有 `openWindow({route,key})` 工厂；新增 IPC `window:open`，preload/api-types 暴露 `window.api.window.open`，渲染进程可开独立窗口（按 key 去重 + hash 路由）
- [x] store（`settings.ts`）新增 `recentSaveDirs` 常用保存位置列表 + `addRecentSaveDir` / `removeRecentSaveDir`（持久化）
- [x] 全局可复用组件：`BatchImportPanel`（选择文件 / 扫描文件夹 / 已导入列表）、`SaveLocationSetting`（保存位置 + 常用位置）
- [x] 水印参数面板提取为 `WatermarkControls.vue`（支持 `lockTile`，全屏水印复用）；`watermark.vue` 单张页接入并在操作区顶部加 sticky「批量处理」入口
- [x] 独立窗口批量工具：`watermark-batch`（完整）、`global-watermark-batch`（平铺锁定）；`BatchTool` 通用组件支撑 resizer/compress/convert 批量（底层 image op 已存在）
- [x] 首页双入口：5 个批量工具卡片加「批量处理」按钮，点击开独立窗口

## 设计原则：单张 tab + 独立窗口批量（双形态）
- 支持「无人值守批量处理多张（含文件夹递归扫描 + 保持目录结构）」的工具，采用**双形态**：主窗口内以功能 tab 形式开「单张处理」，并提供独立窗口的「批量处理」入口。
- 批量工具清单（5 个，来自老项目能力确认）：加水印、全屏水印、尺寸调整、压缩、格式转换。
- 语义不同于「每张独立输出批量」的工具（长图拼接 splicer、裁剪 cropper）**保持纯 tab**，只以功能 tab 形式存在，无独立批量窗口。
- 首页支持批量的工具提供两个入口：单张 tab 入口 + 批量独立窗口入口。
- 复用要点：批量窗口的左侧导入/扫描/列表（`BatchImportPanel`）、保存位置设置（`SaveLocationSetting`）、水印参数面板（`WatermarkControls`）均为全局可复用组件，其它工具后续做批量时直接复用。
- **独立窗口不显示左侧功能导航**：路由 `meta.standalone = true` 标记独立窗口页面，`Layout.vue` 据此隐藏 `sidebar`；`WindowControls` 的 `inset` 置 0（主窗口为 232，需避开侧边栏），并以 `meta.title` 在左上角显示「logo + 工具名」替代缺失的系统标题栏，同时同步 `document.title`。后续新增独立窗口页面，只需在路由上加 `meta: { standalone: true, title: 'xxx' }`。

## 子模块注册说明（重要）
- 源仓库备份在 `C:/potatofield-image-toolkit-src`（二进制/备份用，可删）。
- `.gitmodules` 中 url 已设为 `git@github.com:CNOliverZhang/potatofield-image-toolkit.git`（占位，推到远端后生效）。
- 子模块自身 remote 当前指向本地备份路径，推送前需在子模块内执行：
  `git -C potatofield-image-toolkit remote set-url origin git@github.com:CNOliverZhang/potatofield-image-toolkit.git`
- 注册过程中遇到 git 限制：`file://` 传输被禁，需用 `git -c protocol.file.allow=always` 或本地绝对路径注册。

## 待做（按会话）
> 状态注记：样式系统、Fluent token 化、logo 资源替换、水印参数（offsetX/offsetY）已在本轮完成；以下为原始规划，工具业务逻辑仍按此推进，未变更。

### 当前状态（2026-09-29 更新）
- [x] 单图处理工具：水印、裁剪、尺寸调整、压缩、格式转换、分割、长图拼接 —— 功能均已完成
- [x] 批量工具：水印 / 全屏水印 / 尺寸 / 压缩 / 转换 / 裁剪 —— 功能均已完成（导入与保存位置已统一）
- [x] 字体管理、色彩提取、EXIF、设置页 —— 已完成
- [x] textToImage —— 已外移为独立产品「洋芋田富文本编辑器」
- [x] ~~待确认：单图/批量差异统一（11 项）~~ —— 2026-09-30 已全部完成，见 `docs/TOOL_CONSISTENCY.md` §3
- [ ] **待评估**：EXIF 方向自动校正（老版有、新版未做，见 `docs/LEGACY_COMPARISON.md` §5）
- [ ] **待定**：模板码（templateCode）能力是否保留（老版水印/拼接有）
- [ ] 主题/默认路径/参数接入全页面 + 自动更新联调 + win/mac 打包

## 未决问题
- 后端 `/image_toolkit/usage` 接口是否存在？（见 PLANNING §4）
- cropperjs 版本（v1 vs v2）
- asar:false 是否必须
- 单图/批量差异是否全部按建议统一（见 `docs/TOOL_CONSISTENCY.md` §3）
- 是否在各 op 统一加 `.rotate()` 做 EXIF 方向校正

## 关键约束（勿忘）
- appId = cn.potatofield.imagetoolkit
- publish url = https://files.potatofield.cn/ImageToolkit/Packages/
- win=nsis, mac=dmg, asar=false
- 在线接口 baseURL = https://api.potatofield.cn

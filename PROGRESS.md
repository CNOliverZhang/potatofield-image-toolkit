# 进度跟踪（跨会话）

最后更新：2026-07-31 · 会话 2（样式系统 + 资源管理）

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

- [ ] 基础模块补全 + resizer/compress/convert/exif
- [ ] watermark/globalWatermark 业务逻辑（参数 UI 已就绪）
- [ ] splicer + slicer + cropper
- [ ] textToImage + fonts + settings 业务逻辑
- [ ] 主题/默认路径/参数接入全页面 + 自动更新联调 + win/mac 打包

## 未决问题
- 后端 `/image_toolkit/usage` 接口是否存在？（见 PLANNING §4）
- cropperjs 版本（v1 vs v2）
- asar:false 是否必须

## 关键约束（勿忘）
- appId = cn.potatofield.imagetoolkit
- publish url = https://files.potatofield.cn/ImageToolkit/Packages/
- win=nsis, mac=dmg, asar=false
- 在线接口 baseURL = https://api.potatofield.cn

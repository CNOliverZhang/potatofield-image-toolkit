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

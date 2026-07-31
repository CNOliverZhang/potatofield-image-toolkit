# 进度跟踪（跨会话）

最后更新：2026-07-31 · 会话 1

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

## 子模块注册说明（重要）
- 源仓库备份在 `C:/potatofield-image-toolkit-src`（二进制/备份用，可删）。
- `.gitmodules` 中 url 已设为 `git@github.com:CNOliverZhang/potatofield-image-toolkit.git`（占位，推到远端后生效）。
- 子模块自身 remote 当前指向本地备份路径，推送前需在子模块内执行：
  `git -C potatofield-image-toolkit remote set-url origin git@github.com:CNOliverZhang/potatofield-image-toolkit.git`
- 注册过程中遇到 git 限制：`file://` 传输被禁，需用 `git -c protocol.file.allow=always` 或本地绝对路径注册。

## 待做（按会话）
- [ ] 会话 2：基础模块补全 + resizer/compress/convert/exif
- [ ] 会话 3：watermark + globalWatermark
- [ ] 会话 4：splicer + slicer + cropper
- [ ] 会话 5：textToImage + fonts + settings
- [ ] 会话 6：主题/默认路径/参数接入全页面 + 自动更新联调 + win/mac 打包

## 未决问题
- 后端 `/image_toolkit/usage` 接口是否存在？（见 PLANNING §4）
- cropperjs 版本（v1 vs v2）
- asar:false 是否必须

## 关键约束（勿忘）
- appId = cn.potatofield.imagetoolkit
- publish url = https://files.potatofield.cn/ImageToolkit/Packages/
- win=nsis, mac=dmg, asar=false
- 在线接口 baseURL = https://api.potatofield.cn

# 洋芋田图像工具箱 · 重写规划文档（跨会话接续用）

> 本文件同时供「人」阅读与「AI 跨会话接续」使用。每次会话开始时先读 `PLANNING.md` + `PROGRESS.md`。
> 最后更新：2026-07-31（会话 1：分析 + 骨架搭建）

---

## 0. 总览与目标

将原项目 `PotatofieldImageToolkit`（Electron 11 + Vue 2 + Webpack 4 + electron-vue 模板）用 **新 Electron + Vue 3** 完全重写。

- 新项目位置：`Potatofield/potatofield-image-toolkit/`（已 git init，分支 `main`）
- 作为子模块注册进大仓 `Potatofield`（`.gitmodules` 见会话 1 末尾）
- **不直接修改老项目**，老项目保留作为参考与对比基准

### 重写硬性要求（来自用户）
1. 详细拆解功能模块，评估更优雅/高性能实现。
2. 抽取跨模块通用基础组件（文件选择、目录选择、文件读取、文件夹扫描等），消除重复实现。
3. 实现深色模式 + 主题色（参照图笔记本/富文本编辑器），并持久化：
   - 文件默认保存地址
   - 各工具的默认导出参数
4. 自动更新与老版本兼容：**新包放到更新服务器后，老版本能自动更新到新版本**。
5. 在线功能与原来一致（用户数据上报、字体库管理等）；在线接口实现可参考博客后台 `potatofield-backend`。
6. 保持 win / mac 多平台兼容。

---

## 1. 老项目技术栈与架构（已分析）

| 项 | 老实现 |
|---|---|
| 构建 | electron-vue 模板（Webpack 4 + Babel 6） |
| 渲染进程框架 | Vue 2.6 + Vue Router 3（hash 模式）+ Vuex 3 |
| UI | Element UI + Font Awesome |
| 状态持久化 | `vuex-electron` 的 `createPersistedState` → localStorage；`createSharedMutations` 跨进程共享 |
| 主/渲染进程通信 | `electron-promise-ipc` + 自定义 `ActionPromise` 插件：重写 `store.dispatch`，让 Vuex action 实际跑到主进程 |
| 图像库 | `sharp`（渲染进程内，因 nodeIntegration=true） |
| 其他库 | colorthief、cropperjs、exif-js、html2canvas、CKEditor5、crypto-js |

### 主进程要点（`src/main/index.js`）
- 按 `title` 去重的窗口管理（`openWindow`）
- 单实例锁（`app.requestSingleInstanceLock`）
- 托盘
- `electron-updater`：`autoUpdater`（squirrel/sparkle 宏），事件：`update-available / update-not-available / update-download-progress / update-downloaded / error`
- IPC：`relaunch`、`open`、`version`（sendSync）、`app-data-path`（sendSync）、`select-folder`（`dialog.showOpenDialog`）
- `electron-squirrel-startup` 处理 Windows 安装事件

### 关键兼容性事实（需求 4：自动更新兼容）
- `appId: cn.potatofield.imagetoolkit`（**必须保持不变**）
- `publish: [{ provider: 'generic', url: 'https://files.potatofield.cn/ImageToolkit/Packages/' }]`（**必须保持不变**）
- `win.target: ['nsis']`，`mac.target: ['dmg']`（**必须保持相同安装器格式**）
- `artifactName: potatofield-image-toolkit-${version}.${ext}`
- `asar: false`，`directories.output: 'build'`

---

## 2. 功能模块拆解（12 个工具）

| # | 旧页面 | 功能 | 核心库 | 输入 | 输出 | 备注 |
|---|---|---|---|---|---|---|
| 1 | `watermark.vue` + `watermark/` | 给图片加图片/文字水印 | sharp（composite + SVG 文本） | 图片 + 水印图/文字 | 带水印图 | 有「模板」保存；模板码用 crypto-js |
| 2 | `globalWatermark.vue` + `globalWatermark/` | 批量给一目录图片加水印 | 同上 + 目录扫描 | 目录 | 整目录输出 | 模板同 watermark |
| 3 | `splicer.vue` + `splicer/` | 多图拼接长图 | sharp（append） | 多图 | 拼接图 | 有模板 |
| 4 | `cropper.vue` + `cropper/` | 可视化裁剪 | cropperjs + sharp | 图片 | 裁剪图 | cropperjs 取区域，sharp 切割 |
| 5 | `slicer.vue` + `slicer/` | 按行/列/网格分割 | sharp（extract） | 图片 | 多张切片 | 设定行列 |
| 6 | `textToImage.vue` + `textToImage/` | 富文本制图 | CKEditor5 + html2canvas + sharp | 富文本 | 图片 | 有模板 |
| 7 | `resizer.vue` | 尺寸调整 | sharp（resize） | 图片 + 尺寸 | 缩放图 | 可批量 |
| 8 | `compress.vue` | 压缩 | sharp（quality/webp） | 图片 | 压缩图 | 可批量 |
| 9 | `convert.vue` | 格式转换 | sharp（toFormat） | 图片 | 转格式图 | 可批量 |
| 10 | `exif.vue` | EXIF 读取 | exif-js → 替换为 `exifr` | 图片 | EXIF 表 | 只读 |
| 11 | `palette.vue` | 色彩提取 | colorthief | 图片 | 调色板 | 取主色/调色板 |
| 12 | `fonts.vue` | 字体管理 | 在线接口 + fs | 本地/在线字体 | 安装字体 | 见 §4 |

**公共能力（每个工具都会用到，必须抽取为 base 模块，见 §3）**：文件选择、目录选择、文件读取、文件夹递归扫描、文件写出、模板码编解码、在线 API 客户端、对话框组件、图像预处理、深色模式 + 主题色、默认保存路径、各工具默认导出参数。

---

## 3. 抽取出的基础组件模块（需求 2）

集中放在 `src/renderer/utils/` 与 `src/shared/`，跨工具复用：

1. **`filePicker.ts`** —— 封装「选择文件 / 多选文件 / 选择目录」，底层走 preload 暴露的 `window.api.selectFile/selectDirectory`。替代老项目各页面里散落的 `dialog.showOpenDialog` 调用。
2. **`directoryScanner.ts`** —— 递归扫描目录，按扩展名白名单过滤，返回 `{ fileList, errorList }`。替代老项目 `utils/readdirectory.js` 以及各工具里重复写的 `fs.readdirSync`。
3. **`fileIO.ts`** —— `readFile` / `writeFile` / `ensureDir`（替代 `utils/createdirectory.js`），统一错误处理。主进程 `fs` IPC 执行。
4. **`templateCode.ts`** —— crypto-js 模板码编解码（watermark / splicer / textToImage 共用）。替代老项目三处重复实现。
5. **`image` 主进程模块** —— 所有 sharp 操作（resize / convert / compress / watermark composite / append / extract / metadata）移到**主进程**执行，渲染进程通过 `invoke` 调用。理由：渲染进程无法在沙箱 + contextIsolation 下直接 `require('sharp')`；且放到主进程可利用多核、避免卡 UI。
6. **`useOnlineApi.ts`** —— 统一的 axios 实例（baseURL `https://api.potatofield.cn`），封装字体列表、消息、版本、客户端注册、用量上报。替代老项目里硬编码的 5+ 处完整 URL。
7. **`DialogProvider` / `useDialog.ts`** —— 全局对话框（用 Element Plus ElMessage/ElMessageBox 实现）。
8. **`useTheme.ts`** —— 深色模式 + 主题色（CSS 变量）。
9. **`stores/settings.ts`** —— 持久化全局设置（主题色、深色模式、默认保存路径、各工具默认导出参数、identifier）。

---

## 4. 在线接口（需求 5：与原来一致 + 参考博客后台）

老项目实际调用的接口：

| 用途 | 方法 | URL | 返回 |
|---|---|---|---|
| 字体列表 | GET | `https://api.potatofield.cn/font_library/font/list` | `{ data: { list: [...] } }` |
| 消息列表 | GET | `https://api.potatofield.cn/image_toolkit/message/list` | `{ data: { count, list } }` |
| 最新消息 | GET | `https://api.potatofield.cn/image_toolkit/message/latest` | `{ id, title, ... }` |
| 版本列表 | GET | `https://api.potatofield.cn/image_toolkit/version/list` | `{ data: { list } }` |
| 客户端注册/上报 | POST | `https://api.potatofield.cn/image_toolkit/client/register` | `{ identifier, version, platform }` |
| 字体文件/预览下载 | GET | `font.previewImage` / `font.fontFile`（完整 URL） | binary |

**博客后台对应实现（已确认存在，新项目直接复用这些接口即可，无需改后端）**：
- `potatofield-backend/app/routes/font_library.js` → `/font_library/font/list`
- `potatofield-backend/app/routes/old.js` → `/imagetoolkit/versions`、`/imagetoolkit/messages`、`/imagetoolkit/register`
- `potatofield-backend/app/old/index.js` → `getFontList`、`getMessageList`
- `potatofield-backend/app/handlers/.../ImageToolkitClient.register`
- 模型：`ImageToolkit_client`、`ImageToolkit_message`、`ImageToolkit_tool`、`ImageToolkit_usage`、`ImageToolkit_version`、`FontLibrary_*`

**用户数据上报设计（新项目）**：
- 首次启动生成 `identifier`（crypto-js AES 加密，存 `settings.identifier`）
- 启动后 `POST /image_toolkit/client/register` 上报 identifier + version + platform
- 每个工具被使用时 `POST /image_toolkit/usage`（需确认后端是否有该接口；待会话中确认）

---

## 5. 深色模式 + 主题色 + 持久化（需求 3）

- 主题色与深色模式通过 **CSS 变量** 实现（`--main-color` 等），挂在 `:root` / `body`
- `useTheme.ts`：`applyTheme({ color, dark })` 写入 CSS 变量，并切换 `dark` 类（Element Plus 深色模式）
- `stores/settings.ts` 用 **Pinia + `pinia-plugin-persistedstate`** 持久化到 localStorage
- 持久化字段：
  - `themeColor`
  - `darkMode`
  - `defaultSaveDirectory`
  - `defaultExportParams`（按工具名存默认导出参数）
  - `identifier`
- 文件保存对话框默认打开 `defaultSaveDirectory`；各工具「导出」时默认填入 `defaultExportParams[toolName]`

---

## 6. 新项目技术栈选型（最终）

- **构建**：[`electron-vite`](https://electron-vite.org)（Vite 驱动，main/preload/renderer 均用 TypeScript）
- **框架**：Vue 3 + `<script setup lang="ts">` + TypeScript
- **路由**：Vue Router 4（hash 模式）
- **状态**：Pinia + `pinia-plugin-persistedstate`
- **UI**：Element Plus + Font Awesome
- **图像**：`sharp`（**主进程侧**，经 IPC invoke）+ `exifr` + `cropperjs` + `colorthief` + `html2canvas` + CKEditor5 + `crypto-js`
- **更新**：`electron-updater`，配置保持老项目兼容
- **多平台**：`electron-builder` 同时出 win/nsis 与 mac/dmg

### 目录结构
```
src/
  main/        # 主进程：windows.ts, ipc.ts, updater.ts, image.ts, fs.ts, index.ts
  preload/     # index.ts contextBridge
  shared/      # types.ts, api-types.ts 主/渲染共享类型
  renderer/
    main.ts, App.vue, index.html
    router/
    stores/      # settings, fonts, messages
    composables/ # useTheme, useOnlineApi, useDialog
    utils/       # filePicker, directoryScanner, fileIO, templateCode
    components/  # WindowControls, Layout, ToolStub
    layouts/     # (合并进 components/Layout)
    pages/       # 12 个工具 + index + settings + fonts
```

---

## 7. 分阶段执行计划

- **会话 1（本次）**：分析 + `PLANNING.md` + 项目骨架（git init、package.json、electron-vite 配置、electron-builder 兼容配置、tsconfig、main/preload 骨架、renderer 核心）+ 实现 1 个示范工具 `palette.vue`。注册为子模块。
- **会话 2**：基础模块补全 + 简单工具批处理类（resizer / compress / convert / exif）—— 共用 `image` 主进程 IPC。
- **会话 3**：watermark + globalWatermark（含模板码 templateCode + 目录批量）。
- **会话 4**：splicer + slicer + cropper（含模板）。
- **会话 5**：textToImage（CKEditor5 + html2canvas）+ fonts（在线字体）+ settings（上报、备份）。
- **会话 6**：深色模式/主题色 UI 接入所有页面、默认保存路径/默认参数接入所有导出、自动更新联调、win/mac 打包验证。

---

## 8. 待确认 / 风险

- [ ] 后端是否已有 `/image_toolkit/usage` 用量上报接口？若无需在 `potatofield-backend` 补。
- [ ] `asar: false` 是否必须？为兼容 `static/` 资源路径沿用；后续可评估改为 true。
- [ ] cropperjs 版本：v1（老）vs v2 API 不同，按 v1 渐进迁移。
- [ ] CKEditor5 体积大，textToImage 是否仍用 CKEditor5 或换更轻方案（TipTap/Quill）？暂沿用 CKEditor5。
- [ ] 老项目 `select-folder` 用 sendSync（阻塞）；新项目改用 `invoke`（Promise，非阻塞）。

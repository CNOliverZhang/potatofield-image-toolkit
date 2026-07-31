# 洋芋田图像工具箱（重写版）

老项目 `PotatofieldImageToolkit`（Electron 11 + Vue 2）的现代化重写版本。

- 构建：[electron-vite](https://electron-vite.org)（Vite + TypeScript，主进程 / 预加载 / 渲染进程统一构建）
- 框架：Vue 3（`<script setup lang="ts">`）+ Vue Router 4 + Pinia
- UI：Element Plus + Font Awesome
- 图像处理：`sharp`（运行于**主进程**，渲染进程经 IPC 调用，避免阻塞 UI）
- 状态持久化：Pinia + `pinia-plugin-persistedstate`（localStorage）
- 更新：`electron-updater`，沿用老版本更新源（保持兼容）

## 开发

```bash
npm install
npm run dev        # 启动 Vite + Electron 开发模式
npm run build      # 构建主进程 / 预加载 / 渲染进程
npm run package    # 打包（win/nsis + mac/dmg）
```

## 目录结构

```
src/
  main/        主进程：窗口管理、IPC、图像处理(sharp)、更新、文件 IO
  preload/     预加载：contextBridge 暴露 window.api
  shared/      主/渲染共享类型
  renderer/    渲染进程：router / stores / composables / utils / components / pages
```

## 功能模块（12 个工具）

加水印、全屏水印、长图拼接、裁剪、分割、富文本制图、尺寸调整、压缩、格式转换、EXIF 读取、色彩提取、字体管理。

详细拆解与分阶段计划见 [`PLANNING.md`](./PLANNING.md)，进度见 [`PROGRESS.md`](./PROGRESS.md)。

## 更新兼容性（重要）

新版本必须保持以下不变，老客户端才能自动更新到新版本：

- `appId`: `cn.potatofield.imagetoolkit`
- `publish.url`: `https://files.potatofield.cn/ImageToolkit/Packages/`
- `win.target`: `nsis`，`mac.target`: `dmg`
- `asar`: `false`

## 图标

打包需要 `build/icons/` 下的图标文件（从老项目 `PotatofieldImageToolkit/build/icons` 复制）：

- `icon.ico`（Windows）
- `icon.icns`（macOS）
- `icon.png`（托盘）

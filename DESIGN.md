# 洋芋田图像工具箱 · UI 设计语言（Liquid Glass 液态玻璃）

> 本文档定义整个重写的视觉风格。所有页面、组件、弹窗必须遵循本文档的变量与规范。
> 最后更新：2026-07-31（确立风格阶段）

---

## 0. 设计语言总览

**风格：Apple 风格的半透明液态玻璃（Liquid Glass / Glassmorphism）**

核心视觉特征：
- 窗口本体半透明，桌面壁纸透过玻璃被模糊，形成"液态"质感
- 面板、卡片、标题栏均为玻璃层，浮于半透明外壳之上
- 玻璃边缘有 1px 高光线（top highlight）+ 柔和投影，模拟光线在玻璃上的折射
- 主题色（用户可在设置中调节）作为唯一强调色，用于：激活态、主按钮、链接、logo、焦点环
- 深色模式下玻璃转为暗色半透明，高光变弱、阴影变深

---

## 1. 窗口层配置（主进程）

文件：`src/main/windows.ts`

| 配置 | 值 | 说明 |
|---|---|---|
| `transparent` | `true` | 窗口本体透明，**液态玻璃的前提** |
| `backgroundColor` | `'#00000000'` | 全透明；若有值时才会遮挡模糊 |
| `frame` | `false` | 无系统边框（配合自定义标题栏） |
| `titleBarStyle` | `'hidden'` | 隐藏标题栏，自绘 WindowControls |
| `resizable` | 暂保持默认 | 透明窗口无系统边框拖拽；resize 在后续会话用边缘 handle 实现 |
| 圆角 | 由 CSS `.app-shell { border-radius }` 负责 | transparent 窗口本身方形，玻璃层切圆角，四角透明 |

**注意**：`transparent: true` 与 macOS 的 `vibrancy` 互斥。本项目**真实折射由原生面板提供**（见 §1.1），CSS `backdrop-filter` 仅作为 macOS / 不支持原生玻璃环境时的回退着色，不可依赖它去模糊 Windows 桌面（Electron 透明窗口的 `backdrop-filter` 在 Windows 上只能模糊同页面 DOM，无法模糊 OS 桌面）。

### 1.1 原生液态玻璃面板（真实折射，Windows 专用）

文件：`src/main/glass.ts` + 依赖 `@hicccc77/electron-liquid-glass`

实现方式：用一个独立原生窗口（DXGI 桌面复制 + D3D11 着色 + DirectComposition）实时折射桌面，钉在主窗口正下方作为玻璃背景；Electron 透明窗口只绘制玻璃"表面"（高光/描边/着色/文字）。

- `glass.ts` 在窗口创建后调用 `attachGlass(win)`：
  - 以 `screen.getDisplayMatching(bounds).scaleFactor` 作为 dpr，将窗口逻辑坐标换算为**物理像素**传给原生面板；
  - 监听 `move` / `resize` 同步面板位置与尺寸，`minimize`/`restore` 控制显隐，`closed` 时销毁；
  - 圆角 `cornerRadius = 14 * dpr`，与 CSS `.layout` 的 14px 圆角对齐；`displacementScale: 70`（边缘透镜位移）、`aberrationIntensity: 1.8`、`saturation: 1.4`、`blurSigma: 6`；
  - 支持时向渲染进程注入 `document.documentElement.dataset.nativeGlass = "true"`。
- `isSupported()` 在非 Windows 或后端不可用时返回 `false`，此时不创建面板，走 CSS 回退（§2/§3 较厚着色）。
- 该包必须在 `electron.vite.config.ts` 的 `rollupOptions.external` 中声明（原生 `.node`，不可被打包）。

---

## 2. CSS 变量系统

文件：`src/renderer/styles/global.css`

### 2.1 保留并沿用的语义变量（来自老系统）
- `--main-color`：主题色（JS 注入，用户可改）
- `--text-color` / `--text-secondary`：文字颜色
- `--border-color`

### 2.2 新增玻璃变量

```css
:root {
  /* 液态玻璃核心 */
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-bg-strong: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-highlight: rgba(255, 255, 255, 0.85);
  --glass-shadow: 0 8px 32px rgba(31, 38, 135, 0.12);
  --glass-blur: 28px;
  --glass-saturate: 180%;
}

html[data-theme='dark'] {
  --glass-bg: rgba(30, 30, 32, 0.5);
  --glass-bg-strong: rgba(30, 30, 32, 0.68);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-highlight: rgba(255, 255, 255, 0.16);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}
```

### 2.3 根背景透明化（关键）

```css
html, body, #app {
  background: transparent;   /* 不能写 var(--bg-color)，否则遮住桌面模糊 */
}
```

---

## 3. 玻璃工具类（复用）

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
.glass-strong { background: var(--glass-bg-strong); }
```

所有"浮层"容器（卡片、弹窗、侧边栏、标题栏、工具面板）统一加 `.glass` / `.glass-strong`。

---

## 4. 全局外壳（Layout）

`.app-shell`（即 Layout 的 `.layout`）为顶层玻璃容器：
- `height: 100%`，`border-radius: 14px`，`overflow: hidden`
- 组合玻璃背景 + 阴影 + 顶部内高光（`inset 0 1px 0 var(--glass-highlight)`）
- 内部 `display: flex; flex-direction: column`：标题栏在上，body 在下

子层：
- 标题栏（WindowControls）：`.glass-strong` + 顶边圆角 + 底部分隔高光
- 侧边栏（sidebar）：`.glass` + 右侧 1px 高光边
- 内容区（content）：透明或极淡玻璃，承载各工具卡片

---

## 5. 与 Element Plus 的融合

通过覆盖 Element Plus 的 CSS 变量，使 el-card / el-button / el-menu / el-dialog / el-input 等融入玻璃风格：

```css
:root {
  --el-color-primary: var(--main-color);
  --el-bg-color: transparent;
  --el-bg-color-overlay: var(--glass-bg);
  --el-fill-color-blank: rgba(255, 255, 255, 0.35);
  --el-border-color: var(--glass-border);
  --el-border-color-light: var(--glass-border);
  --el-border-color-lighter: var(--glass-border);
  --el-mask-color: rgba(0, 0, 0, 0.4);
}
html[data-theme='dark'] {
  --el-fill-color-blank: rgba(255, 255, 255, 0.08);
}
```

具体组件（el-card / el-menu / el-dialog 等）在开发时按需叠加 `.glass` 类。

---

## 6. 组件规范（后续开发必须遵守）

1. **每页根容器**：用 `.glass` 或容器壳包裹，不要直接铺在透明 content 上。
2. **卡片/面板**：`class="glass card"` 形式。
3. **主按钮**：`type="primary"` 自动用 `--main-color`。
4. **激活态/选中态**：用主题色描边/底色，不另起颜色。
5. **弹窗**：`el-dialog` 加 `.glass`；自定义浮层一律 `.glass`。
6. **深色模式**：不要写死颜色，全部走变量；仅通过 `[data-theme='dark']` 切换。
7. **字体**：沿用系统字体栈（已定义，含 PingFang SC / Microsoft YaHei）。
8. **圆角统一**：外壳 14px，卡片/面板 10px，按钮/输入 8px。

---

## 7. 主题色（用户可调）与玻璃的关系

- `--main-color` 由 `useTheme.ts` 在运行时注入（读取 `settings.themeColor`），不在 CSS 里写死。
- 玻璃背景/边框/高光均为中性色（白/黑 + alpha），**不随主题色变化**，保证"玻璃"质感稳定；主题色仅作强调。
- 未来若需"彩色玻璃"，可扩展 `--glass-tint` 变量由主题色派生（暂不做）。

---

## 8. 跨平台注意

- **Windows（主力，真实液态玻璃）**：`transparent: true` 仅让窗口透明，**并不能**让 `backdrop-filter` 模糊 OS 桌面。真实折射由 `@hicccc77/electron-liquid-glass` 原生面板提供（见 §1.1）。`isSupported()` 为 `true` 时渲染进程进入 `data-native-glass='true'` 轻量着色模式。
- **macOS / 不支持原生玻璃的环境（回退）**：不创建原生面板，`data-native-glass` 不设置，沿用 §2/§3 较厚的 glassmorphism 着色（此时 `backdrop-filter` 在 macOS 上可模糊桌面，作为近似效果）。
- 透明窗口下 `el-dialog` 默认居中弹窗的背景遮罩（mask）用 40% 黑，确保可读。

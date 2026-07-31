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

**注意**：`transparent: true` 与 macOS 的 `vibrancy` 互斥。本项目统一用 `transparent + CSS backdrop-filter`，保证 win/mac 一致。

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

- **Windows**：`backdrop-filter` 在 Win10/11 可用；透明窗口需自行绘制圆角与阴影（已由 `.app-shell` 的 border-radius + box-shadow 解决）。
- **macOS**：`transparent: true` 同样生效；若后续启用 `vibrancy` 需去掉 `transparent`（本项目不采用，保持双平台一致）。
- 透明窗口下 `el-dialog` 默认居中弹窗的背景遮罩（mask）用 40% 黑，确保可读。

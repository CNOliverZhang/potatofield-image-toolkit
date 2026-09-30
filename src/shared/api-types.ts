import type {
  ImageProcessPayload,
  ImageProcessResult,
  SelectFileOptions,
  UpdaterStatus
} from './types';

export interface ImageToolkitApi {
  app: {
    version: () => Promise<string>;
    appDataPath: () => Promise<string>;
    relaunch: () => Promise<void>;
    /** 是否为打包后运行（开发模式下 electron-updater 不会真正检查更新） */
    isPackaged: () => Promise<boolean>;
    /** 是否随系统开机启动 */
    getOpenAtLogin: () => Promise<boolean>;
    setOpenAtLogin: (open: boolean) => Promise<void>;
    /** 界面缩放比例（1 = 100%） */
    getZoomFactor: () => Promise<number>;
    setZoomFactor: (factor: number) => Promise<number>;
    /** 当前系统是否启用了窗口材质（macOS 玻璃 / Windows 11 亚克力）：为 true 时页面背景应全透明 */
    windowMaterial: boolean;
  };
  dialog: {
    selectFile: (options: SelectFileOptions) => Promise<string[] | null>;
    selectDirectory: (defaultPath?: string) => Promise<string | null>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (fullPath: string) => Promise<void>;
    /** 用系统默认程序打开（字体文件会调起系统字体安装器） */
    openPath: (fullPath: string) => Promise<string>;
  };
  image: {
    process: (payload: ImageProcessPayload) => Promise<ImageProcessResult>;
  };
  fs: {
    scanDirectory: (
      root: string,
      extensions: string[]
    ) => Promise<{ fileList: string[]; errorList: { path: string; error: string }[] }>;
    readFileBase64: (path: string) => Promise<string>;
    writeFileBase64: (path: string, base64: string) => Promise<void>;
    ensureDir: (path: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    stat: (path: string) => Promise<{ size: number; isDirectory: boolean } | null>;
    /** 删除文件或目录（不存在也不报错） */
    remove: (path: string) => Promise<void>;
  };
  font: {
    /** 列出系统已安装字体（force 跳过缓存立即重读） */
    listInstalled: (force?: boolean) => Promise<{ family: string; style: string }[]>;
    isInstalled: (family: string, style?: string) => Promise<boolean>;
    matchInstalled: (
      list: { family: string; style: string }[],
      family: string,
      style?: string
    ) => Promise<boolean>;
  };
  updater: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    quitAndInstall: () => Promise<void>;
    onStatus: (callback: (status: UpdaterStatus) => void) => () => void;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChanged: (callback: (maximized: boolean) => void) => () => void;
    open: (options: {
      route?: string;
      key?: string;
      width?: number;
      height?: number;
      minWidth?: number;
      minHeight?: number;
    }) => void;
  };
  /** 跨窗口主题同步：任意窗口切换深色模式/主题色后广播给其它窗口 */
  theme: {
    set: (darkMode: boolean, themeColor: string) => void;
    onChanged: (
      callback: (payload: { darkMode: boolean; themeColor: string }) => void
    ) => () => void;
  };
}

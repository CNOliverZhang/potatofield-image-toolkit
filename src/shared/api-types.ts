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
  };
  dialog: {
    selectFile: (options: SelectFileOptions) => Promise<string[] | null>;
    selectDirectory: (defaultPath?: string) => Promise<string | null>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
    showItemInFolder: (fullPath: string) => Promise<void>;
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
}

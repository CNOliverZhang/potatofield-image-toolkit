import { reactive } from 'vue';

export type ToastType = 'success' | 'warning' | 'info' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/** 自定义动作按钮（多选一对话框用） */
export interface DialogAction {
  label: string;
  /** 点击后 resolve 的值 */
  value: string;
  appearance?: 'accent' | 'neutral';
}

export type DialogType = 'alert' | 'confirm' | 'choose';

export interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  type: DialogType;
  actions?: DialogAction[];
  resolve: ((value: boolean | string) => void) | null;
}

export const ui = reactive({
  toasts: [] as ToastItem[],
  dialog: {
    visible: false,
    title: '',
    message: '',
    type: 'alert',
    actions: undefined,
    resolve: null
  } as DialogState
});

let toastSeq = 0;

export function pushToast(message: string, type: ToastType = 'info'): void {
  const id = ++toastSeq;
  ui.toasts.push({ id, message, type });
  window.setTimeout(() => {
    const idx = ui.toasts.findIndex((t) => t.id === id);
    if (idx >= 0) ui.toasts.splice(idx, 1);
  }, 2600);
}

/** 打开对话框：alert/confirm 返回 boolean，choose 返回所选动作的 value */
export function openDialog(
  type: DialogType,
  message: string,
  title: string,
  actions?: DialogAction[]
): Promise<boolean | string> {
  return new Promise<boolean | string>((resolve) => {
    ui.dialog = { visible: true, title, message, type, actions, resolve };
  });
}

export function closeDialog(result: boolean | string): void {
  const { resolve } = ui.dialog;
  ui.dialog.visible = false;
  ui.dialog.resolve = null;
  if (resolve) resolve(result);
}

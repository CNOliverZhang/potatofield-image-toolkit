import { reactive } from 'vue';

export type ToastType = 'success' | 'warning' | 'info' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  resolve: ((value: boolean) => void) | null;
}

export const ui = reactive({
  toasts: [] as ToastItem[],
  dialog: {
    visible: false,
    title: '',
    message: '',
    type: 'alert',
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

export function openDialog(
  type: 'alert' | 'confirm',
  message: string,
  title: string
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    ui.dialog = { visible: true, title, message, type, resolve };
  });
}

export function closeDialog(result: boolean): void {
  const { resolve } = ui.dialog;
  ui.dialog.visible = false;
  ui.dialog.resolve = null;
  if (resolve) resolve(result);
}

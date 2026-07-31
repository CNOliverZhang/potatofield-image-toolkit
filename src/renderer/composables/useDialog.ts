import { pushToast, openDialog } from './ui';

export function useDialog() {
  return {
    message: (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') =>
      pushToast(msg, type),
    alert: (message: string, title = '提示') => openDialog('alert', message, title),
    confirm: (message: string, title = '确认') => openDialog('confirm', message, title)
  };
}

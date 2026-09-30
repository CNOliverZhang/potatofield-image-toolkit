import { pushToast, openDialog, type DialogAction } from './ui';

export function useDialog() {
  return {
    message: (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') =>
      pushToast(msg, type),
    alert: (message: string, title = '提示') => openDialog('alert', message, title),
    confirm: (message: string, title = '确认') => openDialog('confirm', message, title),
    /** 多选一：返回被点击动作的 value */
    choose: async (message: string, title = '请选择', actions: DialogAction[]): Promise<string> =>
      (await openDialog('choose', message, title, actions)) as string
  };
}

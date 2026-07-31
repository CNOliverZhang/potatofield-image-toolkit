import { ElMessage, ElMessageBox } from 'element-plus';

export function useDialog() {
  return {
    message: (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') =>
      ElMessage({ message: msg, type }),
    alert: (message: string, title = '提示') =>
      ElMessageBox.alert(message, title, { confirmButtonText: '确定' }),
    confirm: (message: string, title = '确认') =>
      ElMessageBox.confirm(message, title, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
  };
}

/**
 * 模板类型清单（单一数据源）
 *
 * 模板库页面的左侧类型侧栏、模板编辑窗口的入口都从这里取，
 * 后续新增工具的模板只需在这里加一行（key 与 TemplateToolKey 对齐）。
 */

export interface TemplateTypeEntry {
  /** 与 shared/types 的 TemplateToolKey 对齐 */
  key: string;
  label: string;
  /** font-awesome solid 图标名 */
  icon: string;
}

export const templateTypes: TemplateTypeEntry[] = [{ key: 'watermark', label: '水印模板', icon: 'stamp' }];

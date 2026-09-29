/**
 * 工具清单（单一数据源）
 *
 * 首页卡片、侧边栏导航、各工具页图片输入区的图标，全部从这里取，
 * 避免出现「同一个工具在三个地方叫法 / 图标不一致」的情况。
 */

export interface ToolEntry {
  /** 单张处理路由 */
  path: string;
  label: string;
  desc: string;
  /** font-awesome solid 图标名（kebab-case，如 'file-zipper'） */
  icon: string;
  group: string;
  /** 批量处理路由，存在时首页卡片显示「批量处理」入口 */
  batchRoute?: string;
}

/** 首页分组顺序 */
export const toolGroups = ['图像处理', '优化输出', '信息与素材'];

export const tools: ToolEntry[] = [
  { path: '/watermark', label: '加水印', desc: '为图片添加文字或图片水印', icon: 'stamp', group: '图像处理', batchRoute: '/watermark/batch' },
  { path: '/splicer', label: '长图拼接', desc: '将多张图片拼接为一张长图', icon: 'bars-staggered', group: '图像处理' },
  { path: '/cropper', label: '裁剪', desc: '裁剪出想要的画面区域', icon: 'crop', group: '图像处理', batchRoute: '/cropper/batch' },
  { path: '/slicer', label: '分割', desc: '将图片切分为多个分块', icon: 'grip', group: '图像处理' },
  { path: '/text-to-image', label: '文本转图片', desc: '将文本内容渲染为图片', icon: 'paragraph', group: '图像处理' },
  { path: '/resizer', label: '尺寸调整', desc: '调整图片的尺寸与比例', icon: 'maximize', group: '图像处理', batchRoute: '/resizer/batch' },
  { path: '/compress', label: '压缩', desc: '在保证画质的前提下减小体积', icon: 'file-zipper', group: '优化输出', batchRoute: '/compress/batch' },
  { path: '/convert', label: '格式转换', desc: '在常见图片格式之间转换', icon: 'repeat', group: '优化输出', batchRoute: '/convert/batch' },
  { path: '/exif', label: 'EXIF 读取', desc: '查看图片的 EXIF 信息', icon: 'circle-info', group: '信息与素材' },
  { path: '/palette', label: '色彩提取', desc: '提取图片中的主要配色', icon: 'palette', group: '信息与素材' },
  { path: '/fonts', label: '字体管理', desc: '浏览与管理本机字体', icon: 'font', group: '信息与素材' }
];

export function findTool(path: string): ToolEntry | undefined {
  return tools.find((tool) => tool.path === path);
}

const { notarize } = require('electron-notarize');

/**
 * macOS 公证（afterSign 钩子，仅 darwin 生效）。
 *
 * 凭据由 scripts/notarize-config.js 提供，该文件**不入库**（已在 .gitignore 中）。
 * 与富文本编辑器用的是同一份 Apple 开发者账号凭据（Apple ID + 应用专用密码 + Team ID），
 * 公证凭据属于「团队」而非某个 app，因此跨产品通用。
 */
exports.default = async (context) => {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }
  // 本地只想快速出包（不上传 Apple 等待公证）时用：IT_SKIP_NOTARIZE=1 npm run package:mac
  if (process.env.IT_SKIP_NOTARIZE === '1') {
    console.log('[notarize] IT_SKIP_NOTARIZE=1，跳过公证');
    return;
  }
  // 支持两种鉴权方式，任选其一：
  //   1. Apple ID：  { appleId, appleIdPassword, teamId }
  //   2. ASC API Key：{ appleApiKey, appleApiKeyId, appleApiIssuer }
  // 注意：文件名带 .cjs（项目 package.json 是 ESM），require 必须写全扩展名
  const credentials = require('./notarize-config.cjs');
  const appName = context.packager.appInfo.productFilename;
  console.log('[notarize] 已提交 Apple 公证，等待结果（通常 1–5 分钟，慢时可能更久）…');
  await notarize({
    appBundleId: 'cn.potatofield.imagetoolkit',
    appPath: `${appOutDir}/${appName}.app`,
    // Apple 已于 2023 年底停用旧的 altool 公证方式，
    // electron-notarize 默认会回退到 legacy 链路，必须显式指定 notarytool
    tool: 'notarytool',
    ...credentials
  });
  console.log('[notarize] 公证完成');
};

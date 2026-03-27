/**
 * 飞书文档转换模块 - 入口文件
 * 小1 负责
 *
 * 功能：飞书文档 → Markdown → 公众号 HTML
 */

const { fetchFeishu, extractDocId } = require('./fetch');

/**
 * 飞书文档 → Markdown（主函数）
 * @param {string} url - 飞书文档链接
 * @returns {string} Markdown 内容
 */
async function convertFeishu(url) {
  return await fetchFeishu(url);
}

module.exports = { convertFeishu, fetchFeishu, extractDocId };

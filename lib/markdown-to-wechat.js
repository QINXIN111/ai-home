/**
 * Markdown → 公众号 HTML 转换引擎
 * 小q 验证通过，工程师封装
 */

function markdownToWechatHtml(markdown) {
  // 按 --- 分隔符拆分文章
  const articles = markdown.split(/\n---\n/);

  const htmlBlocks = articles.map(article => {
    const lines = article.trim().split('\n');
    let title = '';
    let images = [];
    let meta = [];
    let contentLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 标题
      if (/^#{1}\s+(.+)/.test(trimmed)) {
        title = trimmed.replace(/^#{1}\s+/, '');
      }
      // 图片
      else if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(trimmed)) {
        const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        images.push({ alt: match[1], src: match[2] });
      }
      // 元信息
      else if (/^📌/.test(trimmed) || /^📎/.test(trimmed)) {
        meta.push(trimmed);
      }
      // 其他内容
      else if (!/^#/.test(trimmed)) {
        contentLines.push(trimmed);
      }
    }

    // 构建单篇文章 HTML
    let html = '';
    if (title) {
      html += `  <h1>${escapeHtml(title)}</h1>\n`;
    }
    // 内容段落
    for (const cl of contentLines) {
      html += `  <p>${escapeHtml(cl)}</p>\n`;
    }
    // 图片
    for (const img of images) {
      html += `  <img src="${img.src}" alt="${escapeHtml(img.alt)}">\n`;
    }
    // 元信息
    if (meta.length) {
      html += '  <div class="meta">\n';
      for (const m of meta) {
        html += `    ${formatMeta(m)}\n`;
      }
      html += '  </div>\n';
    }

    return html;
  });

  const body = htmlBlocks.join('<div class="section-divider"></div>\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .article { max-width: 677px; margin: 0 auto; background: #fff; padding: 20px 16px 30px; margin-bottom: 10px; }
  .article h1 { font-size: 22px; font-weight: bold; color: #333; line-height: 1.5; margin: 0 0 16px; }
  .article p { font-size: 15px; color: #333; line-height: 1.8; margin: 0 0 10px; }
  .article img { width: 100%; border-radius: 4px; margin: 10px 0; display: block; }
  .meta { font-size: 13px; color: #999; line-height: 2; padding: 12px 0 0; border-top: 1px solid #eee; }
  .meta a { color: #576b95; text-decoration: none; }
  .section-divider { height: 10px; background: #f5f5f5; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

function formatMeta(line) {
  // 格式化作者和链接
  let formatted = escapeHtml(line);
  const urlMatch = formatted.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    formatted = formatted.replace(urlMatch[0], `<a href="${urlMatch[0]}">原文链接</a>`);
  }
  return formatted;
}

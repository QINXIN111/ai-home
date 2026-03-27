/**
 * 小红书抓取模块 - 小q
 * 输入链接 → 输出标准 Markdown
 * 
 * 注意：小红书有反爬保护，直接 HTTP 请求会被重定向到安全验证。
 *       需要浏览器 Cookie 或 Puppeteer 才能绕过。
 *       当前版本：支持直接粘贴 Markdown 内容作为备用方案。
 */
import https from 'https';
import http from 'http';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.xiaohongshu.com/',
};

export async function fetchXiaohongshu(url) {
  const noteId = extractNoteId(url);
  if (!noteId) throw new Error('无法从链接中提取笔记 ID');

  const html = await fetchHtml(url);
  const data = parseNotePage(html);
  return formatMarkdown(data);
}

function extractNoteId(url) {
  const match = url.match(/\/explore\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: HEADERS }, (res) => {
      // 小红书安全重定向检测
      if (res.statusCode === 302 && res.headers.location?.includes('sec_')) {
        reject(new Error('小红书触发安全验证，需要浏览器 Cookie。请直接粘贴 Markdown 内容。'));
        return;
      }
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('请求超时')); });
  });
}

function parseNotePage(html) {
  const data = { title: '', content: '', images: [], author: '' };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
  if (titleMatch) data.title = titleMatch[1].split(' ')[0];

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (descMatch) data.content = descMatch[1];

  const imgRegex = /https:\/\/sns-webpic-qc\.xhscdn\.com[^"'\s)]+/g;
  const imgs = html.match(imgRegex) || [];
  data.images = [...new Set(imgs)].slice(0, 9);

  const authorMatch = html.match(/"nickName"\s*:\s*"([^"]+)"/);
  if (authorMatch) data.author = authorMatch[1];

  return data;
}

function formatMarkdown(data) {
  let md = '';
  if (data.title) md += `# ${data.title}\n\n`;
  if (data.content) md += `${data.content}\n\n`;
  for (let i = 0; i < data.images.length; i++) {
    md += `![图片${i + 1}](${data.images[i]})\n\n`;
  }
  if (data.author) {
    md += `---\n\n📌 原作者：${data.author}\n`;
  }
  return md.trim();
}

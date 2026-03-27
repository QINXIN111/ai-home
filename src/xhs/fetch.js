/**
 * 小红书抓取模块 - 小q
 * 输入链接 → 输出标准 Markdown
 */

const https = require('https');
const http = require('http');

// 模拟浏览器请求头
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.xiaohongshu.com/',
};

/**
 * 抓取小红书笔记，转为 Markdown
 * @param {string} url - 小红书笔记链接
 * @returns {string} Markdown 内容
 */
async function fetchXiaohongshu(url) {
  // 提取笔记 ID
  const noteId = extractNoteId(url);
  if (!noteId) throw new Error('无法从链接中提取笔记 ID');

  // 获取笔记页面 HTML
  const html = await fetchHtml(url);

  // 解析页面内容（基础版）
  const data = parseNotePage(html);

  // 格式化为 Markdown
  return formatMarkdown(data);
}

/**
 * 从 URL 提取笔记 ID
 */
function extractNoteId(url) {
  // 格式: https://www.xiaohongshu.com/explore/670431f2000000001902e0ad
  const match = url.match(/\/explore\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

/**
 * 发起 HTTP(S) 请求
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: HEADERS }, (res) => {
      // 跟随重定向
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

/**
 * 解析笔记页面（基础版 - 正则提取）
 * 后续可升级为 Puppeteer / Cheerio
 */
function parseNotePage(html) {
  const data = {
    title: '',
    content: '',
    images: [],
    author: '',
  };

  // 提取标题
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
  if (titleMatch) data.title = titleMatch[1].split(' ')[0]; // 取第一段

  // 提取描述 meta
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (descMatch) data.content = descMatch[1];

  // 提取图片
  const imgRegex = /https:\/\/sns-webpic-qc\.xhscdn\.com[^"'\s)]+/g;
  const imgs = html.match(imgRegex) || [];
  data.images = [...new Set(imgs)].slice(0, 9); // 去重，最多9张

  // 提取作者
  const authorMatch = html.match(/"nickName"\s*:\s*"([^"]+)"/);
  if (authorMatch) data.author = authorMatch[1];

  return data;
}

/**
 * 格式化为 Markdown
 */
function formatMarkdown(data) {
  let md = '';

  if (data.title) md += `# ${data.title}\n\n`;
  if (data.content) md += `${data.content}\n\n`;

  // 图片
  for (let i = 0; i < data.images.length; i++) {
    md += `![图片${i + 1}](${data.images[i]})\n\n`;
  }

  // 作者信息
  if (data.author) {
    md += `---\n\n`;
    md += `📌 原作者：${data.author}\n`;
  }

  return md.trim();
}

module.exports = { fetchXiaohongshu };

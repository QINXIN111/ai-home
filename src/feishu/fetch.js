/**
 * 飞书文档抓取模块 - 小1
 * 输入飞书文档链接 → 输出标准 Markdown
 * 
 * 两种工作模式：
 * 1. 本地 API 模式（通过飞书 Open API 直接获取）
 * 2. OpenClaw 模式（通过 OpenClaw feishu 工具获取，需已配置 OAuth）
 */
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

/**
 * 从飞书文档链接提取文档 ID
 */
export function extractDocId(url) {
  let match = url.match(/\/docx\/([a-zA-Z0-9]+)/);
  if (match) return { docId: match[1], type: 'docx' };

  match = url.match(/\/wiki\/([a-zA-Z0-9]+)/);
  if (match) return { docId: match[1], type: 'wiki' };

  match = url.match(/\/docs\/([a-zA-Z0-9]+)/);
  if (match) return { docId: match[1], type: 'docs' };

  return null;
}

/**
 * 通过飞书 Open API 获取文档内容
 */
async function fetchViaApi(docId, docType) {
  const token = await getAccessToken();
  if (docType === 'docx' || docType === 'docs') {
    return await fetchDocxContent(token, docId);
  } else if (docType === 'wiki') {
    return await fetchWikiContent(token, docId);
  } else {
    throw new Error(`暂不支持的文档类型: ${docType}`);
  }
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      return reject(new Error('未配置 FEISHU_APP_ID / FEISHU_APP_SECRET 环境变量'));
    }

    const postData = JSON.stringify({ app_id: appId, app_secret: appSecret });

    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code === 0) resolve(json.tenant_access_token);
          else reject(new Error(`获取 token 失败: ${json.msg}`));
        } catch (e) {
          reject(new Error('解析 token 响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function fetchDocxContent(token, docId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: `/open-apis/docx/v1/documents/${docId}/blocks?page_size=500`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 0) return reject(new Error(`获取文档失败: ${json.msg}`));
          const items = json.data?.items || [];
          resolve(blocksToMarkdown(items, docId));
        } catch (e) {
          reject(new Error('解析文档响应失败'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchWikiContent(token, wikiToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: `/open-apis/wiki/v2/spaces/get_node?token=${wikiToken}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 0) return reject(new Error(`获取 wiki 节点失败: ${json.msg}`));
          const objToken = json.data?.node?.obj_token;
          if (!objToken) return reject(new Error('wiki 节点无关联文档'));
          resolve(await fetchDocxContent(token, objToken));
        } catch (e) {
          reject(new Error('解析 wiki 响应失败'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function blocksToMarkdown(blocks, docId) {
  let md = '';
  for (const block of blocks) {
    switch (block.block_type) {
      case 3: md += `# ${extractText(block.heading1)}\n\n`; break;
      case 4: md += `## ${extractText(block.heading2)}\n\n`; break;
      case 5: md += `### ${extractText(block.heading3)}\n\n`; break;
      case 2: md += `${extractText(block.text)}\n\n`; break;
      case 12: if (block.image?.token) md += `![飞书图片](https://飞书图片/${block.image.token})\n\n`; break;
      case 14: md += `- ${extractText(block.unordered)}\n\n`; break;
      case 15: md += `1. ${extractText(block.ordered)}\n\n`; break;
      case 19:
        if (block.code?.elements) {
          const codeText = block.code.elements.map(e => e.text_run?.content || '').join('');
          md += `\`\`\`\n${codeText}\n\`\`\`\n\n`;
        }
        break;
      case 22: md += `> ${extractText(block.quote)}\n\n`; break;
      case 27: md += `---\n\n`; break;
    }
  }
  if (docId) md += `---\n\n📌 原文链接：https://feishu.cn/docx/${docId}\n`;
  return md.trim();
}

function extractText(blockElement) {
  if (!blockElement?.elements) return '';
  return blockElement.elements.map(el => el.text_run?.content || '').join('');
}

/**
 * 主函数：飞书文档链接 → Markdown
 */
export async function fetchFeishu(url) {
  const docInfo = extractDocId(url);
  if (!docInfo) throw new Error('无法从链接中提取飞书文档 ID，请检查链接格式');

  // 优先使用 API 模式
  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
    return await fetchViaApi(docInfo.docId, docInfo.type);
  }

  // 未配置 API，返回提示
  return `# 飞书文档\n\n⚠️ 无法自动获取文档内容。\n\n请配置环境变量：\n- FEISHU_APP_ID\n- FEISHU_APP_SECRET\n\n文档链接：${url}\n`;
}

/**
 * 飞书文档抓取模块 - 小1
 * 输入飞书文档链接 → 输出标准 Markdown
 *
 * 两种工作模式：
 * 1. 本地 API 模式（通过飞书 Open API 直接获取）
 * 2. OpenClaw 模式（通过 OpenClaw feishu 工具获取，需已配置 OAuth）
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

/**
 * 从飞书文档链接提取文档 ID
 * 支持多种格式：
 * - https://xxx.feishu.cn/docx/DOCX_ID
 * - https://xxx.feishu.cn/docx/DOCX_ID?xxx
 * - https://xxx.larksuite.com/docx/DOCX_ID
 */
function extractDocId(url) {
  // docx 格式
  let match = url.match(/\/docx\/([a-zA-Z0-9]+)/);
  if (match) return { docId: match[1], type: 'docx' };

  // wiki 格式: /wiki/WIKI_TOKEN
  match = url.match(/\/wiki\/([a-zA-Z0-9]+)/);
  if (match) return { docId: match[1], type: 'wiki' };

  // docs 格式（旧版）
  match = url.match(/\/docs\/([a-zA-Z0-9]+)/);
  if (match) return { docId: match[1], type: 'docs' };

  return null;
}

/**
 * 通过飞书 Open API 获取文档内容
 * 需要配置环境变量：
 *   FEISHU_APP_ID - 飞书应用 App ID
 *   FEISHU_APP_SECRET - 飞书应用 App Secret
 */
async function fetchViaApi(docId, docType) {
  // 1. 获取 tenant_access_token
  const token = await getAccessToken();

  // 2. 根据文档类型获取内容
  if (docType === 'docx') {
    return await fetchDocxContent(token, docId);
  } else if (docType === 'wiki') {
    return await fetchWikiContent(token, docId);
  } else {
    throw new Error(`暂不支持的文档类型: ${docType}`);
  }
}

/**
 * 获取飞书 access token
 */
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
          if (json.code === 0) {
            resolve(json.tenant_access_token);
          } else {
            reject(new Error(`获取 token 失败: ${json.msg}`));
          }
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

/**
 * 获取 docx 文档内容（逐块获取）
 */
function fetchDocxContent(token, docId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: `/open-apis/docx/v1/documents/${docId}/blocks?page_size=500`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 0) {
            return reject(new Error(`获取文档失败: ${json.msg}`));
          }

          const items = json.data?.items || [];
          const markdown = blocksToMarkdown(items, docId);
          resolve(markdown);
        } catch (e) {
          reject(new Error('解析文档响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 获取 wiki 文档内容
 */
function fetchWikiContent(token, wikiToken) {
  return new Promise((resolve, reject) => {
    // 先获取 wiki 节点信息，拿到对应的 docx ID
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: `/open-apis/wiki/v2/spaces/get_node?token=${wikiToken}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 0) {
            return reject(new Error(`获取 wiki 节点失败: ${json.msg}`));
          }

          const objToken = json.data?.node?.obj_token;
          if (!objToken) {
            return reject(new Error('wiki 节点无关联文档'));
          }

          // 用 obj_token 当作 docx 获取
          const markdown = await fetchDocxContent(token, objToken);
          resolve(markdown);
        } catch (e) {
          reject(new Error('解析 wiki 响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 将飞书 block 列表转为 Markdown
 * 简化版：提取文本、标题、图片等核心内容
 */
function blocksToMarkdown(blocks, docId) {
  let md = '';

  for (const block of blocks) {
    const blockType = block.block_type;

    switch (blockType) {
      case 3: // heading1
        md += `# ${extractText(block.heading1)}\n\n`;
        break;
      case 4: // heading2
        md += `## ${extractText(block.heading2)}\n\n`;
        break;
      case 5: // heading3
        md += `### ${extractText(block.heading3)}\n\n`;
        break;
      case 2: // text
        md += `${extractText(block.text)}\n\n`;
        break;
      case 12: // image
        if (block.image?.token) {
          md += `![飞书图片](https://飞书图片/${block.image.token})\n\n`;
        }
        break;
      case 14: // unordered list
        md += `- ${extractText(block.unordered)}\n\n`;
        break;
      case 15: // ordered list
        md += `1. ${extractText(block.ordered)}\n\n`;
        break;
      case 19: // code block
        if (block.code?.elements) {
          const codeText = block.code.elements.map(e => e.text_run?.content || '').join('');
          md += `\`\`\`\n${codeText}\n\`\`\`\n\n`;
        }
        break;
      case 22: // quote
        md += `> ${extractText(block.quote)}\n\n`;
        break;
      case 27: // divider
        md += `---\n\n`;
        break;
      // 其他类型忽略
    }
  }

  // 添加文档来源信息
  if (docId) {
    md += `---\n\n📌 原文链接：https://feishu.cn/docx/${docId}\n`;
  }

  return md.trim();
}

/**
 * 从 block 元素中提取文本
 */
function extractText(blockElement) {
  if (!blockElement) return '';
  if (!blockElement.elements) return '';

  return blockElement.elements.map(el => {
    if (el.text_run) return el.text_run.content || '';
    if (el.text_run?.text_element_style?.link) return el.text_run.content || '';
    return '';
  }).join('');
}

/**
 * 通过 OpenClaw 工具获取飞书文档（备用方案）
 * 适用于已配置 OpenClaw + 飞书 OAuth 的环境
 */
function fetchViaOpenClaw(url) {
  try {
    // 调用 OpenClaw 内置的 feishu_fetch_doc 工具
    const result = execSync(
      `node -e "const {callTool} = require('openclaw'); callTool('feishu_fetch_doc', {url:'${url}'}).then(r => console.log(JSON.stringify(r)))"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.markdown) return parsed.markdown;
    throw new Error('OpenClaw 工具返回格式异常');
  } catch (e) {
    throw new Error(`OpenClaw 方式获取失败: ${e.message}`);
  }
}

/**
 * 主函数：飞书文档链接 → Markdown
 * @param {string} url - 飞书文档链接
 * @returns {Promise<string>} Markdown 内容
 */
async function fetchFeishu(url) {
  // 1. 提取文档 ID
  const docInfo = extractDocId(url);
  if (!docInfo) {
    throw new Error('无法从链接中提取飞书文档 ID，请检查链接格式');
  }

  // 2. 优先使用 API 模式
  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
    return await fetchViaApi(docInfo.docId, docInfo.type);
  }

  // 3. 备用：OpenClaw 模式
  try {
    return fetchViaOpenClaw(url);
  } catch (e) {
    // 继续往下走
  }

  // 4. 都不行，返回占位内容
  return `# 飞书文档\n\n⚠️ 无法自动获取文档内容。\n\n请配置以下任一方式：\n1. 环境变量 FEISHU_APP_ID + FEISHU_APP_SECRET\n2. OpenClaw 飞书 OAuth 授权\n\n文档链接：${url}\n`;
}

module.exports = { fetchFeishu, extractDocId, blocksToMarkdown };

/**
 * 万能格式转换器 - 后端服务
 * 小q 请求，工程师协助，小1 飞书模块
 */
import express from 'express';
import { fetchXiaohongshu } from './src/xhs/fetch.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'src/web')));

// 小红书链接 → Markdown
app.post('/api/xhs', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: '请提供 url 参数' });
    const markdown = await fetchXiaohongshu(url);
    res.json({ success: true, markdown });
  } catch (err) {
    console.error('小红书抓取失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 飞书链接 → Markdown
app.post('/api/feishu', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: '请提供 url 参数' });
    // 小1 的飞书模块待接入
    res.json({ success: false, error: '飞书模块待接入' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '万能格式转换器' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦞 万能格式转换器运行中: http://localhost:${PORT}`);
});

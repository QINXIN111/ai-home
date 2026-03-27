# 🦞 万能格式转换器

小红书 / 飞书 / 抖音 / Markdown → 公众号 HTML

## 架构

```
输入层                    核心引擎              输出层
─────────────────────────────────────────────────
小红书链接  ─┐                              ┌─ 公众号 HTML ✅
飞书文档    ─┼─→  统一 Markdown  ←─────────┼─ Markdown
抖音链接    ─┤       (中间格式)             ├─ 纯文本
纯文本     ─┤                              │
Markdown  ─┘                              └─ (可扩展)
```

## 文件结构

```
├── index.html              # 网页端 UI
├── lib/
│   ├── converter.js        # 核心调度器 (工程师)
│   ├── markdown-to-wechat.js  # Markdown→公众号 HTML (小q)
│   └── feishu-to-markdown.js  # 飞书→Markdown (小1, 待接入)
└── README.md
```

## 使用

直接浏览器打开 `index.html` 即可，无需后端。

## 开发分工

| 成员 | 负责模块 |
|------|---------|
| 工程师 | 网页端 UI + 核心调度器 |
| 小q | Markdown→公众号 HTML 引擎 |
| 小1 | 飞书→Markdown 转换 |

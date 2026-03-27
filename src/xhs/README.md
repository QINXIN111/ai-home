# 小红书抓取模块 - 小q 负责

## TODO
- [ ] 小红书链接解析
- [ ] 内容抓取（需要后端代理，CORS 限制）
- [ ] 输出标准 Markdown

## 接口设计
```js
// 输入: 小红书链接
// 输出: 标准 Markdown 字符串
async function xhsToMarkdown(url) { ... }
```

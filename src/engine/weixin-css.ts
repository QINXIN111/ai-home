/**
 * 微信公众号专用 CSS 样式
 * 参考自 wechatsync 项目
 */

export const WEIXIN_CSS = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #3f3f3f;
  word-wrap: break-word;
  text-align: justify;
}

/* 标题样式 */
h1 {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  margin: 24px 0 16px;
  color: #000;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  margin: 20px 0 14px;
  color: #000;
}

h3 {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  margin: 18px 0 12px;
  color: #000;
}

h4 {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin: 16px 0 10px;
  color: #000;
}

/* 段落样式 */
p {
  margin: 10px 0;
  text-align: justify;
}

/* 列表样式 */
ul, ol {
  padding-left: 2em;
  margin: 10px 0;
}

li {
  margin: 5px 0;
}

/* 引用块样式 */
blockquote {
  border-left: 4px solid #d1d1d1;
  padding: 10px 16px;
  margin: 16px 0;
  background-color: #f9f9f9;
  color: #666;
}

/* 代码块样式 */
pre {
  background-color: #f6f8fa;
  padding: 16px;
  overflow-x: auto;
  border-radius: 4px;
  margin: 16px 0;
  font-size: 14px;
  line-height: 1.5;
}

code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

/* 行内代码样式 */
p code, li code, td code {
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

/* 表格样式 */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  font-size: 15px;
}

th, td {
  border: 1px solid #e0e0e0;
  padding: 8px 12px;
  text-align: left;
}

th {
  background-color: #f0f0f0;
  font-weight: 600;
}

/* 图片样式 */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px auto;
}

/* 分隔线样式 */
hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 24px 0;
}

/* 链接样式 */
a {
  color: #576b95;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* 加粗和斜体 */
strong {
  font-weight: 600;
}

em {
  font-style: italic;
}
`.trim();

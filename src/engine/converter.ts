/**
 * Markdown 到微信公众号 HTML 转换器
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import rehypeFormat from 'rehype-format';
import juice from 'juice';
import { WEIXIN_CSS } from './weixin-css.js';
import type { Processor } from 'unified';

/**
 * 转换选项
 */
export interface ConvertOptions {
  /**
   * 是否移除外部链接
   * @default true
   */
  removeExternalLinks?: boolean;

  /**
   * 保留的链接域名白名单
   * @default ['mp.weixin.qq.com', 'weixin.qq.com']
   */
  keepLinkDomains?: string[];

  /**
   * 是否紧凑 HTML（减少空格和换行）
   * @default true
   */
  compactHtml?: boolean;

  /**
   * 图片最大宽度
   * @default 677
   */
  imageMaxWidth?: number;
}

/**
 * 转换结果
 */
export interface ConvertResult {
  /**
   * 转换后的 HTML
   */
  html: string;

  /**
   * 统计信息
   */
  stats: {
    /**
     * 图片数量
     */
    imageCount: number;

    /**
     * 链接数量
     */
    linkCount: number;

    /**
     * 代码块数量
     */
    codeBlockCount: number;
  };
}

/**
 * Markdown 到微信公众号 HTML 转换器
 */
export class WeChatMarkdownConverter {
  private processor: Processor;
  private options: Required<ConvertOptions>;

  constructor(options: ConvertOptions = {}) {
    this.options = {
      removeExternalLinks: options.removeExternalLinks ?? true,
      keepLinkDomains: options.keepLinkDomains ?? ['mp.weixin.qq.com', 'weixin.qq.com'],
      compactHtml: options.compactHtml ?? true,
      imageMaxWidth: options.imageMaxWidth ?? 677,
    };

    // 初始化处理器
    this.processor = unified()
      .use(remarkParse) // 解析 Markdown
      .use(remarkGfm) // 支持 GitHub Flavored Markdown
      .use(remarkRehype, { allowDangerousHtml: true }) // 转换为 HTML AST
      .use(rehypeFormat) // 格式化 HTML
      .use(rehypeStringify, { allowDangerousHtml: true }); // 序列化为字符串
  }

  /**
   * 转换 Markdown 为微信公众号 HTML
   */
  async convert(markdown: string): Promise<ConvertResult> {
    // 1. 解析并转换为 HTML
    let html = String(await this.processor.process(markdown));

    // 2. 处理外部链接
    if (this.options.removeExternalLinks) {
      html = this.stripExternalLinks(html);
    }

    // 3. 处理图片
    html = this.processImages(html);

    // 4. 样式内联
    html = this.inlineStyles(html);

    // 5. 紧凑化处理
    if (this.options.compactHtml) {
      html = this.compactHtml(html);
    }

    // 6. 统计信息
    const stats = this.collectStats(html);

    return { html, stats };
  }

  /**
   * 移除外部链接
   */
  private stripExternalLinks(html: string): string {
    const keepDomains = this.options.keepLinkDomains;
    const domainPattern = keepDomains.map(d => d.replace(/\./g, '\\.')).join('|');

    return html.replace(
      /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (match, href, text) => {
        // 保留锚点链接和微信域名链接
        if (href && (
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          new RegExp(`^https?://(${domainPattern})`).test(href)
        )) {
          return match;
        }

        // 外部链接只保留文字
        return text;
      }
    );
  }

  /**
   * 处理图片
   */
  private processImages(html: string): string {
    const maxWidth = this.options.imageMaxWidth;

    return html.replace(
      /<img([^>]*?)>/gi,
      (match, attrs) => {
        // 确保图片有居中和宽度限制
        if (!attrs.includes('style=')) {
          return `<img${attrs} style="max-width: 100%; height: auto; display: block; margin: 16px auto;">`;
        }

        // 更新现有样式
        const styleMatch = attrs.match(/style=["']([^"']*)["']/i);
        if (styleMatch) {
          let style = styleMatch[1];
          if (!style.includes('max-width')) {
            style += `; max-width: 100%;`;
          }
          if (!style.includes('display: block')) {
            style += `; display: block;`;
          }
          if (!style.includes('margin')) {
            style += `; margin: 16px auto;`;
          }
          return attrs.replace(/style=["'][^"']*["']/i, `style="${style}"`);
        }

        return match;
      }
    );
  }

  /**
   * 样式内联
   */
  private inlineStyles(html: string): string {
    // 使用 juice 将 CSS 内联到 HTML 标签
    const wrapped = `<section>${html}</section>`;
    const inlined = juice(wrapped, {
      extraCss: WEIXIN_CSS,
      removeStyleTags: false,
      preserveImportant: true,
    });

    // 移除外层 wrapper
    return inlined.replace(/<\/?section>/gi, '');
  }

  /**
   * 紧凑化 HTML
   */
  private compactHtml(html: string): string {
    return html
      .replace(/\n\s*/g, '') // 移除换行和多余空格
      .replace(/>\s+</g, '><') // 移除标签间的空格
      .trim();
  }

  /**
   * 收集统计信息
   */
  private collectStats(html: string): ConvertResult['stats'] {
    const imageCount = (html.match(/<img/gi) || []).length;
    const linkCount = (html.match(/<a/gi) || []).length;
    const codeBlockCount = (html.match(/<pre/gi) || []).length;

    return { imageCount, linkCount, codeBlockCount };
  }
}

/**
 * 便捷函数：转换 Markdown 为微信公众号 HTML
 */
export async function markdownToWechatHtml(
  markdown: string,
  options?: ConvertOptions
): Promise<ConvertResult> {
  const converter = new WeChatMarkdownConverter(options);
  return converter.convert(markdown);
}

// 默认导出
export default WeChatMarkdownConverter;

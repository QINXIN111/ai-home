/**
 * 核心调度器 - 万能格式转换器
 * 负责输入识别、路由、中间格式管理
 * 工程师负责
 */

// 输入类型检测
function detectInputType(input) {
  input = input.trim();
  if (/^https?:\/\/.*xiaohongshu\.com/.test(input)) return 'xiaohongshu';
  if (/^https?:\/\/.*feishu\.cn/.test(input) || /^https?:\/\/.*larksuite\.com/.test(input)) return 'feishu';
  if (/^https?:\/\/.*douyin\.com/.test(input)) return 'douyin';
  if (/^https?:\/\//.test(input)) return 'url';
  return 'markdown';
}

/**
 * 核心转换管线
 * 输入 → 中间Markdown → 输出格式
 */
class ConverterPipeline {
  constructor() {
    this.inputHandlers = {};
    this.outputHandlers = {};
  }

  // 注册输入处理器
  registerInput(type, handler) {
    this.inputHandlers[type] = handler;
  }

  // 注册输出处理器
  registerOutput(type, handler) {
    this.outputHandlers[type] = handler;
  }

  // 执行转换
  async convert(input, inputType, outputFormat) {
    // Step 1: 输入 → Markdown
    const detected = inputType === 'auto' ? detectInputType(input) : inputType;
    const inputHandler = this.inputHandlers[detected] || this.inputHandlers['markdown'];

    if (!inputHandler) {
      throw new Error(`不支持的输入类型: ${detected}`);
    }

    const markdown = await inputHandler(input);

    // Step 2: Markdown → 输出
    const outputHandler = this.outputHandlers[outputFormat] || this.outputHandlers['wechat-html'];

    if (!outputHandler) {
      throw new Error(`不支持的输出格式: ${outputFormat}`);
    }

    return {
      markdown,
      output: outputHandler(markdown),
      inputType: detected,
      outputFormat
    };
  }
}

// 全局管道实例
const pipeline = new ConverterPipeline();

// 注册内置 Markdown 输入（直接透传）
pipeline.registerInput('markdown', async (md) => md);
pipeline.registerInput('text', async (text) => text);

// 注册内置输出
pipeline.registerOutput('wechat-html', (md) => {
  return typeof markdownToWechatHtml === 'function'
    ? markdownToWechatHtml(md)
    : md;
});

pipeline.registerOutput('markdown', (md) => md);
pipeline.registerOutput('text', (md) => md.replace(/[#*_\[\]()`]/g, ''));

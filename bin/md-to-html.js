#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const chalk = require('chalk');
const { globSync } = require('glob');

// 设置版本和描述
program
  .version('1.0.0')
  .description('一个简单的Markdown到HTML转换工具');

// 定义命令选项
program
  .option('-i, --input <path>', '输入的Markdown文件或目录')
  .option('-o, --output <path>', '输出的HTML文件或目录')
  .option('-t, --template <path>', '自定义HTML模板路径')
  .option('-s, --style <path>', '自定义CSS样式路径')
  .option('-r, --recursive', '递归处理目录中的所有.md文件')
  .option('-w, --watch', '监听文件变化并自动转换');

// 解析命令行参数
program.parse(process.argv);
const options = program.opts();

// 默认HTML模板
const defaultTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    pre {
      background-color: #f6f8fa;
      border-radius: 3px;
      padding: 16px;
      overflow: auto;
    }
    code {
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 85%;
      padding: 0.2em 0.4em;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      color: #6a737d;
      margin: 0;
      padding: 0 1em;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    table th, table td {
      border: 1px solid #dfe2e5;
      padding: 6px 13px;
    }
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    img {
      max-width: 100%;
    }
    /* {{customStyle}} */
  </style>
</head>
<body>
  {{content}}
</body>
</html>`;

// 如果没有提供必要的参数，显示帮助
if (!options.input) {
  console.log(chalk.yellow('请提供输入文件或目录路径！使用 --help 查看帮助。'));
  program.help();
}

// 转换单个文件
async function convertFile(inputFile, outputFile, template, customStyle) {
  try {
    // 检查输入文件是否存在
    if (!await fs.pathExists(inputFile)) {
      console.log(chalk.red(`错误: 文件 ${inputFile} 不存在`));
      return false;
    }

    // 读取Markdown内容
    const markdown = await fs.readFile(inputFile, 'utf8');
    
    // 解析Markdown文件标题
    let title = path.basename(inputFile, path.extname(inputFile));
    const titleMatch = markdown.match(/^#\s+(.*)/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
    
    // 转换Markdown到HTML
    const content = marked(markdown);
    
    // 准备自定义样式
    let styleContent = '';
    if (customStyle) {
      try {
        styleContent = await fs.readFile(customStyle, 'utf8');
      } catch (err) {
        console.log(chalk.yellow(`警告: 无法读取样式文件 ${customStyle}，将使用默认样式`));
      }
    }
    
    // 生成最终HTML
    let html = template
      .replace('{{title}}', title)
      .replace('{{content}}', content)
      .replace(/\/\*\s*\{\{customStyle\}\}\s*\*\//, styleContent);
    
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(outputFile));
    
    // 写入HTML文件
    await fs.writeFile(outputFile, html, 'utf8');
    console.log(chalk.green(`✓ 成功转换: ${inputFile} → ${outputFile}`));
    return true;
  } catch (err) {
    console.log(chalk.red(`错误: 处理文件 ${inputFile} 时发生错误: ${err.message}`));
    return false;
  }
}

// 处理文件或目录
async function processPath(inputPath, outputPath, template, customStyle, recursive) {
  const stats = await fs.stat(inputPath);
  
  if (stats.isFile()) {
    // 如果输入是文件
    if (path.extname(inputPath).toLowerCase() === '.md') {
      // 确定输出文件路径
      let outputFile = outputPath;
      if (await fs.pathExists(outputPath) && (await fs.stat(outputPath)).isDirectory()) {
        // 如果输出路径是目录，将输出文件放在该目录下
        outputFile = path.join(outputPath, path.basename(inputPath, '.md') + '.html');
      }
      
      return await convertFile(inputPath, outputFile, template, customStyle);
    } else {
      console.log(chalk.yellow(`警告: 跳过非Markdown文件 ${inputPath}`));
      return false;
    }
  } else if (stats.isDirectory()) {
    // 如果输入是目录
    let pattern = recursive ? '**/*.md' : '*.md';
    const files = globSync(pattern, { cwd: inputPath, absolute: true });
    
    if (files.length === 0) {
      console.log(chalk.yellow(`警告: 在目录 ${inputPath} 中未找到Markdown文件`));
      return false;
    }
    
    // 确保输出目录存在
    await fs.ensureDir(outputPath);
    
    // 处理每个找到的Markdown文件
    let success = false;
    for (const file of files) {
      // 计算相对路径，以保持目录结构
      const relativePath = path.relative(inputPath, file);
      const outputFile = path.join(outputPath, relativePath.replace(/\.md$/, '.html'));
      
      const result = await convertFile(file, outputFile, template, customStyle);
      success = success || result;
    }
    
    return success;
  }
}

// 主函数
async function main() {
  try {
    // 加载模板
    let template = defaultTemplate;
    if (options.template) {
      try {
        template = await fs.readFile(options.template, 'utf8');
      } catch (err) {
        console.log(chalk.yellow(`警告: 无法读取模板文件 ${options.template}，将使用默认模板`));
      }
    }
    
    // 处理输入/输出路径
    const inputPath = path.resolve(options.input);
    let outputPath = options.output ? path.resolve(options.output) : null;
    
    // 如果没有指定输出路径，根据输入路径生成
    if (!outputPath) {
      if ((await fs.stat(inputPath)).isFile()) {
        outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, '.md') + '.html');
      } else {
        outputPath = path.join(inputPath, 'html');
      }
    }
    
    // 执行转换
    const success = await processPath(inputPath, outputPath, template, options.style, options.recursive);
    
    // 如果启用了监听模式
    if (options.watch && success) {
      console.log(chalk.blue(`监听文件变化中，按 Ctrl+C 退出...`));
      
      const chokidar = require('chokidar');
      const watcher = chokidar.watch(inputPath, {
        ignored: /(^|[\/\\])\../, // 忽略隐藏文件
        persistent: true
      });
      
      watcher.on('change', async (changedPath) => {
        if (path.extname(changedPath).toLowerCase() === '.md') {
          console.log(chalk.blue(`检测到文件变化: ${changedPath}`));
          
          // 计算输出路径
          let outputFile = outputPath;
          if ((await fs.stat(inputPath)).isDirectory()) {
            const relativePath = path.relative(inputPath, changedPath);
            outputFile = path.join(outputPath, relativePath.replace(/\.md$/, '.html'));
          } else if ((await fs.stat(outputPath)).isDirectory()) {
            outputFile = path.join(outputPath, path.basename(changedPath, '.md') + '.html');
          }
          
          await convertFile(changedPath, outputFile, template, options.style);
        }
      });
    }
  } catch (err) {
    console.error(chalk.red(`错误: ${err.message}`));
    process.exit(1);
  }
}

// 执行主函数
main(); 
#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const { globSync } = require('glob');
const chokidar = require('chokidar');

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

// 转换单个文件
async function convertFile(inputFile, outputFile, template, customStyle) {
  try {
    // 检查输入文件是否存在
    if (!await fs.pathExists(inputFile)) {
      return {
        success: false,
        error: `错误: 文件 ${inputFile} 不存在`
      };
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
        return {
          success: false,
          error: `警告: 无法读取样式文件 ${customStyle}`
        };
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
    
    return {
      success: true,
      inputFile,
      outputFile,
      message: `成功转换: ${inputFile} → ${outputFile}`
    };
  } catch (err) {
    return {
      success: false,
      error: `处理文件 ${inputFile} 时发生错误: ${err.message}`
    };
  }
}

// 处理文件或目录
async function processPath(inputPath, outputPath, template, customStyle, recursive) {
  try {
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
        return {
          success: false,
          error: `警告: 跳过非Markdown文件 ${inputPath}`
        };
      }
    } else if (stats.isDirectory()) {
      // 如果输入是目录
      let pattern = recursive ? '**/*.md' : '*.md';
      const files = globSync(pattern, { cwd: inputPath, absolute: true });
      
      if (files.length === 0) {
        return {
          success: false,
          error: `警告: 在目录 ${inputPath} 中未找到Markdown文件`
        };
      }
      
      // 确保输出目录存在
      await fs.ensureDir(outputPath);
      
      // 处理每个找到的Markdown文件
      const results = [];
      for (const file of files) {
        // 计算相对路径，以保持目录结构
        const relativePath = path.relative(inputPath, file);
        const outputFile = path.join(outputPath, relativePath.replace(/\.md$/, '.html'));
        
        const result = await convertFile(file, outputFile, template, customStyle);
        results.push(result);
      }
      
      return {
        success: results.some(r => r.success),
        results
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

// 主函数
async function processRequest(params) {
  try {
    // 验证必填参数
    if (!params.input) {
      return {
        success: false,
        error: '请提供input参数(输入文件或目录路径)'
      };
    }
    
    // 加载模板
    let template = defaultTemplate;
    if (params.template) {
      try {
        template = await fs.readFile(params.template, 'utf8');
      } catch (err) {
        return {
          success: false,
          error: `无法读取模板文件 ${params.template}`
        };
      }
    }
    
    // 处理输入/输出路径
    const inputPath = path.resolve(params.input);
    let outputPath = params.output ? path.resolve(params.output) : null;
    
    // 如果没有指定输出路径，根据输入路径生成
    if (!outputPath) {
      if ((await fs.stat(inputPath)).isFile()) {
        outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, '.md') + '.html');
      } else {
        outputPath = path.join(inputPath, 'html');
      }
    }
    
    // 执行转换
    const result = await processPath(inputPath, outputPath, template, params.style, params.recursive);
    
    // 如果启用了监听模式，设置监听器但立即返回成功结果
    if (params.watch && result.success) {
      // 在实际应用中，可能需要其他机制来处理watch模式
      // 这里我们只返回初始转换的结果，因为MCP服务不适合长时间运行的任务
      return {
        ...result,
        warning: '监听模式在MCP服务中不完全支持，初始转换已完成'
      };
    }
    
    return result;
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

// 监听标准输入
process.stdin.setEncoding('utf8');
let inputData = '';

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    // 解析输入的JSON
    const params = JSON.parse(inputData);
    
    // 处理请求
    const result = await processRequest(params);
    
    // 输出JSON结果
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: `无法处理请求: ${err.message}`
    }));
  }
}); 
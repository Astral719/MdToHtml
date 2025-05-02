# MD到HTML转换工具

一个简单但功能强大的命令行工具，用于将Markdown文件转换为HTML文件。

## 功能特点

- 💨 快速转换单个Markdown文件或整个目录
- 🔄 支持递归处理目录中的所有Markdown文件
- 👀 监听文件变化，自动转换更新的文件
- 🎨 支持自定义HTML模板和CSS样式
- 📱 默认生成响应式、美观的HTML页面
- 🔍 自动从Markdown提取标题作为HTML标题
- 🤖 支持通过MCP协议提供给大模型客户端使用

## 安装方法

### 全局安装

通过npm全局安装，可以在任何地方使用该工具：

```bash
npm install -g md-to-html-converter
```

### 使用npx运行

无需安装，直接使用npx命令运行：

```bash
npx md-to-html-converter --input 你的文件.md
```

## 使用方法

### 基本用法

转换单个文件：

```bash
md-to-html --input 文件路径.md
```

转换目录中的所有Markdown文件：

```bash
md-to-html --input 目录路径 --output 输出目录 --recursive
```

### 命令选项

```
选项:
  -V, --version          显示版本号
  -i, --input <path>     输入的Markdown文件或目录
  -o, --output <path>    输出的HTML文件或目录
  -t, --template <path>  自定义HTML模板路径
  -s, --style <path>     自定义CSS样式路径
  -r, --recursive        递归处理目录中的所有.md文件
  -w, --watch            监听文件变化并自动转换
  -h, --help             显示帮助信息
```

### 示例

1. 转换单个文件，并指定输出路径：

```bash
md-to-html --input docs/readme.md --output dist/index.html
```

2. 转换整个目录下的所有Markdown文件，保留目录结构：

```bash
md-to-html --input docs --output dist --recursive
```

3. 使用自定义模板和样式：

```bash
md-to-html --input readme.md --template my-template.html --style my-style.css
```

4. 监听文件变化，自动转换：

```bash
md-to-html --input docs --output dist --recursive --watch
```

## 自定义模板

创建自定义模板时，需要包含以下占位符：

- `{{title}}` - 将被替换为Markdown文件的标题
- `{{content}}` - 将被替换为转换后的HTML内容
- `{{customStyle}}` - 将被替换为自定义CSS样式

模板示例：

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
  <style>
    /* 你的基本样式 */
    {{customStyle}}
  </style>
</head>
<body>
  <header>
    <h1>我的网站</h1>
  </header>
  <main>
    {{content}}
  </main>
  <footer>
    <p>© 2023 我的网站</p>
  </footer>
</body>
</html>
```

## 作为MCP服务使用

本工具支持作为MCP(Model Client Protocol)服务使用，可以与大模型客户端集成。

### MCP配置

当你将本项目上传到GitHub后，只需按照以下步骤配置大模型客户端：

1. 复制项目中的 `mcp.json`文件
2. 修改 `homepage`字段为你的GitHub仓库地址
3. 根据你的需求修改其他配置项（如果需要）

### 使用MCP连接

在支持MCP的大模型客户端中，你可以这样连接和使用：

```
将我的Markdown笔记转成HTML文件，输入路径是：notes.md
```

或者：

```
将我的docs文件夹下的所有Markdown文件转成HTML，并保存到output目录，记得递归处理子目录
```

### MCP参数说明

| 参数名    | 类型   | 描述                            | 是否必需 |
| --------- | ------ | ------------------------------- | -------- |
| input     | 字符串 | 输入的Markdown文件或目录路径    | 是       |
| output    | 字符串 | 输出的HTML文件或目录路径        | 否       |
| template  | 字符串 | 自定义HTML模板路径              | 否       |
| style     | 字符串 | 自定义CSS样式路径               | 否       |
| recursive | 布尔值 | 是否递归处理目录中的所有.md文件 | 否       |
| watch     | 布尔值 | 是否监听文件变化并自动转换      | 否       |

## 常见问题

### 如何处理中文文件名？

本工具完全支持中文文件名，无需额外配置。

### 如何在生成的HTML中添加自定义脚本？

创建自定义模板，并在模板中添加你的脚本。

### 如何保留原始Markdown文件的相对链接？

默认情况下，工具会保留相对链接。如果需要修改链接行为，可以使用自定义模板。

# ✅ Import Maps 配置修复

## 问题

在浏览器中使用时遇到错误：
```
Uncaught TypeError: Failed to resolve module specifier "onnxruntime-web".
Relative references must start with either "/", "./", or "../".
```

## 原因

`onnxruntime-web` 被标记为 external（不打包进框架），浏览器无法直接解析裸模块说明符。

## 解决方案

使用 **Import Maps** 从 CDN 加载 `onnxruntime-web`。

### 修复内容

✅ 已更新所有示例页面：
- `examples/bge-embedding-demo.html`
- `examples/nlp-example.html`
- `examples/basic/index.html`
- `examples/advanced/webgpu-demo.html`
- `examples/advanced/segmentation-demo.html`

✅ 已更新 README.md 添加浏览器配置说明

### Import Maps 配置

在每个 HTML 文件的 `<head>` 中添加：

```html
<script type="importmap">
{
  "imports": {
    "onnxruntime-web": "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/esm/ort.min.js"
  }
}
</script>
```

### CDN 版本

- **当前版本**: 1.20.0
- **CDN**: jsDelivr
- **备用 CDN**: unpkg, esm.sh

### 其他 CDN 选项

如果 jsDelivr 不可用，可以使用：

```html
<!-- unpkg -->
"onnxruntime-web": "https://unpkg.com/onnxruntime-web@1.20.0/dist/esm/ort.min.js"

<!-- esm.sh -->
"onnxruntime-web": "https://esm.sh/onnxruntime-web@1.20.0/dist/esm/ort.min.js"

<!-- 自定义托管 -->
"onnxruntime-web": "./assets/onnxruntime-web/dist/esm/ort.min.js"
```

### 版本兼容性

| onnxruntime-web | ONNX Web Framework | 状态 |
|----------------|-------------------|------|
| 1.18.x | 2.0.x | ✅ 兼容 |
| 1.19.x | 2.0.x | ✅ 兼容 |
| 1.20.x | 2.0.x | ✅ 推荐 |
| 1.21.x | 2.0.x | ⚠️ 未测试 |

### 浏览器支持

Import Maps 支持：
- ✅ Chrome 89+
- ✅ Edge 89+
- ✅ Firefox 108+
- ✅ Safari 16.4+

**旧浏览器降级方案**:
使用 polyfill 或打包工具（Vite/Webpack）。

### 验证修复

1. 打开浏览器控制台（F12）
2. 访问示例页面：`http://localhost:8080/examples/bge-embedding-demo.html`
3. 检查控制台是否有错误

**预期结果**:
- ✅ 无 `Failed to resolve module specifier` 错误
- ✅ 看到初始化日志
- ✅ 框架正常加载

### 常见问题

**Q: 能否不使用 CDN?**
A: 可以。下载 onnxruntime-web 到本地，修改 importmap 指向本地路径。

**Q: Web Worker 需要配置 Import Maps 吗?**
A: 不需要。Worker 文件会单独处理。

**Q: Node.js 环境需要 Import Maps 吗?**
A: 不需要。Node.js 原生支持裸模块说明符。

## 测试状态

- [x] BGE 演示页面
- [x] NLP 示例
- [x] Basic 示例
- [x] WebGPU 演示
- [x] Segmentation 演示
- [x] README 文档更新

## 日期

2025-01-21

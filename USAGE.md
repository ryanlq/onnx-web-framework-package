# 使用指南

## 📦 包已成功创建！

你的ONNX Web Framework现在已经是一个完整的npm包了！以下是使用方法：

### 🚀 发布到npm

```bash
# 1. 登录npm（如果还没有登录）
npm login

# 2. 发布包
npm publish
```

### 🧪 本地测试

```bash
# 1. 创建测试目录
mkdir test-project && cd test-project

# 2. 初始化项目
npm init -y

# 3. 安装本地包
npm install ../onnx-web-framework-package/onnx-web-framework-1.0.0.tgz

# 4. 创建测试文件
```

### 💻 使用示例

创建一个测试文件 `test.js`:

```javascript
import ONNXWebFramework from 'onnx-web-framework';

// 初始化框架
const framework = new ONNXWebFramework({
    executionProviders: ['wasm'],
    enableProfiling: true
});

await framework.initialize();

// 加载模型
await framework.loadModel('my-model', 'path/to/model.onnx');

// 运行推理
const result = await framework.predict('my-model', inputData);

console.log('结果:', result.output);
console.log('推理时间:', result.inferenceTime);
```

### 🌐 CDN使用

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>
</head>
<body>
    <script type="module">
        import ONNXWebFramework from 'https://cdn.jsdelivr.net/npm/onnx-web-framework@latest/dist/index.js';

        const framework = new ONNXWebFramework();
        await framework.initialize();

        // 使用框架...
    </script>
</body>
</html>
```

### 📋 包信息

- **包名**: `onnx-web-framework`
- **版本**: `1.0.0`
- **大小**: 24.1 KB (压缩)
- **解压后**: 116.0 KB
- **格式**: ESM + CommonJS
- **类型定义**: 完整的TypeScript支持

### 🎯 支持的功能

✅ **已实现的功能**:
- 多执行提供者 (WASM, WebGL, WebGPU, WebNN)
- Web Worker支持
- 模型缓存 (IndexedDB)
- I/O绑定 (GPU张量, MLTensor)
- 性能分析
- 设备能力检测
- 完整的TypeScript类型定义
- ESM和CommonJS双格式支持
- CDN可用

### 🔄 下一步

1. **发布到npm**: `npm publish`
2. **更新版本**: `npm version patch/minor/major`
3. **文档网站**: 可以创建专门的文档网站
4. **CI/CD**: 设置GitHub Actions自动发布

### 📝 注意事项

- 包设计为浏览器端使用，依赖浏览器API
- 需要现代浏览器支持 (ES6 modules, Web Workers等)
- WebGPU和WebNN支持是实验性的
- 建议在生产环境中使用HTTPS
- 模型文件应该从CORS-enabled的服务器加载

### 🎉 恭喜！

你已经成功将ONNX Web Framework转换为一个专业的npm包！现在其他开发者可以轻松地集成和使用你的框架了。
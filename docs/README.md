# ONNX Web Framework Documentation

欢迎使用 ONNX Web Framework 的完整文档！

## 📚 文档目录

### 🚀 快速开始
- [安装指南](./guides/installation.md) - 如何安装和设置
- [基础使用](./guides/basic-usage.md) - 5分钟上手指南
- [第一个模型](./guides/first-model.md) - 加载和运行你的第一个模型

### 📖 使用指南
- [模型管理](./guides/model-management.md) - 模型加载、缓存和管理
- [执行提供者](./guides/execution-providers.md) - WASM、WebGL、WebGPU、WebNN
- [数据预处理](./guides/preprocessing.md) - 图像和文本预处理
- [性能优化](./guides/performance.md) - 优化推理性能
- [I/O绑定](./guides/io-binding.md) - GPU张量和MLTensor使用

### 🔧 API 参考
- [核心API](./api/core.md) - ONNXWebFramework类
- [配置选项](./api/configuration.md) - 初始化和配置
- [方法参考](./api/methods.md) - 所有可用方法
- [类型定义](./api/types.md) - TypeScript接口和类型

### 💡 实用示例
- [图像分类](./examples/image-classification.md) - ImageNet模型使用
- [目标检测](./examples/object-detection.md) - YOLO模型部署
- [语义分割](./examples/semantic-segmentation.md) - 分割模型示例
- [文本处理](./examples/text-processing.md) - NLP模型推理
- [多模型流水线](./examples/multi-model.md) - 复杂推理流程

### 🛠️ 高级主题
- [Web Workers](./guides/web-workers.md) - 多线程推理
- [模型转换](./guides/model-conversion.md) - ONNX到ORT格式转换
- [部署策略](./guides/deployment.md) - 生产环境部署
- [监控调试](./guides/monitoring.md) - 性能监控和调试

### 🔧 故障排除
- [常见问题](./troubleshooting/faq.md) - 常见问题和解决方案
- [浏览器兼容性](./troubleshooting/browser-compatibility.md) - 浏览器支持情况
- [性能调试](./troubleshooting/performance-debugging.md) - 性能问题排查
- [错误代码](./troubleshooting/error-codes.md) - 错误代码参考

## 🚀 快速导航

### 新用户推荐路径

1. **安装** → [安装指南](./guides/installation.md)
2. **基础使用** → [基础使用](./guides/basic-usage.md)
3. **第一个模型** → [第一个模型](./guides/first-model.md)
4. **进阶功能** → [执行提供者](./guides/execution-providers.md)

### 高级用户推荐路径

1. **API参考** → [核心API](./api/core.md)
2. **性能优化** → [性能优化](./guides/performance.md)
3. **高级示例** → [实用示例](./examples/)
4. **部署指南** → [部署策略](./guides/deployment.md)

## 🌟 核心特性

### 🎯 简单易用
```javascript
import ONNXWebFramework from 'onnx-web-framework';

const framework = new ONNXWebFramework();
await framework.initialize();

await framework.loadModel('model', 'model.onnx');
const result = await framework.predict('model', inputData);
```

### ⚡ 多后端支持
- **WASM** - 通用CPU推理
- **WebGL** - GPU加速（较老浏览器）
- **WebGPU** - 现代GPU加速
- **WebNN** - 原生AI推理支持

### 🧵 非阻塞推理
```javascript
const framework = new ONNXWebFramework({
    useWorker: true  // 启用Web Worker
});
// 推理不会阻塞UI线程
```

### 💾 智能缓存
```javascript
const framework = new ONNXWebFramework({
    enableCache: true  // 启用模型缓存
});
// 模型自动缓存，加快后续加载
```

## 📊 性能对比

| 特性 | ONNX Web Framework | 原生ONNX Runtime | 其他方案 |
|------|-------------------|------------------|----------|
| 简单性 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 缓存支持 | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐ |
| Web Worker | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐ |
| 类型安全 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

## 🔗 相关链接

- [GitHub仓库](https://github.com/your-username/onnx-web-framework)
- [npm包页面](https://www.npmjs.com/package/onnx-web-framework)
- [ONNX Runtime文档](https://onnxruntime.ai/)
- [ONNX模型库](https://github.com/onnx/models)

## 🤝 贡献

欢迎贡献文档！请参考我们的[贡献指南](../CONTRIBUTING.md)。

## 📄 许可证

MIT License - 详见[LICENSE](../LICENSE)文件。
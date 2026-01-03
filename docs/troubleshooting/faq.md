# 常见问题解答 (FAQ)

本文档回答了使用ONNX Web Framework时可能遇到的常见问题和解决方案。

## 🚀 安装和设置问题

### Q: 如何安装ONNX Web Framework？

**A:** 有几种安装方式：

```bash
# NPM安装
npm install onnx-web-framework

# Yarn安装
yarn add onnx-web-framework

# CDN使用
<script type="module">
  import ONNXWebFramework from 'https://cdn.jsdelivr.net/npm/onnx-web-framework@latest/dist/index.js';
</script>
```

### Q: 浏览器兼容性要求是什么？

**A:** 支持以下浏览器版本：
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

需要支持ES6模块和Web Workers。

### Q: 安装时出现"Cannot find module"错误

**A:** 尝试以下解决方案：

```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 如果使用yarn
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

### Q: 需要安装ONNX Runtime Web吗？

**A:** ONNX Web Framework将ONNX Runtime Web作为peer dependency，建议同时安装：

```bash
npm install onnx-web-framework onnxruntime-web
```

## 🔧 模型加载问题

### Q: 模型加载失败，提示CORS错误

**A:** CORS错误通常发生在从不同域加载模型时。解决方案：

1. **服务器配置**：确保模型服务器支持CORS
2. **相同域名**：将模型文件部署到同一域名下
3. **代理服务器**：使用代理服务器绕过CORS限制

```javascript
// 服务器端CORS配置示例（Node.js Express）
app.use('/models', express.static('models', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));
```

### Q: 模型文件太大，加载缓慢

**A:** 优化模型加载：

```javascript
const framework = new ONNXWebFramework({
  enableCache: true,        // 启用缓存
  cacheMaxAge: 86400000    // 24小时缓存
});

// 或者使用ORT格式模型（通常更小更高效）
await framework.loadModel('model', 'model.ort');
```

### Q: 支持哪些模型格式？

**A:** 支持以下格式：
- `.onnx` - 标准ONNX格式
- `.ort` - 优化的ORT格式（推荐）

## ⚡ 执行提供者问题

### Q: WebGPU不可用或初始化失败

**A:** 检查WebGPU支持：

```javascript
// 检查WebGPU支持
if (!navigator.gpu) {
  console.warn('WebGPU not supported, using WebGL or WASM');
  // 回退到其他执行提供者
}

// 或使用自动回退机制
const framework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'webgl', 'wasm']  // 自动回退
});
```

启用WebGPU的浏览器设置：
- Chrome: 访问 `chrome://flags/#enable-webgpu`
- Firefox: 访问 `about:config` 并设置 `dom.webgpu.enabled` 为 `true`

### Q: WebGL上下文丢失

**A:** 处理WebGL上下文丢失：

```javascript
const framework = new ONNXWebFramework();

// 监听上下文丢失
canvas.addEventListener('webglcontextlost', async (e) => {
  console.warn('WebGL context lost, falling back to WASM');
  await framework.updateExecutionProviders(['wasm']);
});
```

### Q: 如何选择最佳的执行提供者？

**A:** 使用设备能力检测：

```javascript
const framework = new ONNXWebFramework();
const capabilities = framework.getDeviceCapabilities();

if (capabilities.webgpu) {
  framework.updateExecutionProviders(['webgpu', 'wasm']);
} else if (capabilities.webgl) {
  framework.updateExecutionProviders(['webgl', 'wasm']);
} else {
  framework.updateExecutionProviders(['wasm']);
}
```

## 🎯 推理问题

### Q: 推理结果不正确或为空

**A:** 检查以下几点：

```javascript
// 1. 检查输入数据格式
console.log('Input data shape:', inputData.length);
console.log('Input data type:', inputData.constructor.name);

// 2. 检查预处理选项
const result = await framework.predict('model', inputData, {
  preprocess: {
    normalization: 'zeroToOne',  // 确保归一化正确
    resize: [224, 224],          // 确保尺寸正确
    layout: 'nchw'               // 确保数据布局正确
  }
});

// 3. 检查模型输出
console.log('Model output:', result.output);
console.log('Output shape:', Array.isArray(result.output) ? result.output.length : 'N/A');
```

### Q: 推理速度很慢

**A:** 性能优化建议：

```javascript
// 1. 使用更快的执行提供者
const framework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'webgl', 'wasm']  // 优先GPU
});

// 2. 启用Web Worker避免UI阻塞
const framework = new ONNXWebFramework({
  useWorker: true
});

// 3. 优化线程设置
const framework = new ONNXWebFramework({
  numThreads: Math.min(navigator.hardwareConcurrency, 4)
});

// 4. 启用模型缓存
const framework = new ONNXWebFramework({
  enableCache: true
});
```

### Q: 内存使用过高

**A:** 内存优化：

```javascript
// 1. 及时卸载不用的模型
await framework.unloadModel('unused-model');

// 2. 使用I/O绑定减少数据拷贝
const result = await framework.predict('model', gpuBuffer, {
  preferredOutputLocation: 'gpu-buffer',
  downloadGpuData: false
});

// 3. 定期清理
await framework.clearCache();
```

## 🌐 网络和环境问题

### Q: 在HTTPS/HTTP环境下出现问题

**A:** ONNX Web Framework在以下环境下工作最佳：
- 生产环境：HTTPS
- 开发环境：HTTP 或 localhost

一些浏览器功能（如WebAssembly）在安全环境下工作更好。

### Q: 在移动设备上运行问题

**A:** 移动设备优化：

```javascript
// 移动设备检测
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const framework = new ONNXWebFramework({
  executionProviders: isMobile ?
    ['webnn', 'webgl', 'wasm'] :  // 移动设备优先WebNN
    ['webgpu', 'webgl', 'wasm'],  // 桌面设备优先WebGPU
  numThreads: isMobile ? 2 : 4,  // 移动设备限制线程
  powerPreference: 'low-power'   // 移动设备省电模式
});
```

### Q: 在React/Vue等框架中使用

**A:** 在现代前端框架中使用：

```jsx
// React示例
import { useState, useEffect } from 'react';
import ONNXWebFramework from 'onnx-web-framework';

function ModelComponent() {
  const [framework, setFramework] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initFramework = async () => {
      const fw = new ONNXWebFramework();
      await fw.initialize();
      setFramework(fw);
      setIsReady(true);
    };

    initFramework();

    return () => {
      if (framework) {
        framework.dispose();
      }
    };
  }, []);

  if (!isReady) return <div>Loading...</div>;

  // 使用框架...
}
```

## 🐛 调试和错误处理

### Q: 如何启用调试模式？

**A:** 启用详细日志：

```javascript
const framework = new ONNXWebFramework({
  debug: true,           // 启用调试模式
  logLevel: 'verbose'    // 详细日志级别
});
```

### Q: 常见错误代码和解决方案

| 错误代码 | 可能原因 | 解决方案 |
|---------|----------|----------|
| `WebAssembly compilation failed` | WASM编译失败 | 检查WASM MIME类型，确保服务器正确配置 |
| `Model not found` | 模型未找到 | 检查模型路径和URL是否正确 |
| `Out of memory` | 内存不足 | 减少模型大小或批次大小 |
| `WebGL context lost` | WebGL上下文丢失 | 回退到WASM执行提供者 |
| `Invalid tensor shape` | 张量形状错误 | 检查输入数据预处理 |

### Q: 如何捕获和处理错误？

**A:** 完整的错误处理：

```javascript
async function safeInference(modelName, inputData) {
  try {
    const result = await framework.predict(modelName, inputData);
    return { success: true, result };
  } catch (error) {
    console.error('推理失败:', error);

    // 根据错误类型采取不同措施
    if (error.message.includes('WebGL')) {
      console.log('尝试切换到WASM...');
      await framework.updateExecutionProviders(['wasm']);
      return await safeInference(modelName, inputData); // 重试
    }

    if (error.message.includes('memory')) {
      console.log('内存不足，清理缓存...');
      await framework.clearCache();
    }

    return { success: false, error: error.message };
  }
}
```

## 📊 性能优化问题

### Q: 如何监控推理性能？

**A:** 使用内置性能分析：

```javascript
const framework = new ONNXWebFramework({
  enableProfiling: true
});

const result = await framework.predict('model', inputData);

console.log('性能数据:', {
  totalTime: result.totalTime,
  inferenceTime: result.inferenceTime,
  preprocessTime: result.preprocessTime,
  profiling: result.profiling
});
```

### Q: 如何进行批量推理优化？

**A:** 批量处理优化：

```javascript
// 并行批量推理
async function batchInference(modelName, inputList) {
  const promises = inputList.map(input =>
    framework.predict(modelName, input)
  );

  const results = await Promise.all(promises);
  return results;
}

// 流式批量推理
async function streamingBatchInference(modelName, inputList, batchSize = 10) {
  const results = [];

  for (let i = 0; i < inputList.length; i += batchSize) {
    const batch = inputList.slice(i, i + batchSize);
    const batchResults = await batchInference(modelName, batch);
    results.push(...batchResults);

    // 给浏览器喘息时间
    if (i + batchSize < inputList.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return results;
}
```

## 🔧 开发工具问题

### Q: 如何与TypeScript一起使用？

**A:** TypeScript支持：

```typescript
import ONNXWebFramework, {
  ONNXWebFrameworkOptions,
  InferenceResult
} from 'onnx-web-framework';

interface CustomOptions extends ONNXWebFrameworkOptions {
  customParam?: string;
}

const framework = new ONNXWebFramework({
  executionProviders: ['webgpu']
} as CustomOptions);

const result: InferenceResult = await framework.predict('model', data);
```

### Q: 如何与打包工具（Webpack/Rollup/Vite）配置？

**A:** 打包工具配置：

```javascript
// Vite配置
export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});

// Webpack配置
module.exports = {
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async'
      }
    ]
  },
  experiments: {
    asyncWebAssembly: true
  }
};
```

## 💡 其他常见问题

### Q: 可以同时加载多个模型吗？

**A:** 是的，支持多个模型：

```javascript
await framework.loadModel('classifier', 'models/classifier.onnx');
await framework.loadModel('detector', 'models/detector.onnx');
await framework.loadModel('segmentation', 'models/segmentation.onnx');

// 列出所有模型
console.log(framework.listModels()); // ['classifier', 'detector', 'segmentation']
```

### Q: 如何处理不同大小的输入？

**A:** 动态预处理：

```javascript
const result = await framework.predict('model', imageElement, {
  preprocess: {
    resize: [modelInputWidth, modelInputHeight],  // 动态调整
    normalization: 'zeroToOne'
  }
});
```

### Q: 如何在Web Worker中使用？

**A:** Web Worker配置：

```javascript
const framework = new ONNXWebFramework({
  useWorker: true,
  workerPath: '/path/to/onnx-worker.js'
});

// 框架会自动处理Worker通信
```

### Q: 如何更新模型？

**A:** 重新加载模型：

```javascript
// 先卸载旧模型
await framework.unloadModel('old-model');

// 加载新模型
await framework.loadModel('new-model', 'models/new-model.onnx');
```

如果遇到其他问题，请查看：
- [浏览器兼容性指南](./browser-compatibility.md)
- [性能调试指南](./performance-debugging.md)
- [GitHub Issues](https://github.com/your-username/onnx-web-framework/issues)
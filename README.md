# ONNX Web Framework

[![npm version](https://badge.fury.io/js/onnx-web-framework.svg)](https://badge.fury.io/js/onnx-web-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 ONNX Runtime Web 的轻量级浏览器端推理框架，支持模型缓存、Web Worker 非阻塞推理。

## 特性

- **简单易用** - 几行代码即可运行 ONNX 模型
- **双模式支持** - 主线程模式和 Web Worker 模式
- **智能缓存** - 基于 IndexedDB 的模型缓存，支持 HTTP Range 分块下载
- **格式自动检测** - 优先使用 ORT 格式，自动回退到 ONNX 格式
- **多种执行后端** - 支持 WASM、WebGL、WebGPU 等
- **✨ Tokenizer 支持** - 内置 Tokenizer 加载器，支持从 URL 加载分词器
- **✨ 预处理钩子** - 灵活的预处理/后处理机制，轻松集成 NLP 模型
- **完整 TypeScript 支持** - 提供类型定义

## 安装

```bash
npm install onnx-web-framework
```

还需要安装 ONNX Runtime Web 作为 peer dependency：

```bash
npm install onnxruntime-web
```

## 快速开始

### 浏览器环境配置

**重要**: 在浏览器中使用时，需要通过 `<script>` 标签加载 onnxruntime-web：

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 加载 onnxruntime-web (UMD 版本) -->
  <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>
</head>
<body>
  <script type="module">
    import ONNXWebFramework from './dist/index.js';
    // 使用框架...
  </script>
</body>
</html>
```

**注意**: 框架会优先使用全局的 `ort` 对象（通过 script 标签加载），如果不存在则尝试导入模块。

### 方式一：主线程模式（简单场景）

```javascript
import ONNXWebFramework from 'onnx-web-framework';

// 创建框架实例
const framework = new ONNXWebFramework({
  executionProviders: ['wasm'],
  enableCache: true
});

// 初始化
await framework.initialize();

// 加载模型
await framework.loadModel('my-model', 'path/to/model.onnx');

// 准备输入张量
const inputs = {
  input: new ort.Tensor('float32', new Float32Array(224 * 224 * 3), [1, 3, 224, 224])
};

// 运行推理
const results = await framework.run('my-model', feeds);

console.log('输出:', results);
```

### 方式二：Web Worker 模式（推荐，避免阻塞 UI）

```javascript
import { createOnnxWorkerProxy } from 'onnx-web-framework';
import WorkerUrl from 'onnx-web-framework/worker?worker&url';

// 创建 Worker
const worker = new Worker(WorkerUrl, { type: 'module' });

// 创建代理
const proxy = createOnnxWorkerProxy(worker);

// 初始化
await proxy.initialize({
  wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/',
  numThreads: 4
});

// 加载模型
const response = await fetch('model.onnx');
const modelBuffer = await response.arrayBuffer();

const info = await proxy.loadModel('my-model', modelBuffer);
console.log('输入:', info.inputNames);
console.log('输出:', info.outputNames);

// 运行推理
const results = await proxy.run('my-model', {
  input: {
    data: new Float32Array([1, 2, 3, 4]),
    dims: [1, 4],
    type: 'float32'
  }
});

console.log('推理结果:', results);

// 清理资源
await proxy.dispose();
worker.terminate();
```

## API 文档

### ONNXWebFramework（主线程 API）

#### 构造函数

```javascript
new ONNXWebFramework(options)
```

**选项参数：**
- `enableCache` (boolean) - 是否启用模型缓存，默认 `true`
- `cacheMaxAge` (number) - 缓存最大时长（毫秒），默认 `24 * 60 * 60 * 1000`
- `executionProviders` (string[]) - 执行后端优先级，默认 `['wasm']`
- `enableProfiling` (boolean) - 是否启用性能分析，默认 `false`
- `debug` (boolean) - 是否启用调试模式，默认 `false`
- `logLevel` (string) - 日志级别，默认 `'warning'`
- `numThreads` (number) - WASM 线程数，默认 `0`（自动）
- `wasmPaths` (string|null) - 自定义 WASM 路径，默认 `null`

#### initialize()

初始化框架，设置环境并初始化缓存。

```javascript
await framework.initialize();
```

#### loadModel(name, modelSource, sessionOptions?)

加载 ONNX 模型。支持 URL、Uint8Array 或 ArrayBuffer。

```javascript
// 从 URL 加载（自动检测 ORT/ONNX 格式）
await framework.loadModel('model', 'https://example.com/model.onnx');

// 从 ArrayBuffer 加载
const buffer = await fetch('model.onnx').then(r => r.arrayBuffer());
await framework.loadModel('model', buffer);

// 带会话选项
await framework.loadModel('model', 'model.onnx', {
  executionProviders: ['webgpu', 'wasm'],
  enableProfiling: true
});
```

**返回值：**
```javascript
{
  modelName: string,
  loaded: boolean,
  inputNames: string[],
  outputNames: string[]
}
```

#### run(modelName, feeds)

运行推理。注意：输入需要是预处理好的 ONNX Runtime 张量。

```javascript
const results = await framework.run('my-model', {
  input: new ort.Tensor('float32', data, [1, 3, 224, 224])
});
```

#### getModelInfo(modelName)

获取已加载模型的信息。

```javascript
const info = framework.getModelInfo('my-model');
console.log(info.inputNames, info.outputNames);
```

#### listModels()

列出所有已加载的模型名称。

```javascript
const models = framework.listModels();
```

#### unloadModel(modelName)

卸载指定模型。

```javascript
await framework.unloadModel('my-model');
```

#### getCacheStats()

获取缓存统计信息。

```javascript
const stats = await framework.getCacheStats();
console.log(`已缓存 ${stats.count} 个模型，总大小 ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
```

#### clearCache()

清理所有过期缓存。

```javascript
await framework.clearCache();
```

#### dispose()

释放所有资源。

```javascript
await framework.dispose();
```

### ONNXWorkerProxy（Web Worker API）

#### createOnnxWorkerProxy(worker)

创建 Worker 代理实例。

```javascript
const proxy = createOnnxWorkerProxy(worker);
```

#### initialize(config)

初始化 Worker 环境。

```javascript
await proxy.initialize({
  wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/',
  numThreads: 4,
  executionProviders: ['wasm']
});
```

#### loadModel(modelName, modelBuffer, sessionOptions?)

在 Worker 中加载模型。注意：modelBuffer 必须是 ArrayBuffer。

```javascript
const response = await fetch('model.onnx');
const modelBuffer = await response.arrayBuffer();

const info = await proxy.loadModel('my-model', modelBuffer);
```

#### run(modelName, inputs)

在 Worker 中运行推理。

```javascript
const results = await proxy.run('my-model', {
  input: {
    data: new Float32Array([1, 2, 3, 4]),
    dims: [1, 4],
    type: 'float32'
  }
});
```

**TensorData 格式：**
```typescript
{
  data: Float32Array | Int32Array | Uint8Array,
  dims: number[],
  type: 'float32' | 'int32' | 'int64' | 'uint8' | ...
}
```

#### dispose()

释放 Worker 资源。

```javascript
await proxy.dispose();
```

## 模型缓存机制

框架使用 IndexedDB 自动缓存已下载的模型：

1. **优先检测 ORT 格式** - 自动将 `.onnx` URL 替换为 `.ort` 并尝试加载
2. **HTTP Range 请求** - 大文件（>10MB）自动使用分块下载
3. **自动过期** - 默认缓存 24 小时，过期自动清理
4. **ETag 支持** - 支持基于 ETag 的缓存验证

### 缓存配置

```javascript
const framework = new ONNXWebFramework({
  enableCache: true,          // 启用缓存
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000  // 7天过期
});
```

## 执行后端

| 后端 | 说明 | 适用场景 |
|------|------|----------|
| `wasm` | WebAssembly | 通用 CPU 推理，兼容性最好 |
| `webgl` | WebGL | GPU 加速，旧浏览器 |
| `webgpu` | WebGPU | 现代 GPU 加速，性能最佳 |
| `webnn` | WebNN | 原生 AI 加速（实验性） |

### 设置执行后端

```javascript
// 主线程模式
const framework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'wasm']  // 优先使用 WebGPU，失败则回退到 WASM
});

// Worker 模式
await proxy.initialize({
  executionProviders: ['webgpu', 'wasm']
});

// 加载模型时也可以指定
await framework.loadModel('model', 'model.onnx', {
  executionProviders: ['wasm']
});
```

## ✨ Tokenizer 和预处理钩子

框架 v2.1.0+ 引入了强大的预处理和后处理机制，让你可以轻松集成 NLP 模型。

### 使用 Tokenizer

框架内置了 Tokenizer 加载器，支持从 URL 加载 HuggingFace 格式的 tokenizer.json：

```javascript
import { loadTokenizer } from 'onnx-web-framework';

// 从 URL 加载 tokenizer
const tokenizer = await loadTokenizer('https://example.com/tokenizer.json');

// 编码文本
const encoded = tokenizer.encode('Hello, world!');
console.log(encoded.ids);           // [15496, 11, 1515, 0]
console.log(encoded.attentionMask); // [1, 1, 1, 1]

// 解码 tokens
const text = tokenizer.decode([15496, 11, 1515, 0]);
console.log(text); // "Hello, world!"
```

### 注册预处理器和后处理器

使用 `registerPreprocessor` 和 `registerPostprocessor` 方法注册自定义处理逻辑：

```javascript
import ONNXWebFramework, { loadTokenizer } from 'onnx-web-framework';

const framework = new ONNXWebFramework();
await framework.initialize();

// 加载 tokenizer
const tokenizer = await loadTokenizer('https://example.com/bert-tokenizer.json');

// 注册预处理器
framework.registerPreprocessor('bert-model', async (text, options) => {
  // 1. 分词
  const tokens = tokenizer.encode(text);

  // 2. 转换为 ONNX Runtime Tensor
  const { ort } = globalThis;
  return {
    input_ids: new ort.Tensor('int64', BigInt64Array.from(tokens.ids.map(BigInt)), [1, tokens.ids.length]),
    attention_mask: new ort.Tensor('int64', BigInt64Array.from(tokens.attentionMask.map(BigInt)), [1, tokens.attentionMask.length]),
    token_type_ids: new ort.Tensor('int64', BigInt64Array.from(tokens.typeIds.map(BigInt)), [1, tokens.typeIds.length])
  };
});

// 注册后处理器
framework.registerPostprocessor('bert-model', async (output, options) => {
  // 处理模型输出
  const logits = Object.values(output)[0];
  const probs = softmax(Array.from(logits.data));

  return {
    prediction: probs.indexOf(Math.max(...probs)),
    confidence: Math.max(...probs)
  };
});

// 加载模型
await framework.loadModel('bert-model', 'bert-classifier.onnx');

// 使用 predict() 方法，会自动调用预处理器和后处理器
const result = await framework.predict('bert-model', 'This is amazing!');
console.log(result); // { prediction: 1, confidence: 0.95 }
```

### 在构造函数中配置处理器

也可以在创建框架实例时直接配置：

```javascript
const framework = new ONNXWebFramework({
  preprocessors: {
    'my-model': async (input) => {
      // 预处理逻辑
      return { input: processedTensor };
    }
  },
  postprocessors: {
    'my-model': async (output) => {
      // 后处理逻辑
      return processedOutput;
    }
  }
});
```

### 自定义 Tokenizer

如果内置 tokenizer 不满足需求，可以实现 `ITokenizer` 接口：

```javascript
import { ITokenizer } from 'onnx-web-framework';

class CustomTokenizer extends ITokenizer {
  encode(text) {
    // 自定义分词逻辑
    return {
      ids: [1, 2, 3],
      attentionMask: [1, 1, 1],
      typeIds: [0, 0, 0]
    };
  }

  decode(ids) {
    // 自定义解码逻辑
    return 'decoded text';
  }

  get vocabSize() {
    return 30000;
  }
}

// 使用自定义 tokenizer
const tokenizer = new CustomTokenizer();
framework.registerPreprocessor('my-model', async (text) => {
  const tokens = tokenizer.encode(text);
  // ... 转换为 tensor
});
```

### predict() vs run()

- **run()** - 底层 API，需要手动预处理输入
- **predict()** - 高级 API，自动调用预处理器和后处理器

```javascript
// 使用 run() - 需要手动预处理
const feeds = { input: new ort.Tensor('float32', data, shape) };
const results = await framework.run('my-model', feeds);

// 使用 predict() - 自动处理
const results = await framework.predict('my-model', rawText);
```

## 工具集成

### Vite

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'onnxruntime-web': ['onnxruntime-web']
        }
      }
    }
  }
}
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /worker\.js$/,
        use: { loader: 'worker-loader' }
      }
    ]
  }
}
```

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 注意事项

1. **predict() vs run()** - `predict()` 是高级 API，需要注册预处理器和后处理器；`run()` 是底层 API，需要手动预处理输入
2. **主线程阻塞** - 主线程模式在推理时可能会阻塞 UI，推荐使用 Web Worker 模式
3. **WASM 路径** - 确保正确配置 ONNX Runtime Web 的 WASM 文件路径
4. **内存管理** - 使用完毕后记得调用 `dispose()` 释放资源
5. **Tokenizer 生产环境** - 内置的 BPE 实现是简化版，生产环境建议集成 `tokenizers.js` 或 `@nlpjs/bpe` 等专业库

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-username/onnx-web-framework.git
cd onnx-web-framework

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm run test

# 类型检查
npm run type-check
```

## 许可证

MIT License

## 致谢

基于 [ONNX Runtime Web](https://onnxruntime.ai/) 构建

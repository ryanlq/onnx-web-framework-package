# 基础使用指南

本指南将帮助你快速上手 ONNX Web Framework，了解基本概念和核心功能。

## 🚀 5分钟上手

### 1. 导入和初始化

```javascript
import ONNXWebFramework from 'onnx-web-framework';

// 创建框架实例
const framework = new ONNXWebFramework({
  executionProviders: ['wasm'],  // 使用WASM执行提供者
  enableProfiling: true          // 启用性能分析
});

// 初始化框架
await framework.initialize();
console.log('框架初始化完成！');
```

### 2. 加载模型

```javascript
// 加载ONNX模型
await framework.loadModel('my-model', 'path/to/model.onnx');

// 或从URL加载
await framework.loadModel('image-classifier', 'https://example.com/model.onnx');
```

### 3. 运行推理

```javascript
// 准备输入数据（图像张量）
const inputData = new Float32Array(224 * 224 * 3).fill(0.5);

// 运行推理
const result = await framework.predict('my-model', inputData);

console.log('推理结果:', result.output);
console.log('推理时间:', result.inferenceTime + 'ms');
```

## 📋 核心概念

### 框架实例

`ONNXWebFramework` 是主要的类，负责协调所有功能：

```javascript
const framework = new ONNXWebFramework(options);
```

### 执行提供者

执行提供者决定了模型在什么硬件上运行：

```javascript
const framework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'webgl', 'wasm']  // 按优先级排序
});
```

可用的执行提供者：
- `wasm` - WebAssembly（通用）
- `webgl` - WebGL（GPU加速）
- `webgpu` - WebGPU（现代GPU）
- `webnn` - WebNN（原生AI推理）

### 模型管理

每个加载的模型都有一个唯一的名称：

```javascript
await framework.loadModel('classifier', 'models/mobilenet.onnx');
await framework.loadModel('detector', 'models/yolo.onnx');

// 列出所有模型
console.log(framework.listModels()); // ['classifier', 'detector']

// 获取模型信息
const info = framework.getModelInfo('classifier');
console.log(info);
```

## 🎯 实际示例

### 图像分类

```javascript
import ONNXWebFramework from 'onnx-web-framework';

async function classifyImage(imageElement) {
  // 初始化框架
  const framework = new ONNXWebFramework({
    executionProviders: ['webgpu', 'wasm'],
    enableProfiling: true
  });
  await framework.initialize();

  // 加载分类模型
  await framework.loadModel('mobilenet', 'models/mobilenet.onnx');

  // 运行分类（包含预处理）
  const result = await framework.predict('mobilenet', imageElement, {
    preprocess: {
      normalization: 'zeroToOne',  // 归一化到[0,1]
      resize: [224, 224],          // 调整图像大小
      layout: 'nchw'               // 数据布局
    }
  });

  // 处理结果
  const predictions = result.output;
  const topPrediction = predictions.indexOf(Math.max(...predictions));

  return {
    classIndex: topPrediction,
    confidence: predictions[topPrediction],
    inferenceTime: result.inferenceTime
  };
}

// 使用示例
const image = document.getElementById('input-image');
const classification = await classifyImage(image);
console.log('分类结果:', classification);
```

### 文本处理

```javascript
async function processText(text) {
  const framework = new ONNXWebFramework({
    executionProviders: ['wasm']
  });
  await framework.initialize();

  // 加载文本处理模型
  await framework.loadModel('text-model', 'models/bert.onnx');

  // 文本预处理（简单示例）
  const tokens = text.toLowerCase().split(' ');
  const inputIds = new Int32Array(128).fill(0); // 填充到固定长度
  tokens.slice(0, 128).forEach((token, i) => {
    inputIds[i] = hashToken(token); // 假设的token哈希函数
  });

  // 运行推理
  const result = await framework.predict('text-model', inputIds, {
    preprocess: {
      dataType: 'int32',
      layout: 'batch_first'
    }
  });

  return result.output;
}
```

### 批量推理

```javascript
async function batchInference(inputDataList) {
  const framework = new ONNXWebFramework({
    executionProviders: ['webgpu'],
    enableProfiling: true
  });
  await framework.initialize();

  await framework.loadModel('batch-model', 'models/batch-model.onnx');

  const results = [];
  const times = [];

  for (const input of inputDataList) {
    const startTime = performance.now();

    const result = await framework.predict('batch-model', input);
    results.push(result.output);

    const endTime = performance.now();
    times.push(endTime - startTime);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`批量推理完成，平均时间: ${avgTime.toFixed(2)}ms`);

  return results;
}
```

## ⚙️ 配置选项

### 常用配置

```javascript
const framework = new ONNXWebFramework({
  // 执行提供者优先级
  executionProviders: ['webgpu', 'webgl', 'wasm'],

  // WebNN设备类型
  deviceType: 'gpu',

  // 性能相关
  enableProfiling: true,    // 启用性能分析
  useWorker: true,         // 启用Web Worker
  numThreads: 4,           // WASM线程数

  // 缓存设置
  enableCache: true,       // 启用模型缓存
  cacheMaxAge: 86400000,   // 缓存有效期（24小时）

  // 调试选项
  debug: false,            // 调试模式
  logLevel: 'warning'      // 日志级别
});
```

### 环境检测

```javascript
// 检查设备能力
const capabilities = framework.getDeviceCapabilities();
console.log('设备能力:', {
  webgl: capabilities.webgl,
  webgpu: capabilities.webgpu,
  webnn: capabilities.webnn,
  deviceTypes: capabilities.deviceTypes,
  hardwareConcurrency: capabilities.hardwareConcurrency
});

// 获取支持的执行提供者
const providers = framework.getSupportedProviders();
console.log('支持的执行提供者:', providers);

// 根据能力自动选择最佳配置
let bestConfig = { executionProviders: ['wasm'] };

if (capabilities.webgpu) {
  bestConfig.executionProviders = ['webgpu', 'wasm'];
} else if (capabilities.webgl) {
  bestConfig.executionProviders = ['webgl', 'wasm'];
}

const optimizedFramework = new ONNXWebFramework(bestConfig);
```

## 📊 性能监控

### 基础性能分析

```javascript
const framework = new ONNXWebFramework({
  enableProfiling: true
});

const result = await framework.predict('model', inputData);

console.log('性能数据:', {
  total: result.totalTime,           // 总时间
  inference: result.inferenceTime,   // 推理时间
  preprocess: result.preprocessTime, // 预处理时间
  profiling: result.profiling        // 详细性能数据
});
```

### 高级性能监控

```javascript
async function benchmarkModel(modelName, input, iterations = 100) {
  const times = [];
  const memoryUsages = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();

    // 检查内存使用（如果支持）
    const memoryBefore = performance.memory?.usedJSHeapSize || 0;

    const result = await framework.predict(modelName, input);

    const memoryAfter = performance.memory?.usedJSHeapSize || 0;

    const endTime = performance.now();
    times.push(endTime - startTime);
    memoryUsages.push(memoryAfter - memoryBefore);

    if (i % 10 === 0) {
      console.log(`完成 ${i}/${iterations} 次推理`);
    }
  }

  const stats = {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    stdDev: Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - (times.reduce((a, b) => a + b, 0) / times.length), 2), 0) / times.length),
    throughput: 1000 / (times.reduce((a, b) => a + b, 0) / times.length),
    avgMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
  };

  console.log('基准测试结果:', stats);
  return stats;
}
```

## 🔄 错误处理

### 基础错误处理

```javascript
try {
  const result = await framework.predict('model', inputData);
  console.log('推理成功:', result);
} catch (error) {
  if (error.message.includes('model not found')) {
    console.error('模型未找到，请检查模型名称和路径');
  } else if (error.message.includes('WebAssembly')) {
    console.error('WebAssembly初始化失败，尝试其他执行提供者');
  } else {
    console.error('推理失败:', error.message);
  }
}
```

### 执行提供者回退

```javascript
async function initializeWithFallback() {
  const providers = ['webgpu', 'webgl', 'wasm'];

  for (const provider of providers) {
    try {
      const framework = new ONNXWebFramework({
        executionProviders: [provider]
      });
      await framework.initialize();
      console.log(`成功初始化 ${provider} 执行提供者`);
      return framework;
    } catch (error) {
      console.warn(`${provider} 初始化失败，尝试下一个...`);
    }
  }

  throw new Error('所有执行提供者都初始化失败');
}
```

## 🎯 下一步

掌握了基础使用后，你可以：

1. [学习模型管理](./model-management.md)
2. [了解执行提供者](./execution-providers.md)
3. [探索数据预处理](./preprocessing.md)
4. [查看API文档](../api/core.md)

## 💡 最佳实践

1. **选择合适的执行提供者**: 根据目标设备和性能需求选择
2. **启用缓存**: 对于频繁使用的模型，启用缓存可以显著提升加载速度
3. **使用Web Worker**: 对于可能阻塞UI的长时推理任务
4. **监控性能**: 使用内置的性能分析来优化推理流程
5. **处理错误**: 实现适当的错误处理和回退机制
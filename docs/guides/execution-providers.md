# 执行提供者指南

执行提供者决定了ONNX模型在什么硬件和软件环境下运行。ONNX Web Framework支持多种执行提供者，可以根据目标设备和性能需求选择最合适的方案。

## 🎯 执行提供者概览

| 执行提供者 | 描述 | 优势 | 劣势 | 适用场景 |
|------------|------|------|------|----------|
| **WASM** | WebAssembly | 兼容性最好，支持所有ONNX操作符 | CPU执行，性能相对较低 | 通用CPU推理，复杂模型 |
| **WebGL** | WebGL | GPU加速，较好的性能 | 操作符支持有限，内存限制 | 图像处理，卷积网络 |
| **WebGPU** | WebGPU | 现代GPU，最佳性能 | 新技术，浏览器支持有限 | 高性能推理，大规模模型 |
| **WebNN** | WebNN | 原生AI推理，支持NPU | 实验性，平台差异大 | 移动设备，专用AI硬件 |

## 🔧 配置执行提供者

### 基础配置

```javascript
const framework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'webgl', 'wasm']  // 按优先级排序
});
```

### 优先级设置

```javascript
// 高性能优先
const highPerformance = new ONNXWebFramework({
  executionProviders: ['webgpu', 'webnn', 'webgl', 'wasm']
});

// 兼容性优先
const compatible = new ONNXWebFramework({
  executionProviders: ['wasm', 'webgl', 'webgpu', 'webnn']
});

// 仅GPU
const gpuOnly = new ONNXWebFramework({
  executionProviders: ['webgpu', 'webgl']
});
```

## 🧠 WASM (WebAssembly)

### 特性
- ✅ 100%浏览器兼容性
- ✅ 完整的ONNX操作符支持
- ✅ 稳定可靠
- ❌ CPU执行，性能相对较低
- ❌ 无法利用GPU加速

### 配置选项

```javascript
const wasmFramework = new ONNXWebFramework({
  executionProviders: ['wasm'],

  // WASM特定配置
  numThreads: navigator.hardwareConcurrency || 4,  // 线程数
  wasmProxy: false,                                // 启用WASM代理
  wasmPaths: {
    wasm: '/node_modules/onnxruntime-web/dist/',
    mjs: '/node_modules/onnxruntime-web/dist/',
    wasmThreaded: '/node_modules/onnxruntime-web/dist/',
    mjsThreaded: '/node_modules/onnxruntime-web/dist/'
  }
});
```

### 性能优化

```javascript
// 根据设备能力优化
const optimizeWASM = () => {
  const threads = Math.min(navigator.hardwareConcurrency || 4, 8);

  return new ONNXWebFramework({
    executionProviders: ['wasm'],
    numThreads: threads,
    enableProfiling: true
  });
};
```

### 适用场景
- **通用推理**: 适用于任何模型的推理任务
- **复杂模型**: 包含复杂操作符或自定义操作符的模型
- **调试开发**: 稳定性高，适合开发和测试
- **兼容性要求**: 需要支持老版本浏览器

## 🎮 WebGL

### 特性
- ✅ GPU加速，性能良好
- ✅ 较好的浏览器支持
- ✅ 适合图像处理
- ❌ 操作符支持有限
- ❌ 内存限制较严格
- ❌ 调试相对困难

### 配置选项

```javascript
const webglFramework = new ONNXWebFramework({
  executionProviders: ['webgl'],

  // WebGL特定优化
  enableProfiling: true,
  powerPreference: 'high-performance'  // 高性能模式
});
```

### 支持的操作符
- 卷积层 (Conv)
- 池化层 (Pool)
- 激活函数 (Relu, Sigmoid, Tanh等)
- 批归一化 (BatchNormalization)
- 全连接层 (MatMul, Gemm)

### 适用场景
- **CNN模型**: 卷积神经网络，如图像分类
- **图像处理**: 图像分割、目标检测
- **中等复杂度模型**: 不包含复杂操作符的模型
- **移动设备**: 较老移动设备的GPU加速

## 🚀 WebGPU

### 特性
- ✅ 现代GPU，最佳性能
- ✅ 原生GPU编程能力
- ✅ 支持大规模模型
- ✅ I/O绑定支持
- ❌ 浏览器支持较新
- ❌ 技术相对新，稳定性待验证

### 浏览器支持
- Chrome 94+
- Firefox 113+
- Safari 16.4+
- Edge 94+

### 配置选项

```javascript
const webgpuFramework = new ONNXWebFramework({
  executionProviders: ['webgpu'],

  // WebGPU优化
  powerPreference: 'high-performance',
  enableProfiling: true,
  preferredOutputLocation: 'gpu-buffer'  // I/O绑定
});
```

### 高级特性 - I/O绑定

```javascript
// WebGPU I/O绑定示例
async function webgpuIOBinding() {
  const framework = new ONNXWebFramework({
    executionProviders: ['webgpu'],
    preferredOutputLocation: 'gpu-buffer'
  });

  await framework.initialize();
  await framework.loadModel('model', 'model.onnx');

  // 获取WebGPU设备
  const device = framework.getWebGPUDevice();

  // 创建GPU缓冲区
  const inputBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  // 写入数据
  device.queue.writeBuffer(inputBuffer, 0, inputData);

  // 创建GPU张量
  const gpuTensor = await framework.createGpuTensor(inputBuffer, {
    dataType: 'float32',
    dims: [1, 3, 224, 224]
  });

  // 运行推理（数据保留在GPU上）
  const result = await framework.run('model', {
    input: gpuTensor
  }, {
    returnTensors: true,
    downloadGpuData: false
  });

  return result;
}
```

### 适用场景
- **高性能推理**: 需要最佳推理性能的应用
- **大规模模型**: 大型神经网络，如BERT、GPT
- **实时应用**: 实时视频分析、游戏AI
- **批量推理**: 需要处理大量数据的场景

## 🧮 WebNN

### 特性
- ✅ 原生AI推理API
- ✅ 支持专用AI硬件（NPU）
- ✅ 优化功耗和性能
- ✅ 设备类型选择（CPU/GPU/NPU）
- ❌ 实验性技术
- ❌ 平台支持差异大
- ❌ 标准未完全稳定

### 设备类型

```javascript
// CPU设备
const cpuFramework = new ONNXWebFramework({
  executionProviders: ['webnn'],
  deviceType: 'cpu'
});

// GPU设备
const gpuFramework = new ONNXWebFramework({
  executionProviders: ['webnn'],
  deviceType: 'gpu'
});

// NPU设备（如果支持）
const npuFramework = new ONNXWebFramework({
  executionProviders: ['webnn'],
  deviceType: 'npu'
});
```

### 自动设备选择

```javascript
// 智能设备选择
function createOptimizedWebNNFramework() {
  const capabilities = navigator.ml?.getCapabilities?.();

  if (capabilities) {
    // 优先选择NPU，然后GPU，最后CPU
    const deviceTypes = ['npu', 'gpu', 'cpu'];
    const bestType = deviceTypes.find(type => capabilities.deviceTypes?.includes(type));

    return new ONNXWebFramework({
      executionProviders: ['webnn'],
      deviceType: bestType
    });
  }

  // 回退到其他执行提供者
  return new ONNXWebFramework({
    executionProviders: ['webgpu', 'wasm']
  });
}
```

### 平台支持

| 平台 | 版本要求 | 支持特性 |
|------|----------|----------|
| Chrome | 113+ | WebNN API, NPU支持 |
| Edge | 113+ | WebNN API |
| Safari | 实验性 | 部分支持 |
| Firefox | 实验性 | 部分支持 |

### 适用场景
- **移动设备**: Android设备的NPU加速
- **低功耗应用**: 电池供电设备
- **专用AI硬件**: 具有NPU的设备
- **未来技术**: 前瞻性技术布局

## 🔄 执行提供者选择策略

### 1. 自动选择策略

```javascript
function createOptimalFramework() {
  const capabilities = framework.getDeviceCapabilities();

  if (capabilities.webgpu) {
    return new ONNXWebFramework({
      executionProviders: ['webgpu', 'wasm']
    });
  } else if (capabilities.webgl) {
    return new ONNXWebFramework({
      executionProviders: ['webgl', 'wasm']
    });
  } else {
    return new ONNXWebFramework({
      executionProviders: ['wasm']
    });
  }
}
```

### 2. 性能优先策略

```javascript
function createHighPerformanceFramework() {
  return new ONNXWebFramework({
    executionProviders: ['webgpu', 'webnn', 'webgl', 'wasm'],
    deviceType: 'gpu',  // WebNN使用GPU
    powerPreference: 'high-performance'
  });
}
```

### 3. 兼容性优先策略

```javascript
function createCompatibleFramework() {
  return new ONNXWebFramework({
    executionProviders: ['wasm', 'webgl', 'webgpu', 'webnn']
  });
}
```

### 4. 移动设备优化策略

```javascript
function createMobileOptimizedFramework() {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    return new ONNXWebFramework({
      executionProviders: ['webnn', 'webgl', 'wasm'],
      deviceType: 'gpu',
      numThreads: 2  // 移动设备限制线程数
    });
  } else {
    return new ONNXWebFramework({
      executionProviders: ['webgpu', 'webgl', 'wasm'],
      numThreads: navigator.hardwareConcurrency
    });
  }
}
```

## 📊 性能对比

### 基准测试

```javascript
async function benchmarkExecutionProviders(modelUrl, inputData) {
  const providers = ['wasm', 'webgl', 'webgpu'];
  const results = {};

  for (const provider of providers) {
    try {
      const framework = new ONNXWebFramework({
        executionProviders: [provider],
        enableProfiling: true
      });

      await framework.initialize();
      await framework.loadModel('test-model', modelUrl);

      const times = [];
      for (let i = 0; i < 10; i++) {
        const result = await framework.predict('test-model', inputData);
        times.push(result.inferenceTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      results[provider] = {
        averageTime: avgTime,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        throughput: 1000 / avgTime
      };

      await framework.dispose();

    } catch (error) {
      results[provider] = {
        error: error.message
      };
    }
  }

  return results;
}
```

### 典型性能数据

| 模型 | WASM | WebGL | WebGPU | 提升倍数 |
|------|------|-------|--------|----------|
| MobileNet | 50ms | 25ms | 15ms | 3.3x |
| ResNet-50 | 120ms | 60ms | 35ms | 3.4x |
| BERT-Base | 200ms | - | 80ms | 2.5x |

## 🛠️ 故障排除

### 常见问题

#### 1. WebGPU不可用

```javascript
// 检查WebGPU支持
if (!navigator.gpu) {
  console.warn('WebGPU not supported, falling back to WebGL');
  framework.updateExecutionProviders(['webgl', 'wasm']);
}
```

#### 2. WebGL上下文丢失

```javascript
// 处理WebGL上下文丢失
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');

canvas.addEventListener('webglcontextlost', (e) => {
  console.error('WebGL context lost, falling back to WASM');
  framework.updateExecutionProviders(['wasm']);
});
```

#### 3. 内存不足

```javascript
// 内存优化
const optimizedFramework = new ONNXWebFramework({
  executionProviders: ['webgpu'],
  numThreads: Math.min(navigator.hardwareConcurrency, 4),
  enableCache: true
});
```

### 调试技巧

```javascript
// 启用详细日志
const debugFramework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'wasm'],
  debug: true,
  logLevel: 'verbose',
  enableProfiling: true
});

// 监控执行提供者状态
framework.updateExecutionProviders(['webgpu']).catch(error => {
  console.error('WebGPU初始化失败:', error);
  // 自动回退到WebGL
  return framework.updateExecutionProviders(['webgl', 'wasm']);
});
```

## 💡 最佳实践

1. **优先级设置**: 根据目标设备设置合理的执行提供者优先级
2. **错误处理**: 实现执行提供者失败的回退机制
3. **性能测试**: 在目标设备上进行性能基准测试
4. **设备检测**: 根据设备能力动态选择最优配置
5. **渐进增强**: 从基础功能开始，逐步添加高级特性
6. **内存管理**: 监控内存使用，避免内存泄漏

通过合理选择和配置执行提供者，你可以为不同场景和设备提供最佳的推理性能。
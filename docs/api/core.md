# 核心API文档

## ONNXWebFramework 类

`ONNXWebFramework` 是ONNX Web Framework的核心类，提供模型加载、推理和管理功能。

## 构造函数

### `new ONNXWebFramework(options?)`

创建一个新的ONNX Web Framework实例。

**参数:**
- `options` (可选) - 配置选项对象

**示例:**
```javascript
const framework = new ONNXWebFramework({
  executionProviders: ['webgpu', 'wasm'],
  enableProfiling: true,
  useWorker: true
});
```

## 配置选项 (ONNXWebFrameworkOptions)

```typescript
interface ONNXWebFrameworkOptions {
  // 执行提供者优先级
  executionProviders?: ('wasm' | 'webgl' | 'webgpu' | 'webnn')[];

  // WebNN设备类型
  deviceType?: 'cpu' | 'gpu' | 'npu';

  // 电源偏好
  powerPreference?: 'default' | 'low-power' | 'high-performance';

  // 性能配置
  enableProfiling?: boolean;
  useWorker?: boolean;
  workerPath?: string;

  // 缓存配置
  enableCache?: boolean;
  cacheMaxAge?: number;

  // WASM配置
  numThreads?: number;
  wasmProxy?: boolean;
  wasmPaths?: {
    wasm?: string;
    mjs?: string;
    wasmThreaded?: string;
    mjsThreaded?: string;
    simd?: string;
    simdThreaded?: string;
  };

  // 调试配置
  debug?: boolean;
  logLevel?: 'error' | 'verbose' | 'info' | 'warning' | 'fatal';

  // 高级配置
  graphCapture?: boolean;
  preferredOutputLocation?: 'cpu' | 'gpu-buffer' | 'ml-tensor';
}
```

## 核心方法

### `initialize(): Promise<void>`

初始化框架，设置执行环境和Web Worker。

**返回值:** `Promise<void>`

**示例:**
```javascript
await framework.initialize();
console.log('框架初始化完成');
```

### `loadModel(name, modelSource, sessionOptions?): Promise<InferenceSession>`

加载ONNX模型。

**参数:**
- `name: string` - 模型名称，用于后续引用
- `modelSource: string | ArrayBuffer | Uint8Array` - 模型URL或二进制数据
- `sessionOptions` (可选) - 会话配置选项

**返回值:** `Promise<InferenceSession>`

**示例:**
```javascript
// 从URL加载
await framework.loadModel('classifier', 'models/mobilenet.onnx');

// 从二进制数据加载
const response = await fetch('models/model.onnx');
const modelData = await response.arrayBuffer();
await framework.loadModel('custom', modelData);

// 带会话选项
await framework.loadModel('optimized', 'models/model.onnx', {
  executionProviders: ['webgpu'],
  graphOptimizationLevel: 'all',
  enableCpuFallback: true
});
```

### `predict(modelName, rawData, options?): Promise<InferenceResult>`

执行完整的推理流程（预处理 + 推理）。

**参数:**
- `modelName: string` - 已加载的模型名称
- `rawData: Float32Array | HTMLImageElement | HTMLCanvasElement | GPUBuffer | any` - 原始输入数据
- `options` (可选) - 推理选项

**返回值:** `Promise<InferenceResult>`

**示例:**
```javascript
// 基础推理
const result = await framework.predict('model', inputData);

// 带预处理选项
const result = await framework.predict('image-model', imageElement, {
  preprocess: {
    normalization: 'zeroToOne',
    resize: [224, 224],
    dataType: 'float32'
  }
});

console.log('输出:', result.output);
console.log('推理时间:', result.inferenceTime + 'ms');
```

### `run(modelName, inputs, options?): Promise<InferenceResult>`

仅执行推理步骤（需要预处理的输入张量）。

**参数:**
- `modelName: string` - 模型名称
- `inputs: Record<string, any>` - 预处理后的输入张量
- `options` (可选) - 推理选项

**返回值:** `Promise<InferenceResult>`

**示例:**
```javascript
// 预处理输入
const processedInput = preprocessData(rawData);

// 运行推理
const result = await framework.run('model', {
  'input': processedInput,
  'mask': maskData
});
```

## 模型管理方法

### `getModelInfo(modelName): ModelInfo | undefined`

获取已加载模型的详细信息。

**参数:**
- `modelName: string` - 模型名称

**返回值:** `ModelInfo | undefined`

**示例:**
```javascript
const info = framework.getModelInfo('mobilenet');
if (info) {
  console.log('模型信息:', {
    format: info.format,
    inputNames: info.inputNames,
    outputNames: info.outputNames,
    providers: info.providers
  });
}
```

### `listModels(): string[]`

列出所有已加载的模型名称。

**返回值:** `string[]`

**示例:**
```javascript
const models = framework.listModels();
console.log('已加载模型:', models); // ['classifier', 'detector', 'segmentation']
```

### `unloadModel(modelName): Promise<void>`

卸载指定模型并释放相关资源。

**参数:**
- `modelName: string` - 要卸载的模型名称

**返回值:** `Promise<void>`

**示例:**
```javascript
await framework.unloadModel('old-model');
console.log('模型已卸载');
```

### `getModelFormat(modelName): ModelFormatInfo | undefined`

获取模型格式信息。

**参数:**
- `modelName: string` - 模型名称

**返回值:** `ModelFormatInfo | undefined`

**示例:**
```javascript
const formatInfo = framework.getModelFormat('model');
console.log('模型格式:', formatInfo.format); // 'onnx' 或 'ort'
console.log('文件路径:', formatInfo.path);
```

### `compareModelFormats(modelName, onnxPath, ortPath): Promise<ComparisonResult>`

比较ONNX和ORT格式的性能差异。

**参数:**
- `modelName: string` - 模型名称
- `onnxPath: string` - ONNX格式模型路径
- `ortPath: string` - ORT格式模型路径

**返回值:** `Promise<ComparisonResult>`

**示例:**
```javascript
const comparison = await framework.compareModelFormats(
  'test-model',
  'models/model.onnx',
  'models/model.ort'
);

console.log('性能提升:', comparison.improvements);
console.log('加载时间提升:', comparison.improvements.loadTimeImprovement + '%');
```

## 设备和能力方法

### `getDeviceCapabilities(): DeviceCapabilities`

获取设备能力信息。

**返回值:** `DeviceCapabilities`

**示例:**
```javascript
const capabilities = framework.getDeviceCapabilities();
console.log('设备能力:', {
  webgl: capabilities.webgl,
  webgpu: capabilities.webgpu,
  webnn: capabilities.webnn,
  deviceTypes: capabilities.deviceTypes,
  hardwareConcurrency: capabilities.hardwareConcurrency
});
```

### `getSupportedProviders(): string[]`

获取当前支持的执行提供者列表。

**返回值:** `string[]`

**示例:**
```javascript
const providers = framework.getSupportedProviders();
console.log('支持的提供者:', providers); // ['wasm', 'webgl', 'webgpu']
```

### `updateExecutionProviders(providers): Promise<void>`

动态更新执行提供者配置。

**参数:**
- `providers: ('wasm' | 'webgl' | 'webgpu' | 'webnn')[]` - 新的执行提供者列表

**返回值:** `Promise<void>`

**示例:**
```javascript
// 切换到GPU优先
await framework.updateExecutionProviders(['webgpu', 'wasm']);
```

## WebGPU方法

### `createGpuTensor(gpuBuffer, options): Promise<any>`

从WebGPU缓冲区创建GPU张量（用于I/O绑定）。

**参数:**
- `gpuBuffer: GPUBuffer` - WebGPU缓冲区
- `options: GPUTensorOptions` - 张量选项

**返回值:** `Promise<any>`

**示例:**
```javascript
const gpuBuffer = device.createBuffer({
  size: bufferSize,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});

const gpuTensor = await framework.createGpuTensor(gpuBuffer, {
  dataType: 'float32',
  dims: [1, 3, 224, 224]
});
```

### `createPreallocatedGpuTensor(modelName, outputName, dims): Promise<any>`

创建预分配的GPU输出张量。

**参数:**
- `modelName: string` - 模型名称
- `outputName: string` - 输出名称
- `dims: number[]` - 张量维度

**返回值:** `Promise<any>`

### `getWebGPUDevice(): GPUDevice | undefined`

获取WebGPU设备实例。

**返回值:** `GPUDevice | undefined`

**示例:**
```javascript
const device = framework.getWebGPUDevice();
if (device) {
  console.log('WebGPU设备:', device.name);
}
```

## WebNN方法

### `createMLTensor(mlTensor, options): Promise<any>`

从WebNN MLTensor创建张量。

**参数:**
- `mlTensor: any` - WebNN MLTensor
- `options: MLTensorOptions` - 张量选项

**返回值:** `Promise<any>`

### `createPreallocatedMLTensor(modelName, outputName, dims): Promise<any>`

创建预分配的MLTensor输出张量。

### `getWebNNContext(): any`

获取WebNN上下文。

## 缓存方法

### `getCacheStats(): Promise<CacheStats>`

获取模型缓存统计信息。

**返回值:** `Promise<CacheStats>`

**示例:**
```javascript
const stats = await framework.getCacheStats();
console.log('缓存统计:', {
  count: stats.count,
  totalSize: stats.totalSize,
  hitRate: stats.hitRate
});
```

### `clearCache(): Promise<void>`

清除所有模型缓存。

**返回值:** `Promise<void>`

**示例:**
```javascript
await framework.clearCache();
console.log('缓存已清空');
```

## 资源管理

### `dispose(): Promise<void>`

清理所有资源，包括模型、缓存和Web Worker。

**返回值:** `Promise<void>`

**示例:**
```javascript
// 应用关闭时清理资源
window.addEventListener('beforeunload', async () => {
  await framework.dispose();
});
```

## 类型定义

### InferenceResult

```typescript
interface InferenceResult {
  output: Float32Array | number[] | Record<string, Float32Array | number[]>;
  inferenceTime: number;
  preprocessTime: number;
  totalTime: number;
  profiling: {
    preprocess: number;
    inference: number;
    total: number;
  };
}
```

### ModelInfo

```typescript
interface ModelInfo {
  name: string;
  format: 'onnx' | 'ort';
  path: string;
  loadTime: number;
  inputNames: string[];
  outputNames: string[];
  providers: string[];
  size?: number;
  metadata?: Record<string, any>;
}
```

### DeviceCapabilities

```typescript
interface DeviceCapabilities {
  webgl: boolean;
  webgpu: boolean;
  webnn: boolean;
  deviceTypes: ('cpu' | 'gpu' | 'npu')[];
  hardwareConcurrency: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  gpuAdapter?: {
    name: string;
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
}
```

## 事件处理

框架会在控制台输出重要事件和调试信息：

```javascript
// 启用调试模式查看详细日志
const framework = new ONNXWebFramework({
  debug: true,
  logLevel: 'info'
});

// 框架会输出以下类型的消息：
// - 框架初始化状态
// - 模型加载进度
// - 执行提供者选择
// - 性能警告
// - 错误信息
```

## 使用示例

### 完整的工作流程

```javascript
import ONNXWebFramework from 'onnx-web-framework';

async function main() {
  // 1. 初始化框架
  const framework = new ONNXWebFramework({
    executionProviders: ['webgpu', 'wasm'],
    enableProfiling: true,
    useWorker: true,
    enableCache: true
  });

  await framework.initialize();

  // 2. 检查设备能力
  const capabilities = framework.getDeviceCapabilities();
  console.log('设备能力:', capabilities);

  // 3. 加载模型
  await framework.loadModel('mobilenet', 'models/mobilenet.onnx');

  // 4. 获取模型信息
  const modelInfo = framework.getModelInfo('mobilenet');
  console.log('模型信息:', modelInfo);

  // 5. 运行推理
  const imageData = /* 获取图像数据 */;
  const result = await framework.predict('mobilenet', imageData, {
    preprocess: {
      normalization: 'zeroToOne',
      resize: [224, 224]
    }
  });

  console.log('推理结果:', result);
  console.log('推理时间:', result.inferenceTime + 'ms');

  // 6. 清理资源
  await framework.dispose();
}

main().catch(console.error);
```
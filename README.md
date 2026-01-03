# ONNX Web Framework

[![npm version](https://badge.fury.io/js/onnx-web-framework.svg)](https://badge.fury.io/js/onnx-web-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight browser-based ONNX inference framework with Web Worker, caching, and I/O binding support. Built on top of ONNX Runtime Web for maximum performance and compatibility.

## ✨ Features

- 🚀 **Simple API** - Run ONNX models with just a few lines of code
- 🔧 **Multiple Backends** - Support for WASM, WebGL, WebGPU, and WebNN
- 🧵 **Web Worker** - Non-blocking inference with dedicated worker threads
- 💾 **Smart Caching** - IndexedDB-based model caching with HTTP semantics
- 🎯 **I/O Binding** - GPU tensor and MLTensor support to minimize data transfers
- 📊 **Performance Profiling** - Built-in performance monitoring and optimization
- 🎨 **Modern ES6** - Native ES modules with modern toolchain support
- 📱 **Device Detection** - Automatic capability detection and optimal backend selection
- 🔒 **Privacy-First** - All computation happens in the browser

## 📦 Installation

### NPM

```bash
npm install onnx-web-framework
```

### CDN

```html
<!-- Load ONNX Runtime Web -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>

<!-- Load ONNX Web Framework -->
<script type="module">
  import ONNXWebFramework from 'https://cdn.jsdelivr.net/npm/onnx-web-framework@latest/dist/index.js';
</script>
```

## 🚀 Quick Start

### Basic Usage

```javascript
import ONNXWebFramework from 'onnx-web-framework';

// Initialize framework
const framework = new ONNXWebFramework({
    executionProviders: ['webgpu', 'wasm'],
    enableProfiling: true
});

await framework.initialize();

// Load model
await framework.loadModel('my-model', 'path/to/model.onnx');

// Run inference
const result = await framework.predict('my-model', inputData);

console.log('Output:', result.output);
console.log('Inference time:', result.inferenceTime);
```

### Image Classification

```javascript
const framework = new ONNXWebFramework();
await framework.initialize();

// Load image classification model
await framework.loadModel('classifier', 'models/mobilenet.onnx');

// Get image element
const imageElement = document.getElementById('input-image');

// Run classification
const result = await framework.predict('classifier', imageElement, {
    preprocess: {
        normalization: 'zeroToOne',
        resize: [224, 224]
    }
});

console.log('Classification result:', result.output);
console.log('Confidence:', result.probabilities);
```

## 📚 API Reference

### Constructor

```javascript
const framework = new ONNXWebFramework(options);
```

**Options:**
- `executionProviders`: Backend priority order (default: `['wasm']`)
- `deviceType`: WebNN device type (`'cpu'`, `'gpu'`, `'npu'`)
- `enableProfiling`: Enable performance monitoring
- `useWorker`: Enable Web Worker (default: `true`)
- `enableCache`: Enable model caching (default: `true`)
- `debug`: Enable debug mode
- And many more...

### Core Methods

#### `initialize()`
Initialize the framework and prepare execution environment.

#### `loadModel(name, modelSource, sessionOptions?)`
Load an ONNX model with optional session configuration.

#### `predict(modelName, rawData, options?)`
Run complete inference pipeline with preprocessing.

```javascript
const result = await framework.predict('model', inputData, {
    preprocess: {
        normalization: 'zeroToOne',
        resize: [224, 224]
    }
});

// Result structure
{
    output: Array|Object,           // Model output
    inferenceTime: number,          // Inference time (ms)
    preprocessTime: number,         // Preprocessing time (ms)
    totalTime: number,             // Total time (ms)
    profiling: {                    // Performance details
        preprocess: number,
        inference: number,
        total: number
    }
}
```

#### `run(modelName, inputs, options?)`
Run inference only (assumes preprocessed inputs).

#### `getModelInfo(modelName)`
Get detailed information about a loaded model.

## 🎯 Execution Providers

| Provider | Description | Best For |
|----------|-------------|----------|
| `wasm` | WebAssembly | General CPU inference |
| `webgl` | WebGL | GPU acceleration on older browsers |
| `webgpu` | WebGPU | Modern GPU acceleration |
| `webnn` | WebNN | Native AI acceleration with device selection |

### WebNN Device Types

```javascript
// Auto-detect best device type
const capabilities = framework.getDeviceCapabilities();
const bestDevice = capabilities.deviceTypes[0]; // npu > gpu > cpu

// Manual device selection
const framework = new ONNXWebFramework({
    executionProviders: ['webnn'],
    deviceType: 'npu'  // Use NPU acceleration
});
```

## 🔧 Advanced Usage

### I/O Binding (WebGPU)

```javascript
// Get WebGPU device
const device = framework.getWebGPUDevice();

// Create GPU buffer
const gpuBuffer = device.createBuffer({
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    size: bufferSize
});

// Create GPU tensor
const inputTensor = await framework.createGpuTensor(gpuBuffer, {
    dataType: 'float32',
    dims: [1, 3, 224, 224]
});

// Run inference with I/O binding
const result = await framework.run('model', { input: inputTensor }, {
    returnTensors: true,
    downloadGpuData: false  // Keep data on GPU
});
```

### Performance Optimization

```javascript
// Enable all optimizations
const framework = new ONNXWebFramework({
    executionProviders: ['webgpu', 'webnn', 'wasm'],
    deviceType: 'gpu',
    enableProfiling: true,
    enableCache: true,
    numThreads: navigator.hardwareConcurrency
});

// Benchmark performance
const capabilities = framework.getDeviceCapabilities();
console.log('Available providers:', framework.getSupportedProviders());
console.log('Device capabilities:', capabilities);
```

### Model Caching

```javascript
// Framework automatically caches models
await framework.loadModel('model', 'https://example.com/model.onnx');

// Check cache stats
const stats = await framework.getCacheStats();
console.log(`Cache: ${stats.count} models, ${stats.totalSize / 1024 / 1024}MB`);

// Clear cache if needed
await framework.clearCache();
```

## 🌁 Examples

### Basic Inference
```javascript
// Simple inference with mock data
const input = new Float32Array(224 * 224 * 3).fill(0.5);
const result = await framework.predict('model', input);
```

### Image Processing
```javascript
const img = document.getElementById('image');
const result = await framework.predict('image-model', img, {
    preprocess: {
        normalization: 'imagenet',
        resize: [256, 256],
        crop: [16, 16, 224, 224]
    }
});
```

### Multiple Models
```javascript
// Load multiple models
await framework.loadModel('encoder', 'encoder.onnx');
await framework.loadModel('decoder', 'decoder.onnx');

// Run sequential inference
const encoded = await framework.predict('encoder', input);
const decoded = await framework.predict('decoder', encoded.output);
```

## 🏗️ Browser Support

- **Chrome**: 90+ (WebGPU: 94+, WebNN: Experimental)
- **Firefox**: 88+ (WebGPU: 113+, WebNN: Experimental)
- **Safari**: 14+ (WebGPU: 16.4+, WebNN: Experimental)
- **Edge**: 90+ (WebGPU: 94+, WebNN: Experimental)

## 🔗 Related Links

- [ONNX Runtime Documentation](https://onnxruntime.ai/)
- [ONNX Model Zoo](https://github.com/onnx/models)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WebNN Specification](https://www.w3.org/TR/webnn/)

## 📖 Development

```bash
# Clone repository
git clone https://github.com/your-username/onnx-web-framework.git
cd onnx-web-framework

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🙏 Acknowledgments

Built on top of [ONNX Runtime Web](https://onnxruntime.ai/) by Microsoft.
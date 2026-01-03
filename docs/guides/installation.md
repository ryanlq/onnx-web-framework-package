# 安装指南

本文档介绍如何安装和设置 ONNX Web Framework。

## 📦 安装方式

### 1. NPM 安装（推荐）

```bash
# 使用 npm
npm install onnx-web-framework

# 使用 yarn
yarn add onnx-web-framework

# 使用 pnpm
pnpm add onnx-web-framework
```

### 2. CDN 使用

```html
<!-- 开发版本 -->
<script src="https://cdn.jsdelivr.net/npm/onnxweb-runtime-web@1.18.0/dist/ort.min.js"></script>
<script type="module">
  import ONNXWebFramework from 'https://cdn.jsdelivr.net/npm/onnx-web-framework@latest/dist/index.js';
</script>

<!-- 生产版本 -->
<script src="https://cdn.jsdelivr.net/npm/onnxweb-runtime-web@1.18.0/dist/ort.min.js"></script>
<script type="module">
  import ONNXWebFramework from 'https://cdn.jsdelivr.net/npm/onnx-web-framework@1.0.0/dist/index.js';
</script>
```

## 🔧 依赖要求

### 浏览器要求

| 浏览器 | 最低版本 | 推荐版本 | 支持特性 |
|--------|----------|----------|----------|
| Chrome | 90+ | 100+ | 全功能支持 |
| Firefox | 88+ | 95+ | 全功能支持 |
| Safari | 14+ | 16+ | 全功能支持 |
| Edge | 90+ | 100+ | 全功能支持 |

### 功能支持

- **ES6 Modules**: 所有现代浏览器
- **Web Workers**: 所有现代浏览器
- **WebGL**: 大部分浏览器
- **WebGPU**: Chrome 94+, Firefox 113+, Safari 16.4+
- **WebNN**: 实验性支持，需要开启标志

### 可选依赖

ONNX Web Framework 将 ONNX Runtime Web 作为 peer dependency：

```json
{
  "peerDependencies": {
    "onnxruntime-web": "^1.18.0"
  }
}
```

这意味着你可以选择：

1. **自动依赖管理**（推荐）：
   ```bash
   npm install onnx-web-framework onnxruntime-web
   ```

2. **手动管理版本**：
   ```bash
   npm install onnx-web-framework
   npm install onnxruntime-web@1.18.0
   ```

3. **CDN加载**：
   ```html
   <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>
   ```

## ⚙️ 项目设置

### Vite 项目

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
});
```

### Webpack 项目

```javascript
// webpack.config.js
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

### React 项目

```jsx
// App.jsx
import { useState, useEffect } from 'react';
import ONNXWebFramework from 'onnx-web-framework';

function App() {
  const [framework, setFramework] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initFramework = async () => {
      const fw = new ONNXWebFramework({
        executionProviders: ['webgpu', 'wasm']
      });
      await fw.initialize();
      setFramework(fw);
      setIsReady(true);
    };

    initFramework();
  }, []);

  if (!isReady) {
    return <div>加载中...</div>;
  }

  // 使用框架...
  return <div>框架已就绪！</div>;
}
```

### Vue 项目

```vue
<!-- App.vue -->
<template>
  <div>
    <div v-if="!isReady">正在初始化框架...</div>
    <div v-else>框架已就绪！</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ONNXWebFramework from 'onnx-web-framework';

const framework = ref(null);
const isReady = ref(false);

onMounted(async () => {
  const fw = new ONNXWebFramework({
    executionProviders: ['wasm']
  });
  await fw.initialize();
  framework.value = fw;
  isReady.value = true;
});
</script>
```

## 🧪 验证安装

创建一个简单的测试文件来验证安装：

```javascript
// test-installation.js
import ONNXWebFramework from 'onnx-web-framework';

async function testInstallation() {
  try {
    console.log('正在测试 ONNX Web Framework 安装...');

    // 创建框架实例
    const framework = new ONNXWebFramework({
      executionProviders: ['wasm']
    });

    // 初始化
    await framework.initialize();
    console.log('✅ 框架初始化成功');

    // 检查设备能力
    const capabilities = framework.getDeviceCapabilities();
    console.log('✅ 设备能力检测:', capabilities);

    // 检查支持的执行提供者
    const providers = framework.getSupportedProviders();
    console.log('✅ 支持的执行提供者:', providers);

    console.log('🎉 安装验证成功！');

  } catch (error) {
    console.error('❌ 安装验证失败:', error);
  }
}

testInstallation();
```

## 🔍 故障排除

### 常见安装问题

#### 1. 模块导入失败

**错误**: `Cannot find module 'onnx-web-framework'`

**解决方案**:
```bash
# 确保在正确的目录
npm install onnx-web-framework

# 清除缓存
npm cache clean --force
```

#### 2. WASM 加载失败

**错误**: `WebAssembly compilation failed`

**解决方案**:
```javascript
// 确保使用正确的 MIME 类型
const framework = new ONNXWebFramework({
  wasmPaths: {
    wasm: '/path/to/onnxruntime-web/dist/',
    mjs: '/path/to/onnxruntime-web/dist/'
  }
});
```

#### 3. CORS 错误

**错误**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解决方案**:
- 确保模型文件服务器支持 CORS
- 使用相同域名或配置正确的 CORS 头

#### 4. 内存不足

**错误**: `Out of memory` 或 `WebAssembly memory out of bounds`

**解决方案**:
```javascript
const framework = new ONNXWebFramework({
  numThreads: Math.min(navigator.hardwareConcurrency, 4)
});
```

### 开发环境配置

#### Chrome 开发者工具

1. 打开 Chrome DevTools
2. 进入 Console 面板
3. 测试框架功能

#### Firefox 开发者工具

1. 打开 Firefox DevTools
2. 进入 Web Console
3. 查看网络请求和错误

#### Safari 开发者工具

1. 开启"开发"菜单（Safari > 偏好设置 > 高级）
2. 打开 Web Inspector
3. 检查 Console 和 Network 标签

## 📋 下一步

安装完成后，你可以：

1. [学习基础使用](./basic-usage.md)
2. [加载你的第一个模型](./first-model.md)
3. [了解执行提供者](./execution-providers.md)
4. [查看API文档](../api/core.md)

## 🔗 相关资源

- [官方npm包](https://www.npmjs.com/package/onnx-web-framework)
- [GitHub仓库](https://github.com/your-username/onnx-web-framework)
- [ONNX Runtime文档](https://onnxruntime.ai/)
- [WebAssembly支持情况](https://caniuse.com/webassembly)
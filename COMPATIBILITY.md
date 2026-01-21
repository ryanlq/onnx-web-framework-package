# ⚠️ 修改影响分析和兼容性说明

## 修改内容

### 代码变更

**文件**: `src/onnx-web-framework.js`

**之前**:
```javascript
import ortImport from 'onnxruntime-web';
// 使用 ortImport
```

**现在**:
```javascript
// 不再导入 onnxruntime-web
// 只使用全局 ort 对象
let ort = null;
if (typeof globalThis !== 'undefined' && globalThis.ort) {
  ort = globalThis.ort;
}
```

### 构建产物对比

| 文件 | onnxruntime-web 导入 | 状态 |
|------|---------------------|------|
| `dist/index.js` (主线程) | ❌ 无导入 | ✅ 已修改 |
| `dist/worker.js` (Worker) | ✅ `import * as ort from 'onnxruntime-web'` | ✅ 未改变 |

## 📊 影响分析

### ✅ 不受影响的场景

#### 1. 使用 Worker API 的项目

**示例代码**:
```javascript
import { createOnnxWorkerProxy } from 'onnx-web-framework';
import workerUrl from 'onnx-web-framework/worker?worker&url';

const worker = new Worker(workerUrl, { type: 'module' });
const proxy = createOnnxWorkerProxy(worker);
```

**状态**: ✅ **完全兼容**
- `dist/worker.js` 仍然导入 onnxruntime-web
- 宿主项目需要安装 onnxruntime-web
- 构建工具会处理依赖

**受影响项目**: 无（包括 ryanlq/onnx-apps）

**原因**:
- ryanlq/onnx-apps 只使用 Worker API
- 它们通过 Vite 配置处理 onnxruntime-web
- Worker 文件保持不变

#### 2. 使用构建工具 + 手动加载 onnxruntime-web

**示例代码**:
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      external: ['onnxruntime-web']
    }
  }
}

// main.ts
import ONNXWebFramework from 'onnx-web-framework';

// HTML
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>
```

**状态**: ✅ **兼容**（如果已手动加载）

---

### ❌ 受影响的场景

#### 使用主线程 API + 构建工具自动处理依赖

**示例代码**:
```javascript
// 之前的工作方式
import ONNXWebFramework from 'onnx-web-framework';

// 期望：onnx-web-framework 内部自动导入 onnxruntime-web
const framework = new ONNXWebFramework();
```

**问题**:
- ❌ 现在 onnx-web-framework 不再导入 onnxruntime-web
- ❌ 需要宿主项目手动加载

**迁移**: 见下方

---

## 🔧 迁移指南

### 场景 1：使用主线程 API（需要迁移）

#### 之前的代码（会失败）

```javascript
// ❌ 不再工作
import ONNXWebFramework from 'onnx-web-framework';

const framework = new ONNXWebFramework();
// Error: ort is not defined
```

#### 解决方案 A：在 HTML 中加载（浏览器环境）

```html
<!-- 1. 在 HTML 中加载 onnxruntime-web -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>

<!-- 2. 然后加载你的代码 -->
<script type="module">
  import ONNXWebFramework from 'onnx-web-framework';
  const framework = new ONNXWebFramework();
  // ✅ 现在可以工作了
</script>
```

#### 解决方案 B：在代码中手动导入（Node.js/构建环境）

```javascript
// 1. 手动导入 onnxruntime-web
import ort from 'onnxruntime-web';
globalThis.ort = ort;

// 2. 然后导入框架
import ONNXWebFramework from 'onnx-web-framework';
const framework = new ONNXWebFramework();
```

#### 解决方案 C：使用 Vite 自动注入（推荐）

```javascript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      // 保留 onnxruntime-web 的导入
      external: ['onnxruntime-web']
    }
  },
  // 自动注入全局变量
  define: {
    'globalThis.ort': 'await import("onnxruntime-web").then(m => m.default || m)'
  }
});
```

### 场景 2：Worker API（不需要修改）

```javascript
// ✅ 仍然正常工作，无需修改
import { createOnnxWorkerProxy } from 'onnx-web-framework';
import workerUrl from 'onnx-web-framework/worker?worker&url';

const worker = new Worker(workerUrl, { type: 'module' });
const proxy = createOnnxWorkerProxy(worker);

await proxy.initialize({
  wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/'
});
```

---

## 📋 快速检查清单

### 对于宿主项目维护者

请检查你的项目：

#### 步骤 1：检查使用的 API

```javascript
// 如果你的代码是这样的：
import ONNXWebFramework from 'onnx-web-framework';
const framework = new ONNXWebFramework();  // ❌ 需要迁移

// 如果是这样的：
import { createOnnxWorkerProxy } from 'onnx-web-framework';  // ✅ 不需要修改
```

#### 步骤 2：检查是否已加载 onnxruntime-web

```javascript
// 在控制台运行
console.log(typeof ort);  // 如果是 "undefined"，需要加载

// 检查 package.json
npm list onnxruntime-web  // 如果没有安装，需要安装
```

#### 步骤 3：选择迁移方案

- **方案 A**: HTML 中加载（最简单）
- **方案 B**: 代码中导入（灵活性高）
- **方案 C**: Vite 配置（推荐用于生产环境）

---

## 🎯 版本兼容性

### onnx-web-framework 版本

| 版本 | 主线程 API | Worker API | 推荐用途 |
|------|-----------|------------|----------|
| 2.0.x | 需要手动加载 ort | 自动导入 | 构建工具环境 |
| 2.1.x | 需要手动加载 ort | 自动导入 | 混合环境 |
| 当前版本 | 需要手动加载 ort | 自动导入 | 浏览器优先 |

### 依赖要求

```
onnx-web-framework@2.x
├── onnxruntime-web@^1.18.0 (peer dependency)
└── 浏览器环境：script 标签加载 UMD 版本
```

---

## ✅ 验证步骤

### 测试 Worker API（应该能工作）

```javascript
import { createOnnxWorkerProxy } from 'onnx-web-framework';
import workerUrl from 'onnx-web-framework/worker?worker&url';

const worker = new Worker(workerUrl, { type: 'module' });
const proxy = createOnnxWorkerProxy(worker);

try {
  await proxy.initialize({ wasmPaths: '...' });
  console.log('✅ Worker API 正常');
} catch (error) {
  console.error('❌ Worker API 失败:', error);
}
```

### 测试主线程 API（需要加载 ort）

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>
<script type="module">
  import ONNXWebFramework from 'onnx-web-framework';

  const framework = new ONNXWebFramework();
  await framework.initialize();
  console.log('✅ 主线程 API 正常');
</script>
```

---

## 📞 问题反馈

如果你遇到兼容性问题：

1. 检查使用的 API（Worker vs 主线程）
2. 检查是否已加载 onnxruntime-web
3. 查看浏览器控制台错误信息
4. 提交 Issue 时请附上：
   - 使用的 API 类型
   - 构建工具配置
   - 错误日志

---

## 总结

- ✅ **Worker API**: 完全兼容，无需修改
- ⚠️ **主线程 API**: 需要手动加载 onnxruntime-web
- 📦 **推荐**: 生产环境使用 Worker API
- 🔧 **迁移**: 简单，添加一个 script 标签即可

---

**最后更新**: 2025-01-21
**影响范围**: 主线程 API 用户
**破坏性变更**: 是（需要加载 onnxruntime-web）

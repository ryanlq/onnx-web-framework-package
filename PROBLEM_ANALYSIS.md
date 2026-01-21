# 🎯 问题根本原因分析和解决方案

## 问题现象

```
Uncaught TypeError: Failed to resolve module specifier "onnxruntime-web".
Relative references must start with either "/", "./", or "../".
```

## 根本原因

### 1. 参考项目的工作方式（正确）

**ryanlq/onnx-apps** 使用 **Vite 构建工具**：

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      'onnxruntime-web': path.resolve(__dirname, 'node_modules/onnxruntime-web')
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'onnx-web-framework']
  }
})
```

**关键点**：
- ✅ Vite 在**开发时**提供模块解析服务
- ✅ Vite 在**构建时**打包所有依赖
- ✅ HTML 中不需要 script 标签加载 onnxruntime-web
- ✅ 代码中的 `import ... from 'onnxruntime-web'` 由 Vite 处理

### 2. 我们当前的错误方式

**我们的示例**（直接浏览器 ES 模块）：

```html
<!-- 当前方式 -->
<script src="...ort.min.js"></script>  <!-- 全局 ort -->
<script type="module">
  import ONNXWebFramework from './dist/index.js';
  // dist/index.js 内部有: import ortImport from 'onnxruntime-web'
  // ❌ 浏览器无法解析裸模块 'onnxruntime-web'！
</script>
```

**问题**：
- ❌ 浏览器直接遇到 `import ... from 'onnxruntime-web'`
- ❌ 浏览器不知道如何解析这个裸模块
- ❌ 即使有全局 ort，import 语句还是会执行并失败

## ✅ 正确的解决方案

### 方案 1：使用构建工具（生产环境推荐）

**像参考项目那样使用 Vite**：

```bash
# 创建项目
npm create vite@latest my-app -- --template vanilla
cd my-app
npm install onnxruntime-web onnx-web-framework

# vite.config.ts
export default {
  resolve: {
    alias: {
      'onnxruntime-web': path.resolve(__dirname, 'node_modules/onnxruntime-web')
    }
  }
}

# 代码中直接导入
import ONNXWebFramework from 'onnx-web-framework';
// ✅ Vite 会处理 onnxruntime-web 的导入
```

### 方案 2：浏览器直接使用（简化示例）- **我们采用的方式**

**完全移除源代码中对 onnxruntime-web 的 import**：

```javascript
// src/onnx-web-framework.js (修改后)
// ❌ 移除: import ortImport from 'onnxruntime-web';

// ✅ 只使用全局 ort
let ort = null;
if (typeof globalThis !== 'undefined' && globalThis.ort) {
  ort = globalThis.ort;
  console.log('✅ 使用全局 ort (UMD 版本)');
}
```

**HTML 中加载**：

```html
<!-- 1. 先加载 onnxruntime-web (创建全局 ort) -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>

<!-- 2. 然后导入框架 (使用全局 ort) -->
<script type="module">
  import ONNXWebFramework from './dist/index.js';
  // ✅ 现在可以使用了，因为 dist/index.js 不再 import onnxruntime-web
</script>
```

## 关键区别对比

| 方面 | Vite 构建方式 | 浏览器直接使用方式 |
|------|---------------|-------------------|
| **模块解析** | Vite 开发服务器 | 浏览器原生 |
| **依赖打包** | 构建时打包 | CDN 加载 |
| **裸模块** | ✅ 支持 | ❌ 不支持 |
| **HTML script** | 不需要 | 需要 UMD script |
| **适用场景** | 生产应用 | 快速原型/演示 |
| **配置复杂度** | 中等 | 简单 |

## 修复验证

### 1. 检查构建产物

```bash
# 检查是否还有 onnxruntime-web 导入
grep "import.*onnxruntime" dist/index.js

# 预期输出：（无内容，表示已移除）
```

### 2. 测试加载顺序

访问 `http://localhost:8080/examples/test-ort.html`，应该看到：

```
✅ ort 已成功加载！
ort 对象信息：
  - ort 类型: object
  - ort.InferenceSession: function
  - ort.env: object
✅ 现在可以导入 ONNX Web Framework 了！
```

### 3. 测试完整示例

访问 `http://localhost:8080/examples/bge-embedding-demo.html`，控制台应显示：

```
✅ 使用全局 ort (UMD 版本)
🚀 Initializing ONNX Web Framework...
✅ ONNX Web Framework initialized successfully
📥 Loading tokenizer...
✅ Tokenizer loaded successfully (vocab size: 21128)
✅ Preprocessor registered for 'bge-model'
✅ Postprocessor registered for 'bge-model'
📥 Loading model 'bge-model'...
✅ Model 'bge-model' loaded successfully
🎉 所有组件准备完毕！
```

## 总结

### 问题根源

我们的代码设计有两个假设：
1. **构建工具环境** - Vite/Webpack 处理裸模块
2. **浏览器直接使用** - 需要全局变量

但示例代码混合了这两种方式，导致冲突。

### 最佳实践建议

1. **生产项目**：使用 Vite/Webpack，像 ryanlq/onnx-apps 那样
2. **快速原型/演示**：使用浏览器直接方式（当前实现）
3. **明确文档**：区分两种使用方式，提供清晰的指导

### 后续改进

1. 创建 Vite 版本的示例（examples/vite-example/）
2. 更新 README，说明两种方式的区别
3. 提供迁移指南
4. 添加使用方式检测和友好错误提示

## 测试检查清单

- [x] 移除源代码中的 `import ... from 'onnxruntime-web'`
- [x] 重新构建项目
- [x] 验证 dist/index.js 无 onnxruntime-web 导入
- [x] 创建测试页面验证 ort 加载
- [ ] 用户在浏览器中测试完整功能
- [ ] 验证 BGE 模型推理正常

---
**最后更新**: 2025-01-21

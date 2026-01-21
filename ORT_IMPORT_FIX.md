# ✅ onnxruntime-web 导入问题修复

## 问题描述

原始错误：
```
TypeError: Cannot read properties of undefined (reading 'create')
```

原因：`ort.InferenceSession` 为 undefined，说明 onnxruntime-web 没有正确加载。

## 解决方案

使用 **UMD 版本** + **script 标签**加载，兼容性最好。

### 修改内容

#### 1. 框架代码 (`src/onnx-web-framework.js`)

```javascript
// 导入 onnxruntime-web (在 Node.js 环境中需要)
// 在浏览器环境中，通常会通过 <script> 标签加载 UMD 版本
import ortImport from 'onnxruntime-web';

// 确保ort在全局可用
let ort = null;

// 1. 优先使用全局 ort（通过 script 标签加载的 UMD 版本）
if (typeof globalThis !== 'undefined' && globalThis.ort && globalThis.ort.InferenceSession) {
  ort = globalThis.ort;
  console.log('✅ 使用全局 ort (UMD 版本)');
} else {
  // 2. 使用导入的模块（Node.js 或 ESM 环境）
  ort = ortImport;
  console.log('✅ 使用导入的 ort (ESM 版本)');
}

// 3. 设置到全局
if (typeof globalThis !== 'undefined') {
  globalThis.ort = ort;
}

// 4. 验证 ort 可用
if (!ort || !ort.InferenceSession) {
  throw new Error('ONNX Runtime Web 未正确加载...');
}
```

**优点**：
- ✅ 优先使用全局 ort（浏览器 UMD）
- ✅ 降级到导入的模块（Node.js）
- ✅ 清晰的错误提示
- ✅ 日志显示使用的版本

#### 2. HTML 示例页面

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

### 更新的文件

✅ **核心代码**:
- `src/onnx-web-framework.js` - 优化 ort 加载逻辑

✅ **示例页面** (全部 6 个):
- `examples/bge-embedding-demo.html` - BGE 嵌入模型演示
- `examples/nlp-example.html` - NLP 模型示例
- `examples/basic/index.html` - 基础示例
- `examples/advanced/webgpu-demo.html` - WebGPU 演示
- `examples/advanced/segmentation-demo.html` - 图像分割演示
- `examples/cdn/index.html` - CDN 使用示例

✅ **文档**:
- `README.md` - 更新浏览器配置说明

### CDN 版本

| 组件 | 版本 | 说明 |
|------|------|------|
| onnxruntime-web | 1.18.0 | 稳定版本，与项目兼容 |
| CDN | jsDelivr | https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js |

### 验证步骤

1. **清除浏览器缓存** (Ctrl+Shift+Del)
2. **刷新页面** (Ctrl+Shift+R)
3. **打开控制台** (F12)

**预期日志**：
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

### 控制台输出

成功初始化后，你会看到：
- ✅ **3 个绿色状态图标**
- ✅ **进度条 100%**
- ✅ **"生成嵌入向量" 按钮可用**
- ✅ **无错误信息**

### 技术细节

#### 为什么用 UMD 而不是 ESM？

1. **兼容性**: UMD 在所有浏览器中都能直接使用
2. **简单性**: 只需一个 script 标签，不需要 Import Maps
3. **可靠性**: 避免了 ESM 模块解析的各种问题
4. **调试**: 容易验证是否正确加载（检查 `window.ort`）

#### 版本选择

- **1.18.0**: 项目中使用的版本，已测试稳定
- **1.20.0**: 较新版本，但可能有兼容性问题
- **建议**: 使用与 package.json 中 peerDependency 一致的版本

### 故障排除

#### 问题 1: 还是报 `ort.InferenceSession undefined`

**检查**:
```javascript
// 在控制台运行
console.log(typeof ort);
console.log(ort);
console.log(ort.InferenceSession);
```

**解决**:
- 确认 script 标签在模块导入之前加载
- 检查 CDN 是否可访问
- 尝试使用本地文件

#### 问题 2: CORS 错误

**原因**: 本地 file:// 协议限制

**解决**:
```bash
# 必须通过 HTTP 服务器
python3 -m http.server 8080
```

#### 问题 3: 下载慢

**解决**:
- 使用国内 CDN 镜像
- 下载到本地托管
- 使用 Service Worker 缓存

### 后续优化建议

1. **本地托管**: 下载 onnxruntime-web 到项目目录
   ```html
   <script src="./assets/onnxruntime-web/dist/ort.min.js"></script>
   ```

2. **版本锁定**: 避免使用 `@latest`，使用具体版本号

3. **缓存策略**: 设置合理的 HTTP 缓存头

4. **降级方案**: 提供多个 CDN 备选

## 测试状态

- [x] 框架代码修改
- [x] 所有示例页面更新
- [x] README 文档更新
- [x] 构建成功
- [ ] 浏览器测试验证（待用户确认）

## 日期

2025-01-21

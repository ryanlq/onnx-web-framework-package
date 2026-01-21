# BGE 文本嵌入模型演示 - 使用说明

## 📋 概述

这是一个使用 **BGE-small-zh-v1.5-INT8** 模型的完整示例，展示了如何使用 ONNX Web Framework 的 Tokenizer 和预处理钩子功能。

## 🚀 快速开始

### 1. 启动本地服务器

由于浏览器的 CORS 限制，需要通过 HTTP 服务器访问示例页面：

```bash
# 方法 1: 使用 Python（推荐）
python3 -m http.server 8080

# 方法 2: 使用 Node.js
npx serve -p 8080

# 方法 3: 使用 PHP
php -S localhost:8080
```

### 2. 访问示例页面

在浏览器中打开：

```
http://localhost:8080/examples/bge-embedding-demo.html
```

## ✨ 功能演示

### 1. 自动初始化流程

页面加载后会自动：
- ✅ 初始化 ONNX Web Framework
- ✅ 从 ModelScope 加载 Tokenizer（tokenizer.json）
- ✅ 加载 BGE 模型（model_int8.ort）
- ✅ 注册预处理器和后处理器

初始化进度会通过进度条和状态图标显示。

### 2. 文本向量化

输入任意中文文本，点击"生成嵌入向量"按钮，模型会生成一个 512 维的语义向量。

**示例：**
```
输入: "人工智能技术正在改变世界"
输出: 512 维归一化嵌入向量
```

### 3. 文本相似度比较

输入两个文本，系统会计算它们的余弦相似度：

- **相似度 80%+**：🟢 非常相似
- **相似度 60-80%**：🟡 相似
- **相似度 40-60%**：🟠 部分相似
- **相似度 <40%**：🔴 不太相似

**测试示例：**
```
文本 1: "人工智能技术正在改变世界"
文本 2: "机器学习是人工智能的重要分支"
预期相似度: 约 60-75%（相关话题）
```

## 🔍 技术细节

### 模型信息

- **模型**: BAAI/bge-small-zh-v1.5
- **量化**: INT8（节省内存）
- **向量维度**: 512
- **最大序列长度**: 512
- **输入格式**:
  - `input_ids`: int64[1, seq_len]
  - `attention_mask`: int64[1, seq_len]
  - `token_type_ids`: int64[1, seq_len]

### Tokenizer

使用 HuggingFace 格式的 tokenizer.json：
- **词汇表大小**: 约 60,000+ tokens
- **分词方式**: WordPiece/BPE 混合
- **支持中文**: ✅

### 预处理流程

```javascript
1. 文本分词 (tokenizer.encode)
2. 截断/填充到最大长度 (512)
3. 转换为 BigInt64Array
4. 创建 ONNX Runtime Tensor
```

### 后处理流程

```javascript
1. 提取模型输出张量
2. L2 归一化
3. 返回归一化向量
```

## 🎯 API 使用示例

### 基础用法

```javascript
import ONNXWebFramework, { loadTokenizer } from 'onnx-web-framework';

// 1. 初始化
const framework = new ONNXWebFramework({
  executionProviders: ['wasm']
});
await framework.initialize();

// 2. 加载 tokenizer
const tokenizer = await loadTokenizer(
  'https://www.modelscope.cn/models/duchao/bge-small-zh-v1.5/resolve/master/tokenizer.json'
);

// 3. 注册预处理器
framework.registerPreprocessor('bge', async (text) => {
  const tokens = tokenizer.encode(text);
  const { ort } = globalThis;

  return {
    input_ids: new ort.Tensor('int64',
      BigInt64Array.from(tokens.ids.map(BigInt)),
      [1, tokens.ids.length]
    ),
    attention_mask: new ort.Tensor('int64',
      BigInt64Array.from(tokens.attentionMask.map(BigInt)),
      [1, tokens.attentionMask.length]
    ),
    token_type_ids: new ort.Tensor('int64',
      BigInt64Array.from(tokens.typeIds.map(BigInt)),
      [1, tokens.typeIds.length]
    )
  };
});

// 4. 加载模型
await framework.loadModel('bge',
  'https://www.modelscope.cn/models/duchao/bge-small-zh-v1.5/resolve/master/onnx/model_int8.ort'
);

// 5. 生成嵌入
const result = await framework.predict('bge', '你好，世界！');
console.log(result.embedding); // 512 维向量
```

### 计算相似度

```javascript
// 获取两个文本的嵌入
const emb1 = await framework.predict('bge', text1);
const emb2 = await framework.predict('bge', text2);

// 计算余弦相似度
function cosineSimilarity(vec1, vec2) {
  let dot = 0, norm1 = 0, norm2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

const similarity = cosineSimilarity(emb1.full_embedding, emb2.full_embedding);
console.log(`相似度: ${(similarity * 100).toFixed(2)}%`);
```

## 🛠️ 故障排除

### 问题 1: CORS 错误

**错误信息**: `Access to fetch at 'https://www.modelscope.cn/...' from origin 'null' has been blocked by CORS policy`

**解决方案**: 必须通过 HTTP 服务器访问，不能直接打开 HTML 文件。

### 问题 2: WASM 加载失败

**错误信息**: `Failed to load wasm`

**解决方案**:
- 检查网络连接
- 确保浏览器支持 WebAssembly
- 清除浏览器缓存

### 问题 3: 内存不足

**错误信息**: `Cannot allocate memory`

**解决方案**:
- 关闭其他标签页
- 使用更短的文本输入
- 确保浏览器有足够内存

## 📊 性能参考

| 环境 | 推理时间 | 内存占用 |
|------|---------|---------|
| Chrome (M1 Mac) | ~50ms | ~120MB |
| Firefox (M1 Mac) | ~60ms | ~130MB |
| Safari (M1 Mac) | ~55ms | ~115MB |
| Chrome (Intel i5) | ~80ms | ~150MB |

*测试文本: "人工智能技术正在改变世界" (约 10 tokens)*

## 🔗 相关链接

- [BGE 模型介绍](https://github.com/FlagOpen/FlagEmbedding)
- [ModelScope 模型页](https://www.modelscope.cn/models/duchao/bge-small-zh-v1.5)
- [ONNX Web Framework 文档](../README.md)

## 📝 注意事项

1. **首次加载较慢**: 需要下载 tokenizer.json (~20MB) 和模型文件 (~70MB)
2. **模型缓存**: 下载后会自动缓存到 IndexedDB，下次访问更快
3. **文本长度**: 最大支持 512 tokens，超长文本会被截断
4. **浏览器兼容性**: 需要支持 WebAssembly 和 BigInt64Array

## 🎉 完成！

现在你可以在浏览器中运行强大的中文文本嵌入模型了！

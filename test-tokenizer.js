/**
 * Tokenizer 功能测试脚本
 */

import fetch from 'node-fetch';
import { loadTokenizer } from './dist/index.js';

// 模拟浏览器环境
globalThis.fetch = fetch;

async function testTokenizer() {
  console.log('🧪 开始测试 Tokenizer 功能...\n');

  try {
    // 1. 测试加载 tokenizer
    console.log('📥 测试 1: 加载 Tokenizer');
    console.log('URL: https://www.modelscope.cn/models/duchao/bge-small-zh-v1.5/resolve/master/tokenizer.json');

    const tokenizer = await loadTokenizer(
      'https://www.modelscope.cn/models/duchao/bge-small-zh-v1.5/resolve/master/tokenizer.json',
      { useCache: false }
    );

    console.log('✅ Tokenizer 加载成功');
    console.log('词汇表大小:', tokenizer.vocabSize);
    console.log('');

    // 2. 测试编码功能
    console.log('⚙️  测试 2: 编码文本');
    const testText = '人工智能技术正在改变世界';
    console.log('输入文本:', testText);

    const encoded = tokenizer.encode(testText);
    console.log('✅ 编码成功');
    console.log('Token IDs (前20个):', encoded.ids.slice(0, 20));
    console.log('序列长度:', encoded.ids.length);
    console.log('');

    // 3. 测试解码功能
    console.log('⚙️  测试 3: 解码 Tokens');
    const decoded = tokenizer.decode(encoded.ids.slice(0, 10)); // 只解码前10个
    console.log('✅ 解码成功');
    console.log('解码结果:', decoded);
    console.log('');

    // 4. 测试多文本
    console.log('⚙️  测试 4: 编码多个文本');
    const testTexts = [
      '人工智能技术正在改变世界',
      '机器学习是人工智能的重要分支',
      '深度学习神经网络'
    ];

    for (const text of testTexts) {
      const enc = tokenizer.encode(text);
      console.log(`  "${text}" -> ${enc.ids.length} tokens`);
    }
    console.log('');

    console.log('🎉 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testTokenizer();

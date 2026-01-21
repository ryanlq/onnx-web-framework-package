/**
 * Tokenizer 加载器和工具类
 *
 * 支持从 URL 加载 tokenizer 配置，并提供统一的分词接口
 */

/**
 * Tokenizer 基础接口
 * 所有 tokenizer 插件都需要实现这个接口
 */
export class ITokenizer {
  /**
   * 编码：将文本转换为 tokens
   * @param {string} text - 输入文本
   * @returns {{ids: number[], attentionMask: number[], typeIds: number[]}}
   */
  encode(text) {
    throw new Error('encode() must be implemented by subclass');
  }

  /**
   * 解码：将 tokens 转换回文本
   * @param {number[]} ids - token IDs
   * @returns {string}
   */
  decode(ids) {
    throw new Error('decode() must be implemented by subclass');
  }

  /**
   * 获取词汇表大小
   * @returns {number}
   */
  get vocabSize() {
    throw new Error('vocabSize getter must be implemented by subclass');
  }
}

/**
 * JSON Tokenizer（HuggingFace 格式）
 * 支持从 tokenizer.json 加载
 */
export class JSONTokenizer extends ITokenizer {
  constructor(config) {
    super();
    this.config = config;
    this.vocab = config.model?.vocab || {};
    this.merges = config.model?.merges || [];
    this.addedTokens = config.added_tokens || [];
    this._buildTrie();
  }

  /**
   * 构建 Trie 树用于快速查找
   * @private
   */
  _buildTrie() {
    this.trie = {};
    for (const [token, id] of Object.entries(this.vocab)) {
      let node = this.trie;
      for (const char of token) {
        if (!node[char]) node[char] = {};
        node = node[char];
      }
      node._end = id;
    }
  }

  /**
   * 编码文本
   * @param {string} text
   * @returns {{ids: number[], attentionMask: number[], typeIds: number[]}}
   */
  encode(text) {
    // 简化的 BPE 实现（生产环境建议使用 tokenizers.js）
    const tokens = this._bpeEncode(text);
    const ids = tokens.map(t => this.vocab[t] || this.vocab['<unk>']);

    return {
      ids,
      attentionMask: ids.map(() => 1),
      typeIds: ids.map(() => 0)
    };
  }

  /**
   * BPE 编码（简化版）
   * @private
   */
  _bpeEncode(text) {
    // 这是一个简化的实现
    // 实际使用时建议集成 tokenizers.js 或 @nlpjs/bpe
    const words = text.split(/\s+/);
    const tokens = [];

    for (const word of words) {
      // 简单的字符级分词作为 fallback
      if (this.vocab[word] !== undefined) {
        tokens.push(word);
      } else {
        // 按字符切分
        for (const char of word) {
          if (this.vocab[char] !== undefined) {
            tokens.push(char);
          }
        }
      }
    }

    return tokens;
  }

  /**
   * 解码 token IDs
   * @param {number[]} ids
   * @returns {string}
   */
  decode(ids) {
    const idToToken = Object.fromEntries(
      Object.entries(this.vocab).map(([k, v]) => [v, k])
    );
    return ids.map(id => idToToken[id] || '<unk>').join(' ');
  }

  get vocabSize() {
    return Object.keys(this.vocab).length;
  }
}

/**
 * Tokenizer 加载器
 * 从 URL 或本地路径加载 tokenizer 配置
 */
export class TokenizerLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 从 URL 加载 tokenizer
   * @param {string} url - tokenizer.json 或 tokenizer.txt 的 URL
   * @param {object} options - 加载选项
   * @returns {Promise<ITokenizer>}
   */
  async loadFromUrl(url, options = {}) {
    const { useCache = true, format = 'auto' } = options;

    // 检查缓存
    if (useCache && this.cache.has(url)) {
      return this.cache.get(url);
    }

    console.log(`📥 Loading tokenizer from: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load tokenizer: ${response.statusText}`);
      }

      const text = await response.text();
      let tokenizer;

      // 检测格式
      const detectedFormat = format === 'auto' ? this._detectFormat(url, text) : format;

      switch (detectedFormat) {
        case 'json':
          const config = JSON.parse(text);
          tokenizer = new JSONTokenizer(config);
          break;

        case 'wordpiece':
          // WordPiece 格式 (vocab.txt)
          const vocab = text.split('\n').filter(l => l.trim());
          tokenizer = this._createWordPieceTokenizer(vocab);
          break;

        default:
          throw new Error(`Unsupported tokenizer format: ${detectedFormat}`);
      }

      if (useCache) {
        this.cache.set(url, tokenizer);
      }

      console.log(`✅ Tokenizer loaded successfully (vocab size: ${tokenizer.vocabSize})`);

      return tokenizer;
    } catch (error) {
      console.error(`❌ Failed to load tokenizer:`, error);
      throw error;
    }
  }

  /**
   * 从配置对象创建 tokenizer
   * @param {object} config - tokenizer 配置
   * @param {string} type - tokenizer 类型
   * @returns {ITokenizer}
   */
  createFromConfig(config, type = 'json') {
    switch (type) {
      case 'json':
        return new JSONTokenizer(config);
      default:
        throw new Error(`Unsupported tokenizer type: ${type}`);
    }
  }

  /**
   * 检测 tokenizer 格式
   * @private
   */
  _detectFormat(url, content) {
    if (url.endsWith('.json') || content.trim().startsWith('{')) {
      return 'json';
    }
    if (url.endsWith('.txt') || url.includes('vocab')) {
      return 'wordpiece';
    }
    return 'json'; // 默认
  }

  /**
   * 创建 WordPiece tokenizer
   * @private
   */
  _createWordPieceTokenizer(vocab) {
    const vocabMap = {};
    vocab.forEach((token, idx) => {
      vocabMap[token] = idx;
    });

    return new JSONTokenizer({
      model: { vocab: vocabMap }
    });
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * 单例实例
 */
export const tokenizerLoader = new TokenizerLoader();

/**
 * 便捷函数：从 URL 加载 tokenizer
 * @param {string} url
 * @param {object} options
 * @returns {Promise<ITokenizer>}
 */
export async function loadTokenizer(url, options) {
  return tokenizerLoader.loadFromUrl(url, options);
}

/**
 * 便捷函数：从配置创建 tokenizer
 * @param {object} config
 * @param {string} type
 * @returns {ITokenizer}
 */
export function createTokenizer(config, type = 'json') {
  return tokenizerLoader.createFromConfig(config, type);
}

import * as ort from 'onnxruntime-web';

/**
 * 模型缓存管理器
 * 使用IndexedDB缓存模型文件，支持HTTP Range请求
 */

class ModelCache {
  constructor() {
    this.dbName = 'ONNXModelCache';
    this.dbVersion = 1;
    this.storeName = 'models';
    this.db = null;
  }

  /**
   * 初始化缓存数据库
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('etag', 'etag', { unique: false });
        }
      };
    });
  }

  /**
   * 检查模型是否已缓存
   */
  async isCached(url) {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);

      request.onsuccess = () => {
        const cached = request.result;
        if (!cached) {
          resolve(null);
          return;
        }

        // 检查缓存是否过期（24小时）
        const maxAge = 24 * 60 * 60 * 1000; // 24小时
        if (Date.now() - cached.timestamp > maxAge) {
          this.removeFromCache(url);
          resolve(null);
          return;
        }

        resolve(cached);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * 获取模型文件，支持HTTP Range请求
   */
  async getModel(url) {
    try {
      // 首先检查缓存
      const cached = await this.isCached(url);
      if (cached) {
        console.log(`📦 Loading model from cache: ${url}`);
        return cached.data;
      }

      console.log(`⬇️  Fetching model from network: ${url}`);

      // 检查是否支持Range请求
      const headResponse = await fetch(url, { method: 'HEAD' });
      const supportsRange = headResponse.headers.get('Accept-Ranges') === 'bytes';
      const contentLength = headResponse.headers.get('Content-Length');
      const etag = headResponse.headers.get('ETag');

      let modelArray;

      if (supportsRange && contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        // 大文件使用分块下载
        modelArray = await this.downloadInChunks(url, contentLength);
      } else {
        // 小文件直接下载
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch model: ${response.statusText}`);
        }
        modelArray = await response.arrayBuffer();
      }

      // 缓存模型
      await this.cacheModel(url, modelArray, etag);

      return modelArray;
    } catch (error) {
      console.error(`Failed to get model ${url}:`, error);
      throw error;
    }
  }

  /**
   * 分块下载大文件
   */
  async downloadInChunks(url, contentLength) {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = [];
    let downloaded = 0;

    console.log(`📥 Downloading large model in chunks (${Math.ceil(contentLength / chunkSize)} chunks)`);

    for (let start = 0; start < contentLength; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, contentLength - 1);
      const range = `bytes=${start}-${end}`;

      const response = await fetch(url, {
        headers: { Range: range }
      });

      if (!response.ok) {
        throw new Error(`Failed to download chunk ${range}: ${response.statusText}`);
      }

      const chunk = await response.arrayBuffer();
      chunks.push(chunk);
      downloaded += chunk.byteLength;

      // 更新进度
      const progress = (downloaded / contentLength * 100).toFixed(1);
      console.log(`⏳ Download progress: ${progress}% (${downloaded}/${contentLength} bytes)`);
    }

    // 合并所有块
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const modelArray = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      modelArray.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    return modelArray;
  }

  /**
   * 缓存模型文件
   */
  async cacheModel(url, data, etag = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const modelRecord = {
        url,
        data,
        timestamp: Date.now(),
        etag,
        size: data.byteLength || data.length
      };

      const request = store.put(modelRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 从缓存中移除模型
   */
  async removeFromCache(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清理过期缓存
   */
  async cleanup() {
    if (!this.db) await this.init();

    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result;
        const totalSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
        const stats = {
          count: models.length,
          totalSize,
          models: models.map(model => ({
            url: model.url,
            size: model.size,
            timestamp: model.timestamp,
            age: Date.now() - model.timestamp
          }))
        };
        resolve(stats);
      };

      request.onerror = () => resolve({ count: 0, totalSize: 0, models: [] });
    });
  }
}

/**
 * ONNX Web Framework
 * 基于ONNX Runtime Web构建，支持模型缓存
 */

if (typeof globalThis !== 'undefined') {
  globalThis.ort = ort;
}

class ONNXWebFramework {
  constructor(options = {}) {
    this.options = {
      // 缓存配置
      enableCache: options.enableCache !== false, // 默认启用缓存
      cacheMaxAge: options.cacheMaxAge || 24 * 60 * 60 * 1000, // 24小时

      // ORT配置
      executionProviders: options.executionProviders || ['wasm'],
      enableProfiling: options.enableProfiling || false,
      debug: options.debug || false,
      logLevel: options.logLevel || 'warning',
      numThreads: options.numThreads || 0,

      // WASM路径配置（可选，默认让打包工具自动处理）
      // 只有在需要自定义路径时才设置为字符串
      wasmPaths: options.wasmPaths || null,
      ...options
    };

    // 缓存和模型
    this.modelCache = new ModelCache();
    this.models = new Map();
    this.isInitialized = false;
  }

  /**
   * 初始化框架
   */
  async initialize() {
    try {
      console.log('🚀 Initializing ONNX Web Framework...');

      // 不设置 wasmPaths，让打包工具自动处理
      // 如需自定义路径，可通过 options.wasmPaths 传入
      if (this.options.wasmPaths && typeof this.options.wasmPaths === 'string') {
        ort.env.wasm.wasmPaths = this.options.wasmPaths;
        console.log(`📁 Using custom WASM paths: ${this.options.wasmPaths}`);
      } else {
        console.log('📁 Using default WASM loader (bundle tool will handle it)');
      }

      // 初始化缓存
      if (this.options.enableCache) {
        await this.modelCache.init();
        await this.modelCache.cleanup();
        console.log('✅ Model cache initialized');
      }

      this.isInitialized = true;
      console.log('✅ ONNX Web Framework initialized successfully');

      // 打印缓存统计
      if (this.options.enableCache) {
        const stats = await this.modelCache.getStats();
        console.log(`📊 Cache stats: ${stats.count} models, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
      }

    } catch (error) {
      console.error('❌ Failed to initialize framework:', error);
      throw error;
    }
  }


  /**
   * 加载模型
   */
  async loadModel(name, modelSource, sessionOptions = {}) {
    if (!this.isInitialized) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    console.log(`📦 Loading model '${name}'...`);

    try {
      // 获取模型数据
      let modelArray;
      let modelFormat = 'unknown';

      if (typeof modelSource === 'string') {
        // 优先尝试ORT格式
        const ortSource = modelSource.replace(/\.onnx$/, '.ort');

        try {
          modelArray = await this.modelCache.getModel(ortSource);
          modelFormat = 'ort';
          console.log(`✅ Using ORT format model: ${ortSource}`);
        } catch (ortError) {
          // 回退到ONNX格式
          console.log(`⚠️  ORT format not available, using ONNX format`);
          modelArray = await this.modelCache.getModel(modelSource);
          modelFormat = 'onnx';
        }
      } else if (modelSource instanceof Uint8Array || modelSource instanceof ArrayBuffer) {
        modelArray = modelSource;
        modelFormat = 'array';
      } else {
        throw new Error('Invalid model source. Must be URL, Uint8Array, or ArrayBuffer.');
      }

      // 在主线程加载模型
      console.log('⚠️  Loading model in main thread (UI may be blocked during inference)');
      const finalOptions = {
        executionProviders: sessionOptions.executionProviders || this.options.executionProviders,
        enableProfiling: sessionOptions.enableProfiling || this.options.enableProfiling,
        ...sessionOptions
      };

      const session = await ort.InferenceSession.create(modelArray, finalOptions);

      // 保存模型信息
      this.models.set(name, {
        session,
        modelFormat,
        modelPath: modelSource,
        inputNames: session.inputNames,
        outputNames: session.outputNames
      });

      console.log(`✅ Model '${name}' loaded successfully (${modelFormat})`);
      return {
        modelName: name,
        loaded: true,
        inputNames: session.inputNames,
        outputNames: session.outputNames
      };

    } catch (error) {
      console.error(`❌ Failed to load model '${name}':`, error);
      throw error;
    }
  }

  /**
   * 执行推理
   */
  async run(modelName, feeds) {
    if (!this.isInitialized) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model '${modelName}' not loaded`);
    }

    try {
      // 在主线程执行推理
      const result = await model.session.run(feeds);
      return result;

    } catch (error) {
      console.error(`❌ Failed to run inference with model '${modelName}':`, error);
      throw error;
    }
  }

  /**
   * 执行推理（带预处理）
   */
  async predict(modelName, rawData, options = {}) {
    throw new Error('predict() not implemented. Please use run() directly with preprocessed tensors.');
  }

  /**
   * 预处理输入数据
   */
  async preprocessInput(model, rawData, preprocessOptions) {
    const processed = {};

    for (const [inputName, inputMeta] of Object.entries(model.inputMetadata)) {
      let inputTensor;

      if (rawData instanceof HTMLImageElement || rawData instanceof HTMLCanvasElement) {
        // 图像预处理
        inputTensor = await this.preprocessImage(rawData, inputMeta, preprocessOptions);
      } else if (Array.isArray(rawData) || rawData instanceof Float32Array) {
        // 数组数据
        inputTensor = {
          data: rawData,
          shape: preprocessOptions.resize || inputMeta.shape || [1, rawData.length]
        };
      } else if (typeof rawData === 'object' && rawData[inputName]) {
        // 已经是处理过的对象
        inputTensor = rawData[inputName];
      } else {
        throw new Error(`Unsupported input data type for '${inputName}'`);
      }

      processed[inputName] = inputTensor;
    }

    return processed;
  }

  /**
   * 图像预处理
   */
  async preprocessImage(image, inputMeta, options) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 调整尺寸
    const targetSize = options.resize || [224, 224];
    canvas.width = targetSize[1];
    canvas.height = targetSize[0];

    // 绘制图像
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // 获取像素数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // 转换为模型所需的格式
    const isRGB = options.colorFormat === 'rgb';
    options.normalization || 'zeroToOne';
    const channels = isRGB ? 3 : 4; // RGB或RGBA
    const data = new Float32Array(canvas.width * canvas.height * channels);

    for (let i = 0, j = 0; i < pixels.length; i += 4, j += channels) {
      // RGB通道
      if (isRGB) {
        data[j] = pixels[i] / 255;     // R
        data[j + 1] = pixels[i + 1] / 255; // G
        data[j + 2] = pixels[i + 2] / 255; // B
      } else {
        data[j] = pixels[i] / 255;     // R
        data[j + 1] = pixels[i + 1] / 255; // G
        data[j + 2] = pixels[i + 2] / 255; // B
        data[j + 3] = pixels[i + 3] / 255; // A
      }
    }

    return {
      data,
      shape: [1, channels, canvas.height, canvas.width] // NCHW格式
    };
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelName) {
    return this.models.get(modelName);
  }

  /**
   * 列出已加载的模型
   */
  listModels() {
    return Array.from(this.models.keys());
  }

  /**
   * 卸载模型
   */
  async unloadModel(modelName) {
    const model = this.models.get(modelName);
    if (model && model.session) {
      await model.session.release();
    }
    this.models.delete(modelName);
    console.log(`🗑️  Model '${modelName}' unloaded`);
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats() {
    if (!this.options.enableCache) {
      return { enabled: false };
    }

    return await this.modelCache.getStats();
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    if (!this.options.enableCache) {
      return;
    }

    await this.modelCache.cleanup();
    console.log('🧹 Cache cleared');
  }

  /**
   * 清理所有资源
   */
  async dispose() {
    // 清理Worker
    if (this.workerManager) {
      await this.workerManager.dispose();
      this.workerManager = null;
    }

    // 清理模型
    this.models.clear();

    console.log('🧹 ONNX Web Framework disposed');
  }
}

/**
 * ONNX Web Worker 类型定义
 *
 * 定义 Worker 和主线程之间的消息协议
 */

/**
 * Worker 消息类型枚举
 */
const WorkerMessageType = {
  INITIALIZE: "initialize",
  LOAD_MODEL: "load_model",
  RUN_INFERENCE: "run_inference",
  DISPOSE: "dispose",
  RESULT: "result",
  ERROR: "error",
};

/**
 * 初始化配置
 */
class InitializeConfig {
  constructor(options = {}) {
    /**
     * WASM 文件路径配置
     * @type {string | Record<string, string>}
     */
    this.wasmPaths = options.wasmPaths || null;

    /**
     * 线程数量（0 = 使用默认值）
     * @type {number}
     */
    this.numThreads = options.numThreads || 0;

    /**
     * 是否启用性能分析
     * @type {boolean}
     */
    this.enableProfiling = options.enableProfiling || false;

    /**
     * 执行提供者列表
     * @type {string[]}
     */
    this.executionProviders = options.executionProviders || ["wasm"];
  }
}

/**
 * 张量数据
 */
class TensorData {
  constructor(data, dims, type = "float32") {
    /**
     * 张量数据（Float32Array | Int32Array | Uint8Array | BigInt64Array）
     */
    this.data = data;

    /**
     * 张量维度
     * @type {number[]}
     */
    this.dims = dims;

    /**
     * 数据类型
     * @type {'float32' | 'int32' | 'uint8' | 'int64'}
     */
    this.type = type;
  }
}

/**
 * 加载模型请求
 */
class LoadModelRequest {
  constructor(id, modelName, modelBuffer, sessionOptions = {}) {
    /**
     * 请求 ID
     * @type {string}
     */
    this.id = id;

    /**
     * 请求类型
     * @type {string}
     */
    this.type = WorkerMessageType.LOAD_MODEL;

    /**
     * 模型名称
     * @type {string}
     */
    this.modelName = modelName;

    /**
     * 模型数据（ArrayBuffer）
     * @type {ArrayBuffer}
     */
    this.modelBuffer = modelBuffer;

    /**
     * Session 配置选项
     * @type {Object}
     */
    this.sessionOptions = sessionOptions;
  }
}

/**
 * 推理请求
 */
class RunInferenceRequest {
  constructor(id, modelName, inputs) {
    /**
     * 请求 ID
     * @type {string}
     */
    this.id = id;

    /**
     * 请求类型
     * @type {string}
     */
    this.type = WorkerMessageType.RUN_INFERENCE;

    /**
     * 模型名称
     * @type {string}
     */
    this.modelName = modelName;

    /**
     * 输入张量字典
     * @type {Record<string, TensorData>}
     */
    this.inputs = inputs;
  }
}

/**
 * Worker 响应
 */
class WorkerResponse {
  constructor(id, type, data = null, error = null) {
    /**
     * 响应 ID（对应请求 ID）
     * @type {string}
     */
    this.id = id;

    /**
     * 响应类型
     * @type {string}
     */
    this.type = type;

    /**
     * 响应数据
     * @type {any}
     */
    this.data = data;

    /**
     * 错误信息（如果有）
     * @type {string | null}
     */
    this.error = error;
  }
}

/**
 * 模型信息
 */
class ModelInfo {
  constructor(modelName, inputNames, outputNames) {
    /**
     * 模型名称
     * @type {string}
     */
    this.modelName = modelName;

    /**
     * 输入名称列表
     * @type {string[]}
     */
    this.inputNames = inputNames;

    /**
     * 输出名称列表
     * @type {string[]}
     */
    this.outputNames = outputNames;
  }
}

/**
 * ONNX Worker Proxy
 *
 * 封装 Worker 通信，提供 Promise API
 * 使用 Proxy 模式让调用 Worker 就像调用本地函数一样简单
 *
 * 使用示例:
 * ```javascript
 * import workerUrl from 'onnx-web-framework/worker?worker&url'
 * import { createOnnxWorkerProxy } from 'onnx-web-framework'
 *
 * const worker = new Worker(workerUrl, { type: 'module' })
 * const proxy = createOnnxWorkerProxy(worker)
 *
 * await proxy.initialize({ wasmPaths: '/wasm/' })
 * await proxy.loadModel('model', modelBuffer)
 * const result = await proxy.run('model', inputs)
 * ```
 */


/**
 * ONNX Worker 代理类
 *
 * 封装 Worker 通信，提供 Promise API
 */
class ONNXWorkerProxy {
  /**
   * 构造函数
   *
   * @param {Worker} worker - Web Worker 实例
   */
  constructor(worker) {
    /**
     * Web Worker 实例
     * @type {Worker}
     * @private
     */
    this.worker = worker;

    /**
     * 请求 ID 计数器
     * @type {number}
     * @private
     */
    this.requestId = 0;

    /**
     * 待处理的请求 Map
     * @type {Map<number, {resolve: Function, reject: Function, timeout: number}>}
     * @private
     */
    this.pendingRequests = new Map();

    /**
     * 默认请求超时时间（毫秒）
     * @type {number}
     * @private
     */
    this.defaultTimeout = 60000; // 60秒

    /**
     * 是否已释放
     * @type {boolean}
     * @private
     */
    this.isDisposed = false;

    // 绑定消息处理器
    this.worker.onmessage = this._handleMessage.bind(this);

    // 绑定错误处理器
    this.worker.onerror = this._handleError.bind(this);
  }

  /**
   * 处理 Worker 消息
   * @private
   *
   * @param {MessageEvent<WorkerResponse>} e - 消息事件
   */
  _handleMessage(e) {
    if (this.isDisposed) return;

    const res = e.data;
    const pending = this.pendingRequests.get(res.id);

    if (!pending) {
      console.warn(`[WorkerProxy] 没有找到 ID 为 ${res.id} 的待处理请求`);
      return;
    }

    // 清理超时定时器
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }

    // 从待处理列表中移除
    this.pendingRequests.delete(res.id);

    // 处理响应
    if (res.type === WorkerMessageType.ERROR || res.error) {
      pending.reject(new Error(res.error || 'Unknown error'));
    } else {
      pending.resolve(res.data);
    }
  }

  /**
   * 处理 Worker 错误
   * @private
   *
   * @param {ErrorEvent} e - 错误事件
   */
  _handleError(e) {
    console.error('[WorkerProxy] Worker 错误:', e.message, e);

    // 拒绝所有待处理的请求
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error(`Worker error: ${e.message}`));
    }

    this.pendingRequests.clear();
  }

  /**
   * 发送请求到 Worker
   * @private
   *
   * @param {string} type - 请求类型
   * @param {Object} data - 请求数据
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<any>}
   */
  async _request(type, data = {}, timeout = null) {
    if (this.isDisposed) {
      throw new Error('WorkerProxy has been disposed');
    }

    const id = ++this.requestId;
    const reqTimeout = timeout || this.defaultTimeout;

    return new Promise((resolve, reject) => {
      // 创建超时定时器
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${type} (${reqTimeout}ms)`));
      }, reqTimeout);

      // 保存待处理请求
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutId
      });

      // 发送消息到 Worker
      try {
        this.worker.postMessage({
          id,
          type,
          ...data
        });
      } catch (error) {
        // 发送失败，立即清理
        clearTimeout(timeoutId);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * 初始化 Worker
   *
   * @param {Partial<InitializeConfig>} config - 初始化配置
   * @returns {Promise<void>}
   *
   * @example
   * await proxy.initialize({
   *   wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/',
   *   numThreads: 4
   * })
   */
  async initialize(config = {}) {
    const initConfig = new InitializeConfig(config);
    await this._request(WorkerMessageType.INITIALIZE, { config: initConfig });
    console.log('[WorkerProxy] ✅ Worker 初始化完成');
  }

  /**
   * 加载模型
   *
   * @param {string} modelName - 模型名称（用于后续引用）
   * @param {ArrayBuffer} modelBuffer - 模型数据（ArrayBuffer）
   * @param {Object} sessionOptions - Session 配置选项
   * @returns {Promise<{modelName: string, inputNames: string[], outputNames: string[]}>}
   *
   * @example
   * const modelResponse = await fetch('/models/model.onnx')
   * const modelBuffer = await modelResponse.arrayBuffer()
   * const info = await proxy.loadModel('my-model', modelBuffer)
   * console.log('输入:', info.inputNames)
   * console.log('输出:', info.outputNames)
   */
  async loadModel(modelName, modelBuffer, sessionOptions = {}) {
    if (!modelName) {
      throw new Error('modelName is required');
    }
    if (!modelBuffer) {
      throw new Error('modelBuffer is required');
    }

    const result = await this._request(WorkerMessageType.LOAD_MODEL, {
      modelName,
      modelBuffer,
      sessionOptions
    });

    console.log(`[WorkerProxy] ✅ 模型 '${modelName}' 加载成功`);
    return result;
  }

  /**
   * 运行推理
   *
   * @param {string} modelName - 模型名称
   * @param {Record<string, TensorData>} inputs - 输入张量字典
   * @returns {Promise<Record<string, TensorData>>} 输出张量字典
   *
   * @example
   * const result = await proxy.run('my-model', {
   *   input: {
   *     data: new Float32Array([1, 2, 3]),
   *     dims: [1, 3],
   *     type: 'float32'
   *   }
   * })
   */
  async run(modelName, inputs) {
    if (!modelName) {
      throw new Error('modelName is required');
    }
    if (!inputs || Object.keys(inputs).length === 0) {
      throw new Error('inputs is required');
    }

    return await this._request(WorkerMessageType.RUN_INFERENCE, {
      modelName,
      inputs
    });
  }

  /**
   * 释放 Worker 资源
   *
   * @returns {Promise<void>}
   *
   * @example
   * await proxy.dispose()
   */
  async dispose() {
    if (this.isDisposed) {
      console.warn('[WorkerProxy] 已经释放过了');
      return;
    }

    console.log('[WorkerProxy] 正在释放...');

    // 发送释放消息
    try {
      await this._request(WorkerMessageType.DISPOSE, {}, 5000);
    } catch (error) {
      console.warn('[WorkerProxy] 释放消息发送失败:', error);
    }

    // 清理所有待处理请求
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Worker disposed'));
    }

    this.pendingRequests.clear();

    // 终止 Worker
    this.worker.terminate();

    // 标记为已释放
    this.isDisposed = true;

    console.log('[WorkerProxy] ✅ 释放完成');
  }

  /**
   * 检查 Worker 是否已释放
   *
   * @returns {boolean}
   */
  get disposed() {
    return this.isDisposed;
  }
}

/**
 * 创建 ONNX Worker 代理
 *
 * 这是推荐的创建 Worker Proxy 的方式
 *
 * @param {Worker} worker - Web Worker 实例
 * @returns {ONNXWorkerProxy} Worker 代理实例
 *
 * @example
 * // Vite 项目
 * import workerUrl from 'onnx-web-framework/worker?worker&url'
 * import { createOnnxWorkerProxy } from 'onnx-web-framework'
 *
 * const worker = new Worker(workerUrl, { type: 'module' })
 * const proxy = createOnnxWorkerProxy(worker)
 *
 * await proxy.initialize()
 * await proxy.loadModel('model', modelBuffer)
 * const result = await proxy.run('model', inputs)
 */
function createOnnxWorkerProxy(worker) {
  return new ONNXWorkerProxy(worker);
}

/**
 * ONNX Web Framework - 统一入口
 * 集成Web Worker、模型缓存和显式张量管理
 */

export { InitializeConfig, LoadModelRequest, ModelInfo, ONNXWebFramework, ONNXWorkerProxy, RunInferenceRequest, TensorData, WorkerMessageType, WorkerResponse, createOnnxWorkerProxy, ONNXWebFramework as default };
//# sourceMappingURL=index.js.map

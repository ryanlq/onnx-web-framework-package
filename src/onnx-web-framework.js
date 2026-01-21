/**
 * ONNX Web Framework
 * 基于ONNX Runtime Web构建，支持模型缓存
 */

import ModelCache from './model-cache.js';

// 确保ort在全局可用
// 浏览器环境：通过 <script> 标签加载 UMD 版本
// Node.js环境：通过 npm install onnxruntime-web 安装（需要构建工具处理）
let ort = null;

// 检查全局 ort（通过 script 标签加载的 UMD 版本）
if (typeof globalThis !== 'undefined' && globalThis.ort && globalThis.ort.InferenceSession) {
  ort = globalThis.ort;
  console.log('✅ 使用全局 ort (UMD 版本)');
} else {
  // 如果没有全局 ort，尝试使用已导入的模块（构建时会处理）
  // 注意：这要求 onnxruntime-web 在构建时被正确打包或标记为 external
  try {
    // 访问外部依赖（由构建工具处理）
    ort = globalThis.ort;
    if (!ort) {
      throw new Error('ort not available');
    }
  } catch (error) {
    throw new Error(
      'ONNX Runtime Web 未正确加载。\n\n' +
      '浏览器环境：请在 HTML 中添加:\n' +
      '  <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>\n\n' +
      'Node.js环境：请运行:\n' +
      '  npm install onnxruntime-web'
    );
  }
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

      // 预处理和后处理钩子
      preprocessors: options.preprocessors || {}, // { modelName: (rawInput) => tensor }
      postprocessors: options.postprocessors || {}, // { modelName: (output) => processedOutput }

      ...options
    };

    // 缓存和模型
    this.modelCache = new ModelCache();
    this.models = new Map();
    this.isInitialized = false;

    // 预处理和后处理器注册表
    this.preprocessors = new Map(); // modelName -> function
    this.postprocessors = new Map(); // modelName -> function

    // 初始化预配置的处理器
    for (const [modelName, processor] of Object.entries(this.options.preprocessors)) {
      this.preprocessors.set(modelName, processor);
    }
    for (const [modelName, processor] of Object.entries(this.options.postprocessors)) {
      this.postprocessors.set(modelName, processor);
    }
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
   * 执行推理（带预处理和后处理）
   * 这是一个高级 API，会自动调用注册的预处理器和后处理器
   *
   * @param {string} modelName - 模型名称
   * @param {*} rawInput - 原始输入（如文本、图像等）
   * @param {object} options - 选项
   * @returns {Promise<*>} 处理后的输出
   */
  async predict(modelName, rawInput, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model '${modelName}' not loaded`);
    }

    try {
      console.log(`🔮 Running prediction with model '${modelName}'...`);

      // 1. 预处理
      let feeds;
      const preprocessor = this.preprocessors.get(modelName);

      if (preprocessor) {
        console.log('⚙️  Running preprocessor...');
        feeds = await preprocessor(rawInput, options);
      } else {
        console.warn(`⚠️  No preprocessor registered for '${modelName}', assuming input is preprocessed`);
        // 假设输入已经是处理好的 tensor 格式
        feeds = rawInput;
      }

      // 2. 运行推理
      const results = await this.run(modelName, feeds);

      // 3. 后处理
      const postprocessor = this.postprocessors.get(modelName);
      let processedResults;

      if (postprocessor) {
        console.log('⚙️  Running postprocessor...');
        processedResults = await postprocessor(results, options);
      } else {
        console.warn(`⚠️  No postprocessor registered for '${modelName}', returning raw output`);
        processedResults = results;
      }

      console.log('✅ Prediction completed');
      return processedResults;

    } catch (error) {
      console.error(`❌ Prediction failed for model '${modelName}':`, error);
      throw error;
    }
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
    const normalize = options.normalization || 'zeroToOne';
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
   * 注册预处理器
   * @param {string} modelName - 模型名称
   * @param {function} processor - 预处理函数 (rawInput) => feeds
   */
  registerPreprocessor(modelName, processor) {
    this.preprocessors.set(modelName, processor);
    console.log(`✅ Preprocessor registered for '${modelName}'`);
  }

  /**
   * 注册后处理器
   * @param {string} modelName - 模型名称
   * @param {function} processor - 后处理函数 (output) => processedOutput
   */
  registerPostprocessor(modelName, processor) {
    this.postprocessors.set(modelName, processor);
    console.log(`✅ Postprocessor registered for '${modelName}'`);
  }

  /**
   * 取消注册预处理器
   * @param {string} modelName - 模型名称
   */
  unregisterPreprocessor(modelName) {
    this.preprocessors.delete(modelName);
    console.log(`🗑️  Preprocessor unregistered for '${modelName}'`);
  }

  /**
   * 取消注册后处理器
   * @param {string} modelName - 模型名称
   */
  unregisterPostprocessor(modelName) {
    this.postprocessors.delete(modelName);
    console.log(`🗑️  Postprocessor unregistered for '${modelName}'`);
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

export default ONNXWebFramework;
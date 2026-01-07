import * as ort from 'onnxruntime-web';

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
 * ONNX Web Worker
 *
 * 在 Web Worker 中执行 ONNX 推理，避免阻塞主线程
 *
 * 使用方法:
 * 1. 宿主项目通过 Vite/Webpack 导入此 Worker
 * 2. 使用 createOnnxWorkerProxy 创建代理实例
 * 3. 调用 initialize(), loadModel(), run() 等方法
 */


/**
 * ONNX Worker 运行时
 *
 * 管理 ONNX Runtime 会话和模型
 */
class ONNXWorkerRuntime {
  constructor() {
    /**
     * 已加载的模型会话
     * @type {Map<string, ort.InferenceSession>}
     */
    this.models = new Map();

    /**
     * 是否已初始化
     * @type {boolean}
     */
    this.isInitialized = false;

    /**
     * 初始化配置
     * @type {InitializeConfig}
     */
    this.config = null;
  }

  /**
   * 初始化 Worker 环境
   *
   * @param {InitializeConfig} config - 初始化配置
   * @returns {Promise<{success: boolean}>}
   */
  async initialize(config) {
    console.log("[ONNX Worker] 初始化...", config);

    // 设置 WASM 路径
    if (config.wasmPaths) {
      if (typeof config.wasmPaths === "string") {
        ort.env.wasm.wasmPaths = config.wasmPaths;
      } else {
        ort.env.wasm.wasmPaths = config.wasmPaths;
      }
      console.log("[ONNX Worker] WASM 路径已设置:", config.wasmPaths);
    }

    // 设置线程数
    if (config.numThreads && config.numThreads > 0) {
      ort.env.wasm.numThreads = config.numThreads;
    }

    // 保存配置
    this.config = config;
    this.isInitialized = true;

    console.log("[ONNX Worker] ✅ 初始化完成");

    return { success: true };
  }

  /**
   * 加载模型
   *
   * @param {LoadModelRequest} req - 加载模型请求
   * @returns {Promise<ModelInfo>}
   */
  async loadModel(req) {
    if (!this.isInitialized) {
      throw new Error("Worker not initialized. Call initialize() first.");
    }

    console.log(`[ONNX Worker] 加载模型 '${req.modelName}'...`);

    try {
      // 创建推理会话
      const sessionOptions = {
        executionProviders: req.sessionOptions?.executionProviders ||
          this.config?.executionProviders || ["wasm"],
        enableProfiling:
          req.sessionOptions?.enableProfiling ??
          this.config?.enableProfiling ??
          false,
        ...req.sessionOptions,
      };

      const session = await ort.InferenceSession.create(
        req.modelBuffer,
        sessionOptions,
      );

      // 保存会话
      this.models.set(req.modelName, session);

      console.log(`[ONNX Worker] ✅ 模型 '${req.modelName}' 加载成功`);
      console.log("[ONNX Worker] 输入:", session.inputNames);
      console.log("[ONNX Worker] 输出:", session.outputNames);

      return new ModelInfo(
        req.modelName,
        session.inputNames,
        session.outputNames,
      );
    } catch (error) {
      console.error(`[ONNX Worker] ❌ 加载模型失败:`, error);
      throw error;
    }
  }

  /**
   * 运行推理
   *
   * @param {RunInferenceRequest} req - 推理请求
   * @returns {Promise<Record<string, TensorData>>}
   */
  async runInference(req) {
    if (!this.isInitialized) {
      throw new Error("Worker not initialized. Call initialize() first.");
    }

    console.log(`[ONNX Worker] 运行推理 '${req.modelName}'...`);

    const session = this.models.get(req.modelName);
    if (!session) {
      throw new Error(
        `Model '${req.modelName}' not loaded. Call loadModel() first.`,
      );
    }

    try {
      // 将 TensorData 转换为 ort.Tensor
      const feeds = {};
      for (const [name, tensorData] of Object.entries(req.inputs)) {
        const ortType = this._getOrtTensorType(tensorData.type);
        feeds[name] = new ort.Tensor(ortType, tensorData.data, tensorData.dims);
      }

      // 运行推理
      const startTime = performance.now();
      const results = await session.run(feeds);
      const endTime = performance.now();

      console.log(
        `[ONNX Worker] ✅ 推理完成 (耗时: ${(endTime - startTime).toFixed(2)}ms)`,
      );

      // 将 ort.Tensor 转换为 TensorData
      const output = {};
      for (const [name, tensor] of Object.entries(results)) {
        output[name] = new TensorData(
          tensor.data,
          tensor.dims,
          this._getTensorDataType(tensor.type),
        );
      }

      return output;
    } catch (error) {
      console.error(`[ONNX Worker] ❌ 推理失败:`, error);
      throw error;
    }
  }

  /**
   * 释放资源
   */
  async dispose() {
    console.log("[ONNX Worker] 释放资源...");

    for (const [modelName, session] of this.models.entries()) {
      await session.release();
      console.log(`[ONNX Worker] 已释放模型 '${modelName}'`);
    }

    this.models.clear();
    this.isInitialized = false;

    console.log("[ONNX Worker] ✅ 资源已释放");
  }

  /**
   * 获取 ONNX Tensor 类型
   * @private
   */
  _getOrtTensorType(type) {
    const typeMap = {
      float32: "float32",
      float64: "float64",
      int8: "int8",
      int16: "int16",
      int32: "int32",
      int64: "int64",
      uint8: "uint8",
      uint16: "uint16",
      bool: "bool",
    };
    return typeMap[type] || "float32";
  }

  /**
   * 获取数据类型字符串
   * @private
   */
  _getTensorDataType(ortType) {
    // ONNX Tensor type -> our type string
    if (ortType === "float32" || ortType === "float") return "float32";
    if (ortType === "int32" || ortType === "int32") return "int32";
    if (ortType === "int64") return "int64";
    if (ortType === "uint8") return "uint8";
    return "float32"; // 默认
  }
}

// ============ Worker 消息处理 ============

const runtime = new ONNXWorkerRuntime();

/**
 * 处理主线程发送的消息
 */
self.onmessage = async (e) => {
  const req = e.data;
  const response = new WorkerResponse(req.id, WorkerMessageType.RESULT);

  try {
    switch (req.type) {
      case WorkerMessageType.INITIALIZE:
        response.data = await runtime.initialize(req.config || {});
        break;

      case WorkerMessageType.LOAD_MODEL:
        response.data = await runtime.loadModel(req);
        break;

      case WorkerMessageType.RUN_INFERENCE:
        response.data = await runtime.runInference(req);
        break;

      case WorkerMessageType.DISPOSE:
        await runtime.dispose();
        response.data = { success: true };
        break;

      default:
        throw new Error(`Unknown message type: ${req.type}`);
    }

    // 发送成功响应
    self.postMessage(response);
  } catch (error) {
    // 发送错误响应
    response.type = WorkerMessageType.ERROR;
    response.error = error instanceof Error ? error.message : String(error);
    self.postMessage(response);
  }
};

export { InitializeConfig, LoadModelRequest, ModelInfo, RunInferenceRequest, TensorData, WorkerMessageType, WorkerResponse };
//# sourceMappingURL=worker.js.map

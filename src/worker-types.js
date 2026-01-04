/**
 * ONNX Web Worker 类型定义
 *
 * 定义 Worker 和主线程之间的消息协议
 */

/**
 * Worker 消息类型枚举
 */
export const WorkerMessageType = {
  INITIALIZE: 'initialize',
  LOAD_MODEL: 'load_model',
  RUN_INFERENCE: 'run_inference',
  DISPOSE: 'dispose',
  RESULT: 'result',
  ERROR: 'error'
};

/**
 * 初始化配置
 */
export class InitializeConfig {
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
    this.executionProviders = options.executionProviders || ['wasm'];
  }
}

/**
 * 张量数据
 */
export class TensorData {
  constructor(data, dims, type = 'float32') {
    /**
     * 张量数据（Float32Array | Int32Array | Uint8Array）
     */
    this.data = data;

    /**
     * 张量维度
     * @type {number[]}
     */
    this.dims = dims;

    /**
     * 数据类型
     * @type {'float32' | 'int32' | 'uint8'}
     */
    this.type = type;
  }
}

/**
 * 加载模型请求
 */
export class LoadModelRequest {
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
export class RunInferenceRequest {
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
export class WorkerResponse {
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
export class ModelInfo {
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

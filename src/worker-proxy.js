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

import {
  WorkerMessageType,
  InitializeConfig,
  LoadModelRequest,
  RunInferenceRequest,
  WorkerResponse
} from './worker-types.js';

/**
 * ONNX Worker 代理类
 *
 * 封装 Worker 通信，提供 Promise API
 */
export class ONNXWorkerProxy {
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
export function createOnnxWorkerProxy(worker) {
  return new ONNXWorkerProxy(worker);
}

// 默认导出
export default ONNXWorkerProxy;

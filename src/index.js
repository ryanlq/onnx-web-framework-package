/**
 * ONNX Web Framework - 统一入口
 * 集成Web Worker、模型缓存和显式张量管理
 */

import ONNXWebFramework from './onnx-web-framework.js';

// ========== 主线程 API (向后兼容) ==========
export { ONNXWebFramework };
export default ONNXWebFramework;

// ========== ✨ NEW: Worker API (v2.0.0) ==========
export {
  createOnnxWorkerProxy,
  ONNXWorkerProxy
} from './worker-proxy.js';

export {
  WorkerMessageType,
  InitializeConfig,
  LoadModelRequest,
  RunInferenceRequest,
  WorkerResponse,
  ModelInfo,
  TensorData
} from './worker-types.js';
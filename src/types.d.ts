/**
 * Type definitions for ONNX Web Framework
 */

export interface ONNXWebFrameworkOptions {
  /**
   * List of execution providers in priority order
   * @default ['wasm']
   */
  executionProviders?: ('wasm' | 'webgl' | 'webgpu' | 'webnn')[];

  /**
   * WebNN device type
   * @default 'cpu'
   */
  deviceType?: 'cpu' | 'gpu' | 'npu';

  /**
   * Power preference for execution
   * @default 'default'
   */
  powerPreference?: 'default' | 'low-power' | 'high-performance';

  /**
   * Enable performance profiling
   * @default false
   */
  enableProfiling?: boolean;

  /**
   * Enable Web Worker for non-blocking inference
   * @default true
   */
  useWorker?: boolean;

  /**
   * Path to worker script
   * @default './src/onnx-worker.js'
   */
  workerPath?: string;

  /**
   * Enable model caching
   * @default true
   */
  enableCache?: boolean;

  /**
   * Cache maximum age in milliseconds
   * @default 24 * 60 * 60 * 1000 (24 hours)
   */
  cacheMaxAge?: number;

  /**
   * Number of WASM threads (0 = auto-detect)
   * @default 0
   */
  numThreads?: number;

  /**
   * Enable debug mode
   * @default false
   */
  debug?: boolean;

  /**
   * Log level
   * @default 'warning'
   */
  logLevel?: 'error' | 'verbose' | 'info' | 'warning' | 'fatal';

  /**
   * Enable graph capture
   * @default false
   */
  graphCapture?: boolean;

  /**
   * Preferred output location for I/O binding
   * @default 'cpu'
   */
  preferredOutputLocation?: 'cpu' | 'gpu-buffer' | 'ml-tensor';

  /**
   * Enable WASM proxy
   * @default false
   */
  wasmProxy?: boolean;

  /**
   * WASM file paths
   */
  wasmPaths?: {
    wasm?: string;
    mjs?: string;
    wasmThreaded?: string;
    mjsThreaded?: string;
    simd?: string;
    simdThreaded?: string;
  };
}

export interface SessionOptions {
  /**
   * Execution providers for this session
   */
  executionProviders?: ('wasm' | 'webgl' | 'webgpu' | 'webnn')[];

  /**
   * Graph optimization level
   */
  graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all';

  /**
   * Enable CPU memory arena
   * @default true
   */
  enableCpuMemArena?: boolean;

  /**
   * Enable memory pattern optimization
   * @default true
   */
  enableMemPattern?: boolean;

  /**
   * Execution mode
   * @default 'sequential'
   */
  executionMode?: 'sequential' | 'parallel';

  /**
   * Number of intra-op threads
   */
  intraOpNumThreads?: number;

  /**
   * Number of inter-op threads
   */
  interOpNumThreads?: number;

  /**
   * Enable GPU memory arena
   * @default false
   */
  enableGpuMemArena?: boolean;

  /**
   * Enable fallback to CPU
   * @default true
   */
  enableCpuFallback?: boolean;

  /**
   * Log severity level
   */
  logSeverityLevel?: 0 | 1 | 2 | 3 | 4;

  /**
   * Log verbosity level
   */
  logVerbosityLevel?: number;

  /**
   * Prefer ORT format over ONNX
   * @default true
   */
  preferOrtFormat?: boolean;
}

export interface PreprocessOptions {
  /**
   * Normalization method
   */
  normalization?: 'zeroToOne' | 'oneToMinusOne' | 'imagenet' | 'none';

  /**
   * Target image size [width, height]
   */
  resize?: [number, number];

  /**
   * Image cropping [x, y, width, height]
   */
  crop?: [number, number, number, number];

  /**
   * Data type conversion
   */
  dataType?: 'float32' | 'float16' | 'int8' | 'uint8';

  /**
   * Layout format
   */
  layout?: 'nchw' | 'nhwc';

  /**
   * Mean values for normalization
   */
  mean?: number[];

  /**
   * Standard deviation values for normalization
   */
  std?: number[];

  /**
   * Whether to convert RGB to BGR
   */
  rgbToBgr?: boolean;
}

export interface PredictionOptions {
  /**
   * Preprocessing configuration
   */
  preprocess?: PreprocessOptions;

  /**
   * Preferred output location for I/O binding
   */
  preferredOutputLocation?: 'cpu' | 'gpu-buffer' | 'ml-tensor';

  /**
   * Return tensor objects instead of raw data
   */
  returnTensors?: boolean;

  /**
   * Download GPU data to CPU (only if returnTensors is true)
   */
  downloadGpuData?: boolean;

  /**
   * Session-specific options
   */
  sessionOptions?: SessionOptions;
}

export interface InferenceResult {
  /**
   * Model output data
   */
  output: Float32Array | number[] | Record<string, Float32Array | number[]>;

  /**
   * Inference time in milliseconds
   */
  inferenceTime: number;

  /**
   * Preprocessing time in milliseconds
   */
  preprocessTime: number;

  /**
   * Total time in milliseconds
   */
  totalTime: number;

  /**
   * Detailed performance metrics
   */
  profiling: {
    preprocess: number;
    inference: number;
    total: number;
  };
}

export interface ModelInfo {
  /**
   * Model name
   */
  name: string;

  /**
   * Model format ('onnx' or 'ort')
   */
  format: 'onnx' | 'ort';

  /**
   * Model file path
   */
  path: string;

  /**
   * Load time in milliseconds
   */
  loadTime: number;

  /**
   * Input tensor names
   */
  inputNames: string[];

  /**
   * Output tensor names
   */
  outputNames: string[];

  /**
   * Supported execution providers
   */
  providers: string[];

  /**
   * Model size in bytes
   */
  size?: number;

  /**
   * Model metadata
   */
  metadata?: Record<string, any>;
}

export interface DeviceCapabilities {
  /**
   * WebGL support
   */
  webgl: boolean;

  /**
   * WebGPU support
   */
  webgpu: boolean;

  /**
   * WebNN support
   */
  webnn: boolean;

  /**
   * Available device types for WebNN
   */
  deviceTypes: ('cpu' | 'gpu' | 'npu')[];

  /**
   * Hardware concurrency
   */
  hardwareConcurrency: number;

  /**
   * Memory information
   */
  memory: {
    used: number;
    total: number;
    limit: number;
  };

  /**
   * GPU adapter information
   */
  gpuAdapter?: {
    name: string;
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
}

export interface GPUTensorOptions {
  /**
   * Data type
   */
  dataType?: 'float32' | 'float16' | 'int32' | 'uint32';

  /**
   * Tensor dimensions
   */
  dims: number[];

  /**
   * Shape layout
   */
  layout?: 'nchw' | 'nhwc';
}

export interface MLTensorOptions {
  /**
   * Data type
   */
  dataType?: 'float32' | 'float16' | 'int8' | 'uint8';

  /**
   * Tensor dimensions
   */
  dims: number[];

  /**
   * Shape layout
   */
  layout?: 'nchw' | 'nhwc';
}

export interface CacheStats {
  /**
   * Number of cached models
   */
  count: number;

  /**
   * Total cache size in bytes
   */
  totalSize: number;

  /**
   * Cache hit rate (0-1)
   */
  hitRate: number;

  /**
   * Oldest entry timestamp
   */
  oldestEntry: number;

  /**
   * Newest entry timestamp
   */
  newestEntry: number;
}

export interface ModelFormatInfo {
  /**
   * Model format ('onnx' or 'ort')
   */
  format: 'onnx' | 'ort';

  /**
   * Model file path
   */
  path: string;

  /**
   * Load time in milliseconds
   */
  loadTime: number;

  /**
   * Input tensor names
   */
  inputNames: string[];

  /**
   * Output tensor names
   */
  outputNames: string[];

  /**
   * Supported execution providers
   */
  providers: string[];

  /**
   * Model size in bytes
   */
  size: number;
}

export interface ComparisonResult {
  /**
   * ONNX format results
   */
  onnx: {
    loadTime: number;
    inferenceTime: number;
    memoryUsage: number;
  };

  /**
   * ORT format results
   */
  ort: {
    loadTime: number;
    inferenceTime: number;
    memoryUsage: number;
  };

  /**
   * Performance improvements
   */
  improvements: {
    loadTimeImprovement: number; // percentage
    inferenceTimeImprovement: number; // percentage
    memoryReduction: number; // percentage
  };
}

/**
 * Main ONNX Web Framework class
 */
export default class ONNXWebFramework {
  constructor(options?: ONNXWebFrameworkOptions);

  /**
   * Initialize the framework
   */
  initialize(): Promise<void>;

  /**
   * Load an ONNX model
   */
  loadModel(name: string, modelSource: string | ArrayBuffer | Uint8Array, sessionOptions?: SessionOptions): Promise<any>;

  /**
   * Run complete inference pipeline (preprocess + inference)
   */
  predict(modelName: string, rawData: Float32Array | HTMLImageElement | HTMLCanvasElement | GPUBuffer | any, options?: PredictionOptions): Promise<InferenceResult>;

  /**
   * Run inference only (assumes preprocessed input)
   */
  run(modelName: string, inputs: Record<string, any>, options?: PredictionOptions): Promise<InferenceResult>;

  /**
   * Get model information
   */
  getModelInfo(modelName: string): ModelInfo | undefined;

  /**
   * List all loaded models
   */
  listModels(): string[];

  /**
   * Unload a specific model
   */
  unloadModel(modelName: string): Promise<void>;

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities;

  /**
   * Get supported execution providers
   */
  getSupportedProviders(): string[];

  /**
   * Update execution providers
   */
  updateExecutionProviders(providers: ('wasm' | 'webgl' | 'webgpu' | 'webnn')[]): Promise<void>;

  /**
   * Get model format information
   */
  getModelFormat(modelName: string): ModelFormatInfo | undefined;

  /**
   * Compare ONNX vs ORT format performance
   */
  compareModelFormats(modelName: string, onnxPath: string, ortPath: string): Promise<ComparisonResult>;

  /**
   * Get cache statistics
   */
  getCacheStats(): Promise<CacheStats>;

  /**
   * Clear model cache
   */
  clearCache(): Promise<void>;

  // WebGPU methods
  /**
   * Create GPU tensor from WebGPU buffer
   */
  createGpuTensor(gpuBuffer: GPUBuffer, options: GPUTensorOptions): Promise<any>;

  /**
   * Create preallocated GPU tensor
   */
  createPreallocatedGpuTensor(modelName: string, outputName: string, dims: number[]): Promise<any>;

  /**
   * Get WebGPU device
   */
  getWebGPUDevice(): GPUDevice | undefined;

  // WebNN methods
  /**
   * Create MLTensor from WebNN MLTensor
   */
  createMLTensor(mlTensor: any, options: MLTensorOptions): Promise<any>;

  /**
   * Create preallocated MLTensor
   */
  createPreallocatedMLTensor(modelName: string, outputName: string, dims: number[]): Promise<any>;

  /**
   * Get WebNN context
   */
  getWebNNContext(): any;

  /**
   * Dispose all resources
   */
  dispose(): Promise<void>;
}
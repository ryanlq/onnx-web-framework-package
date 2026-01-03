/**
 * ONNX Web Framework 工具函数
 */

/**
 * 下载文件
 * @param {string} url - 文件URL
 * @param {Function} progressCallback - 进度回调
 */
export async function downloadFile(url, progressCallback) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentLength = response.headers.get('Content-Length');
  const total = parseInt(contentLength, 10);
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (progressCallback && total > 0) {
      progressCallback(loaded / total);
    }
  }

  return new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
}

/**
 * 从FormData创建张量
 * @param {FormData} formData - 表单数据
 * @param {Object} metadata - 张量元数据
 */
export async function formDataToTensor(formData, metadata) {
  const { dims, type } = metadata;
  const size = dims.reduce((acc, dim) => acc * dim, 1);

  let data;
  switch (type) {
    case 'tensor(float32)':
      data = new Float32Array(size);
      break;
    case 'tensor(int64)':
      data = new BigInt64Array(size);
      break;
    default:
      throw new Error(`Unsupported tensor type: ${type}`);
  }

  // 填充数据逻辑
  return data;
}

/**
 * 图像URL转换为ImageData
 * @param {string} imageUrl - 图片URL
 */
export async function imageUrlToImageData(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * 文件读取为ArrayBuffer
 * @param {File} file - 文件对象
 */
export function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 性能计时器
 */
export class Timer {
  constructor() {
    this.startTime = 0;
    this.endTime = 0;
  }

  start() {
    this.startTime = performance.now();
  }

  stop() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  elapsed() {
    return this.endTime - this.startTime;
  }
}

/**
 * 内存使用监控
 */
export class MemoryMonitor {
  constructor() {
    this.initial = performance.memory ? performance.memory.usedJSHeapSize : 0;
  }

  getCurrent() {
    return performance.memory ? performance.memory.usedJSHeapSize : 0;
  }

  getDelta() {
    return this.getCurrent() - this.initial;
  }

  getStats() {
    if (!performance.memory) return null;

    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      delta: this.getDelta()
    };
  }
}

/**
 * 错误处理包装器
 * @param {Function} fn - 要执行的函数
 * @param {Object} options - 选项
 */
export async function safeExecute(fn, options = {}) {
  const {
    retries = 0,
    retryDelay = 1000,
    onError = null,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (onError) {
        onError(error, attempt);
      }

      if (attempt < retries) {
        if (onRetry) {
          onRetry(attempt + 1);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError;
}

/**
 * 模型缓存管理
 */
export class ModelCache {
  constructor(maxSize = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 重新插入以更新LRU顺序
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}
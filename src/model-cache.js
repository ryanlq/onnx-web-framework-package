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

export default ModelCache;
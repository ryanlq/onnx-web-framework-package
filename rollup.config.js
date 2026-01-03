import { defineConfig } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default defineConfig([
  // ========== 主入口 (ESM + CJS) ==========
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs()
      // 禁用terser以避免代码被错误压缩
    ],
    external: ['onnxruntime-web']
  },

  // ========== ✨ NEW: Worker 入口 (仅 ESM) ==========
  {
    input: 'src/worker.js',
    output: {
      file: 'dist/worker.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs()
      // Worker 只输出 ESM 格式
    ],
    external: ['onnxruntime-web']
  }
]);
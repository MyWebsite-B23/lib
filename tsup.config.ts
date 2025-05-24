import { defineConfig } from 'tsup';
 
export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['./src/index.ts', 'src/Auth/index.ts', 'src/Classes/**/*.ts', 'src/Dynamodb/index.ts'],
    dts: true,
    shims: true,
    skipNodeModulesBundle: false,
    clean: true,
    sourcemap: true,
    minify: true,
    treeshake: true,
});
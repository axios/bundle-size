import { builtinModules } from "node:module";
import path from "node:path";
import { defineConfig } from "vite";

const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    target: "node24",
    emptyOutDir: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "src/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: (id) => builtins.has(id),
      output: {
        entryFileNames: "index.js",
      },
    },
  },
  plugins: [
    {
      name: "emit-commonjs-package-type",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "package.json",
          source: `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
        });
      },
    },
  ],
});

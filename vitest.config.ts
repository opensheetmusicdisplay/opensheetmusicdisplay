import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      vexflow: path.resolve(__dirname, "external/vexflow/entry/vexflow.ts"),
      "structured-clone-es.js": path.resolve(__dirname, "node_modules/structured-clone-es/dist/index.mjs"),
    },
  },
  assetsInclude: ["**/*.glsl"],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.ts"],
    exclude: [
      "test/Util/**",
      "test/data/**",
      "test/setup*",
      "test/**/*SVG_Test*",
      "test/**/GeometricSkyBottomLine*",
    ],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/**/*.d.ts", "src/KarmaWebpackPatch/**"],
      reporter: ["text", "lcov", "html"],
    },
  },
});

import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
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
    browser: {
      enabled: true,
      provider: playwright({ launchOptions: { headless: true } }),
      instances: [{ browser: "chromium" }],
    },
    include: [
      "test/**/*SVG_Test*",
      "test/**/GeometricSkyBottomLine*",
    ],
    setupFiles: ["./test/setup.browser.ts"],
    testTimeout: 60000,
  },
});

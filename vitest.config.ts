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
    // Each worker runs a full jsdom + VexFlow engrave, so memory per worker is
    // high. Unbounded, vitest forks one per core (20 here) and workers get OOM-
    // killed under load — they die as "Worker exited unexpectedly", taking their
    // unreported tests with them (a run reported 489 of 673 tests with 2 such
    // errors, while the same tree passed fully on a quieter machine). Capping the
    // pool keeps peak memory well below that cliff at nearly the same wall time.
    pool: "forks",
    poolOptions: { forks: { maxForks: 8 } },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/**/*.d.ts", "src/KarmaWebpackPatch/**"],
      reporter: ["text", "lcov", "html"],
    },
  },
});

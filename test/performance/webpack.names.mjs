// Production build of the OSMD library (without the demo) that isn't minified, so that CPU profiles show the function names,
// and that keeps webpack's module markers (";// ./path"), with which profileBreakdown.mjs and allocationSites.mjs map the
// profiled code to classes and modules: export/bundles/names/opensheetmusicdisplay.min.js
// Usage (from the repository root): npx webpack --config test/performance/webpack.names.mjs
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const prod = require("../../webpack.prod.js");

export default {
    ...prod,
    entry: { opensheetmusicdisplay: "./src/index.ts" },
    output: { ...prod.output, path: path.resolve("export/bundles/names"), clean: true },
    optimization: { minimize: false },
    // only the EnvironmentPlugin: not the demo's HtmlWebpackPlugin or the bundle statistics
    plugins: prod.plugins.filter(plugin => plugin.constructor?.name === "EnvironmentPlugin"),
};

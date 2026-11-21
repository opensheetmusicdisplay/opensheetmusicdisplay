// Entry of the ES module build (build/opensheetmusicdisplay.min.mjs, see webpack.prod.js): the exports of index.ts,
//   and all of them as the default export, so that `import osmd from "opensheetmusicdisplay"` works in Node as it
//   does with the UMD build (where Node provides the CommonJS exports as the default export).
export * from "./index";
import * as opensheetmusicdisplay from "./index";
export default opensheetmusicdisplay;

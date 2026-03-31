/* eslint-disable @typescript-eslint/no-var-requires */

let VF: any;

try {
  // VexFlow 5 CommonJS entry.
  VF = require("vexflow/build/cjs/vexflow.js");
} catch (_err) {
  // Fallback for environments that expose a different package entry.
  VF = require("vexflow");
}

export = VF;

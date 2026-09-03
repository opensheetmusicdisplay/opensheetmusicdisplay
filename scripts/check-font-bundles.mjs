import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const bundledPath = new URL("../build/opensheetmusicdisplay.min.js", import.meta.url);
const corePath = new URL("../build/opensheetmusicdisplay-core.min.js", import.meta.url);
const [bundled, core] = await Promise.all([
  readFile(bundledPath, "utf8"),
  readFile(corePath, "utf8"),
]);

const bundledFaces = bundled.match(/data:font\/woff2;base64/g) || [];
if (bundledFaces.length !== 5 || !bundled.includes("Bravura with Academico (embedded)")) {
  throw new Error(`Expected five embedded font faces in the default bundle; found ${bundledFaces.length}.`);
}
if (core.includes("data:font/woff2;base64") || !core.includes("Bravura with Academico (external)")) {
  throw new Error("The core bundle contains embedded font data or lacks its external font contract.");
}

process.stdout.write("Font bundle contract verified: 5 embedded faces in default, 0 in core.\n");

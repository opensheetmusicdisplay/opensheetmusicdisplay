// Node 24 bug: ESM→CJS interop (loadCJSModuleWithModuleLoad) throws internal assertion.
// Solution: fork() child process running .cjs entry point, avoiding broken ESM→CJS bridge.
import { fork } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const child = fork(join(__dirname, "generateImages_browserless.cjs"), process.argv.slice(2), { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));

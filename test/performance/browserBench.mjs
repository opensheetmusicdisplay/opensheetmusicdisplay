// Runs a bench page (browserBench*.html) of the current folder (browserBenchWork/, see browserBenchPrepare.sh) in WebKit or
// Safari, one browser session per call, and appends the page's result (POSTed to /result) to a JSON array file.
// Usage: node browserBench.mjs <webkit|safari> <page.html> <session> <rounds> <warmup> <out.json>
//   webkit: Playwright's WebKit (npx playwright install webkit), found through the playwright package of PLAYWRIGHT_FROM
//           (a folder with node_modules/playwright; default: the current folder).
//   safari: real Safari through safaridriver (macOS; enable it once with `sudo safaridriver --enable`).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const [engine, page, session, rounds, warmup, outArg] = process.argv.slice(2);
const dir = process.cwd();
const outFile = path.resolve(outArg);
const timeoutMs = 60 * 60 * 1000;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml",
                ".musicxml": "application/xml" };

let onResult = undefined;
let onFailure = undefined;
const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/result") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => { res.end("ok"); onResult?.(JSON.parse(body)); });
        return;
    }
    const file = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.statusCode = 404;
        res.end();
        return;
    }
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/${page}?session=${session}&rounds=${rounds}&warmup=${warmup}`;
let timeout = undefined;
const result = new Promise((resolve, reject) => {
    onResult = resolve;
    onFailure = reject; // the browser closed or the page crashed: no result will come
    timeout = setTimeout(() => reject(new Error("timeout")), timeoutMs);
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let close = undefined;
if (engine === "webkit") {
    const require = createRequire(path.join(process.env.PLAYWRIGHT_FROM || dir, "package.json"));
    const { webkit } = require("playwright");
    const browser = await webkit.launch();
    browser.on("disconnected", () => onFailure(new Error("the browser closed (crashed?)")));
    const tab = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    tab.on("crash", () => onFailure(new Error("the page crashed")));
    tab.on("pageerror", e => console.log("page error:", String(e).slice(0, 300)));
    await tab.goto(url);
    close = () => browser.close();
} else if (engine === "safari") {
    const port = 4444 + Number(session) % 100;
    const driver = spawn("safaridriver", ["-p", String(port)], { stdio: "ignore" });
    const base = `http://127.0.0.1:${port}`;
    let sessionId = undefined;
    for (let i = 0; i < 50 && !sessionId; i++) {
        try {
            const r = await fetch(`${base}/session`, { method: "POST", body: JSON.stringify({ capabilities: { alwaysMatch: { browserName: "safari" } } }) });
            sessionId = (await r.json()).value.sessionId;
        } catch {
            await sleep(200); // safaridriver isn't listening yet
        }
    }
    if (!sessionId) {
        throw new Error("no safaridriver session");
    }
    await fetch(`${base}/session/${sessionId}/window/rect`, { method: "POST", body: JSON.stringify({ width: 1400, height: 1000 }) });
    await fetch(`${base}/session/${sessionId}/url`, { method: "POST", body: JSON.stringify({ url }) });
    // a crashed page or a lost session gives no result: ask the session every 30 s whether it's still there
    const watch = setInterval(async () => {
        try {
            const r = await fetch(`${base}/session/${sessionId}/url`);
            if (!r.ok) {
                onFailure(new Error(`safaridriver: ${r.status} ${(await r.text()).slice(0, 200)}`));
            }
        } catch (e) {
            onFailure(new Error("safaridriver gone: " + e));
        }
    }, 30000);
    close = async () => {
        clearInterval(watch);
        await fetch(`${base}/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
        driver.kill();
    };
} else {
    throw new Error("engine: webkit or safari");
}
try {
    const r = await result;
    const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : [];
    all.push(r);
    fs.writeFileSync(outFile, JSON.stringify(all));
    console.log(`session ${session}: ${r.results.length} measurements, ${r.errors.length} errors, ${r.userAgent}`);
    for (const e of r.errors.slice(0, 3)) {
        console.log("  error:", JSON.stringify(e).slice(0, 300));
    }
} finally {
    clearTimeout(timeout); // else the timer keeps the process alive until it fires
    await close();
    server.close();
}
process.exit(0); // nothing left to wait for (e.g. the browser's or safaridriver's handles)

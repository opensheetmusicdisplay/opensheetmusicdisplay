// Run from the OSMD repository after npm run build:webpack:
//   node test/data/tab-rhythm-dots/render-comparison.mjs
// Optionally compare the default with an upstream build:
//   OSMD_BASELINE_BUNDLE=/absolute/path/to/upstream.js node test/data/tab-rhythm-dots/render-comparison.mjs
import fs from "node:fs/promises";
import http from "node:http";
import process from "node:process";
import console from "node:console";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { chromium } from "playwright";

const directory = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.resolve(directory, "../../../build/opensheetmusicdisplay.min.js");
const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/bundle.js") {
        const file = url.searchParams.has("baseline") ? process.env.OSMD_BASELINE_BUNDLE : bundle;
        response.setHeader("Content-Type", "application/javascript");
        response.end(await fs.readFile(file));
    } else if (url.pathname === "/score.xml") {
        response.setHeader("Content-Type", "application/xml");
        response.end(await fs.readFile(path.join(directory, "tab-rhythm-reference.musicxml")));
    } else if (url.pathname === "/") {
        response.setHeader("Content-Type", "text/html");
        response.end(`<meta charset="utf-8"><body style="margin:24px;background:white;font-family:Arial">
            <h2 id="title"></h2><div id="score" style="width:1100px"></div>
            <script src="/bundle.js${url.searchParams.has("baseline") ? "?baseline" : ""}"></script>`);
    } else {
        response.writeHead(404);
        response.end();
    }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
    const page = await browser.newPage({ viewport: { width: 1150, height: 1000 }, deviceScaleFactor: 1 });
    const modes = process.env.OSMD_BASELINE_BUNDLE ? ["upstream", "default", "rhythmic"] : ["default", "rhythmic"];
    for (const mode of modes) {
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode === "upstream" ? "?baseline" : ""}`);
        await page.evaluate(async enabled => {
            const osmd = new globalThis.opensheetmusicdisplay.OpenSheetMusicDisplay("score", { autoResize: false, backend: "svg" });
            osmd.EngravingRules.TabRhythmRendered = enabled;
            globalThis.document.querySelector("#title").textContent = enabled ? "OSMD — rhythmic TAB opt-in" : "OSMD — default stemless TAB";
            await osmd.load(await globalThis.fetch("/score.xml").then(response => response.text()));
            osmd.render();
        }, mode === "rhythmic");
        const output = path.join(directory, `osmd-${mode}.png`);
        await page.screenshot({ path: output, fullPage: true });
        console.log(output);
    }
} finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
}

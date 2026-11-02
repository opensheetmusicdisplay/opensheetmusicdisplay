// Shared helpers of the Chrome tools in this folder (chromeAB.mjs, chromeProfile.mjs, chromeSvgCompare.mjs, chromeEval.mjs,
// chromeForcedLayouts.mjs): argument parsing, a static file server for the repository root, and headless Chrome driven over
// the DevTools protocol. Chrome is the CHROME_PATH environment variable, or the default installation of the platform.
// Needs node 22+ (global fetch and WebSocket).
import { spawn } from "child_process";
import http from "http";
import FS from "fs";
import os from "os";
import path from "path";

/** The scores that the timing tools use by default: 8 test samples, from ~15 ms to ~300 ms of render() in Chrome. */
export const DEFAULT_SAMPLES = ["ActorPreludeSample.xml", "CharlesGounod_Meditation.xml", "JosephHaydn_ConcertanteCello.xml",
    "ScottJoplin_EliteSyncopations.xml", "test_dynamics_attribute_Chopin_Etudes_op_10_4_Duepree02.musicxml",
    "MuzioClementi_SonatinaOpus36No3_Part1.xml", "Dichterliebe01.xml", "Beethoven_AnDieFerneGeliebte.xml"];

/**
 * Parses the command line: `--key=value` options (`--flag` alone has the value "1") and positional arguments.
 * @param {string[]} args the arguments after the script's path
 * @returns {{options: Object<string, string>, positional: string[]}} the options by key, and the other arguments
 */
export function parseArgs (args = process.argv.slice(2)) {
    const options = {};
    const positional = [];
    for (const arg of args) {
        const match = arg.match(/^--([^=]+)(?:=([\s\S]*))?$/);
        if (match) {
            options[match[1]] = match[2] ?? "1";
        } else {
            positional.push(arg);
        }
    }
    return { options, positional };
}

/**
 * @param {number[]} values the numbers
 * @returns {number} their median
 */
export function median (values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * @returns {string} the Chrome executable: CHROME_PATH, or the default installation path of the platform
 */
export function chromePath () {
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }
    if (process.platform === "win32") {
        return "C:/Program Files/Google/Chrome/Application/chrome.exe";
    }
    if (process.platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    }
    return "google-chrome";
}

const CONTENT_TYPES = {
    ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".json": "application/json",
    ".xml": "application/xml", ".musicxml": "application/xml",
};

/**
 * Serves the files of the repository root (the current directory), without caching: the tools' pages, test/data and the
 * bundles to measure, e.g. http://localhost:<port>/test/data/<sample>.
 * @param {number} port the HTTP port
 * @returns {http.Server} the server
 */
export function serveRepository (port) {
    const root = process.cwd();
    return http.createServer((req, res) => {
        const file = path.join(root, decodeURIComponent(new URL(req.url, "http://localhost").pathname));
        if (!file.startsWith(root)) {
            res.writeHead(403);
            res.end();
            return;
        }
        FS.readFile(file, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
            res.end(data);
        });
    }).listen(port);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Starts headless Chrome with a new temporary profile and connects to its page over the DevTools protocol.
 * close() quits Chrome and removes the profile (if the process exits without it, Chrome is stopped, and the profile removed
 * if Chrome no longer holds its files).
 * @param {string} name a name for the temporary profile directory
 * @returns {Promise<object>} version: Chrome's version string; send(method, params): a DevTools command, resolving to its
 *   result; evaluate(expression): evaluates an expression in the page (awaiting a returned promise), resolving to its value;
 *   navigate(url): resolves when the page has loaded; close(): resolves when Chrome has quit
 */
export async function launchChrome (name) {
    const userDataDir = FS.mkdtempSync(path.join(os.tmpdir(), "osmd-chrome-" + name + "-"));
    const chrome = spawn(chromePath(), ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + userDataDir,
        "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
        "--disable-component-update", "--disable-sync", "--disable-default-apps", "--mute-audio", "--window-size=1600,1200",
        "about:blank"], { stdio: "ignore" });
    // (a wrong path gives an "error" event instead of "exit")
    const exited = new Promise(resolve => {
        chrome.once("exit", resolve);
        chrome.once("error", resolve);
    });
    let running = true;
    exited.then(() => {
        running = false;
    });
    const removeProfile = () => {
        try {
            FS.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        } catch {
            console.log(`(couldn't remove Chrome's temporary profile ${userDataDir})`);
        }
    };
    let ws;
    let browserUrl;
    let closed = false;
    const onExit = () => {
        if (!closed) {
            chrome.kill();
            removeProfile();
        }
    };
    process.on("exit", onExit);
    const close = async () => {
        if (closed) {
            return;
        }
        closed = true;
        process.off("exit", onExit);
        ws?.close();
        // Quit the whole browser over its own DevTools endpoint: killing the main process would leave its helper processes,
        //   which hold files of the profile, running for a while.
        if (browserUrl && running) {
            try {
                const browser = new WebSocket(browserUrl);
                await new Promise((resolve, reject) => {
                    browser.onopen = resolve;
                    browser.onerror = reject;
                });
                browser.send(JSON.stringify({ id: 1, method: "Browser.close" }));
            } catch {
                // the endpoint is gone: Chrome is quitting
            }
        }
        if (await Promise.race([exited.then(() => true), sleep(10000)]) !== true) {
            chrome.kill();
            await exited;
        }
        removeProfile();
    };

    let port;
    for (let i = 0; i < 300 && !port && running; i++) {
        await sleep(100);
        try {
            port = FS.readFileSync(path.join(userDataDir, "DevToolsActivePort"), "utf8").split("\n")[0].trim();
        } catch {
            // not written yet
        }
    }
    if (!port) {
        await close();
        throw new Error(`Chrome didn't start: ${chromePath()} (set CHROME_PATH)`);
    }
    const versionInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const version = versionInfo.Browser;
    browserUrl = versionInfo.webSocketDebuggerUrl;
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });
    let lastId = 0;
    const pending = new Map();
    const waiters = [];
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.id && pending.has(message.id)) {
            const { resolve, reject } = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) {
                reject(new Error(JSON.stringify(message.error)));
            } else {
                resolve(message.result);
            }
        } else if (message.method) {
            for (const waiter of waiters.filter(w => w.method === message.method)) {
                waiters.splice(waiters.indexOf(waiter), 1);
                waiter.resolve(message.params);
            }
        }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++lastId;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
        const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) {
            throw new Error(expression.slice(0, 200) + ": " + JSON.stringify(result.exceptionDetails).slice(0, 2000));
        }
        return result.result.value;
    };
    const navigate = async (url) => {
        const loaded = new Promise(resolve => waiters.push({ method: "Page.loadEventFired", resolve }));
        await send("Page.navigate", { url });
        await loaded;
    };
    await send("Page.enable");
    return { version, send, evaluate, navigate, close };
}

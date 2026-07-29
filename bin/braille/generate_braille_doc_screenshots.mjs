// Re-capture the demo screenshots embedded in the Music Braille user guide
// (src/Plugins/Braille/UserGuide.md + the PDF built from it).
//
// Captures full-viewport screenshots (1600x900 CSS px at deviceScaleFactor 2) of the
// braille-enabled demo into export/braille_doc_shots/, writes a crop manifest, and then
// runs bin/braille/crop_braille_doc_screenshots.py, which crops and installs the results into
// src/Plugins/Braille/img/. Full-viewport + crop is deliberate: element/clip screenshots
// are displaced under an emulated deviceScaleFactor on some Chrome versions.
//
// Covered (the shots that depend on the demo UI layout): ui-select-sample,
// ui-braille-options, overview-accidentals, overview-braille-only, overview-facsimile.
// The panel-*.png closeups of the braille output itself only change when the braille
// FORMATTING changes and are captured by hand when that happens.
//
// Prerequisites:
//   - the dev server running with the current build: npm start (port 8000)
//   - Google Chrome (path autodetected; override with the CHROME environment variable)
//   - Node >= 22 (global fetch + WebSocket), python + Pillow for the crop step
//
// Usage: node bin/braille/generate_braille_doc_screenshots.mjs [--no-crop]

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(REPO, 'export', 'braille_doc_shots');
const DEMO_URL = 'http://localhost:8000';
const CDP_PORT = 9337;
const DSF = 2;
// a string that only exists in the current demo bundle -- guards against webpack-dev-server
// serving a stale (frozen) in-memory build, which would silently produce outdated shots
const FRESH_BUNDLE_MARKER = 'Music Braille Test - Facsimile';

const CHROME_CANDIDATES = [
    process.env.CHROME,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
];
const CHROME = CHROME_CANDIDATES.find(c => c && fs.existsSync(c));
if (!CHROME) {
    console.error('Chrome not found -- set the CHROME environment variable to its executable.');
    process.exit(1);
}

const sleep = ms => new Promise(res => setTimeout(res, ms));
let msgId = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = ++msgId;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evalJs(expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) {
        throw new Error('JS exception: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result.value;
}

async function waitFor(expression, timeoutMs, label) {
    const start = Date.now();
    for (;;) {
        if (await evalJs(expression)) { return; }
        if (Date.now() - start > timeoutMs) { throw new Error('timeout waiting for: ' + label); }
        await sleep(300);
    }
}

async function shoot(name) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
    console.log('raw shot:', name);
}

async function selectSample(fileValue) {
    const prev = await evalJs("(window.brailleDebug && window.brailleDebug.text) || ''");
    await evalJs(`(function(){
        const sel = document.getElementById('selectSample');
        for (const o of sel.options) { if (o.value.endsWith('${fileValue}')) { sel.value = o.value; break; } }
        sel.dispatchEvent(new Event('change'));
    })()`);
    await waitFor(`window.brailleDebug && window.brailleDebug.text && window.brailleDebug.text.length > 0`
        + ` && window.brailleDebug.text !== ${JSON.stringify(prev)}`, 60000, 'braille output for ' + fileValue);
    await sleep(700); // let the layout settle
}

async function main() {
    // dev server up and serving the current build?
    let bundle = '';
    try {
        bundle = await (await fetch(DEMO_URL + '/demo.js')).text();
    } catch {
        console.error(`dev server not reachable on ${DEMO_URL} -- start it with: npm start`);
        process.exit(1);
    }
    if (!bundle.includes(FRESH_BUNDLE_MARKER)) {
        console.error('dev server serves a STALE demo bundle (marker string missing) -- restart npm start.');
        process.exit(1);
    }

    fs.mkdirSync(OUT, { recursive: true });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'osmd-braille-shots-'));
    const chrome = spawn(CHROME, [
        '--headless', '--disable-gpu', '--hide-scrollbars', '--window-size=1600,900',
        `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, 'about:blank',
    ], { stdio: 'ignore' });
    try {
        let version = null;
        for (let i = 0; i < 30 && !version; i++) {
            await sleep(500);
            version = await fetch(`http://localhost:${CDP_PORT}/json/version`).then(r => r.json()).catch(() => null);
        }
        if (!version) { throw new Error('Chrome DevTools endpoint did not come up'); }

        const targets = await (await fetch(`http://localhost:${CDP_PORT}/json/list`)).json();
        const page = targets.find(t => t.type === 'page');
        ws = await new Promise((resolve, reject) => {
            const s = new WebSocket(page.webSocketDebuggerUrl);
            s.onopen = () => resolve(s);
            s.onerror = () => reject(new Error('DevTools websocket failed'));
        });
        ws.onmessage = (event) => {
            const m = JSON.parse(event.data);
            if (m.id && pending.has(m.id)) {
                const p = pending.get(m.id);
                pending.delete(m.id);
                if (m.error) { p.reject(new Error(m.error.message)); } else { p.resolve(m.result); }
            }
        };
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: DSF, mobile: false });

        const manifest = [];
        await send('Page.navigate', { url: DEMO_URL + '/?braille=1' });
        await waitFor('window.brailleDebug && window.brailleDebug.text && window.brailleDebug.text.length > 0',
            90000, 'initial braille render');
        await sleep(1000);

        // Scene 1: Accidentals sample selected -- sample-select pill crop + page overview
        await selectSample('test_Braille_Accidentals.musicxml');
        await evalJs('window.scrollTo(0, 0)');
        await sleep(300);
        const pill = await evalJs(`(function(){
            const r = document.getElementById('selectSampleContainer').getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
        })()`);
        await shoot('raw-accidentals.png');
        manifest.push({ raw: 'raw-accidentals.png', out: 'ui-select-sample.png',
            x: pill.x - 8, y: pill.y - 2, w: pill.w + 16, h: pill.h + 10 });
        manifest.push({ raw: 'raw-accidentals.png', out: 'overview-accidentals.png',
            x: 0, y: 0, w: 1600, h: 900 });

        // Scene 2: the "Music Braille options" section (sidebar scrolled to its bottom; the
        // <details> is already expanded because ?braille=1 / the braille sample opened it)
        await evalJs("var dc = document.getElementById('divControls'); dc.scrollTop = dc.scrollHeight;");
        await sleep(400);
        const opts = await evalJs(`(function(){
            const r = document.getElementById('brailleOptionsColumn').getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
        })()`);
        await shoot('raw-options.png');
        manifest.push({ raw: 'raw-options.png', out: 'ui-braille-options.png',
            x: opts.x - 6, y: opts.y - 6, w: opts.w + 12, h: opts.h + 12 });

        // Scene 3: classical score switched off (sidebar stays scrolled so the toggle is in frame)
        await evalJs("document.querySelector('label[for=\\'braille-show-classical-checkbox\\']').click()");
        await sleep(800);
        await evalJs('window.scrollTo(0, 0)');
        await sleep(300);
        await shoot('raw-braille-only.png');
        manifest.push({ raw: 'raw-braille-only.png', out: 'overview-braille-only.png', x: 0, y: 0, w: 1600, h: 900 });
        await evalJs("document.querySelector('label[for=\\'braille-show-classical-checkbox\\']').click()"); // back on
        await sleep(800);

        // Scene 4: facsimile sample (its sample hook switches facsimile mode on)
        await selectSample('test_Braille_Facsimile_option.musicxml');
        await evalJs("var dc = document.getElementById('divControls'); dc.scrollTop = dc.scrollHeight;");
        await evalJs('window.scrollTo(0, 0)');
        await sleep(400);
        await shoot('raw-facsimile.png');
        manifest.push({ raw: 'raw-facsimile.png', out: 'overview-facsimile.png', x: 0, y: 0, w: 1600, h: 900 });

        fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ dsf: DSF, crops: manifest }, null, 2));
        console.log('manifest written,', manifest.length, 'crops');
    } finally {
        chrome.kill();
        await sleep(500);
        fs.rmSync(profile, { recursive: true, force: true });
    }

    if (process.argv.includes('--no-crop')) {
        console.log('skipping crop step (--no-crop); run bin/braille/crop_braille_doc_screenshots.py manually.');
        return;
    }
    const cropScript = path.join(REPO, 'bin', 'braille', 'crop_braille_doc_screenshots.py');
    for (const python of ['python', 'python3', 'py']) {
        const r = spawnSync(python, [cropScript], { stdio: 'inherit' });
        if (!r.error) { process.exit(r.status ?? 0); }
    }
    console.error('python not found -- run manually: python bin/braille/crop_braille_doc_screenshots.py');
    process.exit(1);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

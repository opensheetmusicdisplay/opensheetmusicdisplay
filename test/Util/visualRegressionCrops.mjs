// before/after crops of the changed regions of the visual regression tests, e.g. for a pull request
//
// see https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Testing
//
// test/Util/visualRegression.mjs (npm run test:visual) calls writeCrops() after the comparison, unless it runs with
// --nocrops (npm run test:visual:nocrops). The comparison copies each changed image into the diff folder as
// <name>_Blessed.png and <name>_Current.png. For each pair, writeCrops() finds the regions that differ, and writes one
// PNG per region into diff/crops/: the blessed and the current crop next to each other (or one above the other, if
// they're too wide for that), enlarged when small, with the changed area outlined in red, and labeled with the states
// the images were generated from, e.g. "blessed: develop 52b16c29". A crop shows a change without searching the whole
// page for it, e.g. on a large score. Its blessed and current crop are also written alone, as <name>_crop<n>_Blessed.png
// and <name>_crop<n>_Current.png (the same part of each image, unscaled and without outline, below the caption and its
// label, in images of the same size): flipping between them in an image viewer shows a change in place, where the eye
// spots it at once, like flipping between the whole images in the diff folder.
//
// Regions: rows with changed pixels less than 60 px apart form one region, spanning their changed columns.
// A region taller than 400 px is cropped to its first 400 px: when the layout moves (e.g. a system gets taller),
// everything below the change differs, and its start is what matters. Images of different sizes are compared in their
// common area.

import FS from "fs";
import Path from "path";
import canvasPkg from "canvas";

const { loadImage, createCanvas } = canvasPkg;

const ROW_GAP = 60; // changed rows less than this apart belong to one region
const MAX_REGION_HEIGHT = 400; // a taller region is cropped to its start
const PAD_X = 90; // context around a region, in image pixels
const PAD_Y = 70;
const MAX_WIDTH = 1600; // crops are enlarged 2x, and put next to each other, as long as the result stays this narrow
const GAP = 16; // between the blessed and the current crop
const TEXT_HEIGHT = 22; // a line of the caption or of a label
const FONT = "14px sans-serif";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decodes a PNG file into a canvas context and its RGBA pixels.
 * Reads the file with Node's fs: node-canvas can't open paths longer than 260 characters on Windows.
 * @param {string} file path of the PNG file
 * @returns {Promise<{ ctx: object, w: number, h: number, data: Uint8ClampedArray }>} the decoded image
 */
async function decode(file) {
    const img = await loadImage(FS.readFileSync(file));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return { ctx, w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

/**
 * Finds the regions where two images differ, in their common area: rows with changed pixels less than ROW_GAP apart
 * form one region, spanning their changed columns.
 * @param {{ w: number, h: number, data: Uint8ClampedArray }} a the blessed image, from decode()
 * @param {{ w: number, h: number, data: Uint8ClampedArray }} b the current image, from decode()
 * @param {number} channelThreshold per-channel delta above which a pixel counts as changed
 * @returns {{ x0: number, x1: number, y0: number, y1: number }[]} the regions (inclusive pixel bounds), top to bottom
 */
function findRegions(a, b, channelThreshold) {
    const w = Math.min(a.w, b.w);
    const h = Math.min(a.h, b.h);
    const regions = [];
    let region;
    for (let y = 0; y < h; y++) {
        let minX = -1;
        let maxX = -1;
        for (let x = 0; x < w; x++) {
            const i = (y * a.w + x) * 4;
            const j = (y * b.w + x) * 4;
            if (Math.abs(a.data[i] - b.data[j]) > channelThreshold ||
                Math.abs(a.data[i + 1] - b.data[j + 1]) > channelThreshold ||
                Math.abs(a.data[i + 2] - b.data[j + 2]) > channelThreshold ||
                Math.abs(a.data[i + 3] - b.data[j + 3]) > channelThreshold) {
                if (minX < 0) {
                    minX = x;
                }
                maxX = x;
            }
        }
        if (maxX < 0) {
            continue;
        }
        if (region && y - region.y1 < ROW_GAP) {
            region.y1 = y;
            region.x0 = Math.min(region.x0, minX);
            region.x1 = Math.max(region.x1, maxX);
        } else {
            region = { x0: minX, x1: maxX, y0: y, y1: y };
            regions.push(region);
        }
    }
    return regions;
}

/**
 * Copies a part of an image into a new canvas.
 * Uses getImageData/putImageData, as drawImage with a large source offset draws nothing on very tall images
 * (a Cairo/pixman fixed-point limit), e.g. on the 32767 px tall page of ActorPreludeSample.
 * @param {{ ctx: object }} image the image, from decode()
 * @param {number} x0 left edge of the part
 * @param {number} y0 top edge of the part
 * @param {number} w width of the part
 * @param {number} h height of the part
 * @returns {object} a canvas with the part
 */
function crop(image, x0, y0, w, h) {
    const canvas = createCanvas(w, h);
    canvas.getContext("2d").putImageData(image.ctx.getImageData(x0, y0, w, h), 0, 0);
    return canvas;
}

/**
 * Creates a white canvas for a crop, set up for its caption.
 * @param {number} width width of the canvas
 * @param {number} height height of the canvas
 * @returns {object} the canvas's 2d context
 */
function whiteCanvas(width, height) {
    const ctx = createCanvas(width, height).getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.font = FONT;
    ctx.textBaseline = "top";
    return ctx;
}

/**
 * Draws the crop of one changed region: a caption, then the blessed and the current crop with their labels, next to
 * each other or one above the other, with the changed area outlined in red.
 * @param {string} name image name, without .png
 * @param {number} index number of the region, from 1
 * @param {number} count number of regions of the image
 * @param {{ x0: number, x1: number, y0: number, y1: number }} region the changed region, from findRegions()
 * @param {object} blessed the blessed image, from decode()
 * @param {object} current the current image, from decode()
 * @param {string[]} labels the labels of the blessed and the current crop
 * @returns {{ crop: Buffer, blessed: Buffer, current: Buffer }} the crop, and the blessed and the current crop alone
 *   (the same part of each image, unscaled and without outline, below the caption and its label, in images of the same
 *   size, to flip between), as PNG files
 */
function drawCrop(name, index, count, region, blessed, current, labels) {
    const y1 = Math.min(region.y1, region.y0 + MAX_REGION_HEIGHT - 1);
    const x0 = Math.max(0, region.x0 - PAD_X);
    const y0 = Math.max(0, region.y0 - PAD_Y);
    const cropWidth = Math.min(Math.min(blessed.w, current.w), region.x1 + 1 + PAD_X) - x0;
    const cropHeight = Math.min(Math.min(blessed.h, current.h), y1 + 1 + PAD_Y) - y0;
    const scale = cropWidth * 2 <= MAX_WIDTH ? 2 : 1;
    const sideBySide = 2 * cropWidth * scale + GAP <= MAX_WIDTH;
    const parts = [blessed, current].map((image) => crop(image, x0, y0, cropWidth, cropHeight));

    let caption = `${name}: region ${index} of ${count}, x${region.x0}-${region.x1} y${region.y0}-${region.y1}`;
    if (y1 < region.y1) {
        caption += ` (its first ${MAX_REGION_HEIGHT} px)`;
    }
    if (blessed.w !== current.w || blessed.h !== current.h) {
        caption += `, image size ${blessed.w}x${blessed.h} -> ${current.w}x${current.h}`;
    }
    const measure = createCanvas(1, 1).getContext("2d");
    measure.font = FONT;
    const textWidth = (text) => Math.ceil(measure.measureText(text).width) + 8;
    const panelWidth = Math.max(cropWidth * scale, ...labels.map(textWidth));
    const panelHeight = TEXT_HEIGHT + cropHeight * scale;
    const width = Math.max(sideBySide ? 2 * panelWidth + GAP : panelWidth, textWidth(caption));
    const height = TEXT_HEIGHT + (sideBySide ? panelHeight : 2 * panelHeight + GAP);

    const ctx = whiteCanvas(width, height);
    ctx.fillStyle = "#000000";
    ctx.fillText(caption, 4, 4);
    ctx.imageSmoothingEnabled = false; // enlarge without blurring
    // the outline of the changed area, a few pixels around it, within the crop
    const outlineX0 = Math.max(0, region.x0 - x0 - 4);
    const outlineY0 = Math.max(0, region.y0 - y0 - 4);
    const outlineX1 = Math.min(cropWidth, region.x1 - x0 + 5);
    const outlineY1 = Math.min(cropHeight, y1 - y0 + 5);
    parts.forEach((part, i) => {
        const left = sideBySide ? i * (panelWidth + GAP) : 0;
        const top = TEXT_HEIGHT + (sideBySide ? 0 : i * (panelHeight + GAP));
        ctx.fillStyle = "#b00000";
        ctx.fillText(labels[i], left + 4, top + 4);
        ctx.drawImage(part, left, top + TEXT_HEIGHT, cropWidth * scale, cropHeight * scale);
        ctx.strokeStyle = "#cccccc"; // a frame, as the crop's edges can cut through glyphs
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, top + TEXT_HEIGHT + 0.5, cropWidth * scale - 1, cropHeight * scale - 1);
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.strokeRect(left + outlineX0 * scale, top + TEXT_HEIGHT + outlineY0 * scale,
            (outlineX1 - outlineX0) * scale, (outlineY1 - outlineY0) * scale);
    });

    // the blessed and the current crop alone, below the caption and their label, in images of the same size (the width
    //   fits the longer label), so that flipping between them in an image viewer keeps the crop in place
    const aloneWidth = Math.max(cropWidth, textWidth(caption), ...labels.map(textWidth));
    const [blessedAlone, currentAlone] = parts.map((part, i) => {
        const aloneCtx = whiteCanvas(aloneWidth, 2 * TEXT_HEIGHT + cropHeight);
        aloneCtx.fillStyle = "#000000";
        aloneCtx.fillText(caption, 4, 4);
        aloneCtx.fillStyle = "#b00000";
        aloneCtx.fillText(labels[i], 4, TEXT_HEIGHT + 4);
        aloneCtx.drawImage(part, 0, 2 * TEXT_HEIGHT);
        return aloneCtx.canvas.toBuffer("image/png");
    });
    return { crop: ctx.canvas.toBuffer("image/png"), blessed: blessedAlone, current: currentAlone };
}

// ---------------------------------------------------------------------------
// Crops
// ---------------------------------------------------------------------------

/**
 * Writes the crops of the changed regions of the changed images in the diff folder, three PNGs per region.
 * @param {string} diffFolder folder with the changed images, as <name>_Blessed.png and <name>_Current.png
 * @param {string} cropsFolder folder to write the crops into, as <name>_crop<n>.png, and their blessed and current
 *   crop alone as <name>_crop<n>_Blessed.png and <name>_crop<n>_Current.png
 * @param {object} options how to crop
 * @param {string[]} options.labels the labels of the blessed and the current crops, e.g. "blessed: develop 52b16c29"
 * @param {number} options.channelThreshold per-channel delta above which a pixel counts as changed
 * @param {number} options.maxRegions maximum number of crops per image (of its first regions)
 * @param {(done: number, total: number) => void} options.onProgress called after each image, e.g. for a progress bar
 * @returns {Promise<{ count: number, capped: string[], uncropped: string[] }>} the number of crops written, the images
 *   with more regions than maxRegions, and the images without a crop, as they differ only in size, not in their common
 *   area
 */
export async function writeCrops(diffFolder, cropsFolder, { labels, channelThreshold, maxRegions, onProgress }) {
    const names = FS.readdirSync(diffFolder)
        .filter((f) => f.endsWith("_Blessed.png"))
        .map((f) => f.slice(0, -"_Blessed.png".length))
        .filter((name) => FS.existsSync(Path.join(diffFolder, `${name}_Current.png`)))
        .sort();
    FS.mkdirSync(cropsFolder, { recursive: true });
    const result = { count: 0, capped: [], uncropped: [] };
    for (const [index, name] of names.entries()) {
        const blessed = await decode(Path.join(diffFolder, `${name}_Blessed.png`));
        const current = await decode(Path.join(diffFolder, `${name}_Current.png`));
        const regions = findRegions(blessed, current, channelThreshold);
        if (regions.length === 0) {
            result.uncropped.push(name);
        } else if (regions.length > maxRegions) {
            result.capped.push(name);
        }
        regions.slice(0, maxRegions).forEach((region, i) => {
            const pngs = drawCrop(name, i + 1, regions.length, region, blessed, current, labels);
            const file = Path.join(cropsFolder, `${name}_crop${i + 1}`);
            FS.writeFileSync(`${file}.png`, pngs.crop);
            FS.writeFileSync(`${file}_Blessed.png`, pngs.blessed);
            FS.writeFileSync(`${file}_Current.png`, pngs.current);
            result.count++;
        });
        onProgress(index + 1, names.length);
    }
    return result;
}

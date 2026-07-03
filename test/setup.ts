import fs from "fs";
import path from "path";

// Replicate karma-xml2js-preprocessor + karma-base64-to-js-preprocessor:
// Populate globalThis.__xml__ and globalThis.__raw__ so TestUtils works unchanged.

const DATA_DIR: string = path.resolve(__dirname, "data");

function getFiles(exts: string[]): string[] {
  const all: string[] = fs.readdirSync(DATA_DIR);
  return all.filter((f: string) => exts.some((ext: string) => f.endsWith(ext)));
}

// XML / MusicXML files → Document via DOMParser
const xmlFiles: string[] = getFiles([".xml", ".musicxml"]);
const xmlMap: Record<string, Document> = {};
for (const file of xmlFiles) {
  const fullPath: string = path.join(DATA_DIR, file);
  const content: string = fs.readFileSync(fullPath, "utf-8");
  xmlMap[`test/data/${file}`] = new DOMParser().parseFromString(content, "text/xml");
}

// MXL files → raw binary string (starts with PK, JSZip.loadAsync expects raw bytes)
const mxlFiles: string[] = getFiles([".mxl"]);
const rawMap: Record<string, string> = {};
for (const file of mxlFiles) {
  const fullPath: string = path.join(DATA_DIR, file);
  // latin1 maps each byte to a single char (0-255), preserving binary content as string
  rawMap[`test/data/${file}`] = fs.readFileSync(fullPath, "latin1");
}

(globalThis as any).__xml__ = xmlMap;
(globalThis as any).__raw__ = rawMap;

// Mock FontFace.load for environments without real font rendering (node, jsdom)
if (typeof FontFace !== "undefined") {
  FontFace.prototype.load = function (): Promise<any> {
    return Promise.resolve(this);
  };
}

// Mock HTMLCanvasElement.getContext for jsdom (no real canvas package).
// VexFlow creates canvas 2d contexts to measure text.
// Skip jsdom's native getContext entirely — without the optional `canvas` binary
// it logs "Not implemented" and returns null; our mock handles everything instead.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function (...args: any[]): any {
    const type: string = args[0] as string;
    if (type === "2d" || type === "2d-default") {
      const mockCtx: Record<string, any> = {};
      mockCtx.canvas = this;
      mockCtx.font = "10px sans-serif";
      mockCtx.textAlign = "start";
      mockCtx.textBaseline = "alphabetic";
      mockCtx.direction = "ltr";
      mockCtx.measureText = (text: string): TextMetrics => ({
        width: text.length * 6,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 8,
        fontBoundingBoxDescent: 2,
        alphabeticBaseline: 0,
      } as TextMetrics);
      mockCtx.clearRect = (): void => {};
      mockCtx.fillRect = (): void => {};
      mockCtx.strokeRect = (): void => {};
      mockCtx.fillText = (): void => {};
      mockCtx.strokeText = (): void => {};
      mockCtx.save = (): void => {};
      mockCtx.restore = (): void => {};
      mockCtx.beginPath = (): void => {};
      mockCtx.closePath = (): void => {};
      mockCtx.moveTo = (): void => {};
      mockCtx.lineTo = (): void => {};
      mockCtx.arc = (): void => {};
      mockCtx.bezierCurveTo = (): void => {};
      mockCtx.quadraticCurveTo = (): void => {};
      mockCtx.fill = (): void => {};
      mockCtx.stroke = (): void => {};
      mockCtx.clip = (): void => {};
      mockCtx.scale = (): void => {};
      mockCtx.rotate = (): void => {};
      mockCtx.translate = (): void => {};
      mockCtx.transform = (): void => {};
      mockCtx.setTransform = (): void => {};
      mockCtx.createLinearGradient = (): any => ({ addColorStop: (): void => {} });
      mockCtx.createRadialGradient = (): any => ({ addColorStop: (): void => {} });
      mockCtx.createPattern = (): any => null;
      Object.defineProperty(mockCtx, "width", { get: (): number => 300 });
      Object.defineProperty(mockCtx, "height", { get: (): number => 150 });
      return mockCtx as any;
    }
    return null;
  };
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { resolve } from "path";
import chai from "chai";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.getComputedStyle = dom.window.getComputedStyle;

// Karma provides chai as global
global.chai = chai;

// XML documents cache (Karma xml2js preprocessor equivalent)
const dataDir = resolve("test/data");
const xmlDocCache = {};
const rawCache = {};

const files = [
  "OSMD_Function_Test_Voice_Alignment.musicxml",
  "OSMD_Function_Test_Voice_Alignment_reduced.musicxml",
  "OSMD_Function_Test_Voice_Alignment_colored.musicxml",
];

for (const f of files) {
  const path = `test/data/${f}`;
  const fullPath = resolve(dataDir, f);
  try {
    const content = readFileSync(fullPath, "utf-8");
    rawCache[path] = content;
    const parser = new dom.window.DOMParser();
    const doc = parser.parseFromString(content, "text/xml");
    xmlDocCache[path] = doc;
  } catch (e) {
    console.warn(`[mocha-setup] Could not load ${fullPath}: ${e.message}`);
  }
}

dom.window.__xml__ = xmlDocCache;
dom.window.__raw__ = rawCache;

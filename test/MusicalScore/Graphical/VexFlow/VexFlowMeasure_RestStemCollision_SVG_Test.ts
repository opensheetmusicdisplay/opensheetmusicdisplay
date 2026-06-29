/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

interface BBox {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

function renderSVG(scorePath: string): Promise<SVGElement> {
  const container: HTMLElement = TestUtils.getDivElement(document);
  container.style.width = "1200px";
  container.style.height = "1600px";
  const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
    container, { autoResize: false, backend: "svg", drawTitle: false }
  );
  const doc: Document = TestUtils.getScore(scorePath);
  return osmd.load(doc).then(() => {
    osmd.render();
    const svg: SVGElement | null = container.querySelector("svg");
    if (!svg) {throw new Error("No SVG after render");}
    return svg;
  });
}

function parseStems(svg: SVGElement): BBox[] {
  const stems: BBox[] = [];
  const paths: NodeListOf<Element> = svg.querySelectorAll(".vf-stem path, [class*='vf-stem'] path");
  for (let i: number = 0; i < paths.length; i++) {
    const d: string = paths[i].getAttribute("d") || "";
    const m: RegExpMatchArray | null = d.match(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);
    if (m) {
      const x: number = parseFloat(m[1]);
      const y1: number = parseFloat(m[2]);
      const y2: number = parseFloat(m[4]);
      stems.push({ x: x - 1, y: Math.min(y1, y2), x2: x + 2, y2: Math.max(y1, y2) });
    }
  }
  return stems;
}

function parseRestBBoxes(svg: SVGElement): BBox[] {
  const boxes: BBox[] = [];
  const noteheads: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-notehead']");
  for (let i: number = 0; i < noteheads.length; i++) {
    const nh: Element = noteheads[i];
    const parent: Element | null = nh.closest("[class*='vf-stavenote']");
    if (!parent) {continue;}
    const hasStem: boolean = parent.querySelector("[class*='vf-stem']") !== null;
    if (hasStem) {continue;}
    const text: Element | null = nh.querySelector("text");
    if (!text) {continue;}
    const rect: Element | null = parent.querySelector("rect");
    if (rect) {
      const rx: number = parseFloat(rect.getAttribute("x") || "0");
      const ry: number = parseFloat(rect.getAttribute("y") || "0");
      const rw: number = parseFloat(rect.getAttribute("width") || "0");
      const rh: number = parseFloat(rect.getAttribute("height") || "0");
      if (rw > 0 && rh > 0) {
        boxes.push({ x: rx, y: ry, x2: rx + rw, y2: ry + rh });
      }
    }
  }
  return boxes;
}

function parseClefPositions(svg: SVGElement): BBox[] {
  const clefs: BBox[] = [];
  const allTexts: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-stavenote'] text");
  for (let i: number = 0; i < allTexts.length; i++) {
    const t: Element = allTexts[i];
    const cp: number = (t.textContent || "").codePointAt(0) || 0;
    // SMuFL clef glyph range: U+E050–E063 (C clefs), E062–E0A3 (G/F clefs)
    if ((cp >= 0xe050 && cp <= 0xe063) || (cp >= 0xe060 && cp <= 0xe0a3)) {
      const x: number = parseFloat(t.getAttribute("x") || "0");
      const y: number = parseFloat(t.getAttribute("y") || "0");
      clefs.push({ x: x - 10, y: y - 15, x2: x + 25, y2: y + 10 });
    }
  }
  return clefs;
}

function overlap(a: BBox, b: BBox): boolean {
  return a.x < b.x2 && a.x2 > b.x && a.y < b.y2 && a.y2 > b.y;
}

describe("Rest vs Stem / In-Measure Clef Collision", () => {

  it("bass rest must not overlap any stem from other voices", () => {
    return renderSVG("test_rest_in_measure_keys_bass_rest.musicxml").then((svg: SVGElement) => {
      const stems: BBox[] = parseStems(svg);
      const rests: BBox[] = parseRestBBoxes(svg);
      expect(rests.length).to.be.greaterThan(0, "no rests found");
      expect(stems.length).to.be.greaterThan(0, "no stems found");
      const collisions: string[] = [];
      for (const r of rests) {
        for (const s of stems) {
          if (overlap(r, s)) {
            collisions.push(
              `rest@[${r.x.toFixed(0)},${r.y.toFixed(0)}-${r.x2.toFixed(0)},${r.y2.toFixed(0)}] ` +
              `stem@[${s.x.toFixed(0)},${s.y.toFixed(0)}-${s.x2.toFixed(0)},${s.y2.toFixed(0)}]`
            );
          }
        }
      }
      expect(collisions, `Rest-stem overlaps:\n${collisions.join("\n")}`).to.be.empty;
    });
  });

  it("rest must not overlap in-measure clef glyphs", () => {
    return renderSVG("test_rest_in_measure_keys_bass_rest.musicxml").then((svg: SVGElement) => {
      const clefs: BBox[] = parseClefPositions(svg);
      const rests: BBox[] = parseRestBBoxes(svg);
      expect(clefs.length).to.be.greaterThan(0, "no in-measure clefs found");
      expect(rests.length).to.be.greaterThan(0, "no rests found");
      const collisions: string[] = [];
      for (const r of rests) {
        for (const c of clefs) {
          if (overlap(r, c)) {
            collisions.push(
              `rest@[${r.x.toFixed(0)},${r.y.toFixed(0)}-${r.x2.toFixed(0)},${r.y2.toFixed(0)}] ` +
              `clef@[${c.x.toFixed(0)},${c.y.toFixed(0)}-${c.x2.toFixed(0)},${c.y2.toFixed(0)}]`
            );
          }
        }
      }
      expect(collisions, `Rest-clef overlaps:\n${collisions.join("\n")}`).to.be.empty;
    });
  });

});

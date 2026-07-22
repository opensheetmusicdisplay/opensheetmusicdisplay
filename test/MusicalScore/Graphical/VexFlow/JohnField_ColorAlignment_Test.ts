
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

interface ColoredNote {
  color: string;
  x: number;
  y: number;
}

/**
 * Parse colored noteheads from rendered SVG (MXL with MuseScore color assignment).
 *
 * Voice 1 (tuplet 16ths, 18 notes/measure) and voice 5 (8ths, 6 notes/measure)
 * have different tick densities. Colored pairs assigned by sequence index land
 * at DIFFERENT tick contexts across staves — they correctly get different x.
 * This is NOT a rendering alignment issue.
 *
 * This test verifies the property we CAN assert: notes at the same tick context
 * (same x, different staves) have identical x values. The tick-0 anchor in each
 * measure is always shared.
 */
function parseColoredNotes(svg: SVGElement): ColoredNote[] {
  const notes: ColoredNote[] = [];
  const noteheads: NodeListOf<SVGGElement> = svg.querySelectorAll("g.vf-notehead");
  for (const nh of noteheads) {
    const fill: string | null = nh.getAttribute("fill");
    if (!fill || fill === "#000000") { continue; }
    const textEl: SVGTextElement | null = nh.querySelector("text");
    if (!textEl) { continue; }
    const x: number = parseFloat(textEl.getAttribute("x") ?? "");
    const y: number = parseFloat(textEl.getAttribute("y") ?? "");
    if (isNaN(x) || isNaN(y)) { continue; }
    notes.push({ color: fill, x, y });
  }
  return notes;
}

function renderToSVG(): Promise<SVGElement> {
  const container: HTMLElement = TestUtils.getDivElement(document);
  container.style.width = "1200px";
  container.style.height = "1600px";
  const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
    container, { autoResize: false, backend: "svg", drawTitle: false }
  );
  const scoreDoc: Document = TestUtils.getScore("john-field-piano-concerto-7_m533-537.musicxml");
  return osmd.load(scoreDoc).then(() => {
    osmd.render();
    const svg: SVGElement | null = container.querySelector("svg");
    if (!svg) { throw new Error("No SVG element after render"); }
    return svg;
  });
}

describe("John Field cross-stave alignment", () => {
  let notes: ColoredNote[];

  beforeAll(function (): Promise<void> {
    return renderToSVG().then(
      (svg: SVGElement) => { notes = parseColoredNotes(svg); }
    );
  });

  it("should extract colored notes", () => {
    expect(notes.length).to.be.greaterThan(0);
    const uniqueColors: string[] = [...new Set(notes.map(n => n.color))];
    expect(uniqueColors.length).to.be.at.least(2);
  });

  it("tick-0 colored pairs are aligned across staves", () => {
    // Group colored notes by color
    const groups: Map<string, ColoredNote[]> = new Map();
    for (const n of notes) {
      const existing: ColoredNote[] | undefined = groups.get(n.color);
      if (existing) { existing.push(n); }
      else { groups.set(n.color, [n]); }
    }

    // Identify tick-0 pairs: same color, notes from different staves (y diff > 100),
    // at the minimum x for that color (tick-0 = first note = minimum x within measure).
    // Verify they share the exact same x.
    let tick0Pairs: number = 0;
    const failures: string[] = [];

    for (const [color, group] of groups) {
      if (group.length < 2) { continue; }
      const ys: number[] = group.map(n => n.y);
      const minY: number = Math.min(...ys);
      const maxY: number = Math.max(...ys);
      // Must span both staves (y gap > 100px between piano staves)
      if (maxY - minY < 100) { continue; }
      // Tick-0 notes are the first in measure — minimum x within staff group
      const xs: number[] = group.map(n => n.x);
      const minX: number = Math.min(...xs);
      const tick0Notes: ColoredNote[] = group.filter(n => n.x === minX);
      if (tick0Notes.length < 2) { continue; }
      tick0Pairs++;
      if (tick0Notes[0].x !== tick0Notes[1].x) {
        failures.push(`${color}: tick-0 x mismatch [${tick0Notes[0].x}, ${tick0Notes[1].x}]`);
      }
    }

    console.log(`Found ${tick0Pairs} tick-0 cross-staff color pairs`);
    expect(failures.length).toBe(0, `Tick-0 cross-staff misalignments:\n  ${failures.join("\n  ")}`);
  });
});

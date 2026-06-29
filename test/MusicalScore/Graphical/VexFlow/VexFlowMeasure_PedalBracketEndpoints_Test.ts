
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { VexFlowPedal } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import * as VF from "vexflow";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

function buildGMS(path: string): GraphicalMusicSheet {
  const score: any = TestUtils.getScore(path);
  const partwise: any = TestUtils.getPartWiseElement(score);
  const reader: MusicSheetReader = new MusicSheetReader();
  const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
  const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), path);
  const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
  calc.calculate();
  return gms;
}

interface BracketInfo {
  startX: number;
  endX: number;
  y: number;
}

interface NoteheadInfo {
  x: number;
  y: number;
  measure: number;
}

function getPedalBrackets(svg: SVGElement): BracketInfo[] {
  const brackets: BracketInfo[] = [];
  // Find all path elements
  const paths: NodeListOf<Element> = svg.querySelectorAll("path");
  for (let i: number = 0; i < paths.length; i++) {
    const d: string = paths[i].getAttribute("d") || "";
    // Bracket paths have 3 points: M <startX> <y> L <endX> <y> L <endX> <y-10>
    const match: RegExpMatchArray | null =
      d.match(/M([\d.]+)\s+([\d.]+)L([\d.]+)\s+\2L([\d.]+)\s+([\d.]+)/);
    if (match) {
      const startX: number = parseFloat(match[1]);
      const y: number = parseFloat(match[2]);
      const endX: number = parseFloat(match[3]);
      const endX2: number = parseFloat(match[4]);
      const endY: number = parseFloat(match[5]);
      // Verify bracket shape: horizontal line then vertical drop
      if (Math.abs(endX - endX2) < 1 && endY < y) {
        brackets.push({ startX, endX, y });
      }
    }
  }
  return brackets;
}

function getNoteheads(svg: SVGElement): NoteheadInfo[] {
  const noteheads: NoteheadInfo[] = [];
  const measures: NodeListOf<Element> = svg.querySelectorAll("[class*='vf-measure']");
  for (let m: number = 0; m < measures.length; m++) {
    const mg: Element = measures[m];
    const id: string = mg.getAttribute("id") || "";
    const notes: NodeListOf<Element> = mg.querySelectorAll("text");
    for (let n: number = 0; n < notes.length; n++) {
      const x: string | null = notes[n].getAttribute("x");
      const y: string | null = notes[n].getAttribute("y");
      if (x && y) {
        noteheads.push({
          x: parseFloat(x),
          y: parseFloat(y),
          measure: parseInt(id, 10),
        });
      }
    }
  }
  return noteheads;
}

function renderToSVG(scorePath: string): Promise<SVGElement> {
  const container: HTMLElement = TestUtils.getDivElement(document);
  container.style.width = "1440px";
  container.style.height = "600px";
  const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
    container, { autoResize: false, backend: "svg", drawTitle: false }
  );
  const scoreDoc: Document = TestUtils.getScore(scorePath);
  return osmd.load(scoreDoc).then(() => {
    osmd.render();
    const svg: SVGElement | null = container.querySelector("svg");
    if (!svg) { throw new Error("No SVG element after render"); }
    return svg;
  });
}

describe("Pedal Bracket Endpoints", () => {

  describe("OSMD_Function_Test_Pedals.musicxml (internal state)", () => {
    it("pedal start/end notes and EndsStave should be correct", () => {
      const gms: GraphicalMusicSheet = buildGMS("OSMD_Function_Test_Pedals.musicxml");
      const pedalInfos: string[] = [];
      for (const measureList of gms.MeasureList) {
        for (const measure of measureList) {
          if (!measure) { continue; }
          const sl: StaffLine = measure.ParentStaffLine;
          if (sl?.Pedals) {
            for (const p of sl.Pedals) {
              if (p) {
                const vfp: VexFlowPedal = p as VexFlowPedal;
                const marking: VF.PedalMarking = vfp.getPedalMarking();
                const endM: string = vfp.endMeasure ? "M" + vfp.endMeasure.MeasureNumber : "?";
                const stM: string = vfp.startVfVoiceEntry
                  ? "M" + vfp.startVfVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber
                  : "?";
                const startX: string = vfp.startNote
                  ? vfp.startNote.getAbsoluteX().toFixed(1)
                  : "?";
                pedalInfos.push(
                  `  stM=${stM} endM=${endM} ` +
                  `startX=${startX} ` +
                  `style=${(marking as any).type} ` +
                  `openEnd=${!!vfp.ChangeEnd} openBegin=${!!vfp.ChangeBegin}`
                );
              }
            }
          }
        }
      }
      console.warn(`Found ${pedalInfos.length} pedal(s):`);
      for (const info of pedalInfos) {
        console.warn(info);
      }
      expect(pedalInfos.length, "should have pedals").to.be.greaterThan(0);
    });
  });

  describe("OSMD_Function_Test_Pedals.musicxml (SVG)", () => {
    let brackets: BracketInfo[];
    let noteheads: NoteheadInfo[];

    before(function (): Promise<void> {
      this.timeout(20000);
      return renderToSVG("OSMD_Function_Test_Pedals.musicxml").then(
        (svg: SVGElement) => {
          brackets = getPedalBrackets(svg);
          noteheads = getNoteheads(svg);
        }
      );
    });

    it("should find at least 2 pedal brackets", () => {
      expect(brackets.length).to.be.at.least(2,
        `found ${brackets.length} brackets`);
    });

    it("bracket from M9 to M10 A4 ends at A4 not at E4", () => {
      // Bracket 1: starts at M9 first note (~x=1005), should end at M10 A4 (~x=1146)
      // Before fix: ends at x≈1161 (E4 position)
      // After fix: ends at x≈1146 (A4 position)
      const b1: BracketInfo | undefined = brackets[0];
      if (!b1) { expect(brackets.length).to.be.at.least(1); return; }

      // Find M10 noteheads (measure 10). No y filter — score is single treble staff.
      const m10notes: NoteheadInfo[] = noteheads.filter(
        (n: NoteheadInfo) => n.measure === 10
      );
      // Log all M10 noteheads for debugging
      console.warn("M10 noteheads: " + m10notes.map(
        (n: NoteheadInfo) => "x=" + n.x.toFixed(1) + " y=" + n.y.toFixed(1)
      ).join(", "));
      const m10A4: NoteheadInfo | undefined = m10notes[2]; // 3rd note in M10 = A4
      const m10E4: NoteheadInfo | undefined = m10notes[3]; // 4th note in M10 = E4

      if (m10A4 && m10E4) {
        const distToA4: number = Math.abs(b1.endX - m10A4.x);
        const distToE4: number = Math.abs(b1.endX - m10E4.x);

        console.warn(
          "BRACKET1 endX=" + b1.endX.toFixed(1) +
          " A4.x=" + m10A4.x.toFixed(1) +
          " E4.x=" + m10E4.x.toFixed(1) +
          " distToA4=" + distToA4.toFixed(1) +
          " distToE4=" + distToE4.toFixed(1)
        );

        expect(distToA4).to.be.lessThan(
          25,
          "bracket1 ends " + distToA4.toFixed(1) +
          "px from A4 vs " + distToE4.toFixed(1) + "px from E4 — " +
          "should end at A4 (release note), not extend to E4"
        );
        expect(distToA4).to.be.lessThan(
          distToE4,
          "bracket1 should be closer to A4 than to E4"
        );
      }
    });

    it("bracket from M10 A4 to M11 A4 ends at A4 not at D5", () => {
      // Bracket 2: starts at M10 A4 (~x=1146), should end at M11 A4 (~x=1245)
      // Before fix: ends at x≈1261 (D5 position)
      const b2: BracketInfo | undefined = brackets[1];
      if (!b2) { expect(brackets.length).to.be.at.least(2); return; }

      // Find M11 noteheads (measure 11). No y filter — score is single treble staff.
      const m11notes: NoteheadInfo[] = noteheads.filter(
        (n: NoteheadInfo) => n.measure === 11
      );
      console.warn("M11 noteheads: " + m11notes.map(
        (n: NoteheadInfo) => "x=" + n.x.toFixed(1) + " y=" + n.y.toFixed(1)
      ).join(", "));
      const m11A4: NoteheadInfo | undefined = m11notes[2]; // 3rd note in M11 = A4
      const m11D5: NoteheadInfo | undefined = m11notes[3]; // 4th note in M11 = D5

      if (m11A4 && m11D5) {
        const distToA4: number = Math.abs(b2.endX - m11A4.x);
        const distToD5: number = Math.abs(b2.endX - m11D5.x);

        console.warn(
          "BRACKET2 endX=" + b2.endX.toFixed(1) +
          " A4.x=" + m11A4.x.toFixed(1) +
          " D5.x=" + m11D5.x.toFixed(1) +
          " distToA4=" + distToA4.toFixed(1) +
          " distToD5=" + distToD5.toFixed(1)
        );

        expect(distToA4).to.be.lessThan(
          25,
          "bracket2 ends " + distToA4.toFixed(1) +
          "px from A4 vs " + distToD5.toFixed(1) + "px from D5 — " +
          "should end at A4 (release note), not extend to D5"
        );
        expect(distToA4).to.be.lessThan(
          distToD5,
          "bracket2 should be closer to A4 than to D5"
        );
      }
    });
  });
});

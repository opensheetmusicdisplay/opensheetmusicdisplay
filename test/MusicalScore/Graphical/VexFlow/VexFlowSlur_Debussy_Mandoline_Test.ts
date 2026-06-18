/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import * as VF from "vexflow";

describe("Debussy Mandoline m11 slur positioning", () => {
  let osmd: OpenSheetMusicDisplay;
  const m11Slurs: GraphicalSlur[] = [];

  before(async function (): Promise<void> {
    this.timeout(30000);
    const score: Document = TestUtils.getScore("Debussy_Mandoline.xml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();

    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          for (const slur of staffLine.GraphicalSlurs) {
            if (slur.staffEntries.length < 2) { continue; }
            const startM: number = slur.staffEntries[0].parentMeasure.MeasureNumber;
            const endM: number = slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber;
            if (startM === 11 && endM === 11 && slur.placement === PlacementEnum.Above) {
              m11Slurs.push(slur);
            }
          }
        }
      }
    }
  });

  it("slurs on 8th-note chords are not displaced right of noteheads", () => {
    expect(m11Slurs.length, "should find within-m11 above-placed slurs").to.be.at.least(2);

    for (const slur of m11Slurs) {
      const startNote: GraphicalNote = slur.staffEntries[0].findGraphicalNoteFromNote(slur.slur.StartNote);
      const endNote: GraphicalNote = slur.staffEntries[slur.staffEntries.length - 1].findGraphicalNoteFromNote(slur.slur.EndNote);
      if (!startNote || !endNote) { continue; }

      const vfStart: VF.StaveNote = (startNote as VexFlowGraphicalNote).vfnote[0] as VF.StaveNote;
      const vfEnd: VF.StaveNote = (endNote as VexFlowGraphicalNote).vfnote[0] as VF.StaveNote;

      const noteStartPx: number = vfStart.getAbsoluteX();
      const noteEndPx: number = vfEnd.getAbsoluteX();

      const vfMeasure: VexFlowMeasure = slur.staffEntries[0].parentMeasure as VexFlowMeasure;
      const staveX: number = vfMeasure.getVFStave().getX();
      const measureRelX: number = slur.staffEntries[0].parentMeasure.PositionAndShape.RelativePosition.x;

      const staffLinePixelX: number = staveX - measureRelX * 10;
      const slurStartPx: number = slur.bezierStartPt.x * 10 + staffLinePixelX;
      const slurEndPx: number = slur.bezierEndPt.x * 10 + staffLinePixelX;

      const startDispPx: number = slurStartPx - noteStartPx;
      const endDispPx: number = slurEndPx - noteEndPx;

      expect(Math.abs(startDispPx),
        `slur start displaced ${startDispPx.toFixed(1)}px from VF notehead`,
      ).to.be.at.most(15);
      expect(Math.abs(endDispPx),
        `slur end displaced ${endDispPx.toFixed(1)}px from VF notehead`,
      ).to.be.at.most(15);
    }
  });

  it("slurs start above staccato dots on start notes", () => {
    expect(m11Slurs.length).to.be.at.least(2);

    const vf5ToOsmdY: (line: number) => number = (l: number): number => 5 - l;

    for (const slur of m11Slurs) {
      const startNote: GraphicalNote = slur.staffEntries[0].findGraphicalNoteFromNote(slur.slur.StartNote);
      if (!startNote) { continue; }

      const vfNote: VF.StaveNote = (startNote as VexFlowGraphicalNote).vfnote[0] as VF.StaveNote;
      let hasStaccatoAbove: boolean = false;
      for (const mod of vfNote.getModifiers()) {
        if ((mod as any).getCategory?.() === VF.Articulation.CATEGORY) {
          if ((mod as VF.Articulation).getPosition() === VF.Modifier.Position.ABOVE) {
            hasStaccatoAbove = true;
            break;
          }
        }
      }

      expect(hasStaccatoAbove, "start note should have staccato above").to.be.true;

      const startVE: GraphicalVoiceEntry = startNote.parentVoiceEntry;
      let extremeNoteY: number = vf5ToOsmdY((startNote as VexFlowGraphicalNote).notehead().line);
      for (const n of startVE.notes) {
        const ny: number = vf5ToOsmdY((n as VexFlowGraphicalNote).notehead().line);
        if (ny < extremeNoteY) { extremeNoteY = ny; }
      }
      const noteTopY: number = extremeNoteY - 0.5;

      const distAboveNoteTop: number = noteTopY - slur.bezierStartPt.y;
      expect(distAboveNoteTop, "slur should be above notehead top (clearing staccato)").to.be.at.least(0.3);
    }
  });
});

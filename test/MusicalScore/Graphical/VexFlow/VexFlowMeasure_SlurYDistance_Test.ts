import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { StemDirectionType } from "../../../../src/MusicalScore/VoiceData/VoiceEntry";

describe("Beethoven Slur Y Distance", () => {
  let osmd: OpenSheetMusicDisplay;

  before(async function (): Promise<void> {
    this.timeout(30000);
    const score: Document = TestUtils.getScore("Beethoven_AnDieFerneGeliebte.xml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();
  });

  it("measure-spanning slurs in m10-11 start close to their start notes", () => {
    const slurs: GraphicalSlur[] = [];
    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          for (const slur of staffLine.GraphicalSlurs) {
            if (slur.staffEntries.length < 2) {
              continue;
            }
            const startM: number = slur.staffEntries[0].parentMeasure.MeasureNumber;
            const endM: number = slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber;
            if (startM === 10 && endM === 11) {
              slurs.push(slur);
            }
          }
        }
      }
    }

    expect(slurs.length, "should find measure-spanning slurs in m10-11").to.be.at.least(1);

    for (const slur of slurs) {
      const startSE: GraphicalStaffEntry = slur.staffEntries[0];
      const slurStartNote: GraphicalNote = startSE.findGraphicalNoteFromNote(slur.slur.StartNote);
      if (!slurStartNote) {
        continue;
      }

      const slurStartVE: GraphicalVoiceEntry = slurStartNote.parentVoiceEntry;
      const placement: PlacementEnum = slur.placement;
      const stemDir: StemDirectionType = slurStartVE.parentVoiceEntry.StemDirection;

      // Voice entry top/bottom (from VF5 bounding box, includes stem+modifiers).
      // Needed for stem-toward-slur cases (Above+Up, Below+Down).
      const veRelY: number = slurStartVE.PositionAndShape.RelativePosition?.y ?? 0;
      const veTopY: number = veRelY + (slurStartVE.PositionAndShape.BorderTop ?? 0);
      const veBottomY: number = veRelY + (slurStartVE.PositionAndShape.BorderBottom ?? 0);

      // Find extreme notehead Y across the whole chord (matching calculateStartAndEnd logic).
      // VF5 notehead line is bottom-up: getYForNote(line) = stave.y + (5-line)*spacing.
      // OSMD staff-relative Y (0=top staff line, down=positive) = 5 - line.
      const vf5ToOsmdY: (l: number) => number = (l: number): number => 5 - l;
      let noteStaffY: number = vf5ToOsmdY((slurStartNote as VexFlowGraphicalNote).notehead().line);
      if (slurStartVE.notes.length > 1) {
          if (placement === PlacementEnum.Above) {
              for (const n of slurStartVE.notes) {
                  const ny: number = vf5ToOsmdY((n as VexFlowGraphicalNote).notehead().line);
                  if (ny < noteStaffY) { noteStaffY = ny; }
              }
          } else {
              for (const n of slurStartVE.notes) {
                  const ny: number = vf5ToOsmdY((n as VexFlowGraphicalNote).notehead().line);
                  if (ny > noteStaffY) { noteStaffY = ny; }
              }
          }
      }
      const noteTopY: number = noteStaffY - 0.5;
      const noteBottomY: number = noteStaffY + 0.5;

      const slurStartY: number = slur.bezierStartPt.y;

      const sm: number = slur.staffEntries[0].parentMeasure.MeasureNumber;
      const em: number = slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber;

      console.log(
        `slur m${sm}-m${em}` +
        ` placement=${PlacementEnum[placement]} stem=${StemDirectionType[stemDir]}` +
        ` veRelY=${veRelY.toFixed(2)} noteStaffY=${noteStaffY.toFixed(2)}` +
        ` noteTop=${noteTopY.toFixed(2)} noteBottom=${noteBottomY.toFixed(2)}` +
        ` slurStartY=${slurStartY.toFixed(2)}`,
      );
      console.log(
        `  bezierStartPt=(${slur.bezierStartPt.x.toFixed(2)},${slur.bezierStartPt.y.toFixed(2)})` +
        ` bezierStartControlPt=(${slur.bezierStartControlPt.x.toFixed(2)},${slur.bezierStartControlPt.y.toFixed(2)})`,
      );
      console.log(
        `  bezierEndPt=(${slur.bezierEndPt.x.toFixed(2)},${slur.bezierEndPt.y.toFixed(2)})` +
        ` bezierEndControlPt=(${slur.bezierEndControlPt.x.toFixed(2)},${slur.bezierEndControlPt.y.toFixed(2)})`,
      );
      // Print individual chord notehead lines
      if (slurStartVE.notes.length > 1) {
        const lines: string[] = [];
        for (const n of slurStartVE.notes) {
          const vn: VexFlowGraphicalNote = n as VexFlowGraphicalNote;
          lines.push(vn.notehead().line.toFixed(1));
        }
        console.log(`  chordStartNoteLines=[${lines.join(",")}]`);
      }

      if (placement === PlacementEnum.Above) {
        if (stemDir === StemDirectionType.Down) {
          const distToNoteTop: number = noteTopY - slurStartY;
          console.log(`  startDistToNoteTop=${distToNoteTop.toFixed(2)}`);
          expect(
            Math.abs(distToNoteTop),
            `slur m${sm}-m${em} Above+Down: far from note top (dist=${distToNoteTop.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        } else {
          const distToVeTop: number = veTopY - slurStartY;
          console.log(`  startDistToVeTop=${distToVeTop.toFixed(2)}`);
          expect(
            Math.abs(distToVeTop),
            `slur m${sm}-m${em} Above+Up: far from stem tip (dist=${distToVeTop.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        }
      } else if (placement === PlacementEnum.Below) {
        if (stemDir === StemDirectionType.Up) {
          const distToNoteBottom: number = slurStartY - noteBottomY;
          console.log(`  startDistToNoteBottom=${distToNoteBottom.toFixed(2)}`);
          expect(
            Math.abs(distToNoteBottom),
            `slur m${sm}-m${em} Below+Up: far from note bottom (dist=${distToNoteBottom.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        } else {
          const distToVeBottom: number = slurStartY - veBottomY;
          console.log(`  startDistToVeBottom=${distToVeBottom.toFixed(2)}`);
          expect(
            Math.abs(distToVeBottom),
            `slur m${sm}-m${em} Below+Down: far from stem tip (dist=${distToVeBottom.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        }
      }

      // --- End note check ---
      const endSE: GraphicalStaffEntry = slur.staffEntries[slur.staffEntries.length - 1];
      const slurEndNote: GraphicalNote = endSE.findGraphicalNoteFromNote(slur.slur.EndNote);
      if (!slurEndNote) {
        continue;
      }
      const slurEndVE: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;
      const endStemDir: StemDirectionType = slurEndVE.parentVoiceEntry.StemDirection;

      const endVeRelY: number = slurEndVE.PositionAndShape.RelativePosition?.y ?? 0;
      const endVeTopY: number = endVeRelY + (slurEndVE.PositionAndShape.BorderTop ?? 0);
      const endVeBottomY: number = endVeRelY + (slurEndVE.PositionAndShape.BorderBottom ?? 0);

      let endNoteStaffY: number = vf5ToOsmdY((slurEndNote as VexFlowGraphicalNote).notehead().line);
      if (slurEndVE.notes.length > 1) {
          if (placement === PlacementEnum.Above) {
              for (const n of slurEndVE.notes) {
                  const ny: number = vf5ToOsmdY((n as VexFlowGraphicalNote).notehead().line);
                  if (ny < endNoteStaffY) { endNoteStaffY = ny; }
              }
          } else {
              for (const n of slurEndVE.notes) {
                  const ny: number = vf5ToOsmdY((n as VexFlowGraphicalNote).notehead().line);
                  if (ny > endNoteStaffY) { endNoteStaffY = ny; }
              }
          }
      }
      const endNoteTopY: number = endNoteStaffY - 0.5;
      const endNoteBottomY: number = endNoteStaffY + 0.5;
      const slurEndY: number = slur.bezierEndPt.y;

      console.log(
        `  END noteStaffY=${endNoteStaffY.toFixed(2)} endNoteTop=${endNoteTopY.toFixed(2)} endNoteBottom=${endNoteBottomY.toFixed(2)}` +
        ` slurEndY=${slurEndY.toFixed(2)} endVeRelY=${endVeRelY.toFixed(2)} endNotesInVE=${slurEndVE.notes.length}` +
        ` endStem=${StemDirectionType[endStemDir]}`,
      );
      if (slurEndVE.notes.length > 1) {
        const lines: string[] = [];
        for (const n of slurEndVE.notes) {
          const vn: VexFlowGraphicalNote = n as VexFlowGraphicalNote;
          lines.push(vn.notehead().line.toFixed(1));
        }
        console.log(`  chordEndNoteLines=[${lines.join(",")}]`);
      }

      if (placement === PlacementEnum.Above) {
        if (endStemDir === StemDirectionType.Down) {
          const distToEndNoteTop: number = endNoteTopY - slurEndY;
          console.log(`  endDistToNoteTop=${distToEndNoteTop.toFixed(2)}`);
          expect(
            Math.abs(distToEndNoteTop),
            `slur m${sm}-m${em} end Above+Down: far from note top (dist=${distToEndNoteTop.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        } else {
          const distToEndVeTop: number = endVeTopY - slurEndY;
          console.log(`  endDistToVeTop=${distToEndVeTop.toFixed(2)}`);
          expect(
            Math.abs(distToEndVeTop),
            `slur m${sm}-m${em} end Above+Up: far from stem tip (dist=${distToEndVeTop.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        }
      } else if (placement === PlacementEnum.Below) {
        if (endStemDir === StemDirectionType.Up) {
          const distToEndNoteBottom: number = slurEndY - endNoteBottomY;
          console.log(`  endDistToNoteBottom=${distToEndNoteBottom.toFixed(2)}`);
          expect(
            Math.abs(distToEndNoteBottom),
            `slur m${sm}-m${em} end Below+Up: far from note bottom (dist=${distToEndNoteBottom.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        } else {
          const distToEndVeBottom: number = slurEndY - endVeBottomY;
          console.log(`  endDistToVeBottom=${distToEndVeBottom.toFixed(2)}`);
          expect(
            Math.abs(distToEndVeBottom),
            `slur m${sm}-m${em} end Below+Down: far from stem tip (dist=${distToEndVeBottom.toFixed(2)}u)`,
          ).to.be.at.most(1.5);
        }
      }
    }
  });
});

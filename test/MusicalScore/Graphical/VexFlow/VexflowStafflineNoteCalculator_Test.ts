import { expect } from "chai";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { AbstractGraphicalExpression } from "../../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { GraphicalInstantaneousDynamicExpression } from "../../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

describe("VexflowStafflineNoteCalculator", () => {
    // #1726: a percussion clef in measure 3 must not reposition the notes of the G clef measures 1-2.
    // Before the fix, A5 and E5 in measure 1 (pitches that also occur under the percussion clef)
    // were remapped to the percussion one-line positions ("cn/3"), like the notes in measure 3.
    it("does not apply percussion note positioning to notes under a non-percussion clef (#1726)", async () => {
        const score: Document = TestUtils.getScore("test_percussion_clef_midpart_earlier_notes_1726.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();

        const vfKeysOfMeasure: (measureIndex: number) => string[] = (measureIndex: number): string[] => {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0];
            const keys: string[] = [];
            for (const staffEntry of measure.staffEntries) {
                for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                    for (const note of voiceEntry.notes) {
                        keys.push((note as VexFlowGraphicalNote).vfpitch[0]);
                    }
                }
            }
            return keys;
        };

        // measure 1 and 2: G clef, notes keep their real pitch positions
        expect(vfKeysOfMeasure(0)).to.deep.equal(["an/5", "gn/5", "fn/5", "en/5"]);
        expect(vfKeysOfMeasure(1)).to.deep.equal(["cn/5"]);
        // measure 3: percussion clef, 2 distinct pitches -> percussion position mapping still applies
        expect(vfKeysOfMeasure(2)).to.deep.equal(["cn/3", "cn/3"]);
    });
});

// Percussion staves whose MusicXML gives <staff-lines>: cowbell (1 line), bongos (2), tom-toms (3), temple blocks (4) with a p below,
//   snare drum (5), a suspended cymbal without <staff-lines>, and two-staff parts of 5 over 1 and 2 over 5 lines.
//   Measure 2 is a whole-measure rest in every part.
//   MusicXML places unpitched notes as in treble clef, E4 on the bottom line. Lines are counted as VexFlow does,
//   from the bottom line of a five-line staff (E4 = 1, G4 = 2, B4 = 3).
describe("Percussion staff lines given in MusicXML", () => {
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        osmd = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        await osmd.load(TestUtils.getScore("test_percussion_explicit_staff_lines.musicxml"));
    });

    /** The VexFlow lines drawn for a staff, from the bottom up */
    function drawnLines(staff: number): number[] {
        const options: { num_lines?: number, line_config?: { visible?: boolean }[] } =
            (osmd.GraphicSheet.MeasureList[0][staff] as VexFlowMeasure).getVFStave().options;
        const lines: number[] = [];
        for (let index: number = 0; index < options.num_lines; index++) {
            if (options.line_config[index]?.visible !== false) {
                lines.push(5 - index);
            }
        }
        return lines.sort();
    }

    /** The VexFlow line of each note (or rest) of a staff in a measure */
    function noteLines(staff: number, measure: number = 0): number[] {
        return osmd.GraphicSheet.MeasureList[measure][staff].staffEntries.map(entry =>
            ((entry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote).vfnote[0] as VF.StaveNote).getKeyProps()[0].line);
    }

    /** Staves with 1 to 4 lines and, for each note, the drawn line it belongs on (0: lowest), from E4, G4, B4 and D5 */
    const linesOfNotes: [number, number[]][] = [
        [0, [0, 0, 0, 0]], [1, [1, 0, 1, 0]], [2, [2, 1, 0, 1]], [3, [3, 2, 1, 0]], // one-staff parts
        [7, [0, 0, 0, 0]], [8, [1, 0, 1, 0]], // the 1-line staff below 5 lines, the 2-line staff above 5 lines
    ];
    function expectNotesOnTheirLines(message: string): void {
        expect(linesOfNotes.map(([staff]) => noteLines(staff)), message).to.deep.equal(
            linesOfNotes.map(([staff, lineIndices]) => lineIndices.map(index => drawnLines(staff)[index])));
    }

    it("keeps the number of lines given in MusicXML, and draws a staff without it and few note positions on one line", () => {
        osmd.render();
        expect([0, 1, 2, 3, 4, 6, 7, 8, 9].map(staff => drawnLines(staff).length), "the given lines")
            .to.deep.equal([1, 2, 3, 4, 5, 5, 1, 2, 5]);
        expect(drawnLines(5), "the suspended cymbal (no <staff-lines>) on one line").to.deep.equal([3]);
    });

    it("puts E4 on the bottom line of 1-4 line staves, by the lines of the note's own staff", () => {
        osmd.render();
        expectNotesOnTheirLines("E4, G4, B4 and D5 on the first to fourth drawn line");
        expect([6, 9].map(staff => noteLines(staff)), "the five-line staves of the two-staff parts keep their positions (C5, F4)")
            .to.deep.equal([[3.5, 1.5, 3.5, 1.5], [1.5, 3.5, 1.5, 3.5]]);
    });

    it("places a dynamic below a 2-4 line staff below its lowest line, and hangs a whole-measure rest from one of its lines", () => {
        osmd.render();
        for (const staff of [1, 2, 3]) {
            expect(drawnLines(staff), `the whole-measure rest of the ${drawnLines(staff).length}-line staff hangs from a drawn line`)
                .to.include(noteLines(staff, 1)[0]);
            const staffLine: StaffLine = osmd.GraphicSheet.MeasureList[0][staff].ParentStaffLine;
            const dynamic: AbstractGraphicalExpression = staffLine.AbstractExpressions.find(
                expression => expression instanceof GraphicalInstantaneousDynamicExpression);
            // 2-4 lines end at G4, 3 spaces below the top line of a five-line staff (see VexFlowMeasure.setLineNumber())
            const lowestLineY: number = staffLine.PositionAndShape.AbsolutePosition.y + 3;
            expect(dynamic.PositionAndShape.AbsolutePosition.y + dynamic.PositionAndShape.BorderTop,
                `the top of the p below the ${drawnLines(staff).length}-line staff`).to.be.at.least(lowestLineY);
        }
    });

    it("draws a staff that the cutoff drew on one line on five lines again after setting PercussionOneLineCutoff to 0", () => {
        osmd.render();
        expect(drawnLines(5).length, "the suspended cymbal on one line").to.equal(1);
        osmd.setOptions({ percussionOneLineCutoff: 0 });
        osmd.updateGraphic();
        osmd.render();
        expect(drawnLines(5).length, "the suspended cymbal is drawn on five lines again").to.equal(5);
    });
});

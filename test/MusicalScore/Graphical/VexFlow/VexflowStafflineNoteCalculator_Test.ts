import { expect } from "chai";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { AbstractGraphicalExpression } from "../../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { GraphicalInstantaneousDynamicExpression } from "../../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

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

// Percussion staves: tom-toms (3 lines), temple blocks (4), a cymbal without <staff-lines>, and two-staff parts of 5 over 1 and 2 over 5 lines.
//   The 2-4 line staves have a p below them; the two-staff parts also check the 1- and 5-line cases.
//   Measure 2 is a whole-measure rest in every part.
//   MusicXML places unpitched notes as in treble clef, E4 on the bottom line. Positions are in spaces below the top line
//   of a five-line staff (F5 = 0, B4 = 2, E4 = 4), like StaffLine.TopLineOffset: 2-4 lines end at G4 (3), see VexFlowMeasure.setLineNumber().
describe("Percussion staff lines given in MusicXML", () => {
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        osmd = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        await osmd.load(TestUtils.getScore("test_percussion_explicit_staff_lines.musicxml"));
    });

    function lineCounts(): number[] {
        return osmd.GraphicSheet.MeasureList[0].map(measure => measure.ParentStaff.StafflineCount);
    }

    /** The position of a box on a staff, in spaces below the top line of a five-line staff */
    function positionOnStaff(box: BoundingBox, staff: number): number {
        return box.AbsolutePosition.y - osmd.GraphicSheet.MeasureList[0][staff].ParentStaffLine.PositionAndShape.AbsolutePosition.y;
    }

    /** The positions of the notes of a staff in measure 1 */
    function notePositions(staff: number): number[] {
        return osmd.GraphicSheet.MeasureList[0][staff].staffEntries.map(entry =>
            positionOnStaff(entry.graphicalVoiceEntries[0].notes[0].PositionAndShape, staff));
    }

    it("keeps the given staff lines and positions, and takes changed rules with updateGraphic()", () => {
        osmd.render();
        expect(lineCounts(), "the given lines, and the suspended cymbal (no <staff-lines>) on one line").to.deep.equal([3, 4, 1, 5, 1, 2, 5]);
        // the lines of a 3-line staff are at 1, 2 and 3, those of a 4-line staff at 0 to 3, a 2-line staff at 2 and 3, and a 1-line staff at 2
        expect([0, 1, 4, 5].map(notePositions), "E4, G4, B4 and D5 on the first to fourth line from the bottom")
            .to.deep.equal([[1, 2, 3], [0, 1, 2, 3], [2], [2, 3]]);
        expect([3, 6].map(notePositions), "the five-line staves of the two-staff parts keep their positions (C5, F4)")
            .to.deep.equal([[1.5, 3.5], [3.5, 1.5]]);
        const rest: BoundingBox = osmd.GraphicSheet.MeasureList[1][5].staffEntries[0].graphicalVoiceEntries[0].PositionAndShape;
        expect(positionOnStaff(rest, 5) + rest.BorderBottom, "the whole-measure rest of the 2-line staff isn't above it").to.be.above(2);
        for (const staff of [0, 1, 5]) {
            const dynamic: AbstractGraphicalExpression = osmd.GraphicSheet.MeasureList[0][staff].ParentStaffLine.AbstractExpressions.find(
                expression => expression instanceof GraphicalInstantaneousDynamicExpression);
            expect(positionOnStaff(dynamic.PositionAndShape, staff) + dynamic.PositionAndShape.BorderTop,
                `the top of the p below the ${lineCounts()[staff]}-line staff`).to.be.at.least(3);
        }
        osmd.EngravingRules.PercussionKeepXMLStafflineCount = false;
        osmd.updateGraphic();
        osmd.render();
        expect(lineCounts(), "the cutoff also draws the staves with <staff-lines> and fewer than 3 note positions on one line")
            .to.deep.equal([3, 4, 1, 1, 1, 1, 1]);
        osmd.EngravingRules.PercussionKeepXMLStafflineCount = true;
        osmd.setOptions({ percussionOneLineCutoff: 0 });
        osmd.updateGraphic();
        osmd.render();
        expect(lineCounts(), "the given lines again, and the suspended cymbal on five lines").to.deep.equal([3, 4, 5, 5, 1, 2, 5]);
    });
});

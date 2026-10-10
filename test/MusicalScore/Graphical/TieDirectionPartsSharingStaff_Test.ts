import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * Where two parts share a staff, a tie curves on its stem side, away from the other part: upwards in the upper part,
 * downwards in the lower (#1141). Without a direction from the MusicXML, Vexflow curved it away from the stem, so a tie in
 * the upper part curved down into the lower part, and one in a lower part not numbered 2 or 6 curved up into the upper part.
 * test_tie_direction_parts_sharing_staff_traumerei_measure12:
 *   m.1: Schumann's Träumerei m.12, right hand: the tie of the stem-up D4 (voice 1) passes the C4 of voice 2 moved aside,
 *        and curved down under it, where it read as a tie from the C4 to the Bb3.
 *   m.2: a tie in a lower part with stems down, voice 4 under voice 3.
 *   m.3: a single voice, whose tie keeps curving away from the stem.
 */
describe("Tie direction of parts sharing a staff", () => {
    let osmd: OpenSheetMusicDisplay;
    before(async () => {
        osmd = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        await osmd.load(TestUtils.getScore("test_tie_direction_parts_sharing_staff_traumerei_measure12.musicxml"));
        osmd.render();
    });

    /** The note in the measure where a tie starts (there is one in each measure of the sample). */
    function tieStartNote(measureIndex: number): VexFlowGraphicalNote {
        for (const staffEntry of osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries as GraphicalStaffEntry[]) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    if (note.sourceNote.NoteTie?.StartNote === note.sourceNote) {
                        return note as VexFlowGraphicalNote;
                    }
                }
            }
        }
        return undefined;
    }

    /** The vertical middle of an SVG element, in SVG coordinates (y down). */
    function middleY(element: HTMLElement): number {
        const box: DOMRect = (element as unknown as SVGGraphicsElement).getBBox();
        return box.y + box.height / 2;
    }

    for (const [measureIndex, expected, description] of [
        [0, PlacementEnum.Above, "the upper part's tie (voice 1, stem up) curves up, away from the lower part"],
        [1, PlacementEnum.Below, "the lower part's tie (voice 4, stem down) curves down, away from the upper part"],
    ] as [number, PlacementEnum, string][]) {
        it(description, () => {
            const note: VexFlowGraphicalNote = tieStartNote(measureIndex);
            expect(note.sourceNote.NoteTie.TieDirection).to.equal(expected);
            const ties: HTMLElement[] = note.getTieSVGs();
            expect(ties.length, "the tie is drawn").to.equal(1);
            const tieY: number = middleY(ties[0]);
            const headY: number = middleY(note.getNoteheadSVGs()[0]);
            if (expected === PlacementEnum.Above) {
                expect(tieY, "tie above the note head").to.be.below(headY);
            } else {
                expect(tieY, "tie below the note head").to.be.above(headY);
            }
        });
    }

    it("leaves the tie of a single voice to Vexflow, which curves it away from the stem", () => {
        const note: VexFlowGraphicalNote = tieStartNote(2);
        expect(note.sourceNote.NoteTie.TieDirection).to.equal(PlacementEnum.NotYetDefined);
        const ties: HTMLElement[] = note.getTieSVGs();
        expect(ties.length, "the tie is drawn").to.equal(1);
        expect(middleY(ties[0]), "tie below the stem-up note's head").to.be.above(middleY(note.getNoteheadSVGs()[0]));
    });
});

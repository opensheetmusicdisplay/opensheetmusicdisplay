import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A voice numbered 2 or 6 (the second voice of a right or left hand) has its ties below only where another voice is drawn
 * in the measure on the staff. Alone, e.g. a left hand numbered 6 or voice 2 in a measure without voice 1, its ties curve
 * away from the stem like those of any single voice: they were all below, under the stem of a stem-down note.
 * test_tie_direction_lone_second_voice, each tie between two notes of the same pitch, from a stem-down note in m.2:
 *   staff 0: one staff, only voice 2.
 *   staff 4: the left hand of a piano, only voice 6 (staff 2: the same with voice 2).
 *   staff 5: m.1 voices 1 and 2, m.2 only voice 2, m.3 a whole rest in voice 1 above voice 2.
 */
describe("Tie direction of a lone second voice", () => {
    let osmd: OpenSheetMusicDisplay;
    beforeAll(async () => {
        osmd = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        await osmd.load(TestUtils.getScore("test_tie_direction_lone_second_voice.musicxml"));
        osmd.render();
    });

    /** The note of the given voice in the measure on the staff where a tie starts (the first one). */
    function tieStartNote(measureIndex: number, staffIndex: number, voiceId: number): VexFlowGraphicalNote {
        for (const staffEntry of osmd.GraphicSheet.MeasureList[measureIndex][staffIndex].staffEntries as GraphicalStaffEntry[]) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    if (note.sourceNote.NoteTie?.StartNote === note.sourceNote && voiceEntry.parentVoiceEntry.ParentVoice.VoiceId === voiceId) {
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

    /** Checks the tie's direction and that it is drawn on that side of the note head. */
    function expectTie(note: VexFlowGraphicalNote, direction: PlacementEnum, drawnAbove: boolean): void {
        expect(note, "tie start note").to.not.equal(undefined);
        expect(note.sourceNote.NoteTie.TieDirection).to.equal(direction);
        const ties: HTMLElement[] = note.getTieSVGs();
        expect(ties.length, "the tie is drawn").to.equal(1);
        const tieY: number = middleY(ties[0]);
        const headY: number = middleY(note.getNoteheadSVGs()[0]);
        if (drawnAbove) {
            expect(tieY, "tie above the note head").to.be.below(headY);
        } else {
            expect(tieY, "tie below the note head").to.be.above(headY);
        }
    }

    for (const [staffIndex, voiceId, description] of [
        [0, 2, "a staff whose only voice is 2"],
        [4, 6, "a left hand whose only voice is 6"],
        [5, 2, "voice 2 in a measure without voice 1"],
    ] as [number, number, string][]) {
        it(`curves the tie of a stem-down note away from the stem in ${description}`, () => {
            expectTie(tieStartNote(1, staffIndex, voiceId), PlacementEnum.NotYetDefined, true);
        });
    }

    it("keeps voice 2's ties below where voice 1 has notes or a rest in the measure", () => {
        expectTie(tieStartNote(0, 5, 1), PlacementEnum.Above, true);
        expectTie(tieStartNote(0, 5, 2), PlacementEnum.Below, false);
        expectTie(tieStartNote(2, 5, 2), PlacementEnum.Below, false);
    });
});

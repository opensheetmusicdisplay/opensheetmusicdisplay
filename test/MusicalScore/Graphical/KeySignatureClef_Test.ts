import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * A key signature's accidentals are placed by the clef of the measure's VexFlow stave. The courtesy key signature at the
 * end of a system (before a key change at the next system's start) is drawn in an extra measure without a clef, so on every
 * staff it was drawn at the treble clef's heights, e.g. on a bass staff. So was a key change right after a clef change at
 * the end of the previous measure: its stave had the clef from before the change.
 * test_key_signature_courtesy_clefs.musicxml: viola (alto clef) and piano, D major, B-flat major from the second system on
 * (newSystemFromXML), A major in measure 5, where the left hand changes to the treble clef.
 */
describe("Key signature accidentals in the staff's clef", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(TestUtils.getScore("test_key_signature_courtesy_clefs.musicxml"));
        osmd.render();
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The tops of the accidentals of the key signature drawn in the measure (SVG), in staff spaces below the top staff line. */
    function keyAccidentalTops(measure: GraphicalMeasure, staffLine: StaffLine): number[] {
        const staffTop: number = staffLine.PositionAndShape.AbsolutePosition.y;
        const left: number = measure.PositionAndShape.AbsolutePosition.x;
        const right: number = left + measure.PositionAndShape.Size.width;
        const keys: SVGGElement[] = Array.from(container.querySelectorAll<SVGGElement>("g.vf-keysignature")).filter(key => {
            const box: DOMRect = key.getBBox();
            const centerX: number = (box.x + box.width / 2) / 10; // in units
            const centerY: number = (box.y + box.height / 2) / 10;
            return centerX > left && centerX < right && centerY > staffTop - 1 && centerY < staffTop + 5;
        });
        expect(keys.length, "one key signature in the measure").to.equal(1);
        return Array.from(keys[0].querySelectorAll("path")).map(path => path.getBBox().y / 10 - staffTop);
    }

    /** Expects each accidental to be `shift` staff spaces lower than the same accidental of the reference key signature. */
    function expectShifted(tops: number[], referenceTops: number[], shift: number, message: string): void {
        expect(tops.length, message).to.equal(referenceTops.length);
        tops.forEach((top, index) => expect(top - referenceTops[index], `${message}, accidental ${index + 1}`).to.be.closeTo(shift, 0.01));
    }

    it("draws the courtesy key at a system end at the heights of the staff's clef", () => {
        const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        const [alto, treble, bass] = staffLines.map(staffLine => {
            const lastMeasure: GraphicalMeasure = staffLine.Measures[staffLine.Measures.length - 1];
            expect(lastMeasure.IsExtraGraphicalMeasure, "the courtesy key's measure ends the system").to.equal(true);
            return keyAccidentalTops(lastMeasure, staffLine);
        });
        expect(treble.length, "naturals for F sharp and C sharp, then B flat and E flat").to.equal(4);
        expectShifted(alto, treble, 0.5, "alto clef: half a staff space lower than in the treble clef");
        expectShifted(bass, treble, 1, "bass clef: one staff space lower than in the treble clef");
    });

    it("draws a key change right after a clef change at the heights of the new clef", () => {
        const [, rightHand, leftHand] = osmd.GraphicSheet.MeasureList[4].map(measure => keyAccidentalTops(measure, measure.ParentStaffLine));
        expect(rightHand.length, "naturals for B flat and E flat, then F sharp, C sharp and G sharp").to.equal(5);
        expectShifted(leftHand, rightHand, 0, "left hand changed to the treble clef: at the right hand's heights");
    });
});

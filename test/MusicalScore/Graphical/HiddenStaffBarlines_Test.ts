import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { SystemLine } from "../../../src/MusicalScore/Graphical/SystemLine";
import { SystemLinesEnum } from "../../../src/MusicalScore/Graphical/SystemLinesEnum";
import { SystemLinePosition } from "../../../src/MusicalScore/Graphical/SystemLinePosition";

/**
 * With the first staff of a multi-staff instrument hidden (Staff.Visible = false, e.g. "left hand only" for a piano, #1599),
 * the instrument's remaining staves lost their barline types: the final barline, the double barline before a key change and
 * repeat barlines were drawn as single thin lines. MusicSystem.createVerticalLineForMeasure() created an instrument's
 * barlines (SystemLine) only for the staff line of its first staff, which doesn't exist while that staff is hidden.
 */
describe("Barlines of the staves with a hidden staff of their instrument (#1599)", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1000px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
        osmd.setOptions({ newSystemFromXML: true });
    });

    afterEach(() => {
        osmd.clear();
        div.remove();
    });

    function systems(): MusicSystem[] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems);
    }

    /** The barlines of the measures of the given staff (index in the sheet) that aren't single thin lines,
     *  as "m.<number> <begin|end>: <type>". Only an instrument's top staff line has barlines (they reach down to its bottom one). */
    function barlines(staffIndex: number): string[] {
        return systems().flatMap(system => system.SystemLines)
            .filter((line: SystemLine) => line.lineType !== SystemLinesEnum.SingleThin &&
                line.topMeasure.ParentStaff.idInMusicSheet === staffIndex)
            .map((line: SystemLine) => `m.${line.topMeasure.MeasureNumber} ` +
                `${line.linePosition === SystemLinePosition.MeasureBegin ? "begin" : "end"}: ${SystemLinesEnum[line.lineType]}`);
    }

    /** The number of measure end barlines of the given staff (index in the sheet), of any type. */
    function endBarlineCount(staffIndex: number): number {
        return systems().flatMap(system => system.SystemLines)
            .filter((line: SystemLine) => line.linePosition === SystemLinePosition.MeasureEnd &&
                line.topMeasure.ParentStaff.idInMusicSheet === staffIndex).length;
    }

    describe("piano and violin, key change after m.3, final barline after m.6", () => {
        /** Piano (staves 0 and 1) and violin (staff 2), new-system at m.4. m.1-3: D major, 3/4. m.4-6: B-flat major, 2/4. */
        const sampleFilename: string = "test_hidden_staff_clef_key_time.musicxml";
        /** m.-1 is the extra measure at the end of system 1 with the courtesy key and time signature, which has no end barline. */
        const keyChangeAndFinalBarline: string[] = ["m.3 end: DoubleThin", "m.-1 end: None", "m.6 end: ThinBold"];

        it("gives the left hand the double and the final barline when the right hand is hidden", async () => {
            await osmd.load(TestUtils.getScore(sampleFilename));
            osmd.render();
            expect(barlines(0), "all staves shown: piano").to.deep.equal(keyChangeAndFinalBarline);
            expect(barlines(2), "all staves shown: violin").to.deep.equal(keyChangeAndFinalBarline);

            osmd.Sheet.Instruments[0].Staves[0].Visible = false;
            osmd.render();
            expect(barlines(1), "left hand only: left hand").to.deep.equal(keyChangeAndFinalBarline);
            expect(barlines(2), "left hand only: violin").to.deep.equal(keyChangeAndFinalBarline);
            expect(endBarlineCount(1), "left hand only: one end barline per measure of the left hand, with the courtesy measure").to.equal(7);
            expect(endBarlineCount(0), "left hand only: no barlines for the hidden right hand").to.equal(0);
        });

        it("keeps the right hand's double and final barline when the left hand is hidden", async () => {
            await osmd.load(TestUtils.getScore(sampleFilename));
            osmd.Sheet.Instruments[0].Staves[1].Visible = false;
            osmd.render();
            expect(barlines(0), "right hand only: right hand").to.deep.equal(keyChangeAndFinalBarline);
            expect(barlines(2), "right hand only: violin").to.deep.equal(keyChangeAndFinalBarline);
            expect(endBarlineCount(1), "right hand only: no barlines for the hidden left hand").to.equal(0);
        });
    });

    it("gives the left hand the repeat barlines when the right hand is hidden", async () => {
        await osmd.load(TestUtils.getScore("test_drawFromMeasureNumber_9_respect_earlier_clef_changes.musicxml"));
        osmd.render();
        const allStavesBarlines: string[] = barlines(0);
        expect(allStavesBarlines.some(barline => barline.endsWith("begin: BoldThinDots")), "the sample has a repeat start").to.equal(true);

        osmd.Sheet.Instruments[0].Staves[0].Visible = false;
        osmd.render();
        expect(barlines(1), "left hand only").to.deep.equal(allStavesBarlines);
    });
});

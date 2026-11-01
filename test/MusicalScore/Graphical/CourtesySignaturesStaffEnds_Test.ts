import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

/**
 * The courtesy key and time signatures at the end of a system, for a change at the start of the next system, are drawn in an
 * extra measure per staff. Each staff's extra measure was as wide as its own signatures, so the staves of the system ended at
 * different x when the signatures differed in width, a staff without a change ended at the barline, and each courtesy time
 * signature followed its own staff's key signature, while the time signatures at the start of a system align.
 * test_courtesy_signatures_staff_ends.musicxml: flute, clarinet in B flat and horn in F (without key signature), systems as in the
 * file (newSystemFromXML). The first system ends with courtesy keys of 2 sharps (flute) and 4 sharps (clarinet), none for the horn,
 * and 3/4 in all staves, the second one with courtesy time signatures 3+2+2/8 (flute) and 7/8 (clarinet, horn).
 */
describe("Courtesy signatures at a system end", () => {
    /** The horizontal extents [left, right] in units of the signatures of the class (e.g. "vf-keysignature") drawn in the measure (SVG). */
    function drawnSignatures(container: HTMLElement, measure: GraphicalMeasure, signatureClass: string): number[][] {
        const left: number = measure.PositionAndShape.AbsolutePosition.x;
        const right: number = left + measure.PositionAndShape.Size.width;
        const staffTop: number = measure.ParentStaffLine.PositionAndShape.AbsolutePosition.y;
        return Array.from(container.querySelectorAll<SVGGElement>(`g.${signatureClass}`))
            .map(signature => signature.getBBox())
            .filter(box => {
                const centerX: number = (box.x + box.width / 2) / 10; // in units
                const centerY: number = (box.y + box.height / 2) / 10;
                return centerX > left && centerX < right && centerY > staffTop - 1 && centerY < staffTop + 5;
            })
            .map(box => [box.x / 10, (box.x + box.width) / 10]);
    }

    it("ends all staves at the same x after the widest courtesy signatures, with the keys at the start and the time signatures aligned", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1000px";
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        try {
            osmd.setOptions({ newSystemFromXML: true });
            await osmd.load(TestUtils.getScore("test_courtesy_signatures_staff_ends.musicxml"));
            osmd.render();
            const systems: MusicSystem[] = osmd.GraphicSheet.MusicPages[0].MusicSystems;
            expect(systems.length, "systems as in the file").to.equal(3);
            // [system index, number of courtesy key signatures per staff, number of courtesy time signatures per staff]
            const systemEnds: [number, number[], number[]][] = [[0, [1, 1, 0], [1, 1, 1]], [1, [0, 0, 0], [1, 1, 1]]];
            for (const [systemIndex, keyCounts, timeCounts] of systemEnds) {
                const message: string = `system ${systemIndex + 1}`;
                const lastMeasures: GraphicalMeasure[] = systems[systemIndex].StaffLines.map(staffLine => staffLine.Measures[staffLine.Measures.length - 1]);
                expect(lastMeasures.map(measure => measure.IsExtraGraphicalMeasure), `${message}: every staff ends with an extra measure`)
                    .to.deep.equal([true, true, true]);
                const ends: number[] = lastMeasures.map(measure => measure.PositionAndShape.AbsolutePosition.x + measure.PositionAndShape.Size.width);
                ends.forEach((end, staffIndex) => expect(end, `${message}, staff ${staffIndex + 1}: end x`).to.be.closeTo(ends[0], 0.001));

                const keys: number[][][] = lastMeasures.map(measure => drawnSignatures(container, measure, "vf-keysignature"));
                const times: number[][][] = lastMeasures.map(measure => drawnSignatures(container, measure, "vf-timesignature"));
                expect(keys.map(staffKeys => staffKeys.length), `${message}: courtesy key signatures`).to.deep.equal(keyCounts);
                expect(times.map(staffTimes => staffTimes.length), `${message}: courtesy time signatures`).to.deep.equal(timeCounts);
                keys.forEach((staffKeys, staffIndex) => staffKeys.forEach(([left]) => {
                    const measureStart: number = lastMeasures[staffIndex].PositionAndShape.AbsolutePosition.x;
                    expect(left - measureStart, `${message}, staff ${staffIndex + 1}: key signature at the start of the extra measure`)
                        .to.be.within(0, 2);
                }));
                // the time signatures align, after the widest key signature (in the first system the clarinet's)
                const timeLefts: number[] = times.map(staffTimes => staffTimes[0][0]);
                timeLefts.forEach((left, staffIndex) => expect(left, `${message}, staff ${staffIndex + 1}: time signature left x`)
                    .to.be.closeTo(timeLefts[0], 0.01));
                // (with some space after them: 2 units after the time signatures here, including the end barline's width)
                const rights: number[] = [];
                keys.concat(times).forEach(staffSignatures => staffSignatures.forEach(([, right]) => rights.push(right)));
                const widestRight: number = Math.max(...rights);
                expect(ends[0], `${message}: staves end after the widest courtesy signatures`).to.be.within(widestRight, widestRight + 3);
            }
        } finally {
            osmd.clear();
            container.remove();
        }
    });
});

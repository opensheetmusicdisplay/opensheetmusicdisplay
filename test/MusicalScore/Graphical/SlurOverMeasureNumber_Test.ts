import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";

/**
 * A slur above the staff that runs into a measure number goes over it, and the number stays above its barline (see
 * GraphicalSlur.retryPastMeasureNumbers()). The slurs ignore the measure numbers (which are added to the sky line after the
 * slurs), and the numbers are placed before the slurs, so nothing kept them apart.
 * test_slurs_long_steep_arc_flattening_chopin: the long slur from m. 1 to m. 5 comes down to its end note right after the
 * number "5" of the end note's measure, and ran 0.2 units into the number. It passes high over the number "3".
 */
describe("Slur running into a measure number", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1440px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slurs_long_steep_arc_flattening_chopin.musicxml"));
    });

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`goes over the number it ran into, which stays above the barline (${skyline})`, () => {
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            osmd.render();
            const system: MusicSystem = osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
            const staffLine: StaffLine = system.StaffLines[0];
            const slur: GraphicalSlur = staffLine.GraphicalSlurs.find((s: GraphicalSlur) => s.staffEntries[0].parentMeasure.MeasureNumber === 1);
            expect(slur.placement).to.equal(PlacementEnum.Above);
            expect(slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber).to.equal(5);
            /** The number's box relative to the staffline, and the curve's highest and lowest y over it. */
            function measure(text: string): {y: number, top: number, curve: {top: number, bottom: number}} {
                const label: GraphicalLabel = system.MeasureNumberLabels.find((l: GraphicalLabel) => l.Label.text === text);
                const box: BoundingBox = label.PositionAndShape;
                const x: number = box.RelativePosition.x - staffLine.PositionAndShape.RelativePosition.x;
                return {y: box.RelativePosition.y, top: box.RelativePosition.y + box.BorderTop,
                        curve: slur.getYRangeBetween(x + box.BorderLeft, x + box.BorderRight)};
            }
            // negative y is up. Before the fix, the curve went down to -1.30 over the "5", whose top was at -1.50.
            const five: {y: number, top: number, curve: {top: number, bottom: number}} = measure("5");
            expect(five.y, "the 5 on the staff, above its barline").to.equal(0);
            expect(five.curve, "the slur passes the 5").to.not.equal(undefined);
            // (give or take clearObstacles()' sampling of the sky line)
            expect(five.curve.bottom, "the slur over the 5").to.be.at.most(five.top + 0.05);
            // the slur passed high over the "3" anyway
            const three: {y: number, top: number, curve: {top: number, bottom: number}} = measure("3");
            expect(three.y, "the 3 on the staff").to.equal(0);
            expect(three.curve.bottom, "the slur over the 3").to.be.below(three.top - 3);
        });
    }
});

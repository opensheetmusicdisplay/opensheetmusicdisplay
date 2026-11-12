import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";

/**
 * Close dynamics of a staff line are aligned at one height, that of the one farthest from the staff
 * (AlignmentManager.alignDynamicExpressions()).
 */
describe("Dynamics alignment", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** The y positions of the drawn instantaneous dynamics (p, mf, ...) by their text. */
    function dynamicYs(osmd: OpenSheetMusicDisplay): Map<string, number> {
        const ys: Map<string, number> = new Map<string, number>();
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const expression of staffLine.AbstractExpressions) {
                    if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                        ys.set(expression.Label.Label.text, expression.PositionAndShape.AbsolutePosition.y);
                    }
                }
            }
        }
        return ys;
    }

    it("aligns close dynamics exactly, above and below the staff (they moved only 80 % of the way)", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_dynamics_alignment_placement_change.musicxml"));
        osmd.render();
        const ys: Map<string, number> = dynamicYs(osmd);
        // above the staff, the p moves up to the mf above a C6; below it, the ff moves down to the f
        expect(ys.get("p"), "p at the height of the mf").to.be.closeTo(ys.get("mf"), 1e-6);
        expect(ys.get("ff"), "ff at the height of the f").to.be.closeTo(ys.get("f"), 1e-6);
    });

    it("points a wedge at the middle of the letters of a dynamic next to it, whichever of the two moved", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("OSMD_function_test_expressions_overlap.musicxml"));
        osmd.render();
        const dynamics: GraphicalInstantaneousDynamicExpression[] = [];
        const wedges: GraphicalContinuousDynamicExpression[] = [];
        for (const expression of osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].AbstractExpressions) {
            if (expression instanceof GraphicalInstantaneousDynamicExpression) {
                dynamics.push(expression);
            } else if (expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal) {
                wedges.push(expression);
            }
        }
        /** How far the center of the wedge right after the dynamic is below the dynamic's center. */
        function wedgeBelowDynamic(dynamic: GraphicalInstantaneousDynamicExpression): number {
            const x: number = dynamic.PositionAndShape.AbsolutePosition.x;
            const wedge: GraphicalContinuousDynamicExpression = wedges.filter(w => w.PositionAndShape.AbsolutePosition.x > x)
                .sort((a, b) => a.PositionAndShape.AbsolutePosition.x - b.PositionAndShape.AbsolutePosition.x)[0];
            return wedge.PositionAndShape.AbsolutePosition.y - dynamic.PositionAndShape.AbsolutePosition.y;
        }
        // measure 1: the ppp moves down to the crescendo after it; measure 2: the crescendo moves down to the pp and sff around it
        const ppp: GraphicalInstantaneousDynamicExpression = dynamics.find(d => d.Label.Label.text === "ppp");
        const pp: GraphicalInstantaneousDynamicExpression = dynamics.find(d => d.Label.Label.text === "pp");
        const offset: number = wedgeBelowDynamic(ppp);
        expect(wedgeBelowDynamic(pp), "wedge at the same place next to the pp as next to the ppp").to.be.closeTo(offset, 1e-6);
        // the center of a text's box is 0.3 half heights below the top of its lowercase letters, its baseline 0.6 half heights below the center
        const halfHeight: number = ppp.PositionAndShape.BorderBottom;
        expect(offset, "wedge below the top of the ppp's letters").to.be.greaterThan(0.1 * halfHeight);
        expect(offset, "wedge above the ppp's baseline").to.be.lessThan(0.6 * halfHeight);
    });

    /** The dynamic with the given text in the given measure, and the top of the highest note head at its x. */
    function dynamicAndNoteTop(osmd: OpenSheetMusicDisplay, text: string, measureNumber: number):
        { dynamic: GraphicalInstantaneousDynamicExpression, noteTop: number } {
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const dynamic: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions.find(
            (expression): boolean => expression instanceof GraphicalInstantaneousDynamicExpression &&
                expression.Label.Label.text === text && expression.SourceExpression.parentMeasure.MeasureNumber === measureNumber
        ) as GraphicalInstantaneousDynamicExpression;
        const box: BoundingBox = dynamic.PositionAndShape;
        let noteTop: number = Number.MAX_VALUE;
        for (const measure of staffLine.Measures) {
            for (const staffEntry of measure.staffEntries) {
                for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                    for (const note of voiceEntry.notes) {
                        const noteBox: BoundingBox = note.PositionAndShape;
                        if (noteBox.AbsolutePosition.x + noteBox.BorderLeft < box.AbsolutePosition.x + box.BorderRight &&
                            noteBox.AbsolutePosition.x + noteBox.BorderRight > box.AbsolutePosition.x + box.BorderLeft) {
                            noteTop = Math.min(noteTop, noteBox.AbsolutePosition.y + noteBox.BorderTop);
                        }
                    }
                }
            }
        }
        return { dynamic, noteTop };
    }

    it("draws a dynamic above a note with its text in its box, so that the descender of an f doesn't reach the note head", async () => {
        const cases: [string, string, number][] = [
            ["test_dynamics_alignment_placement_change.musicxml", "mf", 1], // above a C6
            ["test_dynamics_alignment_verbal.musicxml", "ff", 3], // above an E5
        ];
        for (const [sample, text, measureNumber] of cases) {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmd.load(TestUtils.getScore(sample));
            osmd.render();
            const { dynamic, noteTop } = dynamicAndNoteTop(osmd, text, measureNumber);
            const label: GraphicalLabel = dynamic.Label;
            const fontHeight: number = label.Label.fontHeight;
            // the drawn text: SVG's text y is the baseline (in pixels, 10 per unit), and an f reaches 0.2 font heights below it
            const svgText: SVGTextElement = (label.SVGNode as SVGGElement).querySelector("text");
            const drawnBaseline: number = Number(svgText.getAttribute("y")) / 10;
            const boxBottom: number = label.PositionAndShape.AbsolutePosition.y + label.PositionAndShape.BorderBottom;
            expect(drawnBaseline, `${sample}: baseline where the calculator expects it`).to.be.closeTo(
                label.PositionAndShape.AbsolutePosition.y + MusicSheetCalculator.labelBaselineOffset(label), 0.01);
            expect(drawnBaseline + 0.2 * fontHeight, `${sample}: the ${text}'s descender in its box`).to.be.at.most(boxBottom + 0.01);
            expect(noteTop, `${sample}: a note head under the ${text}`).to.be.lessThan(Number.MAX_VALUE);
            expect(boxBottom, `${sample}: the ${text}'s box above the note head`).to.be.at.most(noteTop + 0.05);
        }
    });
});

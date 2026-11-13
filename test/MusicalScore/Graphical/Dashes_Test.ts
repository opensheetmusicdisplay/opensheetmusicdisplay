import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Dashes } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Dashes";
import { ContinuousDynamicExpression } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { AbstractTempoExpression } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractTempoExpression";
import { UnknownExpression } from "../../../src/MusicalScore/VoiceData/Expressions/UnknownExpression";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { GraphicalDashes } from "../../../src/MusicalScore/Graphical/GraphicalDashes";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";

/**
 * The dashed line that extends a text up to where it stops applying, e.g. "cresc. - - - -" (MusicXML `<dashes>`):
 * read by the ExpressionReader into Dashes, drawn as GraphicalDashes (MusicSheetCalculator.calculateDashedLinesAfterTexts()).
 * The sample has three systems of four measures with newSystemFromXML:
 * cresc. (below, measures 1-2, up to the f), dim. (above, measures 3-4), cresc. (below, measure 5 to 9, over the system
 * break, past low notes), "poco a poco animando" (above, measure 10) and rit. (a tempo word, above, measures 11-12).
 */
describe("Dashes after a text (cresc. - - - -)", () => {
    const sample: string = "test_dashes_cresc_dim_tempo_system_break.musicxml";
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function renderSample(score: Document = TestUtils.getScore(sample), renderDashes: boolean = true): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        osmd.EngravingRules.RenderDashes = renderDashes;
        await osmd.load(score);
        osmd.render();
        return osmd;
    }

    /** The text of the expression a line follows. */
    function textOf(dashes: Dashes): string {
        return (dashes.TextExpression as ContinuousDynamicExpression | AbstractTempoExpression | UnknownExpression).Label;
    }

    /** The lines read, in the order of their start. */
    function readDashes(osmd: OpenSheetMusicDisplay): Dashes[] {
        const allDashes: Dashes[] = [];
        for (const measure of osmd.Sheet.SourceMeasures) {
            for (const multiExpression of measure.StaffLinkedExpressions[0]) {
                for (const entry of multiExpression.EntriesList) {
                    if (entry.expression.Dashes) {
                        allDashes.push(entry.expression.Dashes);
                    }
                }
            }
            for (const multiTempoExpression of measure.TempoExpressions) {
                for (const entry of multiTempoExpression.EntriesList) {
                    if (entry.Expression.Dashes) {
                        allDashes.push(entry.Expression.Dashes);
                    }
                }
            }
        }
        return allDashes;
    }

    /** The drawn parts of the lines, system by system. */
    function drawnParts(osmd: OpenSheetMusicDisplay): GraphicalDashes[] {
        const parts: GraphicalDashes[] = [];
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            parts.push(...system.StaffLines[0].Dashes);
        }
        return parts;
    }

    /** The x position of the staff entry at a beat (1-8, in eighths) of a measure, relative to its staffline. */
    function entryX(osmd: OpenSheetMusicDisplay, measureNumber: number, eighth: number): number {
        const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureNumber - 1][0];
        const entry: GraphicalStaffEntry = measure.staffEntries[eighth - 1];
        return measure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x;
    }

    it("reads a start and its stop into the Dashes of the text's expression", async () => {
        const osmd: OpenSheetMusicDisplay = await renderSample();
        const allDashes: Dashes[] = readDashes(osmd);
        const summary: string[] = allDashes.map((dashes: Dashes): string =>
            `${textOf(dashes)} ${PlacementEnum[dashes.Placement]} #${dashes.NumberXml}: ` +
            `${dashes.StartMeasure.MeasureNumber}+${dashes.StartTimestamp.RealValue} to ${dashes.EndMeasure.MeasureNumber}+${dashes.EndTimestamp.RealValue}`);
        expect(summary).to.deep.equal([
            "cresc. Below #1: 1+0.5 to 3+0",
            "dim. Above #1: 3+0.5 to 4+0.5",
            "cresc. Below #2: 5+0.5 to 9+0.5",
            "poco a poco animando Above #1: 10+0 to 11+0",
            "rit. Above #1: 11+0 to 12+0.5",
        ]);
        expect(allDashes[0].TextExpression instanceof ContinuousDynamicExpression, "cresc. is a continuous dynamic").to.equal(true);
        expect(allDashes[3].TextExpression instanceof UnknownExpression, "plain words").to.equal(true);
        expect(allDashes[4].TextExpression instanceof AbstractTempoExpression, "rit. is a tempo expression").to.equal(true);
        expect(allDashes[2].AbsoluteEndTimestamp.RealValue, "absolute end of the long cresc.").to.equal(8.5);
    });

    it("draws the line from its text to its stop position, on the level of the text, over a system break", async () => {
        const osmd: OpenSheetMusicDisplay = await renderSample();
        const rules: EngravingRules = osmd.EngravingRules;
        expect(osmd.GraphicSheet.MusicPages[0].MusicSystems.length, "systems").to.equal(3);
        const parts: GraphicalDashes[] = drawnParts(osmd);
        expect(parts.map((part: GraphicalDashes): string => textOf(part.Dashes) + (part.IsContinuation ? " (continued)" : "")))
            .to.deep.equal(["cresc.", "dim.", "cresc.", "cresc. (continued)", "poco a poco animando", "rit."]);
        const [cresc, dim, longCresc, longCrescContinued, words, rit] = parts;

        for (const part of parts) {
            expect(part.Line.Start.y, "horizontal: " + textOf(part.Dashes)).to.equal(part.Line.End.y);
            // above or below the staff (its lines are at y 0 to 4), as its text
            if (part.Dashes.Placement === PlacementEnum.Below) {
                expect(part.Line.Start.y, "below the staff: " + textOf(part.Dashes)).to.be.greaterThan(4);
            } else {
                expect(part.Line.Start.y, "above the staff: " + textOf(part.Dashes)).to.be.lessThan(0);
            }
            // whole dashes fill the line, with a gap close to the rule's
            const dashCount: number = (part.Line.End.x - part.Line.Start.x + part.GapLength) / (part.DashLength + part.GapLength);
            expect(dashCount, "a whole number of dashes: " + textOf(part.Dashes)).to.be.closeTo(Math.round(dashCount), 1e-6);
            expect(part.GapLength, "gap: " + textOf(part.Dashes)).to.be.closeTo(rules.DashesGapLength, rules.DashesGapLength / 2);
            if (part.IsContinuation) {
                continue;
            }
            // after its text, within the height of the text
            const staffLineBox: BoundingBox = part.ParentStaffLine.PositionAndShape;
            const labelBox: BoundingBox = part.TextLabel.PositionAndShape;
            expect(staffLineBox.AbsolutePosition.x + part.Line.Start.x, "starts after the text: " + textOf(part.Dashes))
                .to.be.closeTo(labelBox.AbsolutePosition.x + labelBox.BorderRight + rules.DashesTextPadding, 1e-6);
            const y: number = staffLineBox.AbsolutePosition.y + part.Line.Start.y;
            expect(y, "below the top of the text: " + textOf(part.Dashes)).to.be.greaterThan(labelBox.AbsolutePosition.y + labelBox.BorderTop);
            expect(y, "above the bottom of the text: " + textOf(part.Dashes)).to.be.lessThan(labelBox.AbsolutePosition.y + labelBox.BorderBottom);
        }

        // a stop at the start of measure 3 (before the f there): the line ends before the barline of measure 2
        const measure2: BoundingBox = osmd.GraphicSheet.MeasureList[1][0].PositionAndShape;
        expect(cresc.Line.End.x, "cresc. ends before the barline").to.be.closeTo(
            measure2.RelativePosition.x + measure2.BorderRight - rules.DashesEndPadding, 1e-6);
        // a stop within a measure: the line ends before the note at the stop, after the note before it
        expect(dim.Line.End.x, "dim. ends before the note of its stop").to.be.lessThan(entryX(osmd, 4, 5));
        expect(dim.Line.End.x, "dim. goes on after the note before its stop").to.be.greaterThan(entryX(osmd, 4, 4));
        expect(rit.Line.End.x, "rit. ends before the note of its stop").to.be.lessThan(entryX(osmd, 12, 5));
        expect(rit.Line.End.x, "rit. goes on after the note before its stop").to.be.greaterThan(entryX(osmd, 12, 4));
        expect(words.Line.End.x, "the line after the words ends before the rit.").to.be.lessThan(rit.Line.Start.x);

        // over the system break: to the end of the staffline, then from after the clef to before the ff's note
        expect(longCresc.Line.End.x, "to the end of the staffline").to.be.closeTo(longCresc.ParentStaffLine.PositionAndShape.Size.width, 1e-6);
        const measure9: GraphicalMeasure = osmd.GraphicSheet.MeasureList[8][0];
        expect(longCrescContinued.ParentStaffLine, "continued in the next system").to.equal(measure9.ParentStaffLine);
        expect(longCrescContinued.Line.Start.x, "from after the clef").to.be.closeTo(
            measure9.PositionAndShape.RelativePosition.x + measure9.beginInstructionsWidth, 1e-6);
        expect(longCrescContinued.Line.End.x, "ends before the ff's note").to.be.lessThan(entryX(osmd, 9, 5));
        expect(longCrescContinued.Line.End.x, "goes on up to the ff").to.be.greaterThan(entryX(osmd, 9, 3));
        // the text and its line are placed below the low notes of measure 8, which are along the line, not under the text
        expect(longCresc.Line.Start.y, "lower than the cresc. of measure 1: clear of the low notes").to.be.greaterThan(cresc.Line.Start.y + 1);

        // drawn as dashed lines with their own class
        const groups: Element[] = Array.from(container.querySelectorAll("g.vf-line.osmd-dashes"));
        expect(groups.length, "drawn lines").to.equal(6);
        for (const group of groups) {
            expect(group.querySelector("path").getAttribute("stroke-dasharray"), "dashed").to.match(/^[\d.]+, [\d.]+$/);
        }
        expect(longCresc.Line.SVGElement, "the part's drawn group").to.equal(groups[2]);
    });

    it("draws no lines with RenderDashes off, and skips a start without a stop and a stop without a start", async () => {
        let osmd: OpenSheetMusicDisplay = await renderSample(undefined, false);
        expect(drawnParts(osmd).length, "no lines with RenderDashes off").to.equal(0);
        expect(container.querySelectorAll("g.osmd-dashes").length, "nothing drawn").to.equal(0);
        expect(readDashes(osmd).length, "the lines are still read").to.equal(5);
        osmd.clear();

        // remove the stop of the dim. (measure 4) and the start after "rit." (measure 11)
        const score: Document = TestUtils.getScore(sample);
        const measures: Element[] = Array.from(score.querySelectorAll("measure"));
        measures[3].querySelector("dashes[type=stop]").closest("direction").remove();
        measures[10].querySelector("dashes[type=start]").closest("direction-type").remove();
        const logs: string[] = TestUtils.catchLogs();
        osmd = await renderSample(score);
        expect(drawnParts(osmd).map((part: GraphicalDashes): string => textOf(part.Dashes)), "the other lines are drawn")
            .to.deep.equal(["cresc.", "cresc.", "cresc.", "poco a poco animando"]);
        expect(logs.filter((message: string): boolean => message.includes("dashes")).length, "one message each").to.equal(2);
        expect(logs.join("\n")).to.contain("<dashes type=\"stop\" number=\"1\"> in measure 12 has no start");
    });
});

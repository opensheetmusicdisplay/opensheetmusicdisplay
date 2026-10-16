import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";

/** A wedge stop before a note ends at that onset, not somewhere inside that note. */
describe("Wedge endpoints", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });
    afterEach(() => container.remove());

    /** Advance the stop and its dynamic by one quarter, so the endpoint is genuinely inside the next measure. */
    function stopAfterFirstNote(xml: Document): void {
        for (const measure of Array.from(xml.querySelectorAll('measure[number="2"], measure[number="4"]'))) {
            measure.insertBefore(measure.querySelector("note"), measure.querySelector("direction"));
        }
    }

    for (const width of [450, 1000]) {
        for (const placement of ["above", "below"]) {
            for (const type of ["crescendo", "diminuendo"]) {
                it(`ends ${type} before the barline with either XML encoding, ${placement}, at width ${width}`, async () => {
                    container.style.width = width + "px";
                    const positions: number[][] = [];
                    for (const stopInPreviousMeasure of [false, true]) {
                        const xml: Document = TestUtils.getScore("test_wedge_stop_before_note.musicxml").cloneNode(true) as Document;
                        for (const direction of Array.from(xml.querySelectorAll("direction"))) {
                            direction.setAttribute("placement", placement);
                        }
                        for (const wedgeNode of Array.from(xml.querySelectorAll('wedge[type="crescendo"]'))) {
                            wedgeNode.setAttribute("type", type);
                        }
                        if (stopInPreviousMeasure) {
                            for (const stop of Array.from(xml.querySelectorAll('wedge[type="stop"]'))) {
                                const direction: Element = stop.parentElement.parentElement;
                                direction.parentElement.previousElementSibling.appendChild(direction);
                            }
                        }
                        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
                        osmd.setOptions({ newSystemFromXML: true });
                        await osmd.load(xml);
                        const endpoints: number[] = [];
                        for (const zoom of [1, 0.75, 1]) {
                            osmd.Zoom = zoom;
                            osmd.render();
                            for (const measureIndex of [0, 2]) {
                                const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0];
                                const staffLine: StaffLine = measure.ParentStaffLine;
                                const wedges: GraphicalContinuousDynamicExpression[] = staffLine.AbstractExpressions.filter(expression =>
                                    expression instanceof GraphicalContinuousDynamicExpression &&
                                    expression.ContinuousDynamic.StartMultiExpression.SourceMeasureParent === measure.parentSourceMeasure
                                ) as GraphicalContinuousDynamicExpression[];
                                expect(wedges.length, "the complete hairpin is in the preceding measure").to.equal(1);
                                const wedge: GraphicalContinuousDynamicExpression = wedges[0];
                                expect(wedge.EndMeasure === measure, "graphical endpoint belongs to the preceding measure").to.equal(true);
                                expect(wedge.IsSplittedPart, "no continuation into the next system").to.equal(false);
                                const xs: number[] = wedge.Lines.flatMap(line => [line.Start.x, line.End.x]);
                                const right: number = Math.max(...xs);
                                const barline: number = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight;
                                expect(right, "hairpin stops before the barline, not at the next note").to.be.at.most(
                                    barline - osmd.EngravingRules.WedgeHorizontalMargin + 1e-6);
                                expect(right - Math.min(...xs), "positive hairpin length").to.be.greaterThan(0);
                                endpoints.push(...xs);
                                const nextMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex + 1][0];
                                if (nextMeasure.ParentStaffLine !== staffLine) {
                                    expect(nextMeasure.ParentStaffLine.AbstractExpressions.some(expression =>
                                        expression instanceof GraphicalContinuousDynamicExpression &&
                                        expression.ContinuousDynamic === wedge.ContinuousDynamic), "no orphan continuation at the next row").to.equal(false);
                                }
                            }
                        }
                        positions.push(endpoints);
                        osmd.clear();
                    }
                    expect(positions[1], "equivalent boundary encodings have identical geometry").to.deep.equal(positions[0]);
                });

                it(`keeps ${type} clear of an in-measure dynamic ${placement}, including a system break, at width ${width}`, async () => {
                    container.style.width = width + "px";
                    const xml: Document = TestUtils.getScore("test_wedge_stop_before_note.musicxml").cloneNode(true) as Document;
                    stopAfterFirstNote(xml);
                    for (const direction of Array.from(xml.querySelectorAll("direction"))) {
                        direction.setAttribute("placement", placement);
                    }
                    for (const wedgeNode of Array.from(xml.querySelectorAll('wedge[type="crescendo"]'))) {
                        wedgeNode.setAttribute("type", type);
                    }
                    const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
                    osmd.setOptions({ newSystemFromXML: true });
                    await osmd.load(xml);
                    for (const zoom of [1, 0.75, 1]) {
                        osmd.Zoom = zoom;
                        osmd.render();
                        for (const measureIndex of [1, 3]) {
                            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[measureIndex][0];
                            const staffLine: StaffLine = measure.ParentStaffLine;
                            const dynamic: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions.find(expression =>
                                expression instanceof GraphicalInstantaneousDynamicExpression &&
                                expression.SourceExpression.parentMeasure === measure.parentSourceMeasure) as GraphicalInstantaneousDynamicExpression;
                            expect(dynamic, "the end dynamic is rendered").to.not.equal(undefined);
                            const wedges: GraphicalContinuousDynamicExpression[] = staffLine.AbstractExpressions.filter(expression =>
                                expression instanceof GraphicalContinuousDynamicExpression &&
                                expression.ContinuousDynamic.EndMultiExpression.SourceMeasureParent === measure.parentSourceMeasure
                            ) as GraphicalContinuousDynamicExpression[];
                            expect(wedges.length, "the ending wedge segment is rendered").to.equal(1);
                            const xs: number[] = wedges[0].Lines.flatMap(line => [line.Start.x, line.End.x]);
                            const right: number = Math.max(...xs);
                            const left: number = dynamic.PositionAndShape.RelativePosition.x + dynamic.PositionAndShape.BorderMarginLeft;
                            expect(right, "wedge ends before the dynamic's left margin").to.be.at.most(left - osmd.EngravingRules.WedgeHorizontalMargin + 1e-6);
                            expect(Math.max(...xs) - Math.min(...xs), "positive wedge length").to.be.greaterThan(0);
                        }
                    }
                });
            }
        }
    }

    for (const [afterNotes, offset, expectedBeat] of [[1, 0, 1], [1, 4, 2], [2, -4, 1], [4, 0, 4], [4, -2, 3.5]]) {
        it(`ends at beat ${expectedBeat} with stop after ${afterNotes} notes and offset ${offset}, without a dynamic`, async () => {
            container.style.width = "800px";
            const note: string = "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>";
            const stop: string = `<direction><direction-type><wedge type="stop"/></direction-type><offset>${offset}</offset></direction>`;
            const xml: string = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Part</part-name></score-part></part-list>
                <part id="P1"><measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef></attributes>
                <direction placement="below"><direction-type><wedge type="crescendo"/></direction-type></direction>
                ${note.repeat(afterNotes)}${stop}${note.repeat(4 - afterNotes)}</measure></part></score-partwise>`;
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmd.load(new DOMParser().parseFromString(xml, "text/xml"));
            for (const zoom of [1, 0.7]) {
                osmd.Zoom = zoom;
                osmd.render();
                const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
                const wedge: GraphicalContinuousDynamicExpression = measure.ParentStaffLine.AbstractExpressions.find(
                    expression => expression instanceof GraphicalContinuousDynamicExpression) as GraphicalContinuousDynamicExpression;
                expect(wedge.Lines.length, "wedge rendered even when its stop has no note onset").to.equal(2);
                const xAtBeat: number[] = measure.staffEntries.map(entry =>
                    measure.PositionAndShape.RelativePosition.x + entry.PositionAndShape.RelativePosition.x);
                xAtBeat.push(measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight - osmd.EngravingRules.WedgeHorizontalMargin);
                const leftBeat: number = Math.floor(expectedBeat);
                const expectedX: number = xAtBeat[leftBeat] + (expectedBeat % 1) * ((xAtBeat[leftBeat + 1] ?? xAtBeat[leftBeat]) - xAtBeat[leftBeat]);
                expect(Math.max(...wedge.Lines.flatMap(line => [line.Start.x, line.End.x])), "explicit stop position")
                    .to.be.closeTo(expectedX, 1e-6);
            }
        });
    }

    it("uses each staff's own dynamic bounds at simultaneous endpoints", async () => {
        container.style.width = "1100px";
        const xml: Document = TestUtils.getScore("test_wedge_stop_before_note.musicxml").cloneNode(true) as Document;
        stopAfterFirstNote(xml);
        const scorePart: Element = xml.querySelector("score-part").cloneNode(true) as Element;
        scorePart.setAttribute("id", "P2");
        xml.querySelector("part-list").appendChild(scorePart);
        const part: Element = xml.querySelector("part").cloneNode(true) as Element;
        part.setAttribute("id", "P2");
        for (const mark of Array.from(part.querySelectorAll("dynamics"))) {
            mark.innerHTML = "<pppp/>";
        }
        xml.documentElement.appendChild(part);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({ newSystemFromXML: true });
        await osmd.load(xml);
        osmd.render();
        for (const measure of osmd.GraphicSheet.MeasureList[1]) {
            const staffLine: StaffLine = measure.ParentStaffLine;
            const dynamic: GraphicalInstantaneousDynamicExpression = staffLine.AbstractExpressions.find(expression =>
                expression instanceof GraphicalInstantaneousDynamicExpression && expression.parentMeasure === measure.parentSourceMeasure
            ) as GraphicalInstantaneousDynamicExpression;
            const wedge: GraphicalContinuousDynamicExpression = staffLine.AbstractExpressions.find(expression =>
                expression instanceof GraphicalContinuousDynamicExpression && expression.ContinuousDynamic.EndMultiExpression.SourceMeasureParent ===
                measure.parentSourceMeasure) as GraphicalContinuousDynamicExpression;
            const right: number = Math.max(...wedge.Lines.flatMap(line => [line.Start.x, line.End.x]));
            const left: number = dynamic.PositionAndShape.RelativePosition.x + dynamic.PositionAndShape.BorderMarginLeft;
            expect(left - right, "gap to this staff's dynamic").to.be.within(0.49, 0.81);
        }
    });

    it("honours UseEndOffsetForExpressions when ignoring an explicit stop's offset", async () => {
        container.style.width = "900px";
        const xml: Document = TestUtils.getScore("test_wedge_stop_before_note.musicxml").cloneNode(true) as Document;
        for (const stop of Array.from(xml.querySelectorAll('wedge[type="stop"]'))) {
            const offset: Element = xml.createElement("offset");
            offset.textContent = "4";
            stop.parentElement.parentElement.appendChild(offset);
        }
        for (const dynamic of Array.from(xml.querySelectorAll("dynamics"))) {
            dynamic.parentElement.parentElement.remove();
        }
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(xml);
        for (const useOffset of [true, false, true]) {
            osmd.EngravingRules.UseEndOffsetForExpressions = useOffset;
            osmd.render();
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[1][0];
            const wedge: GraphicalContinuousDynamicExpression = measure.ParentStaffLine.AbstractExpressions.find(expression =>
                expression instanceof GraphicalContinuousDynamicExpression && expression.ContinuousDynamic.EndMultiExpression.SourceMeasureParent ===
                measure.parentSourceMeasure) as GraphicalContinuousDynamicExpression;
            const previous: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
            const expectedX: number = useOffset ? measure.PositionAndShape.RelativePosition.x + measure.staffEntries[1].PositionAndShape.RelativePosition.x :
                previous.PositionAndShape.RelativePosition.x + previous.PositionAndShape.BorderRight - osmd.EngravingRules.WedgeHorizontalMargin;
            expect(Math.max(...wedge.Lines.flatMap(line => [line.Start.x, line.End.x]))).to.be.closeTo(expectedX, 1e-6);
        }
    });

    for (const type of ["crescendo", "diminuendo"]) {
        it(`moves and squeezes both edges of a split ${type} without changing its opening`, async () => {
            container.style.width = "900px";
            const xml: Document = TestUtils.getScore("test_wedge_stop_before_note.musicxml").cloneNode(true) as Document;
            for (const wedgeNode of Array.from(xml.querySelectorAll('wedge[type="crescendo"]'))) {
                wedgeNode.setAttribute("type", type);
            }
            stopAfterFirstNote(xml);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            osmd.setOptions({ newSystemFromXML: true });
            await osmd.load(xml);
            osmd.render();
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[3][0];
            const wedge: GraphicalContinuousDynamicExpression = measure.ParentStaffLine.AbstractExpressions.find(expression =>
                expression instanceof GraphicalContinuousDynamicExpression) as GraphicalContinuousDynamicExpression;
            expect(wedge.IsSplittedPart).to.equal(true);
            const points: PointF2D[] = Array.from(new Set(wedge.Lines.flatMap(line => [line.Start, line.End])));
            expect(points.length, "a crescendo continuation has four points; a diminuendo shares its closing tip").to.equal(type === "crescendo" ? 4 : 3);
            const original: { x: number, y: number }[] = points.map(point => ({ x: point.x, y: point.y }));
            wedge.shiftYPosition(2);
            points.forEach((point, index) => expect(point.y - original[index].y, "each endpoint moves equally").to.be.closeTo(2, 1e-6));
            const left: number = Math.min(...points.map(point => point.x));
            const right: number = Math.max(...points.map(point => point.x));
            const squeeze: number = (right - left) / 4;
            wedge.squeeze(squeeze);
            wedge.squeeze(-squeeze);
            points.forEach((point, index) => {
                expect(point.x, "both points of each edge move together").to.be.closeTo(
                    original[index].x === left ? left + squeeze : right - squeeze, 1e-6);
                expect(point.y - original[index].y, "squeezing preserves opening height").to.be.closeTo(2, 1e-6);
            });
        });
    }
});

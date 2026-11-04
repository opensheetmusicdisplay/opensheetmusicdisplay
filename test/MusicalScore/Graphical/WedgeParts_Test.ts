import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * A wedge over several systems has a part in each: like its start in the first one, like its end in the last one, and a part
 * between them in the systems between.
 */
describe("Parts of a wedge over several systems", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "800px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The parts of wedges in each system (in its first staffline). */
    function wedgeParts(): GraphicalContinuousDynamicExpression[][] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems.map((system: MusicSystem): GraphicalContinuousDynamicExpression[] =>
            system.StaffLines[0].AbstractExpressions.filter(expression => expression instanceof GraphicalContinuousDynamicExpression)
                .map(expression => expression as GraphicalContinuousDynamicExpression));
    }

    /** The parts of wedges in each system: the x of their start and end, and their opening there (how far the lower line is from
     *  the upper one, 0 at the point of a wedge), rounded. */
    function wedgePartsOfSystems(): string[][] {
        return wedgeParts().map((parts: GraphicalContinuousDynamicExpression[]): string[] =>
            parts.map((wedge: GraphicalContinuousDynamicExpression): string => {
                if (wedge.Lines.length < 2) {
                    return "without lines";
                }
                const [upper, lower]: GraphicalLine[] = wedge.Lines;
                return [upper.Start.x, upper.End.x, lower.Start.y - upper.Start.y, lower.End.y - upper.End.y]
                    .map((value: number): string => value.toFixed(3)).join(" ");
            }));
    }

    it("draws the parts of a wedge that the drawing range cuts off as render() of the whole sheet draws them in those systems", async () => {
        // It wasn't drawn at all (and a cut-off end logged "Not enough lines for SkyBottomLine calculation"). Now it's drawn like a
        //   wedge going on before or after a system break: from the start of the first measure drawn, and to the end of the last
        //   one, open there.
        const messages: string[] = TestUtils.catchLogs();
        for (const sample of ["test_wedge_multiline_crescendo.musicxml", "test_wedge_multiline_decrescendo.musicxml"]) {
            // A wedge from measure 1 to 4, each measure in a system of its own. Without part names, and with the last system
            //   stretched too, the systems are all as wide: a measure's system is the same in each drawing range.
            osmd.setOptions({ newSystemFromXML: true, drawPartNames: false, drawFromMeasureNumber: 1, drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER });
            osmd.EngravingRules.StretchLastSystemLine = true;
            await osmd.load(TestUtils.getScore(sample));
            osmd.render();
            const partsOfMeasures: string[][] = wedgePartsOfSystems();
            expect(partsOfMeasures.map((parts: string[]): number => parts.length), `${sample}: a part in each system`).to.deep.equal([1, 1, 1, 1]);
            // cut off: the end; the start; both, in 2 systems; both, in 1 system; the end in the wedge's first system; the start in its last
            for (const [from, upTo] of [[1, 2], [2, 4], [2, 3], [3, 3], [1, 1], [4, 4]]) {
                osmd.setOptions({ drawFromMeasureNumber: from, drawUpToMeasureNumber: upTo });
                osmd.render();
                expect(wedgePartsOfSystems(), `${sample}, measures ${from} to ${upTo}`).to.deep.equal(partsOfMeasures.slice(from - 1, upTo));
            }
        }
        expect(messages, "nothing logged, e.g. for a wedge without lines").to.deep.equal([]);
    });

    /** A wedge from measure 1 to 4, each measure in a system of its own, with a whole note each: D3 on the middle line of the bass
     *  clef, which doesn't reach beyond the staff, or the given pitch in measure 2. */
    function wedgeThroughFourSystems(placement: string, pitchInMeasure2: string = "<step>D</step><octave>3</octave>"): string {
        const note: (pitch: string) => string = (pitch: string): string =>
            `<note><pitch>${pitch}</pitch><duration>4</duration><type>whole</type></note>`;
        const wedge: (type: string) => string = (type: string): string =>
            `<direction placement="${placement}"><direction-type><wedge type="${type}"/></direction-type></direction>`;
        const d3: string = note("<step>D</step><octave>3</octave>");
        const newSystem: string = "<print new-system='yes'/>";
        return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Part</part-name></score-part></part-list><part id="P1">
            <measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>
                ${wedge("crescendo")}${d3}</measure>
            <measure number="2">${newSystem}${note(pitchInMeasure2)}</measure>
            <measure number="3">${newSystem}${d3}</measure>
            <measure number="4">${newSystem}${d3}${wedge("stop")}</measure>
            </part></score-partwise>`;
    }

    /** The y of the middle of each system's part of the wedge, relative to the staffline (0 at the top line, 4 at the bottom). */
    function middlesOfParts(): number[] {
        return wedgeParts().map((parts: GraphicalContinuousDynamicExpression[]): number => (parts[0].Lines[0].Start.y + parts[0].Lines[1].Start.y) / 2);
    }

    it("places the parts in the systems between like the first and the last part: as far from the staff, and clear of their notes", async () => {
        // They were placed further from the staff, by WedgeOpeningLength / 2 and WedgeVerticalMargin once more below it, and below
        //   it, they were placed by the last system's notes instead of their own.
        osmd.setOptions({ newSystemFromXML: true, drawPartNames: false });
        for (const placement of ["below", "above"]) {
            await osmd.load(wedgeThroughFourSystems(placement));
            osmd.render();
            const sameNoteMiddles: string[] = middlesOfParts().map((y: number): string => y.toFixed(6));
            expect(sameNoteMiddles, `${placement} the staff: as far from it in each system`).to.deep.equal(Array(4).fill(sameNoteMiddles[0]));
        }
        // D2 in measure 2, below the staff: the part in its system goes below it, the others stay where they were
        await osmd.load(wedgeThroughFourSystems("below", "<step>D</step><octave>2</octave>"));
        osmd.render();
        const middles: string[] = middlesOfParts().map((y: number): string => y.toFixed(6));
        expect([middles[2], middles[3]], "the other parts").to.deep.equal([middles[0], middles[0]]);
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[1].StaffLines[0];
        const noteBox: BoundingBox = staffLine.Measures[0].staffEntries[0].graphicalVoiceEntries[0].notes[0].PositionAndShape;
        const noteBottom: number = noteBox.AbsolutePosition.y + noteBox.BorderBottom - staffLine.PositionAndShape.AbsolutePosition.y;
        const upperLine: GraphicalLine = wedgeParts()[1][0].Lines[0];
        expect(Math.min(upperLine.Start.y, upperLine.End.y), "the part below D2").to.be.greaterThan(noteBottom);
    });
});

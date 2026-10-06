import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { InstantaneousTempoExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/InstantaneousTempoExpression";

describe("Metronome ties", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1300px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_metronome_beat_unit_ties.musicxml"));
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("retains chained dotted ties on both sides without changing note values", () => {
        const marks: InstantaneousTempoExpression[] = osmd.Sheet.TimestampSortedTempoExpressionsList
            .map(expression => expression.InstantaneousTempo).filter(expression => expression?.isMetronomeMark);
        expect(marks.map(mark => mark.TempoInBpm)).to.deep.equal([96, 96, 128, 160]);
        expect(marks[1].metronomeNoteGroupLeft.notes).to.deep.equal([
            { type: "quarter", dots: 1 }, { type: "eighth", dots: 1, tied: true }, { type: "16th", dots: 0, tied: true }
        ]);
        expect(marks[1].metronomeNoteGroupRight.notes).to.deep.equal([
            { type: "half", dots: 0 }, { type: "eighth", dots: 0, tied: true }
        ]);
        expect(marks[2].metronomeNoteGroupLeft.notes, "the untied metronome-note control").to.deep.equal([
            { type: "quarter", dots: 0 }, { type: "eighth", dots: 0 }
        ]);
        expect(marks[3].metronomeNoteGroupRight.notes, "ties in the metronome-note form").to.deep.equal([
            { type: "eighth", dots: 0 }, { type: "eighth", dots: 1, tied: true }
        ]);
    });

    it("draws only the requested ties below their adjacent noteheads, including chains and dots", () => {
        osmd.render();
        const marks: SVGGElement[] = Array.from(container.querySelectorAll<SVGGElement>(".vf-stavetempo"));
        // Notehead pairs: numeric, beat-unit ties, untied equation, metronome-note tie.
        const pairs: number[][][] = [[], [[0, 1], [1, 2], [3, 4]], [], [[1, 2]]];
        expect(marks.map(mark => mark.querySelectorAll(".vf-metronometie path").length),
               "numeric, beat-unit ties, untied, metronome-note tie")
            .to.deep.equal(pairs.map(markPairs => markPairs.length));
        marks.forEach((mark, index) => {
            // In this un-beamed sample each notehead is drawn immediately before its stem rectangle.
            const heads: DOMRect[] = Array.from(mark.querySelectorAll<SVGRectElement>(":scope > rect"))
                .map(stem => (stem.previousElementSibling as SVGGraphicsElement).getBBox());
            const ties: SVGPathElement[] = Array.from(mark.querySelectorAll<SVGPathElement>(".vf-metronometie path"));
            pairs[index].forEach(([from, to], tieIndex) => {
                const bounds: DOMRect = ties[tieIndex].getBBox();
                expect(bounds.x, "the tie starts within its first notehead")
                    .to.be.within(heads[from].x, heads[from].x + heads[from].width);
                expect(bounds.x + bounds.width, "the tie ends within its next notehead")
                    .to.be.within(heads[to].x, heads[to].x + heads[to].width);
                expect(bounds.y, "the tie starts below both notehead centers")
                    .to.be.greaterThan(Math.max(heads[from].y + heads[from].height / 2, heads[to].y + heads[to].height / 2));
                expect(bounds.y + bounds.height, "the curve extends below both noteheads")
                    .to.be.greaterThan(Math.max(heads[from].y + heads[from].height, heads[to].y + heads[to].height));
                expect(bounds.height, "a visible curved tie").to.be.greaterThan(1);
            });
        });
    });
});

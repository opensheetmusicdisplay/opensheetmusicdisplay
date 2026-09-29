import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { InstantaneousTempoExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/InstantaneousTempoExpression";
import { MusicPartManagerIterator } from "../../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";

describe("Metronome beat-unit ties", () => {
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

    it("retains ties on each side without changing note values or sound-tempo priority", () => {
        const marks: InstantaneousTempoExpression[] = osmd.Sheet.TimestampSortedTempoExpressionsList
            .map(expression => expression.InstantaneousTempo).filter(expression => expression?.isMetronomeMark);
        expect(marks.map(mark => mark.TempoInBpm)).to.deep.equal([96, 128, 192, 192, 256, 92, 92]);
        expect(marks[1].metronomeNoteGroupLeft.notes).to.deep.equal([
            { type: "quarter", dots: 0 }, { type: "eighth", dots: 0, tied: true }
        ]);
        expect(marks[2].metronomeNoteGroupRight.notes).to.deep.equal([
            { type: "quarter", dots: 0 }, { type: "eighth", dots: 0, tied: true }
        ]);
        expect(marks[3].metronomeNoteGroupLeft.notes).to.deep.equal([
            { type: "quarter", dots: 1 }, { type: "eighth", dots: 1, tied: true }, { type: "16th", dots: 0, tied: true }
        ]);
        expect(marks[3].metronomeNoteGroupRight.notes).to.deep.equal([
            { type: "half", dots: 0 }, { type: "eighth", dots: 0, tied: true }
        ]);
        expect(marks[4].printObject, "a hidden equation still changes the tempo").to.equal(false);
        expect(marks[6].metronomeNoteGroupLeft.notes, "the untied metronome-note control").to.deep.equal([
            { type: "quarter", dots: 0 }, { type: "eighth", dots: 0 }
        ]);

        const bpms: number[] = [];
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        while (!iterator.EndReached) {
            bpms.push(iterator.CurrentBpm);
            iterator.moveToNext();
        }
        expect(bpms).to.deep.equal([96, 128, 192, 192, 256, 92, 92]);
    });

    it("draws only the requested ties, including chains and dots, also after changing zoom", () => {
        for (const zoom of [1, 0.75]) {
            osmd.Zoom = zoom;
            osmd.render();
            const marks: SVGGElement[] = Array.from(container.querySelectorAll<SVGGElement>(".vf-stavetempo"));
            expect(marks.map(mark => mark.querySelectorAll(".vf-metronometie path").length),
                   "numeric, left, right, both/chained, explicit sound, untied; hidden mark omitted")
                .to.deep.equal([0, 1, 1, 3, 1, 0]);
            for (const tie of Array.from(container.querySelectorAll<SVGPathElement>(".vf-metronometie path"))) {
                const bounds: DOMRect = tie.getBBox();
                expect(bounds.width, "a tie connects different noteheads").to.be.greaterThan(4);
                expect(bounds.height, "a visible curved tie").to.be.greaterThan(1);
            }
        }
    });
});

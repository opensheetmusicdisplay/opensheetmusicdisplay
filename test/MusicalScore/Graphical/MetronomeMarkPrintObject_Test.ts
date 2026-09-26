import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { InstantaneousTempoExpression } from "../../../src/MusicalScore/VoiceData/Expressions/InstantaneousTempoExpression";
import { SourceMeasure } from "../../../src/MusicalScore/VoiceData/SourceMeasure";

/**
 * A metronome mark with print-object="no" sets the tempo, but isn't drawn. The sample has a visible mark in measure 1,
 * a hidden ♩ = 120 in measure 2, and in measure 3 a hidden swing mark (a note equation) followed by a visible
 * "Medium Swing" ♩ = 132. Only one metronome mark is drawn per measure, so the hidden one took the place of the visible one.
 */
describe("Metronome marks with print-object=\"no\"", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function renderSample(): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_metronome_mark_print_object_no.musicxml"));
        osmd.render();
        return osmd;
    }

    it("draws only the visible metronome marks, also where a hidden mark comes first in the measure", async () => {
        const osmd: OpenSheetMusicDisplay = await renderSample();
        // the tempo that the drawn metronome mark of each measure shows ("" for a note equation), or undefined
        const drawnTempos: string[] = osmd.GraphicSheet.MeasureList.map((measures: GraphicalMeasure[]): string => {
            const stave: any = (measures[0] as VexFlowMeasure).getVFStave();
            const staveTempo: any = stave.getModifiers().find((modifier: any): boolean => modifier.getCategory() === "stavetempo");
            return staveTempo ? String(staveTempo.tempo.bpm ?? "") : undefined;
        });
        expect(drawnTempos, "measure 1: 96, measure 2: none, measure 3: 132").to.deep.equal(["96", undefined, "132"]);
    });

    it("still reads the hidden metronome marks", async () => {
        const osmd: OpenSheetMusicDisplay = await renderSample();
        const hiddenMarks: InstantaneousTempoExpression[][] = osmd.Sheet.SourceMeasures.map((measure: SourceMeasure) =>
            measure.TempoExpressions.map(expression => expression.InstantaneousTempo)
                .filter((mark: InstantaneousTempoExpression) => mark?.isMetronomeMark && !mark.printObject));
        expect(hiddenMarks.map(marks => marks.length), "hidden metronome marks in measures 2 and 3").to.deep.equal([0, 1, 1]);
        expect(hiddenMarks[1][0].TempoInBpm, "the hidden mark in measure 2 sets 120 BPM").to.equal(120);
        expect(hiddenMarks[2][0].metronomeNoteGroupLeft !== undefined, "the hidden swing mark is read as a note equation").to.equal(true);
    });
});

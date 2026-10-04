import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";

/**
 * A natural after a repeated sharp or flat of the same pitch in a measure needs its natural sign again, e.g. F# F F# F.
 * The AccidentalCalculator dropped the second natural when the naturals had no accidental in the XML,
 * which transposed notes never have (e.g. Telemann's Sonata WV 40.102 Dolce measure 9: G F# G D G F# G G, transposed).
 */
describe("Naturals after a repeated sharp or flat", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    let previousCalculator: ITransposeCalculator;
    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        previousCalculator = osmd.TransposeCalculator;
        osmd.TransposeCalculator = new TransposeCalculator();
    });
    afterEach(() => {
        osmd.TransposeCalculator = previousCalculator; // a static field shared by all OSMD instances
        osmd.clear();
        container.remove();
    });

    /** The drawn accidentals of the notes in a measure, as AccidentalEnum names, e.g. "SHARP". */
    function drawnAccidentals(measureIndex: number): string[] {
        return osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries
            .flatMap((staffEntry: GraphicalStaffEntry): GraphicalNote[] => staffEntry.graphicalVoiceEntries.flatMap(voiceEntry => voiceEntry.notes))
            .map((note: GraphicalNote): string => AccidentalEnum[note.DrawnAccidental]);
    }

    it("draws each natural, also without an accidental in the XML and when transposed", async () => {
        await osmd.load(TestUtils.getScore("test_accidentals_natural_after_repeated_sharp.musicxml"));
        osmd.render();
        const alternating: string[] = ["SHARP", "NATURAL", "SHARP", "NATURAL"];
        expect(drawnAccidentals(0), "F# F F# F, accidentals given in the XML").to.deep.equal(alternating);
        expect(drawnAccidentals(1), "F# F F# F, no accidentals for the naturals in the XML").to.deep.equal(alternating);

        osmd.Sheet.Transpose = 2;
        osmd.updateGraphic();
        osmd.render();
        expect(drawnAccidentals(0), "G# G G# G").to.deep.equal(alternating);
        expect(drawnAccidentals(1), "G# G G# G, measure 2").to.deep.equal(alternating);
    });
});

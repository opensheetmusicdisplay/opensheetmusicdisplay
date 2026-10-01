import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";

/**
 * An accidental given in the XML for a note whose pitch already has that alteration in the measure is drawn as a courtesy
 * accidental, unless a note of the same pitch at the same time already got it (Dichterliebe01 measure 9).
 * The AccidentalCalculator used to skip the first of these after an alteration, e.g. B flat, B, B flat for three B flats
 * with an accidental each (LilyPond test suite 01e-Pitches-ParenthesizedAccidentals).
 */
describe("Courtesy accidentals given in the XML", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The drawn accidentals of a voice's notes in a measure, as AccidentalEnum names, e.g. "FLAT". */
    function drawnAccidentals(measureIndex: number, voiceId: number): string[] {
        return osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries.flatMap((staffEntry: GraphicalStaffEntry) =>
            staffEntry.graphicalVoiceEntries
                .filter(voiceEntry => voiceEntry.parentVoiceEntry.ParentVoice.VoiceId === voiceId)
                .flatMap(voiceEntry => voiceEntry.notes.map(note => AccidentalEnum[note.DrawnAccidental])));
    }

    it("draws each accidental given in the XML, once for notes of the same pitch at the same time", async () => {
        await osmd.load(TestUtils.getScore("test_courtesy_accidentals_repeated_and_unison.musicxml"));
        osmd.render();

        expect(drawnAccidentals(0, 1), "four B flats, the first three with an accidental in the XML")
            .to.deep.equal(["FLAT", "FLAT", "FLAT", "NONE"]);
        const voice1: string[] = drawnAccidentals(1, 1);
        const voice2: string[] = drawnAccidentals(1, 2);
        expect([voice1[0], voice2[0]], "F natural in both voices on beat 1: one natural").to.have.members(["NATURAL", "NONE"]);
        expect(voice1[1], "F natural on beat 2").to.equal("NATURAL");
    });
});

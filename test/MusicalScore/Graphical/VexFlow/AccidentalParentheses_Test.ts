import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Pitch } from "../../../../src/Common/DataObjects/Pitch";
import { Note } from "../../../../src/MusicalScore/VoiceData/Note";
import { VoiceEntry } from "../../../../src/MusicalScore/VoiceData/VoiceEntry";
import { SourceMeasure } from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import { VerticalSourceStaffEntryContainer } from "../../../../src/MusicalScore/VoiceData/VerticalSourceStaffEntryContainer";

/**
 * An accidental given in parentheses (<accidental parentheses="yes">, e.g. a cautionary accidental)
 * or in brackets (<accidental bracket="yes">) is drawn in parentheses.
 * It used to be drawn like any other accidental.
 */
describe("Accidentals in parentheses or brackets", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** measure 1: F#4 (parentheses), Bb4 (bracket), C#5, chord D#4 + G#4 (parentheses).
     *  measure 2: grace note Eb5 (parentheses), D5, F4 (cautionary natural without parentheses).
     */
    const sample: string = "test_accidental_parentheses_bracket.musicxml";

    function noteName(pitch: Pitch): string {
        return pitch.ToStringShort(Pitch.OctaveXmlDifference); // e.g. "F#4"
    }

    /** Whether the accidental of each note is in parentheses, brackets or neither, as read from the XML. */
    async function readEnclosures(osmd: OpenSheetMusicDisplay): Promise<Record<string, string>> {
        await osmd.load(TestUtils.getScore(sample));
        const notes: Note[] = osmd.Sheet.SourceMeasures
            .flatMap((measure: SourceMeasure): VerticalSourceStaffEntryContainer[] => measure.VerticalSourceStaffEntryContainers)
            .flatMap((verticalContainer: VerticalSourceStaffEntryContainer): VoiceEntry[] => verticalContainer.StaffEntries[0].VoiceEntries)
            .flatMap((voiceEntry: VoiceEntry): Note[] => voiceEntry.Notes);
        const enclosures: Record<string, string> = {};
        for (const note of notes) {
            enclosures[noteName(note.Pitch)] = note.AccidentalParenthesesXml ? "parentheses" : note.AccidentalBracketXml ? "bracket" : "none";
        }
        return enclosures;
    }

    it("reads parentheses and brackets of accidentals", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        expect(await readEnclosures(osmd)).to.deep.equal({
            "F#4": "parentheses",
            "Bb4": "bracket",
            "C#5": "none",
            "D#4": "none", // chord
            "G#4": "parentheses", // chord
            "Eb5": "parentheses", // grace note
            "D5": "none",
            "Fn4": "none", // cautionary="yes" only
        });
    });

    it("reads cautionary accidentals as in parentheses with RenderCautionaryAccidentalsInParentheses", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.EngravingRules.RenderCautionaryAccidentalsInParentheses = true; // default false
        const enclosures: Record<string, string> = await readEnclosures(osmd);
        expect(enclosures.Fn4, "Fn4 (cautionary)").to.equal("parentheses");
        expect(enclosures.Bb4, "Bb4 (bracket)").to.equal("bracket");
        expect(enclosures["C#5"], "C#5").to.equal("none");
    });

    it("draws accidentals in parentheses", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
        // how far the notes of measure 1 reach to the left with their accidentals (and parentheses)
        const leftExtent: Record<string, number> = {};
        for (const staffEntry of osmd.GraphicSheet.MeasureList[0][0].staffEntries) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                leftExtent[noteName(voiceEntry.notes[0].sourceNote.Pitch)] = -voiceEntry.PositionAndShape.BorderLeft;
            }
        }
        // both have a sharp, only the one of F#4 is in parentheses
        expect(leftExtent["F#4"] - leftExtent["C#5"], "F#4 compared to C#5").to.be.greaterThan(0.5);
    });
});

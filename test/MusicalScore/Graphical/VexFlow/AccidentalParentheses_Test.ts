import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
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
     *  measure 2: grace note Eb5 (parentheses), then D5.
     */
    const sample: string = "test_accidental_parentheses_bracket.musicxml";

    interface DrawnAccidental {
        note: string;
        type: string;
        inParentheses: boolean;
        fontScale: number;
    }

    function noteName(pitch: Pitch): string {
        return pitch.ToStringShort(Pitch.OctaveXmlDifference); // e.g. "F#4"
    }

    async function drawnAccidentals(): Promise<DrawnAccidental[]> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
        osmd.render();
        const notes: GraphicalNote[] = osmd.GraphicSheet.MeasureList
            .map((measures: GraphicalMeasure[]): GraphicalMeasure => measures[0])
            .flatMap((measure: GraphicalMeasure): GraphicalStaffEntry[] => measure.staffEntries)
            .flatMap((staffEntry: GraphicalStaffEntry): GraphicalVoiceEntry[] => staffEntry.graphicalVoiceEntries) // includes grace notes
            .flatMap((voiceEntry: GraphicalVoiceEntry): GraphicalNote[] => voiceEntry.notes);
        return notes.flatMap((note: GraphicalNote): DrawnAccidental[] => {
            const [vfnote, index] = (note as VexFlowGraphicalNote).vfnote as [any, number];
            return vfnote.getModifiers()
                .filter((modifier: any): boolean => modifier.getCategory() === "accidentals" && modifier.getIndex() === index)
                .map((accidental: any): DrawnAccidental => ({
                    note: noteName(note.sourceNote.Pitch),
                    type: accidental.type,
                    inParentheses: accidental.cautionary,
                    fontScale: accidental.render_options.font_scale,
                }));
        });
    }

    it("reads parentheses and brackets of accidentals", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore(sample));
        const notes: Note[] = osmd.Sheet.SourceMeasures
            .flatMap((measure: SourceMeasure): VerticalSourceStaffEntryContainer[] => measure.VerticalSourceStaffEntryContainers)
            .flatMap((verticalContainer: VerticalSourceStaffEntryContainer): VoiceEntry[] => verticalContainer.StaffEntries[0].VoiceEntries)
            .flatMap((voiceEntry: VoiceEntry): Note[] => voiceEntry.Notes);
        const enclosures: Record<string, string> = {};
        for (const note of notes) {
            enclosures[noteName(note.Pitch)] = note.AccidentalParenthesesXml ? "parentheses" : note.AccidentalBracketXml ? "bracket" : "none";
        }
        expect(enclosures).to.deep.equal({
            "F#4": "parentheses",
            "Bb4": "bracket",
            "C#5": "none",
            "D#4": "none", // chord
            "G#4": "parentheses", // chord
            "Eb5": "parentheses", // grace note
            "D5": "none",
        });
    });

    it("draws accidentals in parentheses or brackets in parentheses, and only those", async () => {
        const accidentals: DrawnAccidental[] = await drawnAccidentals();
        const inParentheses: Record<string, boolean[]> = {};
        for (const accidental of accidentals) {
            expect(accidental.type, accidental.note).to.equal(accidental.note.charAt(1));
            inParentheses[accidental.note] = [...(inParentheses[accidental.note] ?? []), accidental.inParentheses];
        }
        expect(inParentheses).to.deep.equal({
            "F#4": [true],
            "Bb4": [true], // bracket
            "C#5": [false],
            "D#4": [false], // chord
            "G#4": [true], // chord
            "Eb5": [true], // grace note
        });
    });

    it("draws accidentals in parentheses at the size of the other accidentals", async () => {
        const accidentals: DrawnAccidental[] = await drawnAccidentals();
        const plainScale: number = accidentals.find(accidental => accidental.note === "C#5").fontScale;
        for (const accidental of accidentals.filter(drawn => drawn.note !== "Eb5")) {
            expect(accidental.fontScale, accidental.note).to.equal(plainScale);
        }
        const graceAccidental: DrawnAccidental = accidentals.find(accidental => accidental.note === "Eb5");
        expect(graceAccidental.fontScale, "grace note accidental").to.be.lessThan(plainScale);
    });
});

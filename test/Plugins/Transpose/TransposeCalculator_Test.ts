import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalChordSymbolContainer } from "../../../src/MusicalScore/Graphical/GraphicalChordSymbolContainer";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("TransposeCalculator", (): void => {
    describe("with a score", (): void => {
        let div: HTMLElement;
        let osmd: OpenSheetMusicDisplay;
        let previousCalculator: ITransposeCalculator;

        beforeEach((): void => {
            div = TestUtils.getDivElement(document);
            div.style.width = "800px";
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            previousCalculator = osmd.TransposeCalculator;
            osmd.TransposeCalculator = new TransposeCalculator();
        });

        afterEach((): void => {
            osmd.TransposeCalculator = previousCalculator; // a static field shared by all OSMD instances
            osmd.clear();
            div.remove();
        });

        function transposeTo(halftones: number): void {
            osmd.Sheet.Transpose = halftones;
            osmd.updateGraphic();
            osmd.render();
        }

        function firstKey(): KeyInstruction {
            return osmd.Sheet.SourceMeasures[0].FirstInstructionsStaffEntries[0].Instructions
                .find((instruction): instruction is KeyInstruction => instruction instanceof KeyInstruction);
        }

        function notes(measureIndex: number): GraphicalNote[] {
            return osmd.GraphicSheet.MeasureList[measureIndex][0].staffEntries
                .flatMap((entry: GraphicalStaffEntry): GraphicalNote[] => entry.graphicalVoiceEntries.flatMap(
                    (voiceEntry): GraphicalNote[] => voiceEntry.notes,
                ));
        }

        function noteNames(measureIndex: number = 0): string[] {
            const accidental: Record<number, string> = {
                [AccidentalEnum.SHARP]: "#",
                [AccidentalEnum.FLAT]: "b",
            };
            return notes(measureIndex)
                .map((note: GraphicalNote): Pitch => note.sourceNote.TransposedPitch ?? note.sourceNote.Pitch)
                .map((pitch: Pitch): string => NoteEnum[pitch.FundamentalNote] + (accidental[pitch.Accidental] ?? ""));
        }

        function drawnAccidentals(measureIndex: number): string[] {
            return notes(measureIndex).map((note: GraphicalNote): string => AccidentalEnum[note.DrawnAccidental]);
        }

        function chordTexts(): string[] {
            return osmd.GraphicSheet.MeasureList
                .flatMap((measures): GraphicalStaffEntry[] => measures[0].staffEntries)
                .flatMap((entry: GraphicalStaffEntry): GraphicalChordSymbolContainer[] => entry.graphicalChordContainers)
                .map((chord: GraphicalChordSymbolContainer): string => chord.GraphicalLabel.Label.text);
        }

        it("transposes Gb major down a whole tone to E major, and back", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_gflat_major.musicxml"));
            transposeTo(-2);
            expect(firstKey().Key, "E major has 4 sharps").to.equal(4);
            expect(noteNames()).to.deep.equal(["E", "F#", "G#", "A", "B", "C#", "D#", "E"]);

            transposeTo(0);
            expect(firstKey().Key, "back to 6 flats").to.equal(-6);
            expect(noteNames()).to.deep.equal(["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F", "Gb"]);
        });

        it("spells F as E# in F# major, like its key signature, unless the original note was chromatic", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_fsharp_major_e_sharp.musicxml"));
            transposeTo(6);
            expect(firstKey().Key, "F# major has 6 sharps").to.equal(6);
            expect(noteNames(0), "D C B C").to.deep.equal(["G#", "F#", "E#", "F#"]);
            expect(drawnAccidentals(0), "neither the leading tone E# nor the tonic F# after it needs an accidental")
                .to.deep.equal(["NONE", "NONE", "NONE", "NONE"]);
            expect(noteNames(1), "Ab major and Ab minor").to.deep.equal(["D", "F#", "A", "D", "F", "A"]);
            expect(drawnAccidentals(1)[4], "Cb, the third of Ab minor, is F, the third of D minor").to.equal("NATURAL");
            expect(chordTexts()).to.deep.equal(["F#", "E#m7b5", "D", "Dm"]);
        });
    });
});

import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { IRenderNextResult, OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { KeyEnum, KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalChordSymbolContainer } from "../../../src/MusicalScore/Graphical/GraphicalChordSymbolContainer";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("TransposeCalculator", (): void => {
    describe("transposePitch", (): void => {
        it("keeps the spelling when transposing by octaves, e.g. the leading tone C# of D minor", (): void => {
            const calculator: TransposeCalculator = new TransposeCalculator();
            for (const halftones of [12, -24]) {
                const key: KeyInstruction = new KeyInstruction(undefined, -1, KeyEnum.minor);
                calculator.transposeKey(key, halftones);
                const transposed: Pitch = calculator.transposePitch(new Pitch(NoteEnum.C, 1, AccidentalEnum.SHARP), key, halftones);
                expect(transposed.ToString(), `by ${halftones} halftones`)
                    .to.equal(new Pitch(NoteEnum.C, 1 + halftones / 12, AccidentalEnum.SHARP).ToString());
            }
        });
    });

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

        /** The key signature, notes and chord symbols as drawn, all measures. */
        function drawnScore(): { key: number, notes: string[], chords: string[] } {
            return {
                key: firstKey().Key,
                notes: Array.from(osmd.GraphicSheet.MeasureList.keys()).flatMap((measureIndex: number): string[] => noteNames(measureIndex)),
                chords: chordTexts(),
            };
        }

        it("applies a changed transposition with render() alone, like updateGraphic(), and keeps the cursor where it is", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_rehearsal_marks_bolivia.musicxml")); // D major, measure 1: a B and a G7
            osmd.render();
            osmd.cursor.show();
            osmd.cursor.next();
            osmd.cursor.next();
            const cursorTimestamp: number = osmd.cursor.Iterator.currentTimeStamp.RealValue;

            osmd.Sheet.Transpose = 1; // render() transposed only the key signature without updateGraphic()
            osmd.render();
            const transposed: ReturnType<typeof drawnScore> = drawnScore();
            expect(transposed.key, "Eb major has 3 flats").to.equal(-3);
            expect(noteNames(0), "B -> C").to.deep.equal(["C"]);
            expect(transposed.chords[0], "G7 -> Ab7").to.equal("Ab7");
            expect(osmd.cursor.Iterator.currentTimeStamp.RealValue, "the cursor stays at its note").to.equal(cursorTimestamp);
            expect(osmd.cursor.Hidden, "and visible").to.equal(false);

            const graphic: GraphicalMusicSheet = osmd.GraphicSheet;
            osmd.render();
            expect(osmd.GraphicSheet === graphic, "an unchanged transposition keeps the graphic").to.equal(true);
            osmd.TransposeCalculator = new TransposeCalculator();
            osmd.render();
            expect(osmd.GraphicSheet === graphic, "another transpose calculator creates the graphic again").to.equal(false);

            osmd.updateGraphic();
            osmd.render();
            expect(drawnScore(), "the same as with updateGraphic()").to.deep.equal(transposed);
        });

        it("starts an incremental render over with a changed transposition (renderNext())", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_rehearsal_marks_bolivia.musicxml"));
            const firstBatch: IRenderNextResult = osmd.renderNext({ measures: 4 });
            expect(firstBatch.done, "a session in progress").to.equal(false);

            osmd.Sheet.Transpose = 1;
            const restarted: IRenderNextResult = osmd.renderNext({ measures: 4 });
            expect(restarted.renderedMeasures, "from the first measure again").to.equal(firstBatch.renderedMeasures);
            expect(firstKey().Key, "Eb major has 3 flats").to.equal(-3);
            expect(noteNames(0), "B -> C").to.deep.equal(["C"]);
            expect(chordTexts()[0], "G7 -> Ab7").to.equal("Ab7");
        });
    });
});

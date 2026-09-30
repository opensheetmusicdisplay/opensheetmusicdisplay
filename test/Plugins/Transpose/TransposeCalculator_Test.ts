import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("TransposeCalculator", (): void => {
    describe("transposeKey", (): void => {
        const calculator: TransposeCalculator = new TransposeCalculator();

        function transposedKey(fifths: number, transpose: number): number {
            const key: KeyInstruction = new KeyInstruction(undefined, fifths);
            calculator.transposeKey(key, transpose);
            return key.Key;
        }

        it("transposes G flat major (6 flats) like its enharmonic F sharp major", (): void => {
            expect(transposedKey(-6, -2), "Gb -2 -> E").to.equal(4);
            expect(transposedKey(-6, -1), "Gb -1 -> F").to.equal(-1);
            expect(transposedKey(-6, 1), "Gb +1 -> G").to.equal(1);
            expect(transposedKey(-6, 6), "Gb +6 -> C").to.equal(0);
            expect(transposedKey(-6, -6), "Gb -6 -> C").to.equal(0);
            expect(transposedKey(6, -2), "F# -2 -> E, same as Gb").to.equal(transposedKey(-6, -2));
        });

        it("keeps transposing 7 sharps and 7 flats through their enharmonic equivalents", (): void => {
            expect(transposedKey(7, -1), "C# -1 -> C").to.equal(0);
            expect(transposedKey(-7, 1), "Cb +1 -> C").to.equal(0);
        });

        it("restores the original key signature for a net transpose of 0 or 12", (): void => {
            expect(transposedKey(-6, 0)).to.equal(-6);
            expect(transposedKey(-6, 12)).to.equal(-6);
            expect(transposedKey(7, 0)).to.equal(7);
        });
    });

    describe("with a G flat major score", (): void => {
        let div: HTMLElement;
        let osmd: OpenSheetMusicDisplay;

        beforeEach((): void => {
            div = TestUtils.getDivElement(document);
            div.style.width = "800px";
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            osmd.TransposeCalculator = new TransposeCalculator();
        });

        afterEach((): void => {
            osmd.clear();
            div.remove();
        });

        function firstKey(): KeyInstruction {
            return osmd.Sheet.SourceMeasures[0].FirstInstructionsStaffEntries[0].Instructions
                .find((instruction): instruction is KeyInstruction => instruction instanceof KeyInstruction);
        }

        function noteNames(): string[] {
            const accidental: Record<number, string> = {
                [AccidentalEnum.SHARP]: "#",
                [AccidentalEnum.FLAT]: "b",
            };
            return osmd.GraphicSheet.MeasureList[0][0].staffEntries
                .flatMap((entry: GraphicalStaffEntry): GraphicalNote[] => entry.graphicalVoiceEntries.flatMap(
                    (voiceEntry): GraphicalNote[] => voiceEntry.notes,
                ))
                .map((note: GraphicalNote): Pitch => note.sourceNote.TransposedPitch ?? note.sourceNote.Pitch)
                .map((pitch: Pitch): string => NoteEnum[pitch.FundamentalNote] + (accidental[pitch.Accidental] ?? ""));
        }

        it("transposes Gb major down a whole tone to E major, and back", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_gflat_major.musicxml"));
            osmd.Sheet.Transpose = -2;
            osmd.updateGraphic();
            osmd.render();
            expect(firstKey().Key, "E major has 4 sharps").to.equal(4);
            expect(noteNames()).to.deep.equal(["E", "F#", "G#", "A", "B", "C#", "D#", "E"]);
            expect(div.querySelectorAll(".vf-keysignature path"), "4 sharps are drawn").to.have.length(4);

            osmd.Sheet.Transpose = 0;
            osmd.updateGraphic();
            osmd.render();
            expect(firstKey().Key, "back to 6 flats").to.equal(-6);
            expect(noteNames()).to.deep.equal(["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F", "Gb"]);
        });
    });
});

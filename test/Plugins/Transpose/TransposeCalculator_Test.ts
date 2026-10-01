import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("TransposeCalculator", (): void => {
    describe("with a G flat major score", (): void => {
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

            osmd.Sheet.Transpose = 0;
            osmd.updateGraphic();
            osmd.render();
            expect(firstKey().Key, "back to 6 flats").to.equal(-6);
            expect(noteNames()).to.deep.equal(["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F", "Gb"]);
        });
    });
});

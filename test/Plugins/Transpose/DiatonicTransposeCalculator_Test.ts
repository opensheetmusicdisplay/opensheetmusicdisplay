import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { DiatonicTransposeCalculator } from "../../../src/Plugins/Transpose/DiatonicTransposeCalculator";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("DiatonicTransposeCalculator", (): void => {
    const calculator: DiatonicTransposeCalculator = new DiatonicTransposeCalculator();

    /** A key instruction as the calculator receives it from OSMD: transposed Key, original keyTypeOriginal. */
    function transposedKey(fifths: number, transpose: number): KeyInstruction {
        const key: KeyInstruction = new KeyInstruction(undefined, fifths);
        calculator.transposeKey(key, transpose);
        return key;
    }

    function name(pitch: Pitch): string {
        const accidental: Record<number, string> = {
            [AccidentalEnum.SHARP]: "#",
            [AccidentalEnum.FLAT]: "b",
            [AccidentalEnum.DOUBLESHARP]: "##",
            [AccidentalEnum.DOUBLEFLAT]: "bb",
        };
        return NoteEnum[pitch.FundamentalNote] + (accidental[pitch.Accidental] ?? "") + pitch.Octave;
    }

    function transposed(fifths: number, transpose: number, ...pitches: Pitch[]): string[] {
        const key: KeyInstruction = transposedKey(fifths, transpose);
        return pitches.map((pitch: Pitch): string => name(calculator.transposePitch(pitch, key, transpose)));
    }

    describe("letterSteps", (): void => {
        it("follows the tonic letters of the original and transposed key signatures", (): void => {
            expect(DiatonicTransposeCalculator.letterSteps(0, -2, -2), "C -> Bb, whole tone down").to.equal(-1);
            expect(DiatonicTransposeCalculator.letterSteps(0, 2, 2), "C -> D, whole tone up").to.equal(1);
            expect(DiatonicTransposeCalculator.letterSteps(0, -5, 1), "C -> Db, halftone up").to.equal(1);
            expect(DiatonicTransposeCalculator.letterSteps(0, 5, -1), "C -> B, halftone down").to.equal(-1);
            expect(DiatonicTransposeCalculator.letterSteps(0, 6, 6), "C -> F#, tritone up").to.equal(3);
            expect(DiatonicTransposeCalculator.letterSteps(0, 6, -6), "C -> F#, tritone down").to.equal(-4);
            expect(DiatonicTransposeCalculator.letterSteps(2, -3, 1), "D -> Eb").to.equal(1);
            expect(DiatonicTransposeCalculator.letterSteps(-3, 2, -1), "Eb -> D").to.equal(-1);
        });

        it("counts octaves", (): void => {
            expect(DiatonicTransposeCalculator.letterSteps(0, 0, 12)).to.equal(7);
            expect(DiatonicTransposeCalculator.letterSteps(0, 0, -12)).to.equal(-7);
            expect(DiatonicTransposeCalculator.letterSteps(0, -2, 10), "C -> Bb, minor seventh up").to.equal(6);
            expect(DiatonicTransposeCalculator.letterSteps(0, -2, -14), "C -> Bb, ninth down").to.equal(-8);
        });
    });

    describe("spell", (): void => {
        it("moves letter, octave and alteration", (): void => {
            expect(DiatonicTransposeCalculator.spell({letter: 5, octave: 4, alter: 1}, -2, -1), "A#4 -> G#4")
                .to.deep.equal({letter: 4, octave: 4, alter: 1});
            expect(DiatonicTransposeCalculator.spell({letter: 0, octave: 5, alter: 0}, -2, -1), "C5 -> Bb4")
                .to.deep.equal({letter: 6, octave: 4, alter: -1});
            expect(DiatonicTransposeCalculator.spell({letter: 6, octave: 4, alter: 0}, 1, 1), "B4 -> C5")
                .to.deep.equal({letter: 0, octave: 5, alter: 0});
        });

        it("gives up beyond double accidentals and on microtones", (): void => {
            expect(DiatonicTransposeCalculator.spell({letter: 6, octave: 4, alter: 2}, 6, 3), "B##4 + tritone -> E###").to.equal(undefined);
            expect(DiatonicTransposeCalculator.spell({letter: 0, octave: 4, alter: 0.5}, -2, -1)).to.equal(undefined);
        });
    });

    describe("transposePitch", (): void => {
        it("keeps the spelling of chromatic notes relative to the key (C major -> Bb major)", (): void => {
            expect(transposed(0, -2,
                new Pitch(NoteEnum.A, 4, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.D, 5, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.C, 5, AccidentalEnum.NONE),
                new Pitch(NoteEnum.B, 4, AccidentalEnum.FLAT),
            )).to.deep.equal(["G#4", "C#5", "Bb4", "Ab4"]);
        });

        it("keeps sharps sharp and flats flat when moving between sharp and flat keys", (): void => {
            expect(transposed(2, 1, // D major -> Eb major
                new Pitch(NoteEnum.F, 4, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.G, 4, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.B, 4, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.C, 5, AccidentalEnum.NONE),
            )).to.deep.equal(["G4", "A4", "C#5", "Db5"]);
            expect(transposed(-3, -1, // Eb major -> D major
                new Pitch(NoteEnum.A, 4, AccidentalEnum.FLAT),
                new Pitch(NoteEnum.C, 5, AccidentalEnum.FLAT),
                new Pitch(NoteEnum.E, 5, AccidentalEnum.NONE),
            )).to.deep.equal(["G4", "Bb4", "D#5"]);
        });

        it("transposing back restores the original spelling", (): void => {
            // (as long as no note needs the fallback, which isn't reversible: e.g. F## a halftone up from Ab major to A major
            //   would be F###, so the default calculator spells it G#, and G# a halftone down is G)
            const pitches: Pitch[] = [
                new Pitch(NoteEnum.A, 4, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.G, 4, AccidentalEnum.FLAT),
                new Pitch(NoteEnum.F, 5, AccidentalEnum.SHARP),
                new Pitch(NoteEnum.B, 3, AccidentalEnum.NONE),
            ];
            for (const halftones of [1, 2, 3, 5, 6, 7, 11, 12, 14]) {
                for (const fifths of [0, 3, -4]) {
                    const up: KeyInstruction = transposedKey(fifths, halftones);
                    const down: KeyInstruction = transposedKey(up.Key, -halftones);
                    for (const pitch of pitches) {
                        const there: Pitch = calculator.transposePitch(pitch, up, halftones);
                        const back: Pitch = calculator.transposePitch(there, down, -halftones);
                        expect(name(back), `${name(pitch)} by ${halftones} from ${fifths} and back via ${name(there)}`).to.equal(name(pitch));
                    }
                }
            }
        });

        it("returns the same pitch object for 0 halftones, like the default calculator", (): void => {
            const pitch: Pitch = new Pitch(NoteEnum.E, 4, AccidentalEnum.FLAT);
            expect(calculator.transposePitch(pitch, transposedKey(0, 0), 0)).to.equal(pitch);
        });

        it("falls back to the default calculator when the interval can't be spelled", (): void => {
            const pitch: Pitch = new Pitch(NoteEnum.B, 4, AccidentalEnum.DOUBLESHARP);
            const key: KeyInstruction = transposedKey(0, 6);
            expect(name(calculator.transposePitch(pitch, key, 6)))
                .to.equal(name(new TransposeCalculator().transposePitch(pitch, key, 6)));
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
            osmd.TransposeCalculator = new DiatonicTransposeCalculator();
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

        function noteNames(): string[] {
            return osmd.GraphicSheet.MeasureList.flatMap((measures): GraphicalNote[] => measures[0].staffEntries
                .flatMap((entry: GraphicalStaffEntry): GraphicalNote[] => entry.graphicalVoiceEntries.flatMap(
                    (voiceEntry): GraphicalNote[] => voiceEntry.notes,
                )))
                .map((note: GraphicalNote): Pitch => note.sourceNote.TransposedPitch ?? note.sourceNote.Pitch)
                .map((pitch: Pitch): string => name(pitch).replace(/-?\d+$/, "")); // without the octave (OSMD's octave 1 is MusicXML's 4)
        }

        function chordTexts(): string[] {
            return Array.from(div.querySelectorAll("text"))
                .map((text: SVGTextElement): string => text.textContent)
                .filter((text: string): boolean => /^[A-G]/.test(text));
        }

        function firstKey(): number {
            return osmd.Sheet.SourceMeasures[0].FirstInstructionsStaffEntries[0].Instructions
                .find((instruction): instruction is KeyInstruction => instruction instanceof KeyInstruction).Key;
        }

        it("spells notes and chord symbols by interval, and restores them when transposing back", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_diatonic_spelling.musicxml"));
            osmd.render();
            expect(chordTexts()).to.deep.equal(["Ebmaj7", "F#m7b5"]);

            transposeTo(-2);
            expect(firstKey(), "Bb major").to.equal(-2);
            expect(noteNames()).to.deep.equal(["G#", "A", "C#", "D", "Bb", "Ab", "Bb"]);
            expect(chordTexts()).to.deep.equal(["Dbmaj7", "Em7b5"]);

            transposeTo(3);
            expect(firstKey(), "Eb major").to.equal(-3);
            expect(noteNames()).to.deep.equal(["C#", "D", "F#", "G", "Eb", "Db", "Eb"]);

            transposeTo(0);
            expect(firstKey()).to.equal(0);
            expect(noteNames()).to.deep.equal(["A#", "B", "D#", "E", "C", "Bb", "C"]);
            expect(chordTexts()).to.deep.equal(["Ebmaj7", "F#m7b5"]);
        });
    });
});

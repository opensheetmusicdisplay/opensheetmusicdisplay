import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { IntervalTransposeCalculator } from "../../../src/Plugins/Transpose/IntervalTransposeCalculator";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { ITransposeCalculator } from "../../../src/MusicalScore/Interfaces/ITransposeCalculator";
import { KeyInstruction } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalChordSymbolContainer } from "../../../src/MusicalScore/Graphical/GraphicalChordSymbolContainer";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";

describe("IntervalTransposeCalculator", (): void => {
    const calculator: IntervalTransposeCalculator = new IntervalTransposeCalculator();

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

    describe("transposePitch", (): void => {
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

        it("transposing there and back restores the original spelling", (): void => {
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

        it("transposes by the given halftones, not by those of the key (chord symbols with a transposed instrument)", (): void => {
            // the chord symbol is transposed by Sheet.Transpose (-2), its key by Sheet.Transpose + Instrument.Transpose (0)
            const key: KeyInstruction = transposedKey(0, 0);
            expect(name(calculator.transposePitch(new Pitch(NoteEnum.F, 1, AccidentalEnum.SHARP), key, -2)), "F#m7b5 -> Em7b5")
                .to.equal("E1");
            expect(name(calculator.transposePitch(new Pitch(NoteEnum.F, 1, AccidentalEnum.SHARP), transposedKey(0, 2), 3)), "F#m7b5 -> Am7b5")
                .to.equal("A1");
        });

        it("falls back to the default calculator for intervals it can't spell and for microtones", (): void => {
            const fallback: TransposeCalculator = new TransposeCalculator();
            const key: KeyInstruction = transposedKey(0, 6);
            for (const pitch of [
                new Pitch(NoteEnum.B, 4, AccidentalEnum.DOUBLESHARP), // B## a tritone up from C to F# major would be E###
                new Pitch(NoteEnum.C, 4, AccidentalEnum.QUARTERTONESHARP),
            ]) {
                expect(calculator.transposePitch(pitch, key, 6).ToString(), name(pitch))
                    .to.equal(fallback.transposePitch(pitch, key, 6).ToString());
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
            osmd.TransposeCalculator = new IntervalTransposeCalculator();
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

        function staffEntries(): GraphicalStaffEntry[] {
            return osmd.GraphicSheet.MeasureList.flatMap((measures): GraphicalStaffEntry[] => measures[0].staffEntries);
        }

        function noteNames(): string[] {
            return staffEntries()
                .flatMap((entry: GraphicalStaffEntry): GraphicalNote[] => entry.graphicalVoiceEntries.flatMap(
                    (voiceEntry): GraphicalNote[] => voiceEntry.notes,
                ))
                .map((note: GraphicalNote): Pitch => note.sourceNote.TransposedPitch ?? note.sourceNote.Pitch)
                .map((pitch: Pitch): string => name(pitch).replace(/-?\d+$/, "")); // without the octave (OSMD's octave 1 is MusicXML's 4)
        }

        function chordTexts(): string[] {
            return staffEntries()
                .flatMap((entry: GraphicalStaffEntry): GraphicalChordSymbolContainer[] => entry.graphicalChordContainers)
                .map((chord: GraphicalChordSymbolContainer): string => chord.GraphicalLabel.Label.text);
        }

        function firstKey(): number {
            return osmd.Sheet.SourceMeasures[0].FirstInstructionsStaffEntries[0].Instructions
                .find((instruction): instruction is KeyInstruction => instruction instanceof KeyInstruction).Key;
        }

        it("spells notes and chord symbols by interval, and restores them when transposing back", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_interval_spelling.musicxml"));
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

        it("spells chord symbols far from the key simply, unless SimpleChordSymbolSpelling is off", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_interval_chord_spelling.musicxml"));
            transposeTo(1);
            expect(firstKey(), "Eb major").to.equal(-3);
            expect(chordTexts()).to.deep.equal(["Emaj7", "A7", "Bm7/D"]);
            expect(noteNames(), "the notes keep the interval spelling").to.deep.equal(["Eb", "Bbb", "Cb", "Bb"]);
            transposeTo(2);
            expect(chordTexts(), "E major: by interval, not A#7 and Cm7/D#").to.deep.equal(["Fmaj7", "Bb7", "Cm7/Eb"]);

            (osmd.TransposeCalculator as IntervalTransposeCalculator).SimpleChordSymbolSpelling = false;
            (osmd.TransposeCalculator as IntervalTransposeCalculator).AvoidDoubleAccidentals = true;
            transposeTo(1);
            expect(chordTexts(), "by interval, without double accidentals").to.deep.equal(["Fbmaj7", "A7", "Cbm7/D"]);
            expect(noteNames()).to.deep.equal(["Eb", "A", "Cb", "Bb"]);
        });

        it("transposes chord symbols by Sheet.Transpose when the instrument is transposed as well", async (): Promise<void> => {
            await osmd.load(TestUtils.getScore("test_transposing_interval_spelling.musicxml"));
            osmd.Sheet.Instruments[0].Transpose = 2;
            transposeTo(-2);
            expect(noteNames(), "the notes are transposed by -2 + 2").to.deep.equal(["A#", "B", "D#", "E", "C", "Bb", "C"]);
            expect(chordTexts(), "the chords by -2 only").to.deep.equal(["Dbmaj7", "Em7b5"]);
        });
    });
});

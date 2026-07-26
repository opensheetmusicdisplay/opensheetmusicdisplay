import { expect } from "chai";
import { TransposeCalculator } from "../../../src/Plugins/Transpose/TransposeCalculator";
import { Pitch, NoteEnum, AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { KeyInstruction, KeyEnum } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";

describe("TransposeCalculator Unit Tests:", () => {
    /** The 12 key signatures that transposeKey can produce, so the ones a transposed score can end up in. */
    const keyTypes: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
    const modes: KeyEnum[] = [KeyEnum.major, KeyEnum.minor];
    const letters: string[] = ["C", "D", "E", "F", "G", "A", "B"];
    const singleAccidentals: string[] = ["", "#", "b"];
    const allAccidentals: string[] = ["", "#", "b", "x", "bb"];

    const noteEnumOfLetter: { [letter: string]: NoteEnum } = {
        C: NoteEnum.C, D: NoteEnum.D, E: NoteEnum.E, F: NoteEnum.F, G: NoteEnum.G, A: NoteEnum.A, B: NoteEnum.B,
    };
    const accidentalOfSuffix: { [suffix: string]: AccidentalEnum } = {
        "": AccidentalEnum.NONE, "#": AccidentalEnum.SHARP, "b": AccidentalEnum.FLAT,
        "x": AccidentalEnum.DOUBLESHARP, "bb": AccidentalEnum.DOUBLEFLAT,
    };
    const suffixOfAccidental: { [accidental: number]: string } = {
        [AccidentalEnum.NONE]: "", [AccidentalEnum.NATURAL]: "n", [AccidentalEnum.SHARP]: "#",
        [AccidentalEnum.FLAT]: "b", [AccidentalEnum.DOUBLESHARP]: "x", [AccidentalEnum.DOUBLEFLAT]: "bb",
        [AccidentalEnum.TRIPLESHARP]: "#x", [AccidentalEnum.TRIPLEFLAT]: "bbb",
    };

    /** "Ab" / "F#" / "Cbb" -> Pitch. */
    function pitch(noteName: string, octave: number = 4): Pitch {
        const match: RegExpMatchArray = noteName.match(/^([A-G])(x|bb|#|b)?$/);
        return new Pitch(noteEnumOfLetter[match[1]], octave, accidentalOfSuffix[match[2] ?? ""]);
    }

    /** Pitch -> "Ab" / "F#". Unrepresentable accidentals become "?", so a test can never pass by accident. */
    function name(transposedPitch: Pitch): string {
        return Pitch.getNoteEnumString(transposedPitch.FundamentalNote) + (suffixOfAccidental[transposedPitch.Accidental] ?? "?");
    }

    function calculatorWithStrictSpelling(strict: boolean): TransposeCalculator {
        const calculator: TransposeCalculator = new TransposeCalculator();
        calculator.rules = new EngravingRules();
        calculator.rules.StrictTransposeSpelling = strict;
        return calculator;
    }

    /** Transposes the way MusicSheetCalculator does: transpose the key first, then pass that key along with the note. */
    function transpose(calculator: TransposeCalculator, notePitch: Pitch, keyType: number, halftones: number,
                       mode: KeyEnum = KeyEnum.major): Pitch {
        const key: KeyInstruction = new KeyInstruction(undefined, keyType, mode);
        calculator.transposeKey(key, halftones);
        return calculator.transposePitch(notePitch, key, halftones);
    }

    /** Shorthand: transpose a note given by name, return the resulting name. */
    function spell(calculator: TransposeCalculator, noteName: string, keyType: number, halftones: number,
                   mode: KeyEnum = KeyEnum.major): string {
        return name(transpose(calculator, pitch(noteName), keyType, halftones, mode));
    }

    /** How many letter names a transposition moves a note, e.g. C -> Eb is 2. */
    function letterSteps(fromName: string, toName: string): number {
        return (letters.indexOf(toName[0]) - letters.indexOf(fromName[0]) + 7) % 7;
    }

    describe("strict transpose spelling", () => {
        const strict: TransposeCalculator = calculatorWithStrictSpelling(true);

        it("keeps flats flat instead of choosing an easier sharp", (done: Mocha.Done) => {
            // the four transpositions where the default mode forces Ab to a sharp
            expect(spell(strict, "Ab", 0, 2)).to.equal("Bb");   // to D major, default gives A#
            expect(spell(strict, "Ab", 0, 5)).to.equal("Db");   // to F major, default gives C#
            expect(spell(strict, "Ab", 0, 7)).to.equal("Eb");   // to G major, default gives D#
            expect(spell(strict, "Ab", 0, 10)).to.equal("Gb");  // to Bb major, default gives F#
            done();
        });

        it("keeps sharps sharp, including in keys with three or more flats", (done: Mocha.Done) => {
            expect(spell(strict, "D#", 0, 3)).to.equal("F#");   // to Eb major, default gives Gb
            expect(spell(strict, "A#", 0, 3)).to.equal("C#");   // to Eb major, default gives Db
            expect(spell(strict, "A#", 0, 8)).to.equal("F#");   // to Ab major, default gives Gb
            done();
        });

        it("spells Cb/Fb/E#/B# instead of substituting the enharmonic natural", (done: Mocha.Done) => {
            expect(spell(strict, "Ab", 0, 3)).to.equal("Cb");   // b6 of Eb major, default gives B
            expect(spell(strict, "Eb", 0, 8)).to.equal("Cb");   // default gives B
            expect(spell(strict, "Db", 0, 10)).to.equal("Cb");  // default gives B
            expect(spell(strict, "B", 0, 6)).to.equal("E#");
            expect(spell(strict, "F#", 0, 6)).to.equal("B#");
            done();
        });

        it("produces double accidentals where they are the correct spelling", (done: Mocha.Done) => {
            expect(spell(strict, "Ab", 0, 1)).to.equal("Bbb");  // up a minor 2nd
            expect(spell(strict, "Ab", 0, 8)).to.equal("Fb");
            expect(spell(strict, "C#", 0, 6)).to.equal("Fx");   // up an augmented 4th
            expect(spell(strict, "D#", 0, 6)).to.equal("Gx");
            done();
        });

        it("keeps an enclosure's written direction (the reported failure)", (done: Mocha.Done) => {
            // upper neighbour flat, lower neighbour sharp: Ab-F#-G around G, and Db-B-C around C
            const enclosures: [number, string[]][] = [
                [2, ["Bb", "G#", "A", "Eb", "C#", "D"]],
                [3, ["Cb", "A", "Bb", "Fb", "D", "Eb"]],
                [5, ["Db", "B", "C", "Gb", "E", "F"]],
                [7, ["Eb", "C#", "D", "Ab", "F#", "G"]],
                [10, ["Gb", "E", "F", "Cb", "A", "Bb"]],
            ];
            for (const [halftones, expected] of enclosures) {
                const result: string[] = ["Ab", "F#", "G", "Db", "B", "C"].map(n => spell(strict, n, 0, halftones));
                expect(result, `transposing the enclosure by ${halftones}`).to.deep.equal(expected);
            }
            done();
        });

        it("keeps enharmonically distinct notes distinct", (done: Mocha.Done) => {
            for (const keyType of keyTypes) {
                for (let halftones: number = -12; halftones <= 12; halftones++) {
                    if (halftones === 0) {
                        continue;
                    }
                    expect(spell(strict, "C#", keyType, halftones),
                           `C# must not be spelled like Db (key ${keyType}, ${halftones} halftones)`)
                        .to.not.equal(spell(strict, "Db", keyType, halftones));
                    expect(spell(strict, "G#", keyType, halftones))
                        .to.not.equal(spell(strict, "Ab", keyType, halftones));
                }
            }
            done();
        });

        it("moves every note by the same number of letter names", (done: Mocha.Done) => {
            // this is the defining property: the transposition is one interval, applied to every note
            for (const keyType of keyTypes) {
                for (const mode of modes) {
                    for (let halftones: number = -12; halftones <= 12; halftones++) {
                        if (halftones === 0) {
                            continue;
                        }
                        const expectedSteps: number = letterSteps("C", spell(strict, "C", keyType, halftones, mode));
                        for (const letter of letters) {
                            for (const accidental of singleAccidentals) {
                                const noteName: string = letter + accidental;
                                const result: string = spell(strict, noteName, keyType, halftones, mode);
                                expect(letterSteps(noteName, result),
                                       `${noteName} in key ${keyType} by ${halftones} gave ${result}`)
                                    .to.equal(expectedSteps);
                            }
                        }
                    }
                }
            }
            done();
        });

        it("uses the generic interval of the transposition, from C major", (done: Mocha.Done) => {
            // semitones -> letter names moved: 2nds 1, 3rds 2, 4ths 3, 5th 4, 6ths 5, 7ths 6
            const expectedSteps: { [halftones: number]: number } = {
                1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6,
                [-1]: 6, [-2]: 6, [-3]: 5, [-4]: 5, [-5]: 4, [-6]: 3, [-7]: 3, [-8]: 2, [-9]: 2, [-10]: 1, [-11]: 1,
            };
            for (const halftones of Object.keys(expectedSteps).map(Number)) {
                expect(letterSteps("C", spell(strict, "C", 0, halftones)), `${halftones} halftones`)
                    .to.equal(expectedSteps[halftones]);
            }
            done();
        });

        it("takes the interval from the key pair, not from the halftone count alone", (done: Mocha.Done) => {
            // transposeKey picks the enharmonic key signature, and the spelling follows it:
            //   Db major + 1 lands in D major, which is an augmented unison, so no letter name moves
            const augmentedUnison: [string, string][] = [
                ["Db", "D"], ["Eb", "E"], ["F", "F#"], ["Gb", "G"], ["Ab", "A"], ["Bb", "B"], ["C", "C#"],
            ];
            for (const [source, expected] of augmentedUnison) {
                expect(spell(strict, source, -5, 1), `${source} in Db major by 1`).to.equal(expected);
            }
            // Ab major + 3 lands in B major (not Cb major), an augmented 2nd, so letter names move by 1, not 2
            const augmentedSecond: [string, string][] = [
                ["Ab", "B"], ["Bb", "C#"], ["C", "D#"], ["Db", "E"], ["Eb", "F#"], ["F", "G#"], ["G", "A#"],
            ];
            for (const [source, expected] of augmentedSecond) {
                expect(spell(strict, source, -4, 3), `${source} in Ab major by 3`).to.equal(expected);
            }
            done();
        });

        it("gives the same spelling in major and minor keys", (done: Mocha.Done) => {
            for (const keyType of keyTypes) {
                for (let halftones: number = -12; halftones <= 12; halftones++) {
                    if (halftones === 0) {
                        continue;
                    }
                    for (const letter of letters) {
                        for (const accidental of singleAccidentals) {
                            expect(spell(strict, letter + accidental, keyType, halftones, KeyEnum.major))
                                .to.equal(spell(strict, letter + accidental, keyType, halftones, KeyEnum.minor));
                        }
                    }
                }
            }
            done();
        });

        it("changes octave at the right place", (done: Mocha.Done) => {
            const cases: [string, number, number, string, number][] = [
                ["B", 4, 1, "C", 5],       // crossing up over B/C
                ["B", 4, 2, "C#", 5],
                ["C", 4, -1, "B", 3],      // crossing down over C/B
                ["C", 4, -2, "Bb", 3],
                ["Cb", 4, -1, "Bb", 3],    // the letter is already below the pitch
                ["B#", 4, 1, "C#", 5],     // the letter is already above the pitch
                ["A", 4, 3, "C", 5],
                ["G", 4, 5, "C", 5],
                ["C", 4, 12, "C", 5],      // whole octaves
                ["C", 4, -12, "C", 3],
                ["C", 4, 24, "C", 6],
                ["C", 4, -24, "C", 2],
                ["B", 4, 13, "C", 6],      // more than an octave, plus a letter crossing
                ["C", 0, -1, "B", -1],     // extreme octaves
                ["B", 9, 1, "C", 10],
            ];
            for (const [noteName, octave, halftones, expectedName, expectedOctave] of cases) {
                const result: Pitch = transpose(strict, pitch(noteName, octave), 0, halftones);
                expect(`${name(result)}${result.Octave}`, `${noteName}${octave} by ${halftones}`)
                    .to.equal(`${expectedName}${expectedOctave}`);
            }
            done();
        });

        it("preserves the exact pitch for every note, key, mode and interval", (done: Mocha.Done) => {
            for (const keyType of keyTypes) {
                for (const mode of modes) {
                    for (let halftones: number = -12; halftones <= 12; halftones++) {
                        if (halftones === 0) {
                            continue;
                        }
                        for (const letter of letters) {
                            for (const accidental of allAccidentals) {
                                for (const octave of [1, 4, 7]) {
                                    const source: Pitch = pitch(letter + accidental, octave);
                                    const result: Pitch = transpose(strict, source, keyType, halftones, mode);
                                    expect(result.getHalfTone() - source.getHalfTone(),
                                           `${letter}${accidental}${octave} in key ${keyType} by ${halftones}`)
                                        .to.equal(halftones);
                                }
                            }
                        }
                    }
                }
            }
            done();
        });

        it("never returns an accidental that cannot be drawn", (done: Mocha.Done) => {
            const drawable: AccidentalEnum[] = [
                AccidentalEnum.NONE, AccidentalEnum.NATURAL, AccidentalEnum.SHARP, AccidentalEnum.FLAT,
                AccidentalEnum.DOUBLESHARP, AccidentalEnum.DOUBLEFLAT, AccidentalEnum.TRIPLESHARP, AccidentalEnum.TRIPLEFLAT,
            ];
            for (const keyType of keyTypes) {
                for (let halftones: number = -12; halftones <= 12; halftones++) {
                    if (halftones === 0) {
                        continue;
                    }
                    for (const letter of letters) {
                        for (const accidental of allAccidentals) {
                            const result: Pitch = transpose(strict, pitch(letter + accidental), keyType, halftones);
                            expect(drawable, `${letter}${accidental} in key ${keyType} by ${halftones}`)
                                .to.contain(result.Accidental);
                        }
                    }
                }
            }
            done();
        });

        it("falls back to the default spelling when no accidental could express it", (done: Mocha.Done) => {
            // E## down a diminished 7th would need a quadruple flat, so the default spelling is used instead
            const fallback: Pitch = transpose(strict, pitch("Ex"), -5, -9);
            const asDefault: Pitch = transpose(calculatorWithStrictSpelling(false), pitch("Ex"), -5, -9);
            expect(name(fallback)).to.equal(name(asDefault));
            expect(fallback.getHalfTone() - pitch("Ex").getHalfTone()).to.equal(-9);
            done();
        });

        it("never needs the fallback for notes with at most one accidental", (done: Mocha.Done) => {
            for (const keyType of keyTypes) {
                for (const mode of modes) {
                    for (let halftones: number = -12; halftones <= 12; halftones++) {
                        if (halftones === 0) {
                            continue;
                        }
                        const expectedSteps: number = letterSteps("C", spell(strict, "C", keyType, halftones, mode));
                        for (const letter of letters) {
                            for (const accidental of singleAccidentals) {
                                const noteName: string = letter + accidental;
                                expect(letterSteps(noteName, spell(strict, noteName, keyType, halftones, mode)),
                                       `${noteName} in key ${keyType} by ${halftones} fell back`)
                                    .to.equal(expectedSteps);
                            }
                        }
                    }
                }
            }
            done();
        });

        it("maps the tonic of the original key onto the tonic of the transposed key", (done: Mocha.Done) => {
            // including key signatures that are not in the mapping themselves (C# major, Cb major)
            const tonics: [number, string][] = [
                [0, "C"], [1, "G"], [2, "D"], [3, "A"], [4, "E"], [5, "B"], [6, "F#"],
                [-1, "F"], [-2, "Bb"], [-3, "Eb"], [-4, "Ab"], [-5, "Db"], [7, "C#"], [-7, "Cb"],
            ];
            const tonicOfKeyType: { [keyType: number]: string } = {
                0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#",
                [-1]: "F", [-2]: "Bb", [-3]: "Eb", [-4]: "Ab", [-5]: "Db",
            };
            for (const [keyType, tonic] of tonics) {
                for (const halftones of [1, 2, 3, 4, 5, 6, 7, -2, -3, -5, -7]) {
                    const key: KeyInstruction = new KeyInstruction(undefined, keyType, KeyEnum.major);
                    strict.transposeKey(key, halftones);
                    const result: string = name(strict.transposePitch(pitch(tonic), key, halftones));
                    expect(result, `${tonic} major by ${halftones} draws key ${key.Key}`)
                        .to.equal(tonicOfKeyType[key.Key]);
                }
            }
            done();
        });

        it("does not throw without a key instruction", (done: Mocha.Done) => {
            expect(() => strict.transposePitch(pitch("Ab"), undefined, 2)).to.not.throw();
            done();
        });

        it("returns the same pitch object when not transposing", (done: Mocha.Done) => {
            const source: Pitch = pitch("Eb");
            expect(strict.transposePitch(source, new KeyInstruction(undefined, 0, KeyEnum.major), 0)).to.equal(source);
            done();
        });
    });

    describe("default (non-strict) transpose spelling", () => {
        const defaultCalculator: TransposeCalculator = new TransposeCalculator();

        /** The default mode picks the spelling from the key it lands in, so the key is set directly here. */
        function spellInKey(noteName: string, destinationKeyType: number, halftones: number,
                            mode: KeyEnum = KeyEnum.major): string {
            const key: KeyInstruction = new KeyInstruction(undefined, destinationKeyType, mode);
            return name(defaultCalculator.transposePitch(pitch(noteName), key, halftones));
        }

        it("still forces the documented sharp in the five keys that override it", (done: Mocha.Done) => {
            // unconditional: fires even when the note was written as a flat
            for (const mode of modes) {
                expect(spellInKey("G", 0, 1, mode)).to.equal("G#");     // C major / A minor:  Ab -> G#
                expect(spellInKey("Bb", 0, -2, mode)).to.equal("G#");
                expect(spellInKey("D", 1, 1, mode)).to.equal("D#");     // G major / E minor:  Eb -> D#
                expect(spellInKey("A", 2, 1, mode)).to.equal("A#");     // D major / B minor:  Bb -> A#
                expect(spellInKey("F", -2, 1, mode)).to.equal("F#");    // Bb major / G minor: Gb -> F#
                expect(spellInKey("C", -1, 1, mode)).to.equal("C#");    // F major / D minor:  Db -> C#
            }
            done();
        });

        it("still spells the raised degree below in sharp keys, unless the note was flat", (done: Mocha.Done) => {
            for (const mode of modes) {
                expect(spellInKey("E", 3, 1, mode)).to.equal("E#");     // A major / F# minor: F -> E#
                expect(spellInKey("B", 4, 1, mode)).to.equal("B#");     // E major / C# minor: C -> B#
                expect(spellInKey("F", 5, 2, mode)).to.equal("Fx");     // B major / G# minor: G -> Fx
                expect(spellInKey("Gb", 3, -1, mode)).to.equal("F");    // a flat note is left alone
            }
            done();
        });

        it("still never uses sharps in keys with three or more flats", (done: Mocha.Done) => {
            for (const keyType of [-3, -4, -5]) {
                for (const mode of modes) {
                    for (const noteName of ["C#", "D#", "F#", "G#", "A#"]) {
                        expect(spellInKey(noteName, keyType, 1, mode), `${noteName} in key ${keyType}`)
                            .to.not.contain("#");
                    }
                }
            }
            done();
        });

        it("behaves identically whether rules are absent, empty or switched off", (done: Mocha.Done) => {
            const withoutRules: TransposeCalculator = new TransposeCalculator();
            const switchedOff: TransposeCalculator = calculatorWithStrictSpelling(false);
            for (const keyType of keyTypes) {
                for (const mode of modes) {
                    for (let halftones: number = -12; halftones <= 12; halftones++) {
                        if (halftones === 0) {
                            continue;
                        }
                        for (const letter of letters) {
                            for (const accidental of allAccidentals) {
                                const noteName: string = letter + accidental;
                                const reference: string = spell(withoutRules, noteName, keyType, halftones, mode);
                                expect(spell(switchedOff, noteName, keyType, halftones, mode),
                                       `${noteName} in key ${keyType} by ${halftones}`).to.equal(reference);
                            }
                        }
                    }
                }
            }
            done();
        });

        it("preserves the exact pitch for every note, key, mode and interval", (done: Mocha.Done) => {
            for (const keyType of keyTypes) {
                for (const mode of modes) {
                    for (let halftones: number = -12; halftones <= 12; halftones++) {
                        if (halftones === 0) {
                            continue;
                        }
                        for (const letter of letters) {
                            for (const accidental of allAccidentals) {
                                const source: Pitch = pitch(letter + accidental);
                                const result: Pitch = transpose(defaultCalculator, source, keyType, halftones, mode);
                                expect(result.getHalfTone() - source.getHalfTone(),
                                       `${letter}${accidental} in key ${keyType} by ${halftones}`)
                                    .to.equal(halftones);
                            }
                        }
                    }
                }
            }
            done();
        });

        it("returns the same pitch object when not transposing", (done: Mocha.Done) => {
            const source: Pitch = pitch("Eb");
            expect(defaultCalculator.transposePitch(source, new KeyInstruction(undefined, 0, KeyEnum.major), 0)).to.equal(source);
            done();
        });
    });

    describe("transposeKey", () => {
        const calculator: TransposeCalculator = new TransposeCalculator();

        function transposedKeyType(keyType: number, halftones: number): number {
            const key: KeyInstruction = new KeyInstruction(undefined, keyType, KeyEnum.major);
            calculator.transposeKey(key, halftones);
            return key.Key;
        }

        it("picks the key signature of the transposed key", (done: Mocha.Done) => {
            const expected: number[] = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]; // C Db D Eb E F F# G Ab A Bb B
            for (let halftones: number = 0; halftones < 12; halftones++) {
                expect(transposedKeyType(0, halftones), `C major by ${halftones}`).to.equal(expected[halftones]);
            }
            done();
        });

        it("wraps downwards the same way", (done: Mocha.Done) => {
            for (let halftones: number = 1; halftones < 12; halftones++) {
                expect(transposedKeyType(0, -halftones), `C major by -${halftones}`)
                    .to.equal(transposedKeyType(0, 12 - halftones));
            }
            done();
        });

        it("restores the original key signature for whole octaves", (done: Mocha.Done) => {
            for (const keyType of keyTypes.concat([7, -7])) {
                for (const halftones of [-24, -12, 0, 12, 24]) {
                    expect(transposedKeyType(keyType, halftones), `key ${keyType} by ${halftones}`).to.equal(keyType);
                }
            }
            done();
        });

        it("normalizes key signatures with seven sharps or flats", (done: Mocha.Done) => {
            // C# major (7 sharps) is treated as Db, Cb major (7 flats) as B
            expect(transposedKeyType(7, 2)).to.equal(transposedKeyType(-5, 2));
            expect(transposedKeyType(-7, 2)).to.equal(transposedKeyType(5, 2));
            done();
        });

        it("records what it was transposed by", (done: Mocha.Done) => {
            const key: KeyInstruction = new KeyInstruction(undefined, 0, KeyEnum.major);
            calculator.transposeKey(key, 3);
            expect(key.isTransposedBy).to.equal(3);
            expect(key.keyTypeOriginal).to.equal(0);
            done();
        });
    });
});

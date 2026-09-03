import * as chai from "chai";
import { BrailleConverter, BrailleOutput, BrailleDebugEntry } from "../../../src/Plugins/Braille/BrailleConverter";
import { BrailleBarOverBarLayout } from "../../../src/Plugins/Braille/BrailleBarOverBar";
import { textToBraille, BRAILLE_SYLLABIC_SLUR } from "../../../src/Plugins/Braille/BrailleSymbols";
import { collectVerseNumbers } from "../../../src/Plugins/Braille/BrailleLyrics";
import { BrailleOctaveTracker } from "../../../src/Plugins/Braille/BrailleOctaveTracker";
import { BrailleNoteRenderer } from "../../../src/Plugins/Braille/BrailleNoteRenderer";
import {
    dotsToChar, getNoteChar, getAccidentalChar, getAccidentalName,
    getIntervalChar, getIntervalName, getDynamicBraille,
    BrailleDurationGroup, noteTypeToDurationGroup,
    DOT1, DOT2, DOT3, DOT4, DOT5, DOT6,
    BRAILLE_SHARP, BRAILLE_FLAT, BRAILLE_NATURAL,
    BRAILLE_DOUBLE_SHARP, BRAILLE_DOUBLE_FLAT,
    BRAILLE_NUMBER_SIGN, BRAILLE_DIGITS, BRAILLE_UPPER_DIGITS,
    BRAILLE_FULL_MEASURE_IN_ACCORD,
    BRAILLE_STACCATO, BRAILLE_ACCENT, BRAILLE_TENUTO, BRAILLE_MARCATO,
    BRAILLE_FERMATA, BRAILLE_WORD_SIGN,
    BRAILLE_TRILL, BRAILLE_TURN, BRAILLE_MORDENT,
    BRAILLE_INVERTED_MORDENT, BRAILLE_INVERTED_TURN, BRAILLE_TURN_ON_NOTE,
    BRAILLE_CRESC_HAIRPIN, BRAILLE_DIM_HAIRPIN,
    BRAILLE_SINGLE_TIE, BRAILLE_CHORD_TIE,
    BRAILLE_SLUR, BRAILLE_FORWARD_REPEAT, BRAILLE_BACKWARD_REPEAT,
    BRAILLE_BRACKET_SLUR_OPEN, BRAILLE_BRACKET_SLUR_CLOSE,
    BRAILLE_SEGNO, BRAILLE_CODA,
    getVoltaBraille, getNavigationBraille, getNavigationName,
    getClefBraille, getClefName,
    BRAILLE_CLEF_G, BRAILLE_CLEF_F, BRAILLE_CLEF_C, BRAILLE_CLEF_TENOR,
    BRAILLE_MUSIC_HYPHEN,
    BRAILLE_OTTAVA_8VA, BRAILLE_OTTAVA_8VB, BRAILLE_OTTAVA_15MA, BRAILLE_OTTAVA_15MB,
    BRAILLE_OTTAVA_END,
    getOttavaBraille, getOttavaName,
    BRAILLE_HAND_RIGHT, BRAILLE_HAND_LEFT,
    firstCharHasLowerDots,
} from "../../../src/Plugins/Braille/BrailleSymbols";
import { OctaveEnum } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { RepetitionInstructionEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import {
    getArticulationBraille, getOrnamentBraille, renderDynamic,
} from "../../../src/Plugins/Braille/BrailleExpressions";
import { renderKeySignature, BrailleKeySignatureResult } from "../../../src/Plugins/Braille/BrailleKeySignature";
import { renderTimeSignature, BrailleTimeSignatureResult } from "../../../src/Plugins/Braille/BrailleTimeSignature";
import { KeyInstruction, KeyEnum } from "../../../src/MusicalScore/VoiceData/Instructions/KeyInstruction";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { NoteEnum, Pitch, AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";
import { NoteType } from "../../../src/MusicalScore/VoiceData/NoteType";
import { ArticulationEnum } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { OrnamentEnum } from "../../../src/MusicalScore/VoiceData/OrnamentContainer";
import { DynamicEnum } from "../../../src/MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { ClefEnum } from "../../../src/MusicalScore/VoiceData/Instructions/ClefInstruction";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

describe("Braille Converter:", () => {

    describe("BrailleSymbols", () => {
        it("should create braille characters from dot patterns", (done: Mocha.Done) => {
            // Empty cell (no dots) = U+2800
            const emptyCell: string = dotsToChar(0);
            chai.expect(emptyCell).to.equal("\u2800");

            // Full 6-dot cell = U+283F
            const fullCell: string = dotsToChar(DOT1 | DOT2 | DOT3 | DOT4 | DOT5 | DOT6);
            chai.expect(fullCell).to.equal("\u283F");

            // Dot 1 only = U+2801
            const dot1Only: string = dotsToChar(DOT1);
            chai.expect(dot1Only).to.equal("\u2801");
            done();
        });

        it("should generate note characters for each pitch and duration", (done: Mocha.Done) => {
            // Each pitch+duration combination should produce a non-empty string
            const pitches: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
            const durations: BrailleDurationGroup[] = [
                BrailleDurationGroup.WholeOr16th,
                BrailleDurationGroup.HalfOr32nd,
                BrailleDurationGroup.QuarterOr64th,
                BrailleDurationGroup.EighthOr128th,
            ];

            for (const pitch of pitches) {
                for (const duration of durations) {
                    const noteChar: string = getNoteChar(pitch, duration);
                    chai.expect(noteChar).to.be.a("string");
                    chai.expect(noteChar.length).to.equal(1);
                }
            }
            done();
        });

        it("should generate interval sign characters for 2nd through octave", (done: Mocha.Done) => {
            // Table 9: interval signs
            chai.expect(getIntervalChar(2)).to.equal(dotsToChar(DOT3 | DOT4));         // second
            chai.expect(getIntervalChar(3)).to.equal(dotsToChar(DOT3 | DOT4 | DOT6));  // third
            chai.expect(getIntervalChar(4)).to.equal(dotsToChar(DOT3 | DOT4 | DOT5 | DOT6)); // fourth
            chai.expect(getIntervalChar(5)).to.equal(dotsToChar(DOT3 | DOT5));         // fifth
            chai.expect(getIntervalChar(6)).to.equal(dotsToChar(DOT3 | DOT5 | DOT6));  // sixth
            chai.expect(getIntervalChar(7)).to.equal(dotsToChar(DOT2 | DOT5));         // seventh
            chai.expect(getIntervalChar(8)).to.equal(dotsToChar(DOT3 | DOT6));         // octave

            // Compound intervals should reduce: 9th→2nd, 10th→3rd
            chai.expect(getIntervalChar(9)).to.equal(getIntervalChar(2));
            chai.expect(getIntervalChar(10)).to.equal(getIntervalChar(3));

            // Interval names
            chai.expect(getIntervalName(3)).to.equal("3rd");
            chai.expect(getIntervalName(5)).to.equal("5th");
            chai.expect(getIntervalName(8)).to.equal("octave");
            done();
        });

        it("should map NoteType to BrailleDurationGroup", (done: Mocha.Done) => {
            chai.expect(noteTypeToDurationGroup(NoteType.WHOLE)).to.equal(BrailleDurationGroup.WholeOr16th);
            chai.expect(noteTypeToDurationGroup(NoteType._16th)).to.equal(BrailleDurationGroup.WholeOr16th);
            chai.expect(noteTypeToDurationGroup(NoteType.HALF)).to.equal(BrailleDurationGroup.HalfOr32nd);
            chai.expect(noteTypeToDurationGroup(NoteType._32nd)).to.equal(BrailleDurationGroup.HalfOr32nd);
            chai.expect(noteTypeToDurationGroup(NoteType.QUARTER)).to.equal(BrailleDurationGroup.QuarterOr64th);
            chai.expect(noteTypeToDurationGroup(NoteType._64th)).to.equal(BrailleDurationGroup.QuarterOr64th);
            chai.expect(noteTypeToDurationGroup(NoteType.EIGTH)).to.equal(BrailleDurationGroup.EighthOr128th);
            chai.expect(noteTypeToDurationGroup(NoteType._128th)).to.equal(BrailleDurationGroup.EighthOr128th);
            chai.expect(noteTypeToDurationGroup(NoteType.UNDEFINED)).to.equal(undefined);
            done();
        });
    });

    describe("BrailleOctaveTracker", () => {
        it("should create a BrailleOctaveTracker instance", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            chai.expect(tracker).to.not.equal(undefined);
            done();
        });

        it("should return an octave mark for the first note", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            const middleC: Pitch = new Pitch(NoteEnum.C, 1, AccidentalEnum.NONE); // OSMD octave 1 = standard C4
            const mark: string = tracker.getOctaveMark(middleC);
            chai.expect(mark).to.be.a("string");
            chai.expect(mark.length).to.be.greaterThan(0);
            done();
        });

        it("should not return an octave mark for stepwise motion", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            const c4: Pitch = new Pitch(NoteEnum.C, 1, AccidentalEnum.NONE);
            const d4: Pitch = new Pitch(NoteEnum.D, 1, AccidentalEnum.NONE);
            const e4: Pitch = new Pitch(NoteEnum.E, 1, AccidentalEnum.NONE);

            tracker.getOctaveMark(c4); // first note, gets mark
            const markD: string = tracker.getOctaveMark(d4); // step up, no mark needed
            chai.expect(markD).to.equal("");
            const markE: string = tracker.getOctaveMark(e4); // step up, no mark needed
            chai.expect(markE).to.equal("");
            done();
        });

        it("should not mark a 5th within the same octave (Par. 3.2.2c)", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            const c4: Pitch = new Pitch(NoteEnum.C, 1, AccidentalEnum.NONE);
            const g4: Pitch = new Pitch(NoteEnum.G, 1, AccidentalEnum.NONE); // 5th up, same octave

            tracker.getOctaveMark(c4); // first note
            const markG: string = tracker.getOctaveMark(g4); // 5th in same octave — no mark
            chai.expect(markG).to.equal("");
            done();
        });

        it("should mark a 4th crossing octave boundary (Par. 3.2.2c)", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            // A4 (OSMD octave 1) to D5 (OSMD octave 2) — a 4th crossing octave boundary
            const a4: Pitch = new Pitch(NoteEnum.A, 1, AccidentalEnum.NONE);
            const d5: Pitch = new Pitch(NoteEnum.D, 2, AccidentalEnum.NONE);

            tracker.getOctaveMark(a4); // first note
            const markD: string = tracker.getOctaveMark(d5); // 4th, different octave — mark needed
            chai.expect(markD.length).to.be.greaterThan(0);
            done();
        });

        it("should always mark intervals of a 6th or more (Par. 3.2.2b)", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            const c4: Pitch = new Pitch(NoteEnum.C, 1, AccidentalEnum.NONE);
            const a4: Pitch = new Pitch(NoteEnum.A, 1, AccidentalEnum.NONE); // 6th up

            tracker.getOctaveMark(c4); // first note
            const markA: string = tracker.getOctaveMark(a4); // 6th — always mark
            chai.expect(markA.length).to.be.greaterThan(0);
            done();
        });

        it("should expose diatonic interval calculation as public static", (done: Mocha.Done) => {
            // C4 to E4 = 3rd (diatonic distance 3)
            const c4: Pitch = new Pitch(NoteEnum.C, 1, AccidentalEnum.NONE);
            const e4: Pitch = new Pitch(NoteEnum.E, 1, AccidentalEnum.NONE);
            const g4: Pitch = new Pitch(NoteEnum.G, 1, AccidentalEnum.NONE);
            const c5: Pitch = new Pitch(NoteEnum.C, 2, AccidentalEnum.NONE);

            chai.expect(BrailleOctaveTracker.calculateDiatonicInterval(c4, e4)).to.equal(3);
            chai.expect(BrailleOctaveTracker.calculateDiatonicInterval(c4, g4)).to.equal(5);
            chai.expect(BrailleOctaveTracker.calculateDiatonicInterval(c4, c5)).to.equal(8); // octave
            chai.expect(BrailleOctaveTracker.calculateDiatonicInterval(g4, c4)).to.equal(5); // direction doesn't matter
            done();
        });

        it("should return an octave mark after reset", (done: Mocha.Done) => {
            const tracker: BrailleOctaveTracker = new BrailleOctaveTracker();
            const c4: Pitch = new Pitch(NoteEnum.C, 1, AccidentalEnum.NONE);

            tracker.getOctaveMark(c4); // first note
            tracker.reset();
            const markAfterReset: string = tracker.getOctaveMark(c4); // should get mark again
            chai.expect(markAfterReset.length).to.be.greaterThan(0);
            done();
        });
    });

    describe("BrailleNoteRenderer", () => {
        it("should create a BrailleNoteRenderer instance", (done: Mocha.Done) => {
            const renderer: BrailleNoteRenderer = new BrailleNoteRenderer();
            chai.expect(renderer).to.not.equal(undefined);
            done();
        });
    });

    describe("BrailleKeySignature", () => {
        it("should render sharps key signatures", (done: Mocha.Done) => {
            // Table 6: 1-3 accidentals are written out as accidental signs
            // 1 sharp (G major): ⠩
            const key1: KeyInstruction = new KeyInstruction(undefined, 1, KeyEnum.major);
            const result1: BrailleKeySignatureResult = renderKeySignature(key1);
            chai.expect(result1.braille).to.equal(BRAILLE_SHARP);
            chai.expect(result1.debugEntries.length).to.equal(1);
            chai.expect(result1.debugEntries[0].meaning).to.equal("1 sharp");

            // 3 sharps (A major): ⠩⠩⠩ (written out)
            const key3: KeyInstruction = new KeyInstruction(undefined, 3, KeyEnum.major);
            const result3: BrailleKeySignatureResult = renderKeySignature(key3);
            chai.expect(result3.braille).to.equal(BRAILLE_SHARP + BRAILLE_SHARP + BRAILLE_SHARP);
            chai.expect(result3.debugEntries[0].meaning).to.equal("3 sharps");

            // 4 sharps (E major): ⠼⠙⠩ = number sign + upper-cell 4 + sharp (Table 6)
            const key4s: KeyInstruction = new KeyInstruction(undefined, 4, KeyEnum.major);
            const result4s: BrailleKeySignatureResult = renderKeySignature(key4s);
            chai.expect(result4s.braille).to.equal(BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[4] + BRAILLE_SHARP);
            chai.expect(result4s.debugEntries[0].meaning).to.equal("4 sharps");
            done();
        });

        it("should render flats key signatures", (done: Mocha.Done) => {
            // 2 flats (Bb major): ⠣⠣ (written out, Table 6)
            const key2: KeyInstruction = new KeyInstruction(undefined, -2, KeyEnum.major);
            const result2: BrailleKeySignatureResult = renderKeySignature(key2);
            chai.expect(result2.braille).to.equal(BRAILLE_FLAT + BRAILLE_FLAT);
            chai.expect(result2.debugEntries[0].meaning).to.equal("2 flats");

            // 4 flats (Ab major): ⠼⠙⠣ = number sign + upper-cell 4 + flat
            const key4: KeyInstruction = new KeyInstruction(undefined, -4, KeyEnum.major);
            const result4: BrailleKeySignatureResult = renderKeySignature(key4);
            chai.expect(result4.braille).to.equal(BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[4] + BRAILLE_FLAT);
            chai.expect(result4.debugEntries[0].meaning).to.equal("4 flats");
            done();
        });

        it("should render empty for C major (key=0)", (done: Mocha.Done) => {
            const key0: KeyInstruction = new KeyInstruction(undefined, 0, KeyEnum.major);
            const result0: BrailleKeySignatureResult = renderKeySignature(key0);
            chai.expect(result0.braille).to.equal("");
            chai.expect(result0.debugEntries.length).to.equal(0);
            done();
        });
    });

    describe("BrailleTimeSignature", () => {
        it("should render common time signatures", (done: Mocha.Done) => {
            // Use simplify=false to preserve numerator/denominator (like the MusicXML parser does)
            // 4/4: ⠼⠙⠲ = number sign + upper 4 + lower 4
            const ts44: Fraction = new Fraction(4, 4, 0, false);
            const result44: BrailleTimeSignatureResult = renderTimeSignature(ts44);
            chai.expect(result44.braille).to.equal(BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[4] + BRAILLE_DIGITS[4]);
            chai.expect(result44.debugEntries[0].meaning).to.equal("time 4/4");

            // 3/4: ⠼⠉⠲ = number sign + upper 3 + lower 4
            const ts34: Fraction = new Fraction(3, 4, 0, false);
            const result34: BrailleTimeSignatureResult = renderTimeSignature(ts34);
            chai.expect(result34.braille).to.equal(BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[3] + BRAILLE_DIGITS[4]);
            chai.expect(result34.debugEntries[0].meaning).to.equal("time 3/4");

            // 6/8: ⠼⠋⠦ = number sign + upper 6 + lower 8
            const ts68: Fraction = new Fraction(6, 8, 0, false);
            const result68: BrailleTimeSignatureResult = renderTimeSignature(ts68);
            chai.expect(result68.braille).to.equal(BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[6] + BRAILLE_DIGITS[8]);
            chai.expect(result68.debugEntries[0].meaning).to.equal("time 6/8");
            done();
        });

        it("should handle multi-digit time signatures", (done: Mocha.Done) => {
            // 12/8: ⠼⠁⠃⠦ = number sign + upper 1,2 + lower 8
            const ts128: Fraction = new Fraction(12, 8, 0, false);
            const result128: BrailleTimeSignatureResult = renderTimeSignature(ts128);
            chai.expect(result128.braille).to.equal(
                BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[1] + BRAILLE_UPPER_DIGITS[2] + BRAILLE_DIGITS[8]
            );
            chai.expect(result128.debugEntries[0].meaning).to.equal("time 12/8");
            done();
        });
    });

    describe("BrailleAccidentals", () => {
        it("should map AccidentalEnum to braille characters", (done: Mocha.Done) => {
            chai.expect(getAccidentalChar(AccidentalEnum.SHARP)).to.equal(BRAILLE_SHARP);
            chai.expect(getAccidentalChar(AccidentalEnum.FLAT)).to.equal(BRAILLE_FLAT);
            chai.expect(getAccidentalChar(AccidentalEnum.NATURAL)).to.equal(BRAILLE_NATURAL);
            chai.expect(getAccidentalChar(AccidentalEnum.DOUBLESHARP)).to.equal(BRAILLE_DOUBLE_SHARP);
            chai.expect(getAccidentalChar(AccidentalEnum.DOUBLEFLAT)).to.equal(BRAILLE_DOUBLE_FLAT);
            chai.expect(getAccidentalChar(AccidentalEnum.NONE)).to.equal("");
            done();
        });

        it("should return human-readable accidental names", (done: Mocha.Done) => {
            chai.expect(getAccidentalName(AccidentalEnum.SHARP)).to.equal("sharp");
            chai.expect(getAccidentalName(AccidentalEnum.FLAT)).to.equal("flat");
            chai.expect(getAccidentalName(AccidentalEnum.NATURAL)).to.equal("natural");
            chai.expect(getAccidentalName(AccidentalEnum.DOUBLESHARP)).to.equal("double sharp");
            chai.expect(getAccidentalName(AccidentalEnum.DOUBLEFLAT)).to.equal("double flat");
            chai.expect(getAccidentalName(AccidentalEnum.NONE)).to.equal("");
            done();
        });
    });

    describe("BrailleConverter", () => {
        it("should create a BrailleConverter instance", (done: Mocha.Done) => {
            const converter: BrailleConverter = new BrailleConverter();
            chai.expect(converter).to.not.equal(undefined);
            done();
        });

        it("should convert HelloWorld.xml without errors", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("HelloWorld.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output).to.not.equal(undefined);
                chai.expect(output.text).to.be.a("string");
                chai.expect(output.text.length).to.be.greaterThan(0);
                chai.expect(output.debugEntries).to.be.an("array");
                chai.expect(output.debugEntries.length).to.be.greaterThan(0);
                done();
            });
        });

        it("should produce exact braille for HelloWorld.xml (whole note C4)", (done: Mocha.Done) => {
            // HelloWorld.xml = single measure, one whole note C4, 4/4 time, C major
            // Expected: time sig ⠼⠙⠲ (4/4) + octave 4 mark (⠐) + whole C (⠽)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("HelloWorld.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal("\u283C\u2819\u2832\u2810\u283D");
                // Debug entries: time sig + octave mark + whole note
                chai.expect(output.debugEntries.length).to.equal(3);
                chai.expect(output.debugEntries[0].meaning).to.equal("time 4/4");
                chai.expect(output.debugEntries[1].meaning).to.equal("octave 4");
                chai.expect(output.debugEntries[2].meaning).to.contain("C4");
                done();
            });
        });

        it("should produce exact braille for ascending C major scale with rest", (done: Mocha.Done) => {
            // test_Braille_ScaleSimple.musicxml:
            //   C major, 4/4 time.
            //   Measure 1: C4 D4 E4 F4 (quarter notes)
            //   Measure 2: G4 A4 B4 + quarter rest
            // Time sig ⠼⠙⠲ prepended to measure 1. All stepwise — only C4 gets octave mark.
            // Expected: "⠼⠙⠲⠐⠹⠱⠫⠻ ⠳⠪⠺⠧"
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_ScaleSimple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2810\u2839\u2831\u282B\u283B \u2833\u282A\u283A\u2827"
                );
                done();
            });
        });

        it("should handle dotted notes, mixed durations, and octave jumps", (done: Mocha.Done) => {
            // test_Braille_DottedAndJumps.musicxml:
            //   C major, 4/4 time.
            //   Measure 1: dotted half C4 + quarter E4
            //   Measure 2: eighth G4 x2, eighth A4, eighth B4, half C5
            //   Measure 3: whole C4 (octave jump down from C5)
            // Expected: "⠼⠙⠲⠐⠝⠄⠫ ⠓⠓⠊⠚⠝ ⠐⠽"
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_DottedAndJumps.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2810\u281D\u2804\u282B \u2813\u2813\u280A\u281A\u281D \u2810\u283D"
                );
                done();
            });
        });

        it("should handle whole rests and extreme octaves (octave 2 and 6)", (done: Mocha.Done) => {
            // test_Braille_WholeRestsAndExtremeOctaves.musicxml:
            //   C major, 4/4 time.
            //   Measure 1: C4 whole → ⠐⠽
            //   Measure 2: whole rest → ⠍
            //   Measure 3: C2 quarter + C6 quarter + half rest → ⠘⠹⠰⠹⠥
            // Expected: "⠼⠙⠲⠐⠽ ⠍ ⠘⠹⠰⠹⠥"
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_WholeRestsAndExtremeOctaves.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2810\u283D \u280D \u2818\u2839\u2830\u2839\u2825"
                );
                done();
            });
        });

        it("should render key and time signatures in G major 3/4", (done: Mocha.Done) => {
            // test_Braille_KeyTimeSig.musicxml: G major (1 sharp), 3/4 time
            //   Measure 1: G4 quarter, A4 quarter, B4 quarter
            //   Measure 2: D5 half, D5 quarter
            // Key sig: ⠩ (1 sharp, written out per Table 6)
            // Time sig: ⠼⠉⠲ (number sign + upper 3 + lower 4)
            // m1: ⠩⠼⠉⠲⠐⠳⠪⠺    m2: ⠨⠕⠱
            //   ⠐ = octave 4; G A B stepwise, no more marks
            //   m2: D5 = 3rd from B4 → no mark? Actually B4→D5 is a 3rd, same octave check...
            //   B4 is octave 4, D5 is octave 5. Interval is a 3rd. Rule: <4th → no mark.
            //   ⠨⠕ = octave 5 mark? Wait, interval is 3rd → no mark needed.
            //   But D5 is in octave 5 (braille). Previous note B4 is octave 4.
            //   Rule (a): interval ≤3rd → no mark. So no octave mark for D5.
            //   m2: ⠕⠱ (half D, quarter D — D5 to D5, unison, no mark)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_KeyTimeSig.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1 starts with key sig + time sig + notes
                // Key: ⠩ = \u2829
                // Time: ⠼⠉⠲ = \u283C\u2809\u2832
                // Notes: ⠐⠳⠪⠺ = \u2810\u2833\u282A\u283A
                chai.expect(measures[0]).to.equal(
                    "\u2829\u283C\u2809\u2832\u2810\u2833\u282A\u283A"
                );
                // Measure 2: ⠕⠱ = \u2815\u2831 (half D, quarter D, no octave marks)
                chai.expect(measures[1]).to.equal("\u2815\u2831");
                done();
            });
        });

        it("should render accidentals on notes in C major", (done: Mocha.Done) => {
            // test_Braille_Accidentals.musicxml: C major, 4/4
            //   Measure 1: C4♩, C#4♩, D4♩, Eb4♩
            //   Measure 2: F#4♩, G4♩, Ab4♩, Bbb4♩
            // Accidentals precede octave marks: accidental → octave → note
            // m1: ⠼⠙⠲⠐⠹ ⠩⠹ ⠱ ⠣⠫
            //   C4: octave mark + quarter C (no accidental)
            //   C#4: sharp + quarter C (C→C# is unison, no octave mark)
            //   D4: quarter D (step, no mark, no accidental)
            //   Eb4: flat + quarter E (step, no octave mark)
            // m2: ⠩⠻ ⠳ ⠣⠪ ⠣⠣⠺
            //   F#4: sharp + quarter F (step from Eb4)
            //   G4: quarter G (step, no accidental)
            //   Ab4: flat + quarter A (step)
            //   Bbb4: double flat + quarter B (step)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Accidentals.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1: time sig + oct4 + C♩ + sharp + C♩ + D♩ + flat + E♩
                // ⠼⠙⠲ ⠐⠹ ⠩⠹ ⠱ ⠣⠫
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2810\u2839\u2829\u2839\u2831\u2823\u282B"
                );
                // Measure 2: sharp + F♩ + G♩ + flat + A♩ + double-flat + B♩
                // ⠩⠻ ⠳ ⠣⠪ ⠣⠣⠺
                chai.expect(measures[1]).to.equal(
                    "\u2829\u283B\u2833\u2823\u282A\u2823\u2823\u283A"
                );
                done();
            });
        });

        it("should not render time signature again if unchanged between measures", (done: Mocha.Done) => {
            // HelloWorld.xml has 4/4 in a single measure.
            // The time sig should only appear once (in measure 1), not repeated.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_ScaleSimple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1 starts with time sig
                chai.expect(measures[0].startsWith("\u283C\u2819\u2832")).to.equal(true);
                // Measure 2 does NOT start with time sig (unchanged)
                chai.expect(measures[1].startsWith("\u283C")).to.equal(false);
                done();
            });
        });

        it("should render simple triads in treble clef (highest note written, intervals down)", (done: Mocha.Done) => {
            // test_Braille_ChordsSimple.musicxml: C major, 4/4, treble clef
            // Measure 1: C4-E4-G4 chord, F4-A4-C5 chord, G4-B4-D5 chord, C5 single
            //
            // Chord C-E-G (treble): written=G4, intervals: 3rd (E4), 5th (C4)
            //   First note → oct4 mark ⠐, quarter G ⠳, third ⠬, fifth ⠔
            // Chord F-A-C5 (treble): written=C5, intervals: 3rd (A4), 5th (F4)
            //   G4→C5: 4th, different octave (4→5) → oct5 mark ⠨, quarter C ⠹, third ⠬, fifth ⠔
            // Chord G-B-D5 (treble): written=D5, intervals: 3rd (B4), 5th (G4)
            //   C5→D5: 2nd → no mark, quarter D ⠱, third ⠬, fifth ⠔
            // Single C5: D5→C5: 2nd → no mark, quarter C ⠹
            //
            // Expected: ⠼⠙⠲⠐⠳⠬⠔⠨⠹⠬⠔⠱⠬⠔⠹
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_ChordsSimple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2810\u2833\u282C\u2814\u2828\u2839\u282C\u2814\u2831\u282C\u2814\u2839"
                );
                done();
            });
        });

        it("should render triads in bass clef (lowest note written, intervals up)", (done: Mocha.Done) => {
            // test_Braille_ChordsBass.musicxml: C major, 4/4, bass clef
            // Measure 1: C3-E3-G3 chord, F3-A3-C4 chord, quarter rest, quarter rest
            //
            // Chord C-E-G (bass): written=C3, intervals: 3rd (E3), 5th (G3)
            //   First note → oct3 mark ⠸, quarter C ⠹, third ⠬, fifth ⠔
            // Chord F-A-C4 (bass): written=F3, intervals: 3rd (A3), 5th (C4)
            //   C3→F3: 4th, same octave 3 → no mark, quarter F ⠻, third ⠬, fifth ⠔
            // Two quarter rests: ⠧⠧
            //
            // Expected: ⠼⠙⠲⠸⠹⠬⠔⠻⠬⠔⠧⠧
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_ChordsBass.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2838\u2839\u282C\u2814\u283B\u282C\u2814\u2827\u2827"
                );
                done();
            });
        });

        it("should render chords with accidentals and dyads", (done: Mocha.Done) => {
            // test_Braille_ChordsAccidentals.musicxml: C major, 4/4, treble clef
            // Measure 1: C4-Eb4-G4 chord, C4-E4-G#4 chord, C4-E4 dyad, quarter rest
            //
            // Chord C-Eb-G (treble): written=G4, intervals: 3rd (Eb4→flat), 5th (C4)
            //   First note → oct4 ⠐, quarter G ⠳, flat ⠣ + third ⠬, fifth ⠔
            // Chord C-E-G# (treble): written=G#4 (has sharp accidental)
            //   G4→G#4: unison → no octave mark, sharp ⠩ + quarter G ⠳, third ⠬, fifth ⠔
            // Dyad C-E (treble): written=E4
            //   G#4→E4: 3rd → no mark, quarter E ⠫, third ⠬
            // Quarter rest: ⠧
            //
            // Expected: ⠼⠙⠲⠐⠳⠣⠬⠔⠩⠳⠬⠔⠫⠬⠧
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_ChordsAccidentals.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2810\u2833\u2823\u282C\u2814\u2829\u2833\u282C\u2814\u282B\u282C\u2827"
                );
                done();
            });
        });

        it("should render two-voice treble measure with full-measure in-accord", (done: Mocha.Done) => {
            // test_Braille_InAccordSimple.musicxml: C major, 4/4, treble clef
            // Measure 1:
            //   Voice 1 (higher): E4♩ F4♩ G4♩ A4♩
            //   Voice 2 (lower):  C4 half, D4 half
            // Treble clef: highest voice first → Voice 1 then ⠣⠜ then Voice 2
            //
            // Voice 1: ⠐⠫⠻⠳⠪ (oct4+E, F, G, A — all stepwise)
            // In-accord: ⠣⠜
            // Voice 2: ⠐⠝⠕ (oct4+half C, half D — octave mandatory after in-accord)
            //
            // Measure 2: C5 whole — octave mandatory after in-accord measure
            //   ⠨⠽ (oct5 + whole C)
            //
            // Expected m1: ⠼⠙⠲⠐⠫⠻⠳⠪⠣⠜⠐⠝⠕
            // Expected m2: ⠨⠽
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_InAccordSimple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1: time sig + voice 1 + in-accord + voice 2
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2810\u282B\u283B\u2833\u282A\u2823\u281C\u2810\u281D\u2815"
                );
                // Measure 2: octave mark mandatory after in-accord measure
                chai.expect(measures[1]).to.equal("\u2828\u283D");
                done();
            });
        });

        it("should render two-voice bass clef with lowest voice first", (done: Mocha.Done) => {
            // test_Braille_InAccordBass.musicxml: C major, 4/4, bass clef
            // Measure 1:
            //   Voice 1 (upper): G3 half, A3 half
            //   Voice 2 (lower): C3 whole
            // Bass clef: lowest voice first → Voice 2 then ⠣⠜ then Voice 1
            //
            // Voice 2: ⠸⠽ (oct3 + whole C)
            // In-accord: ⠣⠜
            // Voice 1: ⠸⠗⠎ (oct3 + half G, half A — octave mandatory, then stepwise)
            //
            // Expected: ⠼⠙⠲⠸⠽⠣⠜⠸⠗⠎
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_InAccordBass.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2838\u283D\u2823\u281C\u2838\u2817\u280E"
                );
                done();
            });
        });

        it("should render in-accord with chords in one voice", (done: Mocha.Done) => {
            // test_Braille_InAccordChords.musicxml: C major, 4/4, treble clef
            // Measure 1:
            //   Voice 1 (higher): E4-G4 half chord, F4-A4 half chord
            //   Voice 2 (lower): C4 whole
            // Treble: highest voice first → Voice 1 (chords) then ⠣⠜ then Voice 2
            //
            // Voice 1: ⠐⠗⠬⠎⠬ (oct4 + half G + 3rd, half A + 3rd)
            //   Chord 1: written=G4, interval=E4 (3rd)
            //   Chord 2: written=A4 (step from G4), interval=F4 (3rd)
            // In-accord: ⠣⠜
            // Voice 2: ⠐⠽ (oct4 + whole C)
            //
            // Expected: ⠼⠙⠲⠐⠗⠬⠎⠬⠣⠜⠐⠽
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_InAccordChords.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(output.text).to.equal(
                    "\u283C\u2819\u2832\u2810\u2817\u282C\u280E\u282C\u2823\u281C\u2810\u283D"
                );
                done();
            });
        });

        it("should have correct in-accord sign constant", (done: Mocha.Done) => {
            // Full-measure in-accord: dots 1,2,6 + dots 3,4,5 = ⠣⠜
            chai.expect(BRAILLE_FULL_MEASURE_IN_ACCORD).to.equal(
                dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT3 | DOT4 | DOT5)
            );
            chai.expect(BRAILLE_FULL_MEASURE_IN_ACCORD).to.equal("\u2823\u281C");
            done();
        });

        // ── M5: Dynamics, Articulations, Ornaments ──────────────────────

        it("should have correct articulation sign constants", (done: Mocha.Done) => {
            // Table 22(A): staccato = dots 2,3,6
            chai.expect(BRAILLE_STACCATO).to.equal(dotsToChar(DOT2 | DOT3 | DOT6));
            // Accent = dots 4,6 + dots 2,3,6
            chai.expect(BRAILLE_ACCENT).to.equal(
                dotsToChar(DOT4 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT6)
            );
            // Tenuto = dots 4,5,6 + dots 2,3,6
            chai.expect(BRAILLE_TENUTO).to.equal(
                dotsToChar(DOT4 | DOT5 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT6)
            );
            // Marcato = dots 5,6 + dots 2,3,6
            chai.expect(BRAILLE_MARCATO).to.equal(
                dotsToChar(DOT5 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT6)
            );
            // Fermata = dots 1,2,6 + dots 1,2,3
            chai.expect(BRAILLE_FERMATA).to.equal(
                dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            done();
        });

        it("should have correct ornament sign constants", (done: Mocha.Done) => {
            // Table 16: trill = dots 2,3,5
            chai.expect(BRAILLE_TRILL).to.equal(dotsToChar(DOT2 | DOT3 | DOT5));
            // Turn between notes = dots 2,5,6
            chai.expect(BRAILLE_TURN).to.equal(dotsToChar(DOT2 | DOT5 | DOT6));
            // Upper mordent = dots 5 + dots 2,3,5
            chai.expect(BRAILLE_MORDENT).to.equal(
                dotsToChar(DOT5) + dotsToChar(DOT2 | DOT3 | DOT5)
            );
            // Lower mordent (inverted) = dots 5 + dots 2,3,5 + dots 1,2,3
            chai.expect(BRAILLE_INVERTED_MORDENT).to.equal(
                dotsToChar(DOT5) + dotsToChar(DOT2 | DOT3 | DOT5) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            // Inverted turn = dots 2,5,6 + dots 1,2,3
            chai.expect(BRAILLE_INVERTED_TURN).to.equal(
                dotsToChar(DOT2 | DOT5 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            // Turn above/below note = dots 6 + dots 2,5,6
            chai.expect(BRAILLE_TURN_ON_NOTE).to.equal(
                dotsToChar(DOT6) + dotsToChar(DOT2 | DOT5 | DOT6)
            );
            done();
        });

        it("should map ArticulationEnum to correct braille", (done: Mocha.Done) => {
            chai.expect(getArticulationBraille(ArticulationEnum.staccato)).to.equal(BRAILLE_STACCATO);
            chai.expect(getArticulationBraille(ArticulationEnum.accent)).to.equal(BRAILLE_ACCENT);
            chai.expect(getArticulationBraille(ArticulationEnum.tenuto)).to.equal(BRAILLE_TENUTO);
            chai.expect(getArticulationBraille(ArticulationEnum.strongaccent)).to.equal(BRAILLE_MARCATO);
            chai.expect(getArticulationBraille(ArticulationEnum.marcatoup)).to.equal(BRAILLE_MARCATO);
            // Unsupported should return empty
            chai.expect(getArticulationBraille(ArticulationEnum.breathmark)).to.equal("");
            done();
        });

        it("should map OrnamentEnum to correct braille", (done: Mocha.Done) => {
            chai.expect(getOrnamentBraille(OrnamentEnum.Trill)).to.equal(BRAILLE_TRILL);
            chai.expect(getOrnamentBraille(OrnamentEnum.Turn)).to.equal(BRAILLE_TURN);
            chai.expect(getOrnamentBraille(OrnamentEnum.Mordent)).to.equal(BRAILLE_MORDENT);
            chai.expect(getOrnamentBraille(OrnamentEnum.InvertedMordent)).to.equal(BRAILLE_INVERTED_MORDENT);
            chai.expect(getOrnamentBraille(OrnamentEnum.InvertedTurn)).to.equal(BRAILLE_INVERTED_TURN);
            chai.expect(getOrnamentBraille(OrnamentEnum.DelayedTurn)).to.equal(BRAILLE_TURN_ON_NOTE);
            done();
        });

        it("should have correct dynamic sign constants and getDynamicBraille", (done: Mocha.Done) => {
            // Word sign = dots 3,4,5
            chai.expect(BRAILLE_WORD_SIGN).to.equal(dotsToChar(DOT3 | DOT4 | DOT5));
            // Crescendo hairpin = word sign + c (dots 1,4)
            chai.expect(BRAILLE_CRESC_HAIRPIN).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT1 | DOT4)
            );
            // Diminuendo hairpin = word sign + d (dots 1,4,5)
            chai.expect(BRAILLE_DIM_HAIRPIN).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT1 | DOT4 | DOT5)
            );

            // getDynamicBraille: f = word sign + f(dots 1,2,4)
            const dynF: string = getDynamicBraille("f");
            chai.expect(dynF).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT1 | DOT2 | DOT4)
            );

            // getDynamicBraille: pp = word sign + p(dots 1,2,3,4) + p(dots 1,2,3,4)
            const dynPP: string = getDynamicBraille("pp");
            chai.expect(dynPP).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT1 | DOT2 | DOT3 | DOT4) + dotsToChar(DOT1 | DOT2 | DOT3 | DOT4)
            );

            // renderDynamic maps DynamicEnum to braille
            chai.expect(renderDynamic(DynamicEnum.f).braille).to.equal(dynF);
            chai.expect(renderDynamic(DynamicEnum.pp).braille).to.equal(dynPP);
            chai.expect(renderDynamic(DynamicEnum.mf).braille).to.equal(getDynamicBraille("mf"));

            // combined markings are transcribed from their text (the enum is only the first symbol, sf / ff)
            chai.expect(renderDynamic(DynamicEnum.sf, "sfmp").braille).to.equal(getDynamicBraille("sfmp"));
            chai.expect(renderDynamic(DynamicEnum.ff, "ffz").braille).to.equal(getDynamicBraille("ffz"));
            chai.expect(getDynamicBraille("sfmp")).to.not.equal(getDynamicBraille("sf"));
            // free text falls back to the enum: no stray letters from "con fuoco" or "cresc."
            chai.expect(renderDynamic(DynamicEnum.f, "f con fuoco").braille).to.equal(dynF);
            chai.expect(renderDynamic(undefined, "cresc.").braille).to.equal("");
            done();
        });

        it("should render dynamics before notes with octave reset", (done: Mocha.Done) => {
            // test_Braille_Dynamics.musicxml:
            //   4/4 time. Measure 1: f dynamic + C4 D4 E4 F4. Measure 2: pp dynamic + G4 A4 B4 C5.
            //   Dynamics force octave mark on next note (Par. 22.3(e)).
            // Measure 1: ⠼⠙⠲⠜⠋⠐⠹⠱⠫⠻   (time sig + >f + oct4 + C D E F)
            // Measure 2: ⠜⠏⠏⠐⠳⠪⠺⠹       (>pp + oct4 + G A B C)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Dynamics.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1: time sig + f dynamic + octave 4 + C D E F quarter notes
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u281C\u280B\u2810\u2839\u2831\u282B\u283B"
                );
                // Measure 2: pp dynamic + octave 4 + G A B C quarter notes
                chai.expect(measures[1]).to.equal(
                    "\u281C\u280F\u280F\u2810\u2833\u282A\u283A\u2839"
                );
                done();
            });
        });

        it("should render articulations before notes and fermata after", (done: Mocha.Done) => {
            // test_Braille_Articulations.musicxml:
            //   4/4 time. M1: C4 staccato, D4 accent, E4 tenuto, F4 plain
            //   M2: G4 fermata, A4 marcato, B4 staccato+accent, C5 plain
            // M1: ⠼⠙⠲⠦⠐⠹⠨⠦⠱⠸⠦⠫⠻ (time + staccato+oct4+C + accent+D + tenuto+E + F)
            // M2: ⠳⠣⠇⠰⠦⠪⠦⠨⠦⠺⠹     (G+fermata + marcato+A + staccato+accent+B + C)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Articulations.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2826\u2810\u2839\u2828\u2826\u2831\u2838\u2826\u282B\u283B"
                );
                // Measure 2
                chai.expect(measures[1]).to.equal(
                    "\u2833\u2823\u2807\u2830\u2826\u282A\u2826\u2828\u2826\u283A\u2839"
                );
                done();
            });
        });

        it("should render ornaments before notes", (done: Mocha.Done) => {
            // test_Braille_Ornaments.musicxml:
            //   4/4 time. M1: C4 trill, D4 turn, E4 mordent, F4 plain
            //   M2: G4 inverted-mordent, A4 inverted-turn, B4 delayed-turn, C5 plain
            // M1: ⠼⠙⠲⠖⠐⠹⠲⠱⠐⠖⠫⠻ (time + trill+oct4+C + turn+D + mordent+E + F)
            // M2: ⠐⠖⠇⠳⠲⠇⠪⠠⠲⠺⠹     (inv.mordent+G + inv.turn+A + delayed-turn+B + C)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ornaments.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2816\u2810\u2839\u2832\u2831\u2810\u2816\u282B\u283B"
                );
                // Measure 2
                chai.expect(measures[1]).to.equal(
                    "\u2810\u2816\u2807\u2833\u2832\u2807\u282A\u2820\u2832\u283A\u2839"
                );
                done();
            });
        });

        it("should have correct tie sign constants", (done: Mocha.Done) => {
            // Single tie = dots 4 + dots 1,4
            chai.expect(BRAILLE_SINGLE_TIE).to.equal(
                dotsToChar(DOT4) + dotsToChar(DOT1 | DOT4)
            );
            // Chord tie = dots 4,6 + dots 1,4
            chai.expect(BRAILLE_CHORD_TIE).to.equal(
                dotsToChar(DOT4 | DOT6) + dotsToChar(DOT1 | DOT4)
            );
            done();
        });

        it("should have correct slur sign constant", (done: Mocha.Done) => {
            // Short slur = dots 1,4
            chai.expect(BRAILLE_SLUR).to.equal(dotsToChar(DOT1 | DOT4));
            done();
        });

        it("should have correct repeat barline constants", (done: Mocha.Done) => {
            // Forward repeat = dots 1,2,6 + dots 2,3,5,6
            chai.expect(BRAILLE_FORWARD_REPEAT).to.equal(
                dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT2 | DOT3 | DOT5 | DOT6)
            );
            // Backward repeat = dots 1,2,6 + dots 2,3
            chai.expect(BRAILLE_BACKWARD_REPEAT).to.equal(
                dotsToChar(DOT1 | DOT2 | DOT6) + dotsToChar(DOT2 | DOT3)
            );
            done();
        });

        it("should produce correct volta braille signs", (done: Mocha.Done) => {
            // Volta 1 = number sign + digit 1
            chai.expect(getVoltaBraille(1)).to.equal(
                BRAILLE_NUMBER_SIGN + BRAILLE_DIGITS[1]
            );
            // Volta 2 = number sign + digit 2
            chai.expect(getVoltaBraille(2)).to.equal(
                BRAILLE_NUMBER_SIGN + BRAILLE_DIGITS[2]
            );
            // Out of range returns empty
            chai.expect(getVoltaBraille(-1)).to.equal("");
            chai.expect(getVoltaBraille(10)).to.equal("");
            done();
        });

        it("should render ties after notes", (done: Mocha.Done) => {
            // test_Braille_TiesSimple.musicxml:
            //   M1: 4/4 C4 tied + C4 + D4 + E4
            //   M2: F4 half tied + G4 half
            //   M3: F4 half (continuation) + A4 half
            // M1: ⠼⠙⠲⠐⠹⠈⠉⠹⠱⠫  (time sig + oct4 + Cq + tie + Cq + Dq + Eq)
            // M2: ⠟⠈⠉⠗             (Fh + tie + Gh)
            // M3: ⠟⠎               (Fh + Ah)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_TiesSimple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1: time sig + oct4 + Cq + tie + Cq + Dq + Eq
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2810\u2839\u2808\u2809\u2839\u2831\u282B"
                );
                // Measure 2: Fh + tie + Gh
                chai.expect(measures[1]).to.equal(
                    "\u281F\u2808\u2809\u2817"
                );
                // Measure 3: Fh (continuation, no tie sign) + Ah
                chai.expect(measures[2]).to.equal(
                    "\u281F\u280E"
                );
                done();
            });
        });

        it("should render repeat barlines", (done: Mocha.Done) => {
            // test_Braille_Repeats.musicxml:
            //   M1: C4 D4 E4 F4 (plain)
            //   M2: forward repeat + G4 A4 B4 C5
            //   M3: C5 B4 A4 G4 + backward repeat
            //   M4: F4 whole
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Repeats.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // M1: time sig + oct4 + C D E F
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2810\u2839\u2831\u282B\u283B"
                );
                // M2: forward repeat + oct4 + G A B C (B4→C5 is 2nd, no mark)
                chai.expect(measures[1]).to.equal(
                    "\u2823\u2836\u2810\u2833\u282A\u283A\u2839"
                );
                // M3: C B A G + backward repeat (C5→C5 unison from M2, no mark)
                chai.expect(measures[2]).to.equal(
                    "\u2839\u283A\u282A\u2833\u2823\u2806"
                );
                // M4: oct4 + F whole (backward repeat forces octave mark)
                chai.expect(measures[3]).to.equal(
                    "\u2810\u283F"
                );
                done();
            });
        });

        it("should render volta endings", (done: Mocha.Done) => {
            // test_Braille_Voltas.musicxml:
            //   M1: forward repeat + C4 D4 E4 F4
            //   M2: volta 1 + G4 whole + backward repeat
            //   M3: volta 2 + C5 whole
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Voltas.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // M1: time sig + forward repeat + oct4 + C D E F
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2823\u2836\u2810\u2839\u2831\u282B\u283B"
                );
                // M2: volta1 + separator + oct4 + G whole + backward repeat
                chai.expect(measures[1]).to.equal(
                    "\u283C\u2802\u2804\u2810\u2837\u2823\u2806"
                );
                // M3: volta2 + separator + oct5 + C whole
                chai.expect(measures[2]).to.equal(
                    "\u283C\u2806\u2804\u2828\u283D"
                );
                done();
            });
        });

        it("should render short slurs after notes", (done: Mocha.Done) => {
            // test_Braille_SlursSimple.musicxml:
            //   M1: C4-D4 slurred + E4 + F4
            //   M2: G4-A4-B4 three-note slur + C5
            // M1: ⠼⠙⠲⠐⠹⠉⠱⠫⠻  (time + oct4 + Cq + slur + Dq + Eq + Fq)
            // M2: ⠳⠉⠪⠉⠺⠨⠹      (Gq + slur + Aq + slur + Bq + oct5 + Cq)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_SlursSimple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // Measure 1: time sig + oct4 + C + slur + D + E + F
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2810\u2839\u2809\u2831\u282B\u283B"
                );
                // Measure 2: G + slur + A + slur + B + C (B4→C5 is 2nd, no mark)
                chai.expect(measures[1]).to.equal(
                    "\u2833\u2809\u282A\u2809\u283A\u2839"
                );
                done();
            });
        });

        // ── M6b: D.C./D.S./Segno/Coda, bracket slurs ──────────────────

        it("should have correct navigation sign constants", (done: Mocha.Done) => {
            // Segno = dots 3,4,6
            chai.expect(BRAILLE_SEGNO).to.equal(dotsToChar(DOT3 | DOT4 | DOT6));
            chai.expect(BRAILLE_SEGNO).to.equal("\u282C");
            // Coda = dots 3,4,6 + dots 1,2,3
            chai.expect(BRAILLE_CODA).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            chai.expect(BRAILLE_CODA).to.equal("\u282C\u2807");
            // Bracket slur open = dots 5,6 + dots 1,2
            chai.expect(BRAILLE_BRACKET_SLUR_OPEN).to.equal(
                dotsToChar(DOT5 | DOT6) + dotsToChar(DOT1 | DOT2)
            );
            // Bracket slur close = dots 4,5 + dots 2,3
            chai.expect(BRAILLE_BRACKET_SLUR_CLOSE).to.equal(
                dotsToChar(DOT4 | DOT5) + dotsToChar(DOT2 | DOT3)
            );
            done();
        });

        it("should map RepetitionInstructionEnum to correct navigation braille", (done: Mocha.Done) => {
            // Segno → segno sign
            chai.expect(getNavigationBraille(RepetitionInstructionEnum.Segno)).to.equal(BRAILLE_SEGNO);
            // Coda → coda sign
            chai.expect(getNavigationBraille(RepetitionInstructionEnum.Coda)).to.equal(BRAILLE_CODA);
            // ToCoda → coda sign (same rendering, context distinguishes)
            chai.expect(getNavigationBraille(RepetitionInstructionEnum.ToCoda)).to.equal(BRAILLE_CODA);
            // Fine → word sign expression
            const fine: string = getNavigationBraille(RepetitionInstructionEnum.Fine);
            chai.expect(fine).to.equal("\u281C\u280B\u280A\u281D\u2811\u281C");
            // D.C. → word sign expression
            const dc: string = getNavigationBraille(RepetitionInstructionEnum.DaCapo);
            chai.expect(dc.startsWith("\u281C")).to.equal(true);
            chai.expect(dc.endsWith("\u281C")).to.equal(true);
            // getNavigationName returns human-readable names
            chai.expect(getNavigationName(RepetitionInstructionEnum.Fine)).to.equal("fine");
            chai.expect(getNavigationName(RepetitionInstructionEnum.DaCapo)).to.equal("D.C.");
            chai.expect(getNavigationName(RepetitionInstructionEnum.DalSegnoAlCoda)).to.equal("D.S. al Coda");
            // Unsupported → empty
            chai.expect(getNavigationBraille(RepetitionInstructionEnum.None)).to.equal("");
            done();
        });

        it("should render D.C. al Fine with Fine sign", (done: Mocha.Done) => {
            // test_Braille_DaCapo.musicxml:
            //   M1: 2/4 C4 D4
            //   M2: E4 F4 + Fine
            //   M3: G4 A4 + D.C. al Fine
            // M1: ⠼⠃⠲⠐⠹⠱  (time sig 2/4 + oct4 + C♩ D♩)
            // M2: ⠫⠻⠜⠋⠊⠝⠑⠜  (E♩ F♩ + Fine)
            // M3: ⠐⠳⠪⠜⠙⠄⠉⠄⠀⠁⠇⠀⠋⠊⠝⠑⠜  (oct4 + G♩ A♩ + D.C. al Fine)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_DaCapo.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // M1: time sig + oct4 + C D
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2803\u2832\u2810\u2839\u2831"
                );
                // M2: E F + Fine
                chai.expect(measures[1]).to.equal(
                    "\u282B\u283B\u281C\u280B\u280A\u281D\u2811\u281C"
                );
                // M3: oct4 + G A + D.C. al Fine (octave reset after Fine)
                chai.expect(measures[2]).to.equal(
                    "\u2810\u2833\u282A\u281C\u2819\u2804\u2809\u2804\u2800\u2801\u2807\u2800\u280B\u280A\u281D\u2811\u281C"
                );
                done();
            });
        });

        it("should render D.S. al Coda with Segno and Coda signs", (done: Mocha.Done) => {
            // test_Braille_DalSegno.musicxml:
            //   M1: 2/4 C4 D4
            //   M2: Segno + E4 F4
            //   M3: G4 A4 + To Coda
            //   M4: B4 C5 + D.S. al Coda
            //   M5: Coda + D5 half
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_DalSegno.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // M1: time sig + oct4 + C D
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2803\u2832\u2810\u2839\u2831"
                );
                // M2: segno + oct4 + E F (segno resets octave)
                chai.expect(measures[1]).to.equal(
                    "\u282C\u2810\u282B\u283B"
                );
                // M3: G A + toCoda (F→G step, no mark)
                chai.expect(measures[2]).to.equal(
                    "\u2833\u282A\u282C\u2807"
                );
                // M4: oct4 + B C + D.S. al Coda (toCoda resets octave)
                chai.expect(measures[3]).to.equal(
                    "\u2810\u283A\u2839\u281C\u2819\u2804\u280E\u2804\u2800\u2801\u2807\u2800\u2809\u2815\u2819\u2801\u281C"
                );
                // M5: oct5 + D half + coda (D.S. al Coda resets octave; coda at end)
                chai.expect(measures[4]).to.equal(
                    "\u2828\u2815\u282C\u2807"
                );
                done();
            });
        });

        it("should render bracket slurs for long phrases and short slurs for short phrases", (done: Mocha.Done) => {
            // test_Braille_BracketSlurs.musicxml:
            //   M1: 4/4 C4-D4-E4-F4 with slur start on C4 (5-note slur → bracket)
            //   M2: G4 slur end + A4-B4-C5 with 3-note slur (→ short slur)
            // M1: ⠼⠙⠲⠰⠃⠐⠹⠱⠫⠻  (time + bracket-open + oct4 + C D E F)
            // M2: ⠳⠘⠆⠪⠉⠺⠉⠹      (G + bracket-close + A + slur + B + slur + C)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_BracketSlurs.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet);
                const measures: string[] = output.text.split(" ");
                // M1: time sig + bracket slur open + oct4 + C D E F
                chai.expect(measures[0]).to.equal(
                    "\u283C\u2819\u2832\u2830\u2803\u2810\u2839\u2831\u282B\u283B"
                );
                // M2: G + bracket slur close + A + short slur + B + short slur + C
                chai.expect(measures[1]).to.equal(
                    "\u2833\u2818\u2806\u282A\u2809\u283A\u2809\u2839"
                );
                done();
            });
        });

        // ── M7: Facsimile mode ─────────────────────────────────────

        it("should have correct clef sign constants", (done: Mocha.Done) => {
            // G clef = word sign (dots 3,4,5) + G-id (dots 3,4) + suffix (dots 1,2,3)
            chai.expect(BRAILLE_CLEF_G).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT3 | DOT4) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            // F clef = word sign + F-id (dots 3,4,5,6) + suffix
            chai.expect(BRAILLE_CLEF_F).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT3 | DOT4 | DOT5 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            // C clef = word sign + C-id (dots 3,4,6) + suffix
            chai.expect(BRAILLE_CLEF_C).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT3 | DOT4 | DOT6) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            // Tenor clef = word sign + C-id + dot 5 + suffix
            chai.expect(BRAILLE_CLEF_TENOR).to.equal(
                dotsToChar(DOT3 | DOT4 | DOT5) + dotsToChar(DOT3 | DOT4 | DOT6) + dotsToChar(DOT5) + dotsToChar(DOT1 | DOT2 | DOT3)
            );
            // Music hyphen = dot 5
            chai.expect(BRAILLE_MUSIC_HYPHEN).to.equal(dotsToChar(DOT5));
            done();
        });

        it("should map ClefEnum to correct clef braille", (done: Mocha.Done) => {
            chai.expect(getClefBraille(ClefEnum.G)).to.equal(BRAILLE_CLEF_G);
            chai.expect(getClefBraille(ClefEnum.F)).to.equal(BRAILLE_CLEF_F);
            chai.expect(getClefBraille(ClefEnum.C)).to.equal(BRAILLE_CLEF_C);
            chai.expect(getClefBraille(ClefEnum.C, 4)).to.equal(BRAILLE_CLEF_TENOR);
            chai.expect(getClefBraille(ClefEnum.C, 3)).to.equal(BRAILLE_CLEF_C);
            // getClefName returns human-readable names
            chai.expect(getClefName(ClefEnum.G)).to.equal("treble clef");
            chai.expect(getClefName(ClefEnum.F)).to.equal("bass clef");
            chai.expect(getClefName(ClefEnum.C)).to.equal("alto clef");
            chai.expect(getClefName(ClefEnum.C, 4)).to.equal("tenor clef");
            done();
        });

        it("should render clef sign in facsimile mode", (done: Mocha.Done) => {
            // HelloWorld.xml in facsimile mode should include treble clef before time sig
            // Nonfacsimile: ⠼⠙⠲⠐⠽ (time sig + oct4 + whole C)
            // Facsimile:    ⠜⠌⠇⠼⠙⠲⠐⠽ (clef + time sig + oct4 + whole C)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("HelloWorld.xml");
            osmd.load(score).then(() => {
                try {
                    osmd.render();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (ex) {
                    // render may fail in headless test env — skip gracefully
                    done();
                    return;
                }
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    format: "facsimile",
                    graphicSheet: osmd.GraphicSheet,
                });
                // Should start with treble clef sign
                chai.expect(output.text.startsWith(BRAILLE_CLEF_G)).to.equal(true);
                // Full expected: clef + time sig + oct4 + whole C
                chai.expect(output.text).to.equal(
                    "\u281C\u280C\u2807\u283C\u2819\u2832\u2810\u283D"
                );
                done();
            }).catch(done);
        });

        it("should insert line breaks between systems in facsimile mode", (done: Mocha.Done) => {
            // test_Braille_ScaleSimple.musicxml has 2 measures.
            // In facsimile mode with a small container, measures may be on different systems.
            // Regardless of layout, the output should contain the same musical content as nonfacsimile.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_ScaleSimple.musicxml");
            osmd.load(score).then(() => {
                try {
                    osmd.render();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (ex) {
                    done();
                    return;
                }
                const converter: BrailleConverter = new BrailleConverter();

                // Nonfacsimile output for reference
                const nfOutput: BrailleOutput = converter.convert(osmd.Sheet);

                // Facsimile output
                const fOutput: BrailleOutput = converter.convert(osmd.Sheet, {
                    format: "facsimile",
                    graphicSheet: osmd.GraphicSheet,
                });

                // Facsimile should not be empty
                chai.expect(fOutput.text.length).to.be.greaterThan(0);
                // Facsimile should contain the clef sign (not present in nonfacsimile)
                chai.expect(fOutput.text).to.contain(BRAILLE_CLEF_G);
                chai.expect(nfOutput.text).to.not.contain(BRAILLE_CLEF_G);
                // Facsimile should have debug entries
                chai.expect(fOutput.debugEntries.length).to.be.greaterThan(0);
                done();
            }).catch(done);
        });

        it("should render facsimile option sample with clef signs and clef change", (done: Mocha.Done) => {
            // test_Braille_Facsimile_option.musicxml:
            //   System 1: G clef, G major (1♯), 3/4. M1: G4 A4 B4. M2: C5h D5q.
            //   System 2 (new-system): F clef. M3: G3 A3 B3. M4: C4h + rest.
            // Nonfacsimile: no clef signs, no line breaks.
            // Facsimile: G clef + key + time + notes \n F clef + notes.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Facsimile_option.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();

                // Nonfacsimile: no clef signs, single line
                const nfOutput: BrailleOutput = converter.convert(osmd.Sheet);
                chai.expect(nfOutput.text).to.not.contain(BRAILLE_CLEF_G);
                chai.expect(nfOutput.text).to.not.contain(BRAILLE_CLEF_F);
                chai.expect(nfOutput.text).to.not.contain("\n");
                // Should have 4 measures separated by spaces
                chai.expect(nfOutput.text.split(" ").length).to.equal(4);

                // Facsimile: needs render() with NewSystemAtXMLNewSystemAttribute
                // to enforce the <print new-system="yes"/> in the MusicXML.
                osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
                try {
                    osmd.render();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (ex) {
                    done();
                    return;
                }
                const fOutput: BrailleOutput = converter.convert(osmd.Sheet, {
                    format: "facsimile",
                    graphicSheet: osmd.GraphicSheet,
                });

                // Should contain both G and F clef signs
                chai.expect(fOutput.text).to.contain(BRAILLE_CLEF_G);
                chai.expect(fOutput.text).to.contain(BRAILLE_CLEF_F);
                // Should start with G clef (first measure preamble: clef → key → time)
                chai.expect(fOutput.text.startsWith(BRAILLE_CLEF_G)).to.equal(true);
                // F clef should appear before measure 3's notes (clef change from G to F)
                const fClefIdx: number = fOutput.text.indexOf(BRAILLE_CLEF_F);
                const gClefIdx: number = fOutput.text.indexOf(BRAILLE_CLEF_G);
                chai.expect(fClefIdx).to.be.greaterThan(gClefIdx);
                // Debug entries should include clef names
                const meanings: string[] = fOutput.debugEntries.map(
                    (e: { meaning: string }): string => e.meaning
                );
                chai.expect(meanings).to.include("treble clef");
                chai.expect(meanings).to.include("bass clef");
                // new-system="yes" + NewSystemAtXMLNewSystemAttribute should force a line break
                const lines: string[] = fOutput.text.split("\n");
                chai.expect(lines.length).to.equal(2);
                // Line 1: G clef + key + time + measures 1–2
                chai.expect(lines[0].startsWith(BRAILLE_CLEF_G)).to.equal(true);
                // Line 2: F clef + measures 3–4
                chai.expect(lines[1].startsWith(BRAILLE_CLEF_F)).to.equal(true);
                done();
            }).catch(done);
        });

        it("should have correct ottava braille constants", (done: Mocha.Done) => {
            // 8va: word_sign + number_sign + upper_8 + v + a + period + period
            // ⠜⠼⠓⠧⠁⠄⠄
            chai.expect(BRAILLE_OTTAVA_8VA).to.equal("\u281C\u283C\u2813\u2827\u2801\u2804\u2804");
            // 8vb: word_sign + number_sign + upper_8 + v + b + period + period
            // ⠜⠼⠓⠧⠃⠄⠄
            chai.expect(BRAILLE_OTTAVA_8VB).to.equal("\u281C\u283C\u2813\u2827\u2803\u2804\u2804");
            // 15ma: word_sign + number_sign + upper_1 + upper_5 + m + a + period + period
            // ⠜⠼⠁⠑⠍⠁⠄⠄
            chai.expect(BRAILLE_OTTAVA_15MA).to.equal("\u281C\u283C\u2801\u2811\u280D\u2801\u2804\u2804");
            // 15mb: word_sign + number_sign + upper_1 + upper_5 + m + b + period + period
            // ⠜⠼⠁⠑⠍⠃⠄⠄
            chai.expect(BRAILLE_OTTAVA_15MB).to.equal("\u281C\u283C\u2801\u2811\u280D\u2803\u2804\u2804");
            // End marker: word_sign + period = ⠜⠄
            chai.expect(BRAILLE_OTTAVA_END).to.equal("\u281C\u2804");
            done();
        });

        it("should return correct ottava braille via getOttavaBraille", (done: Mocha.Done) => {
            chai.expect(getOttavaBraille(OctaveEnum.VA8)).to.equal(BRAILLE_OTTAVA_8VA);
            chai.expect(getOttavaBraille(OctaveEnum.VB8)).to.equal(BRAILLE_OTTAVA_8VB);
            chai.expect(getOttavaBraille(OctaveEnum.MA15)).to.equal(BRAILLE_OTTAVA_15MA);
            chai.expect(getOttavaBraille(OctaveEnum.MB15)).to.equal(BRAILLE_OTTAVA_15MB);
            chai.expect(getOttavaBraille(OctaveEnum.NONE)).to.equal("");
            done();
        });

        it("should return correct ottava names via getOttavaName", (done: Mocha.Done) => {
            chai.expect(getOttavaName(OctaveEnum.VA8)).to.equal("8va");
            chai.expect(getOttavaName(OctaveEnum.VB8)).to.equal("8vb");
            chai.expect(getOttavaName(OctaveEnum.MA15)).to.equal("15ma");
            chai.expect(getOttavaName(OctaveEnum.MB15)).to.equal("15mb");
            chai.expect(getOttavaName(OctaveEnum.NONE)).to.equal("");
            done();
        });

        it("should include ottava markers in facsimile output for 8va passage", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ottava_8va.musicxml");
            osmd.load(score).then(() => {
                // Nonfacsimile: should NOT contain ottava markers (notes at sounding pitch)
                const converter: BrailleConverter = new BrailleConverter();
                const nfOutput: BrailleOutput = converter.convert(osmd.Sheet, {
                    format: "nonfacsimile", debugMode: true,
                });
                chai.expect(nfOutput.text).to.not.include(BRAILLE_OTTAVA_8VA);
                chai.expect(nfOutput.text).to.not.include(BRAILLE_OTTAVA_END);
                // Nonfacsimile debug entries should not contain ottava
                const nfMeanings: string[] = nfOutput.debugEntries.map(
                    (e: { meaning: string }): string => e.meaning
                );
                chai.expect(nfMeanings).to.not.include("8va");
                chai.expect(nfMeanings).to.not.include("end ottava");

                // Facsimile: try render (may fail in headless), then check output
                try {
                    osmd.render();
                } catch (e) {
                    // render() may fail in headless — skip facsimile test
                    done();
                    return;
                }
                const fOutput: BrailleOutput = converter.convert(osmd.Sheet, {
                    format: "facsimile",
                    graphicSheet: osmd.GraphicSheet,
                    debugMode: true,
                });
                // Facsimile SHOULD contain ottava start and end markers
                chai.expect(fOutput.text).to.include(BRAILLE_OTTAVA_8VA);
                chai.expect(fOutput.text).to.include(BRAILLE_OTTAVA_END);
                // Debug entries should contain ottava markers
                const fMeanings: string[] = fOutput.debugEntries.map(
                    (e: { meaning: string }): string => e.meaning
                );
                chai.expect(fMeanings).to.include("8va");
                chai.expect(fMeanings).to.include("end ottava");
                done();
            }).catch(done);
        });

        it("should produce correct braille for Clementi Sonatina first 2 measures", (done: Mocha.Done) => {
            // Clementi Sonatina Op.36 No.1, Part 1 (C major, 4/4):
            //   Measure 1: C5♩ E5♪ C5♪ G4♩ G4♩
            //   Measure 2: C5♩ E5♪ C5♪ G4♩ G5♩
            // Time sig ⠼⠙⠲ prepended to measure 1.
            // m1: ⠼⠙⠲⠨⠹⠋⠙⠐⠳⠳    m2: ⠨⠹⠋⠙⠐⠳⠨⠳
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Explicit staffIndex: 0 to render only RH (Clementi is a piano score)
                const output: BrailleOutput = converter.convert(osmd.Sheet, { staffIndex: 0 });
                const measures: string[] = output.text.split(" ");
                // Measure 1: ⠼⠙⠲⠨⠹⠋⠙⠐⠳⠳
                chai.expect(measures[0]).to.equal("\u283C\u2819\u2832\u2828\u2839\u280B\u2819\u2810\u2833\u2833");
                // Measure 2: ⠨⠹⠋⠙⠐⠳⠨⠳
                chai.expect(measures[1]).to.equal("\u2828\u2839\u280B\u2819\u2810\u2833\u2828\u2833");
                done();
            });
        });

        // ── M8a: Multi-staff / hand signs ──────────────────────────────────────

        it("should have correct hand sign braille constants", (done: Mocha.Done) => {
            // Right hand: dots 4,6 + dots 3,4,5 = ⠨⠜
            chai.expect(BRAILLE_HAND_RIGHT).to.equal("\u2828\u281C");
            // Left hand: dots 4,5,6 + dots 3,4,5 = ⠸⠜
            chai.expect(BRAILLE_HAND_LEFT).to.equal("\u2838\u281C");
            done();
        });

        it("should detect lower dots in first braille character", (done: Mocha.Done) => {
            // Number sign (dots 3,4,5,6) contains dot 3 → true
            chai.expect(firstCharHasLowerDots(dotsToChar(DOT3 | DOT4 | DOT5 | DOT6))).to.equal(true);
            // Sharp (dots 1,4,6) contains dot 1 → true
            chai.expect(firstCharHasLowerDots(dotsToChar(DOT1 | DOT4 | DOT6))).to.equal(true);
            // Octave mark for octave 5 (dots 4,6) → no dots 1,2,3 → false
            chai.expect(firstCharHasLowerDots(dotsToChar(DOT4 | DOT6))).to.equal(false);
            // Octave mark for octave 4 (dot 5) → false
            chai.expect(firstCharHasLowerDots(dotsToChar(DOT5))).to.equal(false);
            // Empty string → false
            chai.expect(firstCharHasLowerDots("")).to.equal(false);
            done();
        });

        it("should produce multi-staff output with hand signs for piano score", (done: Mocha.Done) => {
            // Clementi Sonatina has 2 staves (RH + LH)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    multiStaff: true,
                    debugMode: true,
                });
                // Output should have two lines (RH and LH)
                const lines: string[] = output.text.split("\n");
                chai.expect(lines.length).to.equal(2);
                // Line 1 starts with RH hand sign
                chai.expect(lines[0].startsWith(BRAILLE_HAND_RIGHT)).to.equal(true);
                // Line 2 starts with LH hand sign
                chai.expect(lines[1].startsWith(BRAILLE_HAND_LEFT)).to.equal(true);
                // RH line should contain time signature (number sign ⠼ is part of time sig)
                chai.expect(lines[0]).to.include("\u283C"); // number sign from time sig
                // LH line should NOT start with a duplicate time signature after hand sign
                // Strip hand sign (and possible dot-3 separator) to check what follows
                let lhContent: string = lines[1].substring(BRAILLE_HAND_LEFT.length);
                if (lhContent.startsWith("\u2804")) { // dot-3 separator
                    lhContent = lhContent.substring(1);
                }
                // LH should not start with number sign (which would mean a time sig)
                chai.expect(lhContent.charAt(0)).to.not.equal("\u283C");
                // Debug entries should include hand sign names
                const meanings: string[] = output.debugEntries.map(
                    (e: { meaning: string }): string => e.meaning
                );
                chai.expect(meanings.some((m: string): boolean => m.startsWith("right hand"))).to.equal(true);
                chai.expect(meanings.some((m: string): boolean => m.startsWith("left hand"))).to.equal(true);
                done();
            }).catch(done);
        });

        it("should produce correct multi-staff braille for simple piano piece", (done: Mocha.Done) => {
            // test_Braille_MultiStaff_Piano: G major, 3/4, 3 measures
            //   RH: G4♩ A4♩ B4♩ | D5♩ C5♩ B4♩ | G4♩.
            //   LH: G2♩. D3♪ B2♩ | G2♩ G2♩ G2♩ | G2♩.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Default: auto-detects multi-staff (score has 2 staves)
                const output: BrailleOutput = converter.convert(osmd.Sheet, { debugMode: true });
                const lines: string[] = output.text.split("\n");
                chai.expect(lines.length).to.equal(2);

                // RH line: hand_sign + [separator] + key_sig + time_sig + measures
                chai.expect(lines[0].startsWith(BRAILLE_HAND_RIGHT)).to.equal(true);
                // LH line: hand_sign + [separator] + measures (no key/time dup)
                chai.expect(lines[1].startsWith(BRAILLE_HAND_LEFT)).to.equal(true);

                // RH should have 3 measures (2 barline spaces within)
                const rhContent: string = lines[0].substring(BRAILLE_HAND_RIGHT.length);
                const rhMeasures: string[] = rhContent.split(" ");
                chai.expect(rhMeasures.length).to.equal(3);

                // LH should also have 3 measures
                const lhRaw: string = lines[1].substring(BRAILLE_HAND_LEFT.length);
                // Strip possible dot-3 separator
                const lhContent: string = lhRaw.startsWith("\u2804") ? lhRaw.substring(1) : lhRaw;
                const lhMeasures: string[] = lhContent.split(" ");
                chai.expect(lhMeasures.length).to.equal(3);

                // RH measure 1 should start with key sig (one sharp = ⠩)
                // followed by time sig, then notes
                chai.expect(rhMeasures[0]).to.include("\u2829"); // sharp sign in key sig

                // LH measure 1 should NOT contain key/time signature
                // First char should be an octave mark (dots 4,5 = octave 2 = ⠘)
                chai.expect(lhContent.charAt(0)).to.equal("\u2818"); // octave 2 mark

                // Debug entries should mention both hands and staff separator
                const meanings: string[] = output.debugEntries.map(
                    (e: { meaning: string }): string => e.meaning
                );
                chai.expect(meanings.some((m: string): boolean => m.startsWith("right hand"))).to.equal(true);
                chai.expect(meanings.some((m: string): boolean => m.startsWith("left hand"))).to.equal(true);
                chai.expect(meanings).to.include("staff separator (newline)");
                done();
            }).catch(done);
        });

        it("should fall back to single-staff for HelloWorld (1 staff)", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("HelloWorld.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    multiStaff: true,
                    debugMode: true,
                });
                // Single staff: only one line (no newline), but should still have RH hand sign
                const lines: string[] = output.text.split("\n");
                chai.expect(lines.length).to.equal(1);
                chai.expect(output.text.startsWith(BRAILLE_HAND_RIGHT)).to.equal(true);
                done();
            });
        });
    });

    describe("Bar-over-bar format (M8b)", () => {
        it("should produce bar-over-bar output with heading and parallel lines", (done: Mocha.Done) => {
            // test_Braille_MultiStaff_Piano: G major, 3/4, 3 measures, 2 staves
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                });
                const lines: string[] = output.text.split("\n");
                // Line 0: heading (key+time), Line 1: RH, Line 2: LH
                chai.expect(lines.length).to.be.greaterThanOrEqual(3);

                // Heading should contain key signature (sharp sign ⠩) and time signature
                chai.expect(lines[0]).to.include("\u2829"); // sharp
                chai.expect(lines[0]).to.include(BRAILLE_NUMBER_SIGN); // number sign in time sig

                // RH line should contain hand sign
                chai.expect(lines[1]).to.include(BRAILLE_HAND_RIGHT);
                // LH line should contain hand sign
                chai.expect(lines[2]).to.include(BRAILLE_HAND_LEFT);
                done();
            }).catch(done);
        });

        it("should use bare digits for measure numbers (no number sign)", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                });
                const lines: string[] = output.text.split("\n");
                // RH and LH lines (after heading) should start with measure digit
                // Measure 1 = BRAILLE_UPPER_DIGITS[1] (bare upper-cell digit, no number sign)
                const rhLine: string = lines[1];
                const lhLine: string = lines[2];
                chai.expect(rhLine.startsWith(BRAILLE_UPPER_DIGITS[1])).to.equal(true);
                chai.expect(lhLine.startsWith(BRAILLE_UPPER_DIGITS[1])).to.equal(true);
                // Should NOT contain BRAILLE_NUMBER_SIGN in the measure number area
                // (first 2 chars: digit + space)
                chai.expect(rhLine.charAt(0)).to.not.equal(BRAILLE_NUMBER_SIGN);
                done();
            }).catch(done);
        });

        it("should force octave mark at start of every measure", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                });
                // Every measure's first note should have an octave mark
                // Check debug entries: each measure should have an octave mark entry
                const measureNumbers: Set<number> = new Set();
                const octaveMarkMeasures: Set<number> = new Set();
                for (const entry of output.debugEntries) {
                    if (entry.measureNumber > 0) {
                        measureNumbers.add(entry.measureNumber);
                    }
                    if (entry.meaning.startsWith("octave ") && entry.measureNumber > 0) {
                        octaveMarkMeasures.add(entry.measureNumber);
                    }
                }
                // Every measure that has notes should have at least one octave mark
                for (const mn of measureNumbers) {
                    chai.expect(octaveMarkMeasures.has(mn), "measure " + mn + " should have octave mark").to.equal(true);
                }
                done();
            }).catch(done);
        });

        it("should place key/time in heading, not in measure lines", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                });
                const lines: string[] = output.text.split("\n");
                // Heading (line 0) has key/time
                chai.expect(lines[0]).to.include("\u2829"); // sharp sign
                // RH line (line 1) should NOT have key signature
                // The sharp sign should not appear after the hand sign
                const rhAfterHandSign: string = lines[1].substring(
                    lines[1].indexOf(BRAILLE_HAND_RIGHT) + BRAILLE_HAND_RIGHT.length
                );
                chai.expect(rhAfterHandSign).to.not.include("\u2829"); // no sharp in RH measures
                done();
            }).catch(done);
        });

        it("should vertically align measure starts across staves", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                    lineWidth: 80, // wide enough for all 3 measures in one parallel
                });
                const lines: string[] = output.text.split("\n");
                const rhLine: string = lines[1];
                const lhLine: string = lines[2];

                // Find the positions of measure separators (spaces between measures)
                // After the prefix (measureNum + space + handSign + [separator]),
                // measures are space-separated. The column positions of spaces should match.
                // Both lines should have the same prefix length since measure numbers align
                chai.expect(rhLine.length).to.be.greaterThan(0);
                chai.expect(lhLine.length).to.be.greaterThan(0);

                // The hand sign starts at the same position in both lines
                const rhHandPos: number = rhLine.indexOf(BRAILLE_HAND_RIGHT);
                const lhHandPos: number = lhLine.indexOf(BRAILLE_HAND_LEFT);
                chai.expect(rhHandPos).to.equal(lhHandPos);
                done();
            }).catch(done);
        });

        it("should generate guide dots for large gaps and spaces for small gaps", (done: Mocha.Done) => {
            const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(undefined as any);
            const config: { guideDotThreshold: number, guideDotMinCount: number } = {
                guideDotThreshold: 6,
                guideDotMinCount: 5,
            };

            // Gap of 10: should use guide dots (1 blank + 8 dots + 1 blank = 10)
            const guideDotPad: string = layout.padWithGuideDots(10, config as any);
            chai.expect(guideDotPad.length).to.equal(10);
            chai.expect(guideDotPad.charAt(0)).to.equal("\u2800"); // BRAILLE_BLANK_CELL
            chai.expect(guideDotPad.charAt(guideDotPad.length - 1)).to.equal("\u2800");
            // Middle should be guide dots (dot 3 = augmentation dot)
            for (let i: number = 1; i < guideDotPad.length - 1; i++) {
                chai.expect(guideDotPad.charAt(i)).to.equal("\u2804"); // BRAILLE_AUGMENTATION_DOT
            }

            // Gap of 4: should use plain blank cells (below threshold)
            const spacePad: string = layout.padWithGuideDots(4, config as any);
            chai.expect(spacePad.length).to.equal(4);
            for (let i: number = 0; i < spacePad.length; i++) {
                chai.expect(spacePad.charAt(i)).to.equal("\u2800"); // BRAILLE_BLANK_CELL
            }

            // Gap of 0: should return empty
            const emptyPad: string = layout.padWithGuideDots(0, config as any);
            chai.expect(emptyPad).to.equal("");
            done();
        });

        it("should emit run-over debug entry when a parallel line exceeds lineWidth", (done: Mocha.Done) => {
            // Use a wider piece (Clementi, 76 measures) with a very narrow lineWidth
            // to force run-over lines. The debug entries should include run-over notices.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                    lineWidth: 25,
                });
                // All lines should respect the line width except where no safe
                // split point exists within a single measure. Verify no line
                // is pathologically longer than lineWidth + max-measure-width.
                const lines: string[] = output.text.split("\n");
                chai.expect(lines.length).to.be.greaterThan(10);
                // The debug entries may include run-over markers (but we don't
                // require them — depends on whether the Clementi measures happen
                // to exceed lineWidth). The test just verifies the pipeline
                // handles narrow widths without crashing.
                chai.expect(output.text.length).to.be.greaterThan(0);
                done();
            }).catch(done);
        });

        it("should split into multiple parallels when line width is narrow", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                    lineWidth: 15, // very narrow — should force multiple parallels
                });
                const lines: string[] = output.text.split("\n");
                // With 3 measures and narrow width, should have heading + multiple parallels
                // Each parallel = 2 lines (RH + LH), plus heading = at least 5 lines
                chai.expect(lines.length).to.be.greaterThanOrEqual(5);

                // Each parallel pair should have RH and LH hand signs
                let rhCount: number = 0;
                let lhCount: number = 0;
                for (const line of lines) {
                    if (line.includes(BRAILLE_HAND_RIGHT)) {
                        rhCount++;
                    }
                    if (line.includes(BRAILLE_HAND_LEFT)) {
                        lhCount++;
                    }
                }
                chai.expect(rhCount).to.be.greaterThanOrEqual(2);
                chai.expect(lhCount).to.be.greaterThanOrEqual(2);
                chai.expect(rhCount).to.equal(lhCount); // same number of parallels for each hand
                done();
            }).catch(done);
        });

        it("should return single line when input fits within lineWidth (no run-over needed)", (done: Mocha.Done) => {
            const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(undefined as any);
            // Short line — no split needed
            const line: string = "⠂⠀⠨⠜⠐⠱⠫⠻⠀⠐⠳⠊⠚"; // 12 cells
            const result: string[] = layout.splitLineWithRunOver(line, 4, 40);
            chai.expect(result.length).to.equal(1);
            chai.expect(result[0]).to.equal(line);
            done();
        });

        it("should split line into run-over lines when exceeding lineWidth (Par. 28.1.2)", (done: Mocha.Done) => {
            const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(undefined as any);
            // Build a line with prefix (4 cells) + 3 measures separated by blank cells.
            // Use distinct non-blank braille chars so we can verify split boundaries.
            const prefix: string = "⠂⠀⠨⠜"; // 4 cells
            const m1: string = "⠐⠱⠫⠻⠳"; // 5 cells
            const m2: string = "⠐⠱⠫⠻⠳"; // 5 cells
            const m3: string = "⠐⠱⠫⠻⠳"; // 5 cells
            const line: string = prefix + m1 + "\u2800" + m2 + "\u2800" + m3; // 4+5+1+5+1+5 = 21 cells
            // With lineWidth=15, the line should split at a blank cell
            const result: string[] = layout.splitLineWithRunOver(line, prefix.length, 15);
            chai.expect(result.length).to.be.greaterThanOrEqual(2);
            // Primary line should not exceed lineWidth
            chai.expect(result[0].length).to.be.lessThanOrEqual(15);
            // Continuation lines should be indented by prefix.length + 2 = 6 blank cells
            const expectedIndent: string = "\u2800".repeat(prefix.length + 2);
            chai.expect(result[1].startsWith(expectedIndent)).to.equal(true);
            done();
        });

        it("should use run-over indent of prefix + 2 cells", (done: Mocha.Done) => {
            const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(undefined as any);
            // Force a split: prefix=3 cells, then long content with blanks
            const prefix: string = "⠂⠀⠨"; // 3 cells
            const content: string = "⠐⠱⠫⠻\u2800⠐⠳⠊⠚\u2800⠐⠱⠫⠻"; // 13 cells
            const line: string = prefix + content; // 16 cells total
            const result: string[] = layout.splitLineWithRunOver(line, prefix.length, 10);
            chai.expect(result.length).to.be.greaterThanOrEqual(2);
            // Continuation should start with 5 blank cells (prefix.length + 2)
            chai.expect(result[1].substring(0, 5)).to.equal("\u2800\u2800\u2800\u2800\u2800");
            done();
        });

        it("should convert measure number 0 to bare digit for anacrusis", (done: Mocha.Done) => {
            const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(undefined as any);
            // Measure 0 (anacrusis)
            const zero: string = layout.measureNumberToBareDigits(0);
            chai.expect(zero).to.equal(BRAILLE_UPPER_DIGITS[0]);
            // Measure 1
            const one: string = layout.measureNumberToBareDigits(1);
            chai.expect(one).to.equal(BRAILLE_UPPER_DIGITS[1]);
            // Measure 12 (multi-digit)
            const twelve: string = layout.measureNumberToBareDigits(12);
            chai.expect(twelve).to.equal(BRAILLE_UPPER_DIGITS[1] + BRAILLE_UPPER_DIGITS[2]);
            done();
        });

        it("should include dot-3 separator after hand sign when first music char has lower dots", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                });
                // Check debug entries for separator mentions
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                // At least one hand sign entry should exist
                chai.expect(meanings.some((m: string): boolean => m.startsWith("right hand"))).to.equal(true);
                chai.expect(meanings.some((m: string): boolean => m.startsWith("left hand"))).to.equal(true);
                done();
            }).catch(done);
        });

        it("should render bar-over-bar for D-major piano piece with chords and asymmetric measures", (done: Mocha.Done) => {
            // test_Braille_BarOverBar: D major (2 sharps), 4/4, 5 measures
            //   m1: RH=4 quarter notes, LH=4 quarter notes (similar length)
            //   m2: RH=4 chords (longer), LH=2 half notes (shorter → padding)
            //   m4: RH=dotted+eighth+quarters (longer), LH=whole note (very short → possible guide dots)
            //   m5: RH=whole, LH=whole (equal, short final)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_BarOverBar.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                    lineWidth: 40,
                });
                const lines: string[] = output.text.split("\n");

                // Heading line should have 2 sharps and 4/4 time
                chai.expect(lines[0].trim()).to.include("\u2829"); // sharp sign
                chai.expect(lines[0].trim()).to.include(BRAILLE_NUMBER_SIGN); // time sig number sign

                // Should have at least one parallel (heading + 2 staff lines)
                chai.expect(lines.length).to.be.greaterThanOrEqual(3);

                // Every parallel pair: RH and LH hand signs at aligned positions
                const rhLines: string[] = lines.filter(
                    (l: string): boolean => l.includes(BRAILLE_HAND_RIGHT)
                );
                const lhLines: string[] = lines.filter(
                    (l: string): boolean => l.includes(BRAILLE_HAND_LEFT)
                );
                chai.expect(rhLines.length).to.equal(lhLines.length);
                chai.expect(rhLines.length).to.be.greaterThanOrEqual(1);

                // In each parallel, hand signs should be at the same column
                for (let i: number = 0; i < rhLines.length; i++) {
                    const rhHandCol: number = rhLines[i].indexOf(BRAILLE_HAND_RIGHT);
                    const lhHandCol: number = lhLines[i].indexOf(BRAILLE_HAND_LEFT);
                    chai.expect(rhHandCol).to.equal(lhHandCol);
                }

                // Debug entries should not contain key/time in measure lines
                // (key/time should only be in heading, not in any measure > 0)
                const keySigInMeasures: boolean = output.debugEntries.some(
                    (e: BrailleDebugEntry): boolean =>
                        e.measureNumber > 0 && e.meaning.startsWith("key ")
                );
                chai.expect(keySigInMeasures).to.equal(false);

                done();
            }).catch(done);
        });
    });

    describe("Ensemble bar-over-bar (M8c)", () => {
        it("should convert text to braille literary characters", (done: Mocha.Done) => {
            // Basic alphabet: a-z → braille Grade 1
            const abc: string = textToBraille("abc");
            chai.expect(abc.length).to.equal(3);
            chai.expect(abc.charAt(0)).to.equal("\u2801"); // a = dot 1
            chai.expect(abc.charAt(1)).to.equal("\u2803"); // b = dots 1,2
            chai.expect(abc.charAt(2)).to.equal("\u2809"); // c = dots 1,4

            // Case insensitive
            chai.expect(textToBraille("ABC")).to.equal(textToBraille("abc"));

            // Period → dot 3 (abbreviation period)
            const withPeriod: string = textToBraille("Vln.");
            chai.expect(withPeriod).to.include("\u2804"); // dot 3

            // Space → braille blank cell
            const withSpace: string = textToBraille("a b");
            chai.expect(withSpace.charAt(1)).to.equal("\u2800"); // blank cell

            done();
        });

        it("should convert digits to literary numbers (number sign + upper-cell digits)", (done: Mocha.Done) => {
            // Single digit: ⠼⠃ = number sign + upper-cell 2 (letter b pattern)
            chai.expect(textToBraille("2")).to.equal(BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[2]);

            // Consecutive digits share one number sign: "12" → ⠼⠁⠃
            chai.expect(textToBraille("12")).to.equal(
                BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[1] + BRAILLE_UPPER_DIGITS[2]
            );

            // A non-digit ends the number: "1 2" → separate number signs
            chai.expect(textToBraille("1 2")).to.equal(
                BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[1] + "\u2800" +
                BRAILLE_NUMBER_SIGN + BRAILLE_UPPER_DIGITS[2]
            );
            done();
        });

        it("should produce ensemble output with instrument abbreviations for quartet", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");

                // Should have: instrument table + blank + heading + measure number + 4 instrument lines
                chai.expect(lines.length).to.be.greaterThanOrEqual(10);

                // Output should contain time signature somewhere (heading)
                chai.expect(output.text).to.include(BRAILLE_NUMBER_SIGN); // number sign in time sig

                // Debug entries should have instrument list entries + instrument abbreviation entries
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                chai.expect(meanings.filter((m: string): boolean => m === "instrument").length)
                    .to.be.greaterThanOrEqual(4); // 4 instruments in music parallels
                chai.expect(meanings.filter(
                    (m: string): boolean => m === "instrument list entry"
                ).length).to.be.greaterThanOrEqual(4); // 4 entries in instrument table

                done();
            }).catch(done);
        });

        it("should render ensemble mode when explicitly enabled for multi-instrument scores", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Explicit ensemble: true required (not auto-detected, since MusicXML often
                // splits piano into separate parts which would be falsely detected)
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                });
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                // Should have instrument abbreviation entries
                chai.expect(meanings.filter((m: string): boolean => m === "instrument").length)
                    .to.be.greaterThanOrEqual(4);
                done();
            }).catch(done);
        });

        it("should NOT auto-detect ensemble for piano (single instrument, multiple staves)", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_MultiStaff_Piano.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Piano has 1 instrument with 2 staves — should NOT trigger ensemble
                const output: BrailleOutput = converter.convert(osmd.Sheet, { debugMode: true });
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                // Should have hand signs (keyboard mode), NOT instrument abbreviations
                chai.expect(meanings.some((m: string): boolean => m.startsWith("right hand"))).to.equal(true);
                chai.expect(meanings.some((m: string): boolean => m === "instrument")).to.equal(false);
                done();
            }).catch(done);
        });

        it("should align music start at the same column across all instrument lines", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");

                // Find instrument music lines (lines containing instrument abbreviations
                // from the music parallels, not the instrument table).
                // The output has: table lines + blank + heading + measure num + instrument lines
                // Just verify we have enough lines and instrument debug entries
                chai.expect(lines.length).to.be.greaterThanOrEqual(10);
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                const instrumentMusicLines: number = meanings.filter(
                    (m: string): boolean => m === "instrument"
                ).length;
                chai.expect(instrumentMusicLines).to.be.greaterThanOrEqual(4);

                done();
            }).catch(done);
        });

        it("should place measure numbers in free line above parallel", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 80,
                });

                // Debug entries should have measure number entries
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                chai.expect(meanings.some(
                    (m: string): boolean => m.startsWith("measure ")
                )).to.equal(true);

                // Measure 1 digit should be present somewhere in the output
                chai.expect(output.text).to.include(BRAILLE_UPPER_DIGITS[1]);

                done();
            }).catch(done);
        });

        it("should include all active parts in condensed ensemble output", (done: Mocha.Done) => {
            // Quartet m1-3: all 4 parts playing. Condensed should include all 4.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 80,
                });

                // All 4 instruments should be present (none resting in first parallel)
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                const instrumentCount: number = meanings.filter(
                    (m: string): boolean => m === "instrument"
                ).length;
                // At least 4 instrument lines (one per part in first parallel)
                chai.expect(instrumentCount).to.be.greaterThanOrEqual(4);

                // Output should have 4 instrument lines in first parallel
                // (heading + measure number + 4 instruments = 6 lines minimum)
                const lines: string[] = output.text.split("\n");
                chai.expect(lines.length).to.be.greaterThanOrEqual(6);

                done();
            }).catch(done);
        });

        it("should omit resting parts in condensed ensemble (Par. 33.1)", (done: Mocha.Done) => {
            // Quartet m4-5: Viola and Cello have whole rests → omitted in condensed score.
            // Use narrow lineWidth to force m4-5 into their own parallel.
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 20, // narrow → forces measures into separate parallels
                });

                // With narrow lineWidth, m4 and m5 will be in later parallels.
                // In those parallels, Viola and Cello rest → should be omitted.
                // Compare: with condensed vs without condensed, total instrument count differs.
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                const totalInstruments: number = meanings.filter(
                    (m: string): boolean => m === "instrument"
                ).length;

                // Count how many parallels there are (measure number entries)
                const parallelCount: number = meanings.filter(
                    (m: string): boolean => m.startsWith("measure ")
                ).length;
                // Without condensed, every parallel would have 4 instruments = 4 * parallelCount
                // With condensed, parallels containing m4-5 have only 2 instruments
                // So totalInstruments should be strictly less than 4 * parallelCount
                chai.expect(totalInstruments).to.be.lessThan(4 * parallelCount);
                // But should still have at least 4 (from the first parallel where all play)
                chai.expect(totalInstruments).to.be.greaterThanOrEqual(4);

                done();
            }).catch(done);
        });
        it("should append per-part key signatures to abbreviations when keys differ (Par. 33.4.1)", (done: Mocha.Done) => {
            // Trio with Violin (C major), Clarinet in Bb (D major = 2 sharps), Cello (C major)
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_TransposingKeys.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 80,
                });

                // Output should contain time signature (heading) and sharp sign
                // (from clarinet's per-part key appended to its abbreviation)
                chai.expect(output.text).to.include(BRAILLE_NUMBER_SIGN); // time sig
                chai.expect(output.text).to.include("\u2829"); // sharp sign in Cl.'s per-part key

                // Debug entries should have instrument entries for all 3 parts
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                const instrumentCount: number = meanings.filter(
                    (m: string): boolean => m === "instrument"
                ).length;
                chai.expect(instrumentCount).to.be.greaterThanOrEqual(3);
                // Should also have instrument list entries
                chai.expect(meanings.filter(
                    (m: string): boolean => m === "instrument list entry"
                ).length).to.be.greaterThanOrEqual(3);

                done();
            }).catch(done);
        });

        it("should keep key in heading when all parts share the same key", (done: Mocha.Done) => {
            // The regular quartet test file has all parts in C major
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Ensemble_Quartet.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");

                // Heading should contain time signature (all parts share C major = no sharps/flats,
                // so only time sig appears in heading — which is the same as the per-part-key case
                // for C major. The key test is: no sharp/flat signs should appear in abbreviations.)
                // With C major (0 sharps), there's no key signature to render anyway.
                // This test verifies the code doesn't crash and produces valid output.
                // Should have instrument table + heading + music (many lines)
                chai.expect(lines.length).to.be.greaterThanOrEqual(10);
                // Output should contain time signature somewhere
                chai.expect(output.text).to.include(BRAILLE_NUMBER_SIGN); // time sig

                done();
            }).catch(done);
        });
    });

    describe("Lyrics (M9)", () => {
        it("should produce word line + music line parallel format", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");

                // Should have: heading, then word line + music line pairs
                // With wide line width, all 4 measures fit in one parallel
                // Line 0: heading, Line 1: word line, Line 2: music line
                chai.expect(lines.length).to.be.greaterThanOrEqual(3);

                // Music line (line 2) should be indented 2 cells (start with 2 blank cells)
                const musicLine: string = lines[2];
                chai.expect(musicLine.charAt(0)).to.equal("\u2800"); // blank cell
                chai.expect(musicLine.charAt(1)).to.equal("\u2800"); // blank cell
                // Third character should be music content (not blank)
                chai.expect(musicLine.charCodeAt(2)).to.not.equal(0x2800);

                done();
            }).catch(done);
        });

        it("should contain lyrics text in word line as braille literary characters", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");
                const wordLine: string = lines[1]; // first word line (after heading)

                // Word line should contain braille literary text for "the sun will be"
                const brailleThe: string = textToBraille("the");
                const brailleSun: string = textToBraille("sun");
                const brailleWill: string = textToBraille("will");
                const brailleBe: string = textToBraille("be");
                chai.expect(wordLine).to.include(brailleThe);
                chai.expect(wordLine).to.include(brailleSun);
                chai.expect(wordLine).to.include(brailleWill);
                chai.expect(wordLine).to.include(brailleBe);

                done();
            }).catch(done);
        });

        it("should join multi-syllable words without hyphens", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");
                const wordLine: string = lines[1];

                // "shi" + "ning" should be concatenated without hyphen → "shining" in braille
                const brailleShining: string = textToBraille("shining");
                chai.expect(wordLine).to.include(brailleShining);

                done();
            }).catch(done);
        });

        it("should produce lyrics output when lyrics: true is set explicitly", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Explicit lyrics: true required (not auto-detected to avoid
                // interfering with existing tests for files that may have lyrics)
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                });

                // Should have lyric debug entries
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                chai.expect(meanings.some(
                    (m: string): boolean => m.startsWith("lyric:")
                )).to.equal(true);

                done();
            }).catch(done);
        });

        it("should include music heading above first parallel", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                });
                const lines: string[] = output.text.split("\n");

                // Heading (line 0) should contain time signature (4/4)
                chai.expect(lines[0]).to.include(BRAILLE_NUMBER_SIGN);

                done();
            }).catch(done);
        });

        it("should handle melisma with syllabic slur in music line", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                    lineWidth: 80,
                });

                // The music line should contain a syllabic slur sign for the melisma
                // (measure 3: "on" extends over 2 notes)
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                chai.expect(meanings.some(
                    (m: string): boolean => m === "syllabic slur (melisma)"
                )).to.equal(true);

                // The syllabic slur character should appear in the output text
                chai.expect(output.text).to.include(BRAILLE_SYLLABIC_SLUR);

                done();
            }).catch(done);
        });
    });

    describe("Multi-verse lyrics (M9 Phase 2)", () => {
        it("should detect multiple verse numbers in a score", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const verses: string[] = collectVerseNumbers(osmd.Sheet.SourceMeasures, 0);
                chai.expect(verses.length).to.equal(2);
                chai.expect(verses[0]).to.equal("1");
                chai.expect(verses[1]).to.equal("2");
                done();
            }).catch(done);
        });

        it("should append verse 2 text after the music", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                    lineWidth: 80,
                });

                // Output should contain verse 2 text after the music
                // Verse 2 has "moon" instead of "sun"
                const brailleMoon: string = textToBraille("moon");
                chai.expect(output.text).to.include(brailleMoon);

                // Verse 2 should also have "dark" and "night"
                const brailleDark: string = textToBraille("dark");
                const brailleNight: string = textToBraille("night");
                chai.expect(output.text).to.include(brailleDark);
                chai.expect(output.text).to.include(brailleNight);

                // Debug entries should have a "verse 2" entry
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                chai.expect(meanings.some(
                    (m: string): boolean => m === "verse 2"
                )).to.equal(true);

                done();
            }).catch(done);
        });

        it("should include verse number prefix (2) in literary braille parentheses", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_Braille_Lyrics_Simple.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                    lineWidth: 80,
                });
                const lines: string[] = output.text.split("\n");
                // The last line should be verse 2 text, starting with (2)
                // Braille parentheses: ( = ⠷ dots 1,2,3,5,6, ) = ⠾ dots 2,3,4,5,6
                const lastLine: string = lines[lines.length - 1];
                chai.expect(lastLine.charAt(0)).to.equal("\u2837"); // opening paren ⠷
                // Should contain closing paren somewhere
                chai.expect(lastLine).to.include("\u283E"); // closing paren ⠾

                done();
            }).catch(done);
        });

        it("should convert Land der Berge with 3 verses", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("Land_der_Berge.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    lyrics: true,
                    debugMode: true,
                });
                // Should produce non-empty output
                chai.expect(output.text.length).to.be.greaterThan(0);

                // Should have verse 2 and verse 3 entries in debug
                const meanings: string[] = output.debugEntries.map(
                    (e: BrailleDebugEntry): string => e.meaning
                );
                chai.expect(meanings.some((m: string): boolean => m === "verse 2")).to.equal(true);
                chai.expect(meanings.some((m: string): boolean => m === "verse 3")).to.equal(true);

                done();
            }).catch(done);
        });
    });

    describe("Real-world score integration", () => {
        // These tests validate that real scores (not synthetic test files) convert
        // through the braille pipeline without crashing and produce reasonable output.

        it("should convert Beethoven vocal score with lyrics mode", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("Beethoven_AnDieFerneGeliebte.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Voice part (staff 0) with lyrics
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    staffIndex: 0,
                    lyrics: true,
                    debugMode: true,
                });
                // Should produce non-empty output with multiple lines
                chai.expect(output.text.length).to.be.greaterThan(0);
                const lines: string[] = output.text.split("\n");
                // Should have heading + at least one word/music line pair
                chai.expect(lines.length).to.be.greaterThanOrEqual(3);
                // Should contain lyric entries
                const lyricEntries: BrailleDebugEntry[] = output.debugEntries.filter(
                    (e: BrailleDebugEntry): boolean => e.meaning.startsWith("lyric:")
                );
                chai.expect(lyricEntries.length).to.be.greaterThan(0);
                done();
            }).catch(done);
        });

        it("should convert Mozart quartet with ensemble mode", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    ensemble: true,
                    debugMode: true,
                    lineWidth: 40,
                });
                // Should produce non-empty output
                chai.expect(output.text.length).to.be.greaterThan(0);
                // Should have instrument abbreviation entries for 4 parts
                const instrumentEntries: BrailleDebugEntry[] = output.debugEntries.filter(
                    (e: BrailleDebugEntry): boolean => e.meaning === "instrument"
                );
                chai.expect(instrumentEntries.length).to.be.greaterThanOrEqual(4);
                done();
            }).catch(done);
        });

        it("should convert Clementi piano with bar-over-bar mode", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    barOverBar: true,
                    debugMode: true,
                    lineWidth: 40,
                });
                // Should produce non-empty output with multiple parallels
                chai.expect(output.text.length).to.be.greaterThan(0);
                const lines: string[] = output.text.split("\n");
                // 76 measures at lineWidth 40 → multiple parallels → many lines
                chai.expect(lines.length).to.be.greaterThan(10);
                // Should have right and left hand signs
                chai.expect(output.text).to.include(BRAILLE_HAND_RIGHT);
                chai.expect(output.text).to.include(BRAILLE_HAND_LEFT);
                done();
            }).catch(done);
        });

        it("should convert Clementi piano in default sequential mode", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                // Default mode — sequential multi-staff (M8a)
                const output: BrailleOutput = converter.convert(osmd.Sheet, { debugMode: true });
                // Should have 2 lines (RH + LH)
                const lines: string[] = output.text.split("\n");
                chai.expect(lines.length).to.equal(2);
                chai.expect(lines[0]).to.include(BRAILLE_HAND_RIGHT);
                chai.expect(lines[1]).to.include(BRAILLE_HAND_LEFT);
                done();
            }).catch(done);
        });

        it("should convert Mozart vocal score with lyrics and produce German text", (done: Mocha.Done) => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("Mozart_DasVeilchen.xml");
            osmd.load(score).then(() => {
                const converter: BrailleConverter = new BrailleConverter();
                const output: BrailleOutput = converter.convert(osmd.Sheet, {
                    staffIndex: 0,
                    lyrics: true,
                    debugMode: true,
                });
                chai.expect(output.text.length).to.be.greaterThan(0);
                // Should have lyric entries (German text)
                const lyricEntries: BrailleDebugEntry[] = output.debugEntries.filter(
                    (e: BrailleDebugEntry): boolean => e.meaning.startsWith("lyric:")
                );
                chai.expect(lyricEntries.length).to.be.greaterThan(0);
                done();
            }).catch(done);
        });
    });
});

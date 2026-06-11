/* eslint-disable */
const { TransposeCalculator } = require('./build/dist/src/Plugins/Transpose/TransposeCalculator');
const { Pitch, NoteEnum, AccidentalEnum } = require('./build/dist/src/Common/DataObjects/Pitch');
const { KeyInstruction, KeyEnum } = require('./build/dist/src/MusicalScore/VoiceData/Instructions/KeyInstruction');

const calculator = new TransposeCalculator();

// Helper to convert NoteEnum and Accidental to string
function pitchToString(note, accidental) {
    let s = "";
    switch (note) {
        case NoteEnum.C: s += "C"; break;
        case NoteEnum.D: s += "D"; break;
        case NoteEnum.E: s += "E"; break;
        case NoteEnum.F: s += "F"; break;
        case NoteEnum.G: s += "G"; break;
        case NoteEnum.A: s += "A"; break;
        case NoteEnum.B: s += "B"; break;
    }
    switch (accidental) {
        case AccidentalEnum.SHARP: s += "#"; break;
        case AccidentalEnum.FLAT: s += "b"; break;
        case AccidentalEnum.DOUBLESHARP: s += "x"; break;
        case AccidentalEnum.DOUBLEFLAT: s += "bb"; break;
    }
    return s;
}

const testCases = [
    // 1 & 2. C Major & A minor: Ab -> G# (halftone 8)
    { key: 0, mode: KeyEnum.major, targetHalfTone: 8, expNote: NoteEnum.G, expAcc: AccidentalEnum.SHARP, desc: "C Major: Ab -> G#" },
    { key: 0, mode: KeyEnum.minor, targetHalfTone: 8, expNote: NoteEnum.G, expAcc: AccidentalEnum.SHARP, desc: "A minor: Ab -> G#" },

    // 3 & 4. G Major & E minor: Eb -> D# (halftone 3)
    { key: 1, mode: KeyEnum.major, targetHalfTone: 3, expNote: NoteEnum.D, expAcc: AccidentalEnum.SHARP, desc: "G Major: Eb -> D#" },
    { key: 1, mode: KeyEnum.minor, targetHalfTone: 3, expNote: NoteEnum.D, expAcc: AccidentalEnum.SHARP, desc: "E minor: Eb -> D#" },

    // 5 & 6. D Major & B minor: Bb -> A# (halftone 10)
    { key: 2, mode: KeyEnum.major, targetHalfTone: 10, expNote: NoteEnum.A, expAcc: AccidentalEnum.SHARP, desc: "D Major: Bb -> A#" },
    { key: 2, mode: KeyEnum.minor, targetHalfTone: 10, expNote: NoteEnum.A, expAcc: AccidentalEnum.SHARP, desc: "B minor: Bb -> A#" },

    // 7 & 8. A Major & F# minor: F -> E# (halftone 5)
    { key: 3, mode: KeyEnum.major, targetHalfTone: 5, expNote: NoteEnum.E, expAcc: AccidentalEnum.SHARP, desc: "A Major: F -> E#" },
    { key: 3, mode: KeyEnum.minor, targetHalfTone: 5, expNote: NoteEnum.E, expAcc: AccidentalEnum.SHARP, desc: "F# minor: F -> E#" },

    // 9 & 10. E Major & C# minor: C -> B# (halftone 0)
    { key: 4, mode: KeyEnum.major, targetHalfTone: 0, expNote: NoteEnum.B, expAcc: AccidentalEnum.SHARP, desc: "E Major: C -> B#" },
    { key: 4, mode: KeyEnum.minor, targetHalfTone: 0, expNote: NoteEnum.B, expAcc: AccidentalEnum.SHARP, desc: "C# minor: C -> B#" },

    // 11 & 12. B Major & G# minor: G -> Fx (halftone 7)
    { key: 5, mode: KeyEnum.major, targetHalfTone: 7, expNote: NoteEnum.F, expAcc: AccidentalEnum.DOUBLESHARP, desc: "B Major: G -> Fx" },
    { key: 5, mode: KeyEnum.minor, targetHalfTone: 7, expNote: NoteEnum.F, expAcc: AccidentalEnum.DOUBLESHARP, desc: "G# minor: G -> Fx" },

    // 13 & 14. F# Major & D# minor: D -> Cx (halftone 2), F -> E# (halftone 5)
    { key: 6, mode: KeyEnum.major, targetHalfTone: 2, expNote: NoteEnum.C, expAcc: AccidentalEnum.DOUBLESHARP, desc: "F# Major: D -> Cx" },
    { key: 6, mode: KeyEnum.major, targetHalfTone: 5, expNote: NoteEnum.E, expAcc: AccidentalEnum.SHARP, desc: "F# Major: F -> E#" },
    { key: 6, mode: KeyEnum.minor, targetHalfTone: 2, expNote: NoteEnum.C, expAcc: AccidentalEnum.DOUBLESHARP, desc: "D# minor: D -> Cx" },
    { key: 6, mode: KeyEnum.minor, targetHalfTone: 5, expNote: NoteEnum.E, expAcc: AccidentalEnum.SHARP, desc: "D# minor: F -> E#" },

    // 15 & 16. Db Major & Bb minor: never use sharps
    { key: -5, mode: KeyEnum.major, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "Db Major: no sharp (Db)" },
    { key: -5, mode: KeyEnum.minor, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "Bb minor: no sharp (Db)" },
    { key: -5, mode: KeyEnum.major, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "Db Major: no sharp (Ab)" },
    { key: -5, mode: KeyEnum.minor, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "Bb minor: no sharp (Ab)" },

    // 17 & 18. Ab Major & F minor: never use sharps
    { key: -4, mode: KeyEnum.major, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "Ab Major: no sharp (Db)" },
    { key: -4, mode: KeyEnum.minor, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "F minor: no sharp (Db)" },
    { key: -4, mode: KeyEnum.major, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "Ab Major: no sharp (Ab)" },
    { key: -4, mode: KeyEnum.minor, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "F minor: no sharp (Ab)" },

    // 19 & 20. Eb Major & C minor: never use sharps
    { key: -3, mode: KeyEnum.major, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "Eb Major: no sharp (Db)" },
    { key: -3, mode: KeyEnum.minor, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "C minor: no sharp (Db)" },
    { key: -3, mode: KeyEnum.major, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "Eb Major: no sharp (Ab)" },
    { key: -3, mode: KeyEnum.minor, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "C minor: no sharp (Ab)" },

    // 21 & 22. Bb Major & G minor: Gb -> F# (halftone 6)
    { key: -2, mode: KeyEnum.major, targetHalfTone: 6, expNote: NoteEnum.F, expAcc: AccidentalEnum.SHARP, desc: "Bb Major: Gb -> F#" },
    { key: -2, mode: KeyEnum.minor, targetHalfTone: 6, expNote: NoteEnum.F, expAcc: AccidentalEnum.SHARP, desc: "G minor: Gb -> F#" },
    { key: -2, mode: KeyEnum.major, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "Bb Major: Db (not C#)" },
    { key: -2, mode: KeyEnum.minor, targetHalfTone: 1, expNote: NoteEnum.D, expAcc: AccidentalEnum.FLAT, desc: "G minor: Db (not C#)" },

    // 23 & 24. F Major & D minor: Db -> C# (halftone 1)
    { key: -1, mode: KeyEnum.major, targetHalfTone: 1, expNote: NoteEnum.C, expAcc: AccidentalEnum.SHARP, desc: "F Major: Db -> C#" },
    { key: -1, mode: KeyEnum.minor, targetHalfTone: 1, expNote: NoteEnum.C, expAcc: AccidentalEnum.SHARP, desc: "D minor: Db -> C#" },
    { key: -1, mode: KeyEnum.major, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "F Major: Ab (not G#)" },
    { key: -1, mode: KeyEnum.minor, targetHalfTone: 8, expNote: NoteEnum.A, expAcc: AccidentalEnum.FLAT, desc: "D minor: Ab (not G#)" },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
    const keyInst = new KeyInstruction(undefined, tc.key, tc.mode);
    // Construct a base pitch that is 1 halftone lower than the target, and transpose by 1
    // to avoid halftones === 0 short-circuit.
    // Base pitch at octave 4: halftone value is 48 (C4) + target - 1
    const targetMidi = 60 + tc.targetHalfTone;
    const basePitch = Pitch.fromHalftone(targetMidi - 1);
    const result = calculator.transposePitch(basePitch, keyInst, 1);

    const matchNote = result.FundamentalNote === tc.expNote;
    const matchAcc = result.Accidental === tc.expAcc;

    if (matchNote && matchAcc) {
        console.log(`[PASS] ${tc.desc}`);
        passed++;
    } else {
        console.log(`[FAIL] ${tc.desc}`);
        console.log(`       Expected: ${pitchToString(tc.expNote, tc.expAcc)}, got: ${pitchToString(result.FundamentalNote, result.Accidental)}`);
        failed++;
    }
}

console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);

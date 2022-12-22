import { Pitch, NoteEnum, AccidentalEnum } from "../../../src/Common/DataObjects/Pitch";

describe("Pitch Unit Tests:", () => {
    describe("transpose Pitch", () => {
        const pitch: Pitch = new Pitch(NoteEnum.A, 1, AccidentalEnum.NONE);
        const transposedFundamentalAndOctave: {halftone: number, overflow: number } =
          Pitch.CalculateTransposedHalfTone(pitch, 12);
        const higherTransposedFundamentalAndOctave: {halftone: number, overflow: number } =
          Pitch.CalculateTransposedHalfTone(pitch, 26);

        it("should be 1 octave higher and same fundamental", (done: Mocha.Done) => {
            chai.expect(transposedFundamentalAndOctave.overflow).to.equal(1);
            chai.expect(transposedFundamentalAndOctave.halftone).to.equal(pitch.FundamentalNote);
            chai.expect(higherTransposedFundamentalAndOctave.overflow).to.equal(2);
            chai.expect(higherTransposedFundamentalAndOctave.halftone).to.equal(pitch.FundamentalNote + 2);
            done();
        });
    });

    describe("calculate Frequency from Pitch", () => {
        const pitch1: Pitch = new Pitch(NoteEnum.A, 1, AccidentalEnum.NONE);
        const pitch2: Pitch = new Pitch(NoteEnum.B, 1, AccidentalEnum.DOUBLEFLAT);
        const pitch3: Pitch = new Pitch(NoteEnum.G, 1, AccidentalEnum.DOUBLESHARP);

        const frequency1: number = Pitch.calcFrequency(Pitch.calcFractionalKey(pitch1.Frequency));
        const frequency2: number = Pitch.calcFrequency(Pitch.calcFractionalKey(pitch2.Frequency));
        const frequency3: number = Pitch.calcFrequency(Pitch.calcFractionalKey(pitch3.Frequency));

        it("should be 440Hz", (done: Mocha.Done) => {
            chai.expect(pitch1.Frequency).to.equal(440);
            chai.expect(pitch2.Frequency).to.equal(440);
            chai.expect(pitch3.Frequency).to.equal(440);
            chai.expect(frequency1).to.equal(440);
            chai.expect(frequency2).to.equal(440);
            chai.expect(frequency3).to.equal(440);
            done();
        });
    });

    describe("calculate fractional key", () => {
        // the values are validated against the C# output. TODO: ask mauz about the shift
        const pitch1: Pitch = new Pitch(NoteEnum.C, 6, AccidentalEnum.SHARP);   // C#6 -> 109
        const pitch2: Pitch = new Pitch(NoteEnum.B, 1, AccidentalEnum.NONE);    // B1 -> 59
        const pitch3: Pitch = new Pitch(NoteEnum.F, 4, AccidentalEnum.DOUBLEFLAT);  // Fbb4 -> 87
        const pitch4: Pitch = new Pitch(NoteEnum.E, -1, AccidentalEnum.DOUBLESHARP);    // E##-1 -> 30
        const pitch5: Pitch = new Pitch(NoteEnum.A, 1, AccidentalEnum.NONE);    // A1 -> 57

        const key1: number = Pitch.calcFractionalKey(pitch1.Frequency);
        const key2: number = Pitch.calcFractionalKey(pitch2.Frequency);
        const key3: number = Pitch.calcFractionalKey(pitch3.Frequency);
        const key4: number = Pitch.calcFractionalKey(pitch4.Frequency);
        const key5: number = Pitch.calcFractionalKey(pitch5.Frequency);

        it("pitch key should equal midi key", (done: Mocha.Done) => {
            chai.expect(Math.round(key1)).to.equal(109);
            chai.expect(Math.round(key2)).to.equal(59);
            chai.expect(Math.round(key3)).to.equal(87);
            chai.expect(Math.round(key4)).to.equal(30);
            chai.expect(Math.round(key5)).to.equal(57);
            done();
        });
    });

    describe("calculate Pitch from Frequency", () => {
        const octave: number = 1;
        const accidentals: number[] = [AccidentalEnum.DOUBLEFLAT,
            AccidentalEnum.FLAT,
            AccidentalEnum.NONE,
            AccidentalEnum.SHARP,
            AccidentalEnum.DOUBLESHARP,
        ];

        let pitch: Pitch;
        let calcedPitch: Pitch;

        for (let i: number = 0; i < Pitch.pitchEnumValues.length; i++) {
            for (let j: number = 0; j < accidentals.length; j++) {
                pitch = new Pitch(Pitch.pitchEnumValues[i], octave, accidentals[j]);
                calcedPitch = Pitch.fromFrequency(pitch.Frequency);

                it( "calcedPitch equals original, " +
                    `note: ${pitch.FundamentalNote}, octave: ${pitch.Octave}, accidental; ${pitch.Accidental}`,
                    (done: Mocha.Done) => {
                        // compare the frequencies here -> only AccidentalEnum None and Sharp will lead to same note, octave and accidental
                        chai.expect(pitch.Frequency).to.equal(calcedPitch.Frequency);
                        done();
                    });
            }
        }
    });

    describe("get Pitch from fractional key", () => {
        const octave: number = 5;
        const accidentals: number[] = [AccidentalEnum.DOUBLEFLAT,
            AccidentalEnum.FLAT,
            AccidentalEnum.NONE,
            AccidentalEnum.SHARP,
            AccidentalEnum.DOUBLESHARP,
        ];

        let pitch: Pitch;
        let calcedPitch: Pitch;

        for (let i: number = 0; i < Pitch.pitchEnumValues.length; i++) {
            for (let j: number = 0; j < accidentals.length; j++) {
                pitch = new Pitch(Pitch.pitchEnumValues[i], octave, accidentals[j]);
                const halftone: number = pitch.getHalfTone();
                calcedPitch = Pitch.fromHalftone(halftone);

                it( "calcedPitch equals original, " +
                    `note: ${pitch.FundamentalNote}, octave: ${pitch.Octave}, accidental; ${pitch.Accidental}`,
                    (done: Mocha.Done) => {
                        chai.expect(pitch.getHalfTone()).to.equal(calcedPitch.getHalfTone());
                        done();
                    });
            }
        }
    });

    // TODO: test ceiling and floor (needed for the music sheet transpose)
    // TODO: test getTransposedPitch (or delete it -> seems to be a less powerful implementation of CalculateTransposedHalfTone)
    // TODO: test DoEnharmonicEnchange (needed for the midi reader)
});

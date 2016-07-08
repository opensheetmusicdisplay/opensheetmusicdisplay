"use strict";
var pitch_1 = require("../../../src/Common/DataObjects/pitch");
describe("Pitch Unit Tests:", function () {
    describe("transpose Pitch", function () {
        var pitch = new pitch_1.Pitch(pitch_1.NoteEnum.A, 1, pitch_1.AccidentalEnum.NONE);
        var transposedFundamentalAndOctave = pitch_1.Pitch.CalculateTransposedHalfTone(pitch, 12);
        var higherTransposedFundamentalAndOctave = pitch_1.Pitch.CalculateTransposedHalfTone(pitch, 26);
        it("should be 1 octave higher and same fundamental", function (done) {
            chai.expect(transposedFundamentalAndOctave.overflow).to.equal(1);
            chai.expect(transposedFundamentalAndOctave.value).to.equal(pitch.FundamentalNote);
            chai.expect(higherTransposedFundamentalAndOctave.overflow).to.equal(2);
            chai.expect(higherTransposedFundamentalAndOctave.value).to.equal(pitch.FundamentalNote + 2);
            done();
        });
    });
    describe("calculate Frequency from Pitch", function () {
        var pitch1 = new pitch_1.Pitch(pitch_1.NoteEnum.A, 1, pitch_1.AccidentalEnum.NONE);
        var pitch2 = new pitch_1.Pitch(pitch_1.NoteEnum.B, 1, pitch_1.AccidentalEnum.DOUBLEFLAT);
        var pitch3 = new pitch_1.Pitch(pitch_1.NoteEnum.G, 1, pitch_1.AccidentalEnum.DOUBLESHARP);
        var frequency1 = pitch_1.Pitch.calcFrequency(pitch_1.Pitch.calcFractionalKey(pitch1.Frequency));
        var frequency2 = pitch_1.Pitch.calcFrequency(pitch_1.Pitch.calcFractionalKey(pitch2.Frequency));
        var frequency3 = pitch_1.Pitch.calcFrequency(pitch_1.Pitch.calcFractionalKey(pitch3.Frequency));
        it("should be 440Hz", function (done) {
            chai.expect(pitch1.Frequency).to.equal(440);
            chai.expect(pitch2.Frequency).to.equal(440);
            chai.expect(pitch3.Frequency).to.equal(440);
            chai.expect(frequency1).to.equal(440);
            chai.expect(frequency2).to.equal(440);
            chai.expect(frequency3).to.equal(440);
            done();
        });
    });
    describe("calculate fractional key", function () {
        // the values are validated against the C# output. TODO: ask mauz about the shift
        var pitch1 = new pitch_1.Pitch(pitch_1.NoteEnum.C, 6, pitch_1.AccidentalEnum.SHARP); // C#6 -> 109
        var pitch2 = new pitch_1.Pitch(pitch_1.NoteEnum.B, 1, pitch_1.AccidentalEnum.NONE); // B1 -> 59
        var pitch3 = new pitch_1.Pitch(pitch_1.NoteEnum.F, 4, pitch_1.AccidentalEnum.DOUBLEFLAT); // Fbb4 -> 87
        var pitch4 = new pitch_1.Pitch(pitch_1.NoteEnum.E, -1, pitch_1.AccidentalEnum.DOUBLESHARP); // E##-1 -> 30
        var pitch5 = new pitch_1.Pitch(pitch_1.NoteEnum.A, 1, pitch_1.AccidentalEnum.NONE); // A1 -> 57
        var key1 = pitch_1.Pitch.calcFractionalKey(pitch1.Frequency);
        var key2 = pitch_1.Pitch.calcFractionalKey(pitch2.Frequency);
        var key3 = pitch_1.Pitch.calcFractionalKey(pitch3.Frequency);
        var key4 = pitch_1.Pitch.calcFractionalKey(pitch4.Frequency);
        var key5 = pitch_1.Pitch.calcFractionalKey(pitch5.Frequency);
        it("pitch key should equal midi key", function (done) {
            chai.expect(key1).to.equal(109);
            chai.expect(key2).to.equal(59);
            chai.expect(key3).to.equal(87);
            chai.expect(key4).to.equal(30);
            chai.expect(key5).to.equal(57);
            done();
        });
    });
    describe("calculate Pitch from Frequency", function () {
        var octave = 1;
        var accidentals = [pitch_1.AccidentalEnum.DOUBLEFLAT,
            pitch_1.AccidentalEnum.FLAT,
            pitch_1.AccidentalEnum.NONE,
            pitch_1.AccidentalEnum.SHARP,
            pitch_1.AccidentalEnum.DOUBLESHARP,
        ];
        var pitch;
        var calcedPitch;
        for (var i = 0; i < pitch_1.Pitch.pitchEnumValues.length; i++) {
            for (var j = 0; j < accidentals.length; j++) {
                pitch = new pitch_1.Pitch(pitch_1.Pitch.pitchEnumValues[i], octave, accidentals[j]);
                calcedPitch = pitch_1.Pitch.fromFrequency(pitch.Frequency);
                it("calcedPitch equals original, " +
                    ("note: " + pitch.FundamentalNote + ", octave: " + pitch.Octave + ", accidental; " + pitch.Accidental), function (done) {
                    // compare the frequencies here -> only AccidentalEnum None and Sharp will lead to same note, octave and accidental
                    chai.expect(pitch.Frequency).to.equal(calcedPitch.Frequency);
                    done();
                });
            }
        }
    });
    describe("get Pitch from fractional key", function () {
        var octave = 5;
        var accidentals = [pitch_1.AccidentalEnum.DOUBLEFLAT,
            pitch_1.AccidentalEnum.FLAT,
            pitch_1.AccidentalEnum.NONE,
            pitch_1.AccidentalEnum.SHARP,
            pitch_1.AccidentalEnum.DOUBLESHARP,
        ];
        var pitch;
        var calcedPitch;
        for (var i = 0; i < pitch_1.Pitch.pitchEnumValues.length; i++) {
            for (var j = 0; j < accidentals.length; j++) {
                pitch = new pitch_1.Pitch(pitch_1.Pitch.pitchEnumValues[i], octave, accidentals[j]);
                var halftone = pitch.getHalfTone();
                calcedPitch = pitch_1.Pitch.fromHalftone(halftone);
                it("calcedPitch equals original, " +
                    ("note: " + pitch.FundamentalNote + ", octave: " + pitch.Octave + ", accidental; " + pitch.Accidental), function (done) {
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

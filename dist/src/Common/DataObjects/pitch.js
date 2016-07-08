"use strict";
(function (NoteEnum) {
    NoteEnum[NoteEnum["C"] = 0] = "C";
    NoteEnum[NoteEnum["D"] = 2] = "D";
    NoteEnum[NoteEnum["E"] = 4] = "E";
    NoteEnum[NoteEnum["F"] = 5] = "F";
    NoteEnum[NoteEnum["G"] = 7] = "G";
    NoteEnum[NoteEnum["A"] = 9] = "A";
    NoteEnum[NoteEnum["B"] = 11] = "B";
})(exports.NoteEnum || (exports.NoteEnum = {}));
var NoteEnum = exports.NoteEnum;
(function (AccidentalEnum) {
    AccidentalEnum[AccidentalEnum["DOUBLEFLAT"] = -2] = "DOUBLEFLAT";
    AccidentalEnum[AccidentalEnum["FLAT"] = -1] = "FLAT";
    AccidentalEnum[AccidentalEnum["NONE"] = 0] = "NONE";
    AccidentalEnum[AccidentalEnum["SHARP"] = 1] = "SHARP";
    AccidentalEnum[AccidentalEnum["DOUBLESHARP"] = 2] = "DOUBLESHARP";
})(exports.AccidentalEnum || (exports.AccidentalEnum = {}));
var AccidentalEnum = exports.AccidentalEnum;
var Pitch = (function () {
    function Pitch(fundamentalNote, octave, accidental) {
        this.accidental = AccidentalEnum.NONE;
        this.fundamentalNote = fundamentalNote;
        this.octave = octave;
        this.accidental = accidental;
        this.halfTone = (fundamentalNote) + (octave + Pitch.octXmlDiff) * 12 + accidental;
        this.frequency = Pitch.calcFrequency(this);
    }
    Pitch.getNoteEnumString = function (note) {
        switch (note) {
            case NoteEnum.C:
                return "C";
            case NoteEnum.D:
                return "D";
            case NoteEnum.E:
                return "E";
            case NoteEnum.F:
                return "F";
            case NoteEnum.G:
                return "G";
            case NoteEnum.A:
                return "A";
            case NoteEnum.B:
                return "B";
            default:
                return "";
        }
    };
    /**
     * @param the input pitch
     * @param the number of halftones to transpose with
     * @returns ret[0] = the transposed fundamental.
     *          ret[1] = the octave shift (not the new octave!)
     * @constructor
     */
    Pitch.CalculateTransposedHalfTone = function (pitch, transpose) {
        var newHalfTone = pitch.fundamentalNote + pitch.accidental + transpose;
        return Pitch.WrapAroundCheck(newHalfTone, 12);
    };
    Pitch.WrapAroundCheck = function (value, limit) {
        var overflow = 0;
        while (value < 0) {
            value += limit;
            overflow--; // the octave change
        }
        while (value >= limit) {
            value -= limit;
            overflow++; // the octave change
        }
        return { overflow: overflow, value: value };
    };
    //public static calcFrequency(pitch: Pitch): number;
    //public static calcFrequency(fractionalKey: number): number;
    Pitch.calcFrequency = function (obj) {
        var octaveSteps = 0;
        var halftoneSteps;
        if (obj instanceof Pitch) {
            // obj is a pitch
            var pitch = obj;
            octaveSteps = pitch.octave - 1;
            halftoneSteps = pitch.fundamentalNote - NoteEnum.A + pitch.accidental;
        }
        else if (typeof obj === "number") {
            // obj is a fractional key
            var fractionalKey = obj;
            halftoneSteps = fractionalKey - 57.0;
        }
        // Return frequency:
        return 440.0 * Math.pow(2, octaveSteps) * Math.pow(2, halftoneSteps / 12.0);
    };
    Pitch.calcFractionalKey = function (frequency) {
        // Return half-tone frequency:
        return Math.log(frequency / 440.0) / Math.LN10 * Pitch.halftoneFactor + 57.0;
    };
    Pitch.fromFrequency = function (frequency) {
        var key = Pitch.calcFractionalKey(frequency) + 0.5;
        var octave = Math.floor(key / 12) - Pitch.octXmlDiff;
        var halftone = Math.floor(key) % 12;
        var fundamentalNote = halftone;
        var accidental = AccidentalEnum.NONE;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = (halftone - 1);
            accidental = AccidentalEnum.SHARP;
        }
        return new Pitch(fundamentalNote, octave, accidental);
    };
    Pitch.fromHalftone = function (halftone) {
        var octave = Math.floor(halftone / 12) - Pitch.octXmlDiff;
        var halftoneInOctave = halftone % 12;
        var fundamentalNote = halftoneInOctave;
        var accidental = AccidentalEnum.NONE;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = (halftoneInOctave - 1);
            accidental = AccidentalEnum.SHARP;
        }
        return new Pitch(fundamentalNote, octave, accidental);
    };
    Pitch.ceiling = function (halftone) {
        halftone = (halftone) % 12;
        var fundamentalNote = halftone;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = (halftone + 1);
        }
        return fundamentalNote;
    };
    Pitch.floor = function (halftone) {
        halftone = halftone % 12;
        var fundamentalNote = halftone;
        if (this.pitchEnumValues.indexOf(fundamentalNote) === -1) {
            fundamentalNote = (halftone - 1);
        }
        return fundamentalNote;
    };
    Object.defineProperty(Pitch.prototype, "Octave", {
        get: function () {
            return this.octave;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pitch.prototype, "FundamentalNote", {
        get: function () {
            return this.fundamentalNote;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pitch.prototype, "Accidental", {
        get: function () {
            return this.accidental;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pitch.prototype, "Frequency", {
        get: function () {
            return this.frequency;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pitch, "OctaveXmlDifference", {
        get: function () {
            return Pitch.octXmlDiff;
        },
        enumerable: true,
        configurable: true
    });
    Pitch.prototype.getHalfTone = function () {
        return this.halfTone;
    };
    Pitch.prototype.getTransposedPitch = function (factor) {
        if (factor > 12) {
            throw new Error("rewrite this method to handle bigger octave changes or don't use is with bigger octave changes!");
        }
        if (factor > 0) {
            return this.getHigherPitchByTransposeFactor(factor);
        }
        if (factor < 0) {
            return this.getLowerPitchByTransposeFactor(-factor);
        }
        return this;
    };
    Pitch.prototype.DoEnharmonicChange = function () {
        switch (this.accidental) {
            case AccidentalEnum.FLAT:
            case AccidentalEnum.DOUBLEFLAT:
                this.fundamentalNote = this.getPreviousFundamentalNote(this.fundamentalNote);
                this.accidental = (this.halfTone - ((this.fundamentalNote) +
                    (this.octave + Pitch.octXmlDiff) * 12));
                break;
            case AccidentalEnum.SHARP:
            case AccidentalEnum.DOUBLESHARP:
                this.fundamentalNote = this.getNextFundamentalNote(this.fundamentalNote);
                this.accidental = (this.halfTone - ((this.fundamentalNote) +
                    (this.octave + Pitch.octXmlDiff) * 12));
                break;
            default:
                return;
        }
    };
    Pitch.prototype.ToString = function () {
        return "Note: " + this.fundamentalNote + ", octave: " + this.octave.toString() + ", alter: " +
            this.accidental;
    };
    Pitch.prototype.OperatorEquals = function (p2) {
        var p1 = this;
        // if (ReferenceEquals(p1, p2)) {
        //     return true;
        // }
        if ((p1 === undefined) || (p2 === undefined)) {
            return false;
        }
        return (p1.FundamentalNote === p2.FundamentalNote && p1.Octave === p2.Octave && p1.Accidental === p2.Accidental);
    };
    Pitch.prototype.OperatorNotEqual = function (p2) {
        var p1 = this;
        return !(p1 === p2);
    };
    Pitch.prototype.getHigherPitchByTransposeFactor = function (factor) {
        var noteEnumIndex = Pitch.pitchEnumValues.indexOf(this.fundamentalNote);
        var newOctave = this.octave;
        var newNoteEnum;
        if (noteEnumIndex + factor > Pitch.pitchEnumValues.length - 1) {
            newNoteEnum = Pitch.pitchEnumValues[noteEnumIndex + factor - Pitch.pitchEnumValues.length];
            newOctave++;
        }
        else {
            newNoteEnum = Pitch.pitchEnumValues[noteEnumIndex + factor];
        }
        return new Pitch(newNoteEnum, newOctave, AccidentalEnum.NONE);
    };
    Pitch.prototype.getLowerPitchByTransposeFactor = function (factor) {
        var noteEnumIndex = Pitch.pitchEnumValues.indexOf(this.fundamentalNote);
        var newOctave = this.octave;
        var newNoteEnum;
        if (noteEnumIndex - factor < 0) {
            newNoteEnum = Pitch.pitchEnumValues[Pitch.pitchEnumValues.length + noteEnumIndex - factor];
            newOctave--;
        }
        else {
            newNoteEnum = Pitch.pitchEnumValues[noteEnumIndex - factor];
        }
        return new Pitch(newNoteEnum, newOctave, AccidentalEnum.NONE);
    };
    Pitch.prototype.getNextFundamentalNote = function (fundamental) {
        var i = Pitch.pitchEnumValues.indexOf(fundamental);
        i = (i + 1) % Pitch.pitchEnumValues.length;
        return Pitch.pitchEnumValues[i];
    };
    Pitch.prototype.getPreviousFundamentalNote = function (fundamental) {
        var i = Pitch.pitchEnumValues.indexOf(fundamental);
        if (i > 0) {
            return Pitch.pitchEnumValues[i - 1];
        }
        else {
            return Pitch.pitchEnumValues[Pitch.pitchEnumValues.length - 1];
        }
    };
    Pitch.pitchEnumValues = [
        NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B,
    ];
    Pitch.halftoneFactor = 12 / (Math.LN2 / Math.LN10);
    Pitch.octXmlDiff = 3;
    return Pitch;
}());
exports.Pitch = Pitch;

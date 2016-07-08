"use strict";
var Vex = require("vexflow");
var ClefInstruction_1 = require("../../VoiceData/Instructions/ClefInstruction");
var RhythmInstruction_1 = require("../../VoiceData/Instructions/RhythmInstruction");
var KeyInstruction_1 = require("../../VoiceData/Instructions/KeyInstruction");
var pitch_1 = require("../../../Common/DataObjects/pitch");
var pitch_2 = require("../../../Common/DataObjects/pitch");
var SystemLinesEnum_1 = require("../SystemLinesEnum");
var VexFlowConverter = (function () {
    function VexFlowConverter() {
    }
    VexFlowConverter.duration = function (fraction) {
        var dur = fraction.RealValue;
        if (dur >= 1) {
            return "w";
        }
        else if (dur < 1 && dur >= 0.5) {
            return "h";
        }
        else if (dur < 0.5 && dur >= 0.25) {
            return "q";
        }
        else if (dur < 0.25 && dur >= 0.125) {
            return "8";
        }
        else if (dur < 0.125 && dur >= 0.0625) {
            return "16";
        }
        else if (dur < 0.0625 && dur >= 0.03125) {
            return "32";
        }
        return "128";
    };
    /**
     * Takes a Pitch and returns a string representing a VexFlow pitch,
     * which has the form "b/4", plus its alteration (accidental)
     * @param pitch
     * @returns {string[]}
     */
    VexFlowConverter.pitch = function (pitch, clef) {
        var fund = pitch_2.NoteEnum[pitch.FundamentalNote].toLowerCase();
        // The octave seems to need a shift of three FIXME?
        var octave = pitch.Octave + clef.OctaveOffset + 3;
        var acc = VexFlowConverter.accidental(pitch.Accidental);
        return [fund + "n/" + octave, acc, clef];
    };
    /**
     * Converts AccidentalEnum to vexFlow accidental string
     * @param accidental
     * @returns {string}
     */
    VexFlowConverter.accidental = function (accidental) {
        var acc;
        switch (accidental) {
            case pitch_1.AccidentalEnum.NONE:
                acc = "n";
                break;
            case pitch_1.AccidentalEnum.FLAT:
                acc = "b";
                break;
            case pitch_1.AccidentalEnum.SHARP:
                acc = "#";
                break;
            case pitch_1.AccidentalEnum.DOUBLESHARP:
                acc = "##";
                break;
            case pitch_1.AccidentalEnum.DOUBLEFLAT:
                acc = "bb";
                break;
            default:
        }
        return acc;
    };
    VexFlowConverter.StaveNote = function (notes) {
        var keys = [];
        var accidentals = [];
        var frac = notes[0].sourceNote.Length;
        var duration = VexFlowConverter.duration(frac);
        var vfclef;
        for (var _i = 0, notes_1 = notes; _i < notes_1.length; _i++) {
            var note = notes_1[_i];
            var res = note.vfpitch;
            if (res === undefined) {
                keys = ["b/4"];
                duration += "r";
                break;
            }
            keys.push(res[0]);
            accidentals.push(res[1]);
            if (!vfclef) {
                vfclef = VexFlowConverter.Clef(res[2]);
            }
        }
        var vfnote = new Vex.Flow.StaveNote({
            auto_stem: true,
            clef: vfclef,
            duration: duration,
            duration_override: {
                denominator: frac.Denominator,
                numerator: frac.Numerator,
            },
            keys: keys,
        });
        for (var i = 0, len = notes.length; i < len; i += 1) {
            notes[i].setIndex(vfnote, i);
            if (accidentals[i]) {
                vfnote.addAccidental(i, new Vex.Flow.Accidental(accidentals[i]));
            }
        }
        return vfnote;
    };
    VexFlowConverter.Clef = function (clef) {
        var type;
        switch (clef.ClefType) {
            case ClefInstruction_1.ClefEnum.G:
                type = "treble";
                break;
            case ClefInstruction_1.ClefEnum.F:
                type = "bass";
                break;
            case ClefInstruction_1.ClefEnum.C:
                type = "alto";
                break;
            case ClefInstruction_1.ClefEnum.percussion:
                type = "percussion";
                break;
            case ClefInstruction_1.ClefEnum.TAB:
                type = "tab";
                break;
            default:
        }
        return type;
    };
    VexFlowConverter.TimeSignature = function (rhythm) {
        var timeSpec;
        switch (rhythm.SymbolEnum) {
            case RhythmInstruction_1.RhythmSymbolEnum.NONE:
                timeSpec = rhythm.Rhythm.Numerator + "/" + rhythm.Rhythm.Denominator;
                break;
            case RhythmInstruction_1.RhythmSymbolEnum.COMMON:
                timeSpec = "C";
                break;
            case RhythmInstruction_1.RhythmSymbolEnum.CUT:
                timeSpec = "C|";
                break;
            default:
        }
        return new Vex.Flow.TimeSignature(timeSpec);
    };
    VexFlowConverter.keySignature = function (key) {
        if (key === undefined) {
            return undefined;
        }
        var ret;
        switch (key.Mode) {
            case KeyInstruction_1.KeyEnum.none:
                ret = undefined;
                break;
            case KeyInstruction_1.KeyEnum.minor:
                ret = VexFlowConverter.minorMap[key.Key] + "m";
                break;
            case KeyInstruction_1.KeyEnum.major:
                ret = VexFlowConverter.majorMap[key.Key];
                break;
            default:
        }
        return ret;
    };
    VexFlowConverter.line = function (lineType) {
        switch (lineType) {
            case SystemLinesEnum_1.SystemLinesEnum.SingleThin:
                return Vex.Flow.StaveConnector.type.SINGLE;
            case SystemLinesEnum_1.SystemLinesEnum.DoubleThin:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum_1.SystemLinesEnum.ThinBold:
                return Vex.Flow.StaveConnector.type.SINGLE;
            case SystemLinesEnum_1.SystemLinesEnum.BoldThinDots:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum_1.SystemLinesEnum.DotsThinBold:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots:
                return Vex.Flow.StaveConnector.type.DOUBLE;
            case SystemLinesEnum_1.SystemLinesEnum.None:
                return Vex.Flow.StaveConnector.type.NONE;
            default:
        }
    };
    VexFlowConverter.majorMap = {
        "0": "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#",
        8: "G#", "-1": "F", "-8": "Fb", "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb", "-2": "Bb",
    };
    VexFlowConverter.minorMap = {
        "1": "E", "7": "A#", "0": "A", "6": "D#", "3": "F#", "-5": "Bb", "-4": "F", "-7": "Ab", "-6": "Eb",
        "-1": "D", "4": "C#", "-3": "C", "-2": "G", "2": "B", "5": "G#", "-8": "Db", "8": "E#",
    };
    return VexFlowConverter;
}());
exports.VexFlowConverter = VexFlowConverter;

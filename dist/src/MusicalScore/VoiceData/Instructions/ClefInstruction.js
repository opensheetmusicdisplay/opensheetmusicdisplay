"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var pitch_1 = require("../../../Common/DataObjects/pitch");
var AbstractNotationInstruction_1 = require("./AbstractNotationInstruction");
var pitch_2 = require("../../../Common/DataObjects/pitch");
var pitch_3 = require("../../../Common/DataObjects/pitch");
var Exceptions_1 = require("../../Exceptions");
var ClefInstruction = (function (_super) {
    __extends(ClefInstruction, _super);
    function ClefInstruction(clefType, octaveOffset, line) {
        if (clefType === void 0) { clefType = ClefEnum.G; }
        if (octaveOffset === void 0) { octaveOffset = 0; }
        if (line === void 0) { line = 2; }
        _super.call(this, undefined); // FIXME? Missing SourceStaffEntry!
        this.clefType = ClefEnum.G;
        this.line = 2;
        this.octaveOffset = 0;
        this.line = line;
        this.clefType = clefType;
        this.octaveOffset = octaveOffset;
        this.calcParameters();
    }
    ClefInstruction.getDefaultClefFromMidiInstrument = function (instrument) {
        switch (instrument) {
            case MidiInstrument.Acoustic_Grand_Piano:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Electric_Bass_finger:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Electric_Bass_pick:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Fretless_Bass:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Slap_Bass_1:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Slap_Bass_2:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Synth_Bass_1:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Synth_Bass_2:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Contrabass:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            default:
                return new ClefInstruction(ClefEnum.G, 0, 2);
        }
    };
    ClefInstruction.getAllPossibleClefs = function () {
        var clefList = [];
        for (var i = 0; i <= 2; i++) {
            var clefInstructionG = new ClefInstruction(ClefEnum.G, i, 2);
            clefList.push(clefInstructionG);
        }
        for (var j = -2; j <= 0; j++) {
            var clefInstructionF = new ClefInstruction(ClefEnum.F, j, 4);
            clefList.push(clefInstructionF);
        }
        return clefList;
    };
    ClefInstruction.isSupportedClef = function (clef) {
        switch (clef) {
            case ClefEnum.G:
            case ClefEnum.F:
            case ClefEnum.C:
            case ClefEnum.percussion:
                return true;
            default:
                return false;
        }
    };
    Object.defineProperty(ClefInstruction.prototype, "ClefType", {
        get: function () {
            return this.clefType;
        },
        set: function (value) {
            this.clefType = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefInstruction.prototype, "Line", {
        get: function () {
            return this.line;
        },
        set: function (value) {
            this.line = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefInstruction.prototype, "OctaveOffset", {
        get: function () {
            return this.octaveOffset;
        },
        set: function (value) {
            this.octaveOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefInstruction.prototype, "ClefPitch", {
        get: function () {
            return this.clefPitch;
        },
        set: function (value) {
            this.clefPitch = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClefInstruction.prototype, "ReferenceCyPosition", {
        get: function () {
            return this.referenceCyPosition;
        },
        set: function (value) {
            this.referenceCyPosition = value;
        },
        enumerable: true,
        configurable: true
    });
    ClefInstruction.prototype.Equals = function (other) {
        if (this === other) {
            return true;
        }
        if (this === undefined || other === undefined) {
            return false;
        }
        return (this.ClefPitch === other.ClefPitch && this.Line === other.Line);
    };
    ClefInstruction.prototype.NotEqual = function (clef2) {
        return !this.Equals(clef2);
    };
    ClefInstruction.prototype.ToString = function () {
        return "ClefType: " + this.clefType;
    };
    ClefInstruction.prototype.calcParameters = function () {
        switch (this.clefType) {
            case ClefEnum.G:
                this.clefPitch = new pitch_1.Pitch(pitch_2.NoteEnum.G, 1 + this.octaveOffset, pitch_3.AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line) + 2;
                break;
            case ClefEnum.F:
                this.clefPitch = new pitch_1.Pitch(pitch_2.NoteEnum.F, 0 + this.octaveOffset, pitch_3.AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line) + 1.5;
                break;
            case ClefEnum.C:
                this.clefPitch = new pitch_1.Pitch(pitch_2.NoteEnum.C, 1 + this.octaveOffset, pitch_3.AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line);
                break;
            case ClefEnum.percussion:
                this.clefPitch = new pitch_1.Pitch(pitch_2.NoteEnum.C, 2, pitch_3.AccidentalEnum.NONE);
                this.referenceCyPosition = 2;
                break;
            default:
                throw new Exceptions_1.ArgumentOutOfRangeException("clefType");
        }
    };
    return ClefInstruction;
}(AbstractNotationInstruction_1.AbstractNotationInstruction));
exports.ClefInstruction = ClefInstruction;
(function (ClefEnum) {
    ClefEnum[ClefEnum["G"] = 0] = "G";
    ClefEnum[ClefEnum["F"] = 1] = "F";
    ClefEnum[ClefEnum["C"] = 2] = "C";
    ClefEnum[ClefEnum["percussion"] = 3] = "percussion";
    ClefEnum[ClefEnum["TAB"] = 4] = "TAB";
})(exports.ClefEnum || (exports.ClefEnum = {}));
var ClefEnum = exports.ClefEnum;
(function (MidiInstrument) {
    MidiInstrument[MidiInstrument["None"] = -1] = "None";
    MidiInstrument[MidiInstrument["Acoustic_Grand_Piano"] = 0] = "Acoustic_Grand_Piano";
    MidiInstrument[MidiInstrument["Bright_Acoustic_Piano"] = 1] = "Bright_Acoustic_Piano";
    MidiInstrument[MidiInstrument["Electric_Grand_Piano"] = 2] = "Electric_Grand_Piano";
    MidiInstrument[MidiInstrument["Honky_tonk_Piano"] = 3] = "Honky_tonk_Piano";
    MidiInstrument[MidiInstrument["Electric_Piano_1"] = 4] = "Electric_Piano_1";
    MidiInstrument[MidiInstrument["Electric_Piano_2"] = 5] = "Electric_Piano_2";
    MidiInstrument[MidiInstrument["Harpsichord"] = 6] = "Harpsichord";
    MidiInstrument[MidiInstrument["Clavinet"] = 7] = "Clavinet";
    MidiInstrument[MidiInstrument["Celesta"] = 8] = "Celesta";
    MidiInstrument[MidiInstrument["Glockenspiel"] = 9] = "Glockenspiel";
    MidiInstrument[MidiInstrument["Music_Box"] = 10] = "Music_Box";
    MidiInstrument[MidiInstrument["Vibraphone"] = 11] = "Vibraphone";
    MidiInstrument[MidiInstrument["Marimba"] = 12] = "Marimba";
    MidiInstrument[MidiInstrument["Xylophone"] = 13] = "Xylophone";
    MidiInstrument[MidiInstrument["Tubular_Bells"] = 14] = "Tubular_Bells";
    MidiInstrument[MidiInstrument["Dulcimer"] = 15] = "Dulcimer";
    MidiInstrument[MidiInstrument["Drawbar_Organ"] = 16] = "Drawbar_Organ";
    MidiInstrument[MidiInstrument["Percussive_Organ"] = 17] = "Percussive_Organ";
    MidiInstrument[MidiInstrument["Rock_Organ"] = 18] = "Rock_Organ";
    MidiInstrument[MidiInstrument["Church_Organ"] = 19] = "Church_Organ";
    MidiInstrument[MidiInstrument["Reed_Organ"] = 20] = "Reed_Organ";
    MidiInstrument[MidiInstrument["Accordion"] = 21] = "Accordion";
    MidiInstrument[MidiInstrument["Harmonica"] = 22] = "Harmonica";
    MidiInstrument[MidiInstrument["Tango_Accordion"] = 23] = "Tango_Accordion";
    MidiInstrument[MidiInstrument["Acoustic_Guitar_nylon"] = 24] = "Acoustic_Guitar_nylon";
    MidiInstrument[MidiInstrument["Acoustic_Guitar_steel"] = 25] = "Acoustic_Guitar_steel";
    MidiInstrument[MidiInstrument["Electric_Guitar_jazz"] = 26] = "Electric_Guitar_jazz";
    MidiInstrument[MidiInstrument["Electric_Guitar_clean"] = 27] = "Electric_Guitar_clean";
    MidiInstrument[MidiInstrument["Electric_Guitar_muted"] = 28] = "Electric_Guitar_muted";
    MidiInstrument[MidiInstrument["Overdriven_Guitar"] = 29] = "Overdriven_Guitar";
    MidiInstrument[MidiInstrument["Distortion_Guitar"] = 30] = "Distortion_Guitar";
    MidiInstrument[MidiInstrument["Guitar_harmonics"] = 31] = "Guitar_harmonics";
    MidiInstrument[MidiInstrument["Acoustic_Bass"] = 32] = "Acoustic_Bass";
    MidiInstrument[MidiInstrument["Electric_Bass_finger"] = 33] = "Electric_Bass_finger";
    MidiInstrument[MidiInstrument["Electric_Bass_pick"] = 34] = "Electric_Bass_pick";
    MidiInstrument[MidiInstrument["Fretless_Bass"] = 35] = "Fretless_Bass";
    MidiInstrument[MidiInstrument["Slap_Bass_1"] = 36] = "Slap_Bass_1";
    MidiInstrument[MidiInstrument["Slap_Bass_2"] = 37] = "Slap_Bass_2";
    MidiInstrument[MidiInstrument["Synth_Bass_1"] = 38] = "Synth_Bass_1";
    MidiInstrument[MidiInstrument["Synth_Bass_2"] = 39] = "Synth_Bass_2";
    MidiInstrument[MidiInstrument["Violin"] = 40] = "Violin";
    MidiInstrument[MidiInstrument["Viola"] = 41] = "Viola";
    MidiInstrument[MidiInstrument["Cello"] = 42] = "Cello";
    MidiInstrument[MidiInstrument["Contrabass"] = 43] = "Contrabass";
    MidiInstrument[MidiInstrument["Tremolo_Strings"] = 44] = "Tremolo_Strings";
    MidiInstrument[MidiInstrument["Pizzicato_Strings"] = 45] = "Pizzicato_Strings";
    MidiInstrument[MidiInstrument["Orchestral_Harp"] = 46] = "Orchestral_Harp";
    MidiInstrument[MidiInstrument["Timpani"] = 47] = "Timpani";
    MidiInstrument[MidiInstrument["String_Ensemble_1"] = 48] = "String_Ensemble_1";
    MidiInstrument[MidiInstrument["String_Ensemble_2"] = 49] = "String_Ensemble_2";
    MidiInstrument[MidiInstrument["Synth_Strings_1"] = 50] = "Synth_Strings_1";
    MidiInstrument[MidiInstrument["Synth_Strings_2"] = 51] = "Synth_Strings_2";
    MidiInstrument[MidiInstrument["Choir_Aahs"] = 52] = "Choir_Aahs";
    MidiInstrument[MidiInstrument["Voice_Oohs"] = 53] = "Voice_Oohs";
    MidiInstrument[MidiInstrument["Synth_Voice"] = 54] = "Synth_Voice";
    MidiInstrument[MidiInstrument["Orchestra_Hit"] = 55] = "Orchestra_Hit";
    MidiInstrument[MidiInstrument["Trumpet"] = 56] = "Trumpet";
    MidiInstrument[MidiInstrument["Trombone"] = 57] = "Trombone";
    MidiInstrument[MidiInstrument["Tuba"] = 58] = "Tuba";
    MidiInstrument[MidiInstrument["Muted_Trumpet"] = 59] = "Muted_Trumpet";
    MidiInstrument[MidiInstrument["French_Horn"] = 60] = "French_Horn";
    MidiInstrument[MidiInstrument["Brass_Section"] = 61] = "Brass_Section";
    MidiInstrument[MidiInstrument["Synth_Brass_1"] = 62] = "Synth_Brass_1";
    MidiInstrument[MidiInstrument["Synth_Brass_2"] = 63] = "Synth_Brass_2";
    MidiInstrument[MidiInstrument["Soprano_Sax"] = 64] = "Soprano_Sax";
    MidiInstrument[MidiInstrument["Alto_Sax"] = 65] = "Alto_Sax";
    MidiInstrument[MidiInstrument["Tenor_Sax"] = 66] = "Tenor_Sax";
    MidiInstrument[MidiInstrument["Baritone_Sax"] = 67] = "Baritone_Sax";
    MidiInstrument[MidiInstrument["Oboe"] = 68] = "Oboe";
    MidiInstrument[MidiInstrument["English_Horn"] = 69] = "English_Horn";
    MidiInstrument[MidiInstrument["Bassoon"] = 70] = "Bassoon";
    MidiInstrument[MidiInstrument["Clarinet"] = 71] = "Clarinet";
    MidiInstrument[MidiInstrument["Piccolo"] = 72] = "Piccolo";
    MidiInstrument[MidiInstrument["Flute"] = 73] = "Flute";
    MidiInstrument[MidiInstrument["Recorder"] = 74] = "Recorder";
    MidiInstrument[MidiInstrument["Pan_Flute"] = 75] = "Pan_Flute";
    MidiInstrument[MidiInstrument["Blown_Bottle"] = 76] = "Blown_Bottle";
    MidiInstrument[MidiInstrument["Shakuhachi"] = 77] = "Shakuhachi";
    MidiInstrument[MidiInstrument["Whistle"] = 78] = "Whistle";
    MidiInstrument[MidiInstrument["Ocarina"] = 79] = "Ocarina";
    MidiInstrument[MidiInstrument["Lead_1_square"] = 80] = "Lead_1_square";
    MidiInstrument[MidiInstrument["Lead_2_sawtooth"] = 81] = "Lead_2_sawtooth";
    MidiInstrument[MidiInstrument["Lead_3_calliope"] = 82] = "Lead_3_calliope";
    MidiInstrument[MidiInstrument["Lead_4_chiff"] = 83] = "Lead_4_chiff";
    MidiInstrument[MidiInstrument["Lead_5_charang"] = 84] = "Lead_5_charang";
    MidiInstrument[MidiInstrument["Lead_6_voice"] = 85] = "Lead_6_voice";
    MidiInstrument[MidiInstrument["Lead_7_fifths"] = 86] = "Lead_7_fifths";
    MidiInstrument[MidiInstrument["Lead_8_bass_lead"] = 87] = "Lead_8_bass_lead";
    MidiInstrument[MidiInstrument["Pad_1_new_age"] = 88] = "Pad_1_new_age";
    MidiInstrument[MidiInstrument["Pad_2_warm"] = 89] = "Pad_2_warm";
    MidiInstrument[MidiInstrument["Pad_3_polysynth"] = 90] = "Pad_3_polysynth";
    MidiInstrument[MidiInstrument["Pad_4_choir"] = 91] = "Pad_4_choir";
    MidiInstrument[MidiInstrument["Pad_5_bowed"] = 92] = "Pad_5_bowed";
    MidiInstrument[MidiInstrument["Pad_6_metallic"] = 93] = "Pad_6_metallic";
    MidiInstrument[MidiInstrument["Pad_7_halo"] = 94] = "Pad_7_halo";
    MidiInstrument[MidiInstrument["Pad_8_sweep"] = 95] = "Pad_8_sweep";
    MidiInstrument[MidiInstrument["FX_1_rain"] = 96] = "FX_1_rain";
    MidiInstrument[MidiInstrument["FX_2_soundtrack"] = 97] = "FX_2_soundtrack";
    MidiInstrument[MidiInstrument["FX_3_crystal"] = 98] = "FX_3_crystal";
    MidiInstrument[MidiInstrument["FX_4_atmosphere"] = 99] = "FX_4_atmosphere";
    MidiInstrument[MidiInstrument["FX_5_brightness"] = 100] = "FX_5_brightness";
    MidiInstrument[MidiInstrument["FX_6_goblins"] = 101] = "FX_6_goblins";
    MidiInstrument[MidiInstrument["FX_7_echoes"] = 102] = "FX_7_echoes";
    MidiInstrument[MidiInstrument["FX_8_scifi"] = 103] = "FX_8_scifi";
    MidiInstrument[MidiInstrument["Sitar"] = 104] = "Sitar";
    MidiInstrument[MidiInstrument["Banjo"] = 105] = "Banjo";
    MidiInstrument[MidiInstrument["Shamisen"] = 106] = "Shamisen";
    MidiInstrument[MidiInstrument["Koto"] = 107] = "Koto";
    MidiInstrument[MidiInstrument["Kalimba"] = 108] = "Kalimba";
    MidiInstrument[MidiInstrument["Bag_pipe"] = 109] = "Bag_pipe";
    MidiInstrument[MidiInstrument["Fiddle"] = 110] = "Fiddle";
    MidiInstrument[MidiInstrument["Shanai"] = 111] = "Shanai";
    MidiInstrument[MidiInstrument["Tinkle_Bell"] = 112] = "Tinkle_Bell";
    MidiInstrument[MidiInstrument["Agogo"] = 113] = "Agogo";
    MidiInstrument[MidiInstrument["Steel_Drums"] = 114] = "Steel_Drums";
    MidiInstrument[MidiInstrument["Woodblock"] = 115] = "Woodblock";
    MidiInstrument[MidiInstrument["Taiko_Drum"] = 116] = "Taiko_Drum";
    MidiInstrument[MidiInstrument["Melodic_Tom"] = 117] = "Melodic_Tom";
    MidiInstrument[MidiInstrument["Synth_Drum"] = 118] = "Synth_Drum";
    MidiInstrument[MidiInstrument["Reverse_Cymbal"] = 119] = "Reverse_Cymbal";
    MidiInstrument[MidiInstrument["Guitar_Fret_Noise"] = 120] = "Guitar_Fret_Noise";
    MidiInstrument[MidiInstrument["Breath_Noise"] = 121] = "Breath_Noise";
    MidiInstrument[MidiInstrument["Seashore"] = 122] = "Seashore";
    MidiInstrument[MidiInstrument["Bird_Tweet"] = 123] = "Bird_Tweet";
    MidiInstrument[MidiInstrument["Telephone_Ring"] = 124] = "Telephone_Ring";
    MidiInstrument[MidiInstrument["Helicopter"] = 125] = "Helicopter";
    MidiInstrument[MidiInstrument["Applause"] = 126] = "Applause";
    MidiInstrument[MidiInstrument["Gunshot"] = 127] = "Gunshot";
    MidiInstrument[MidiInstrument["Percussion"] = 128] = "Percussion";
})(exports.MidiInstrument || (exports.MidiInstrument = {}));
var MidiInstrument = exports.MidiInstrument;

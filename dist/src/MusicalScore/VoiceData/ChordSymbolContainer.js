"use strict";
var pitch_1 = require("../../Common/DataObjects/pitch");
var MusicSheetCalculator_1 = require("../Graphical/MusicSheetCalculator");
var pitch_2 = require("../../Common/DataObjects/pitch");
var ChordSymbolContainer = (function () {
    function ChordSymbolContainer(rootPitch, chordKind, bassPitch, chordDegree, keyInstruction) {
        this.rootPitch = rootPitch;
        this.chordKind = chordKind;
        this.keyInstruction = keyInstruction;
        this.bassPitch = bassPitch;
        this.degree = chordDegree;
    }
    Object.defineProperty(ChordSymbolContainer.prototype, "RootPitch", {
        get: function () {
            return this.rootPitch;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordSymbolContainer.prototype, "ChordKind", {
        get: function () {
            return this.chordKind;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordSymbolContainer.prototype, "BassPitch", {
        get: function () {
            return this.bassPitch;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordSymbolContainer.prototype, "ChordDegree", {
        get: function () {
            return this.degree;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordSymbolContainer.prototype, "KeyInstruction", {
        get: function () {
            return this.keyInstruction;
        },
        enumerable: true,
        configurable: true
    });
    ChordSymbolContainer.calculateChordText = function (chordSymbol, transposeHalftones) {
        var transposedRootPitch = chordSymbol.RootPitch;
        if (MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator !== undefined) {
            transposedRootPitch = MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator.transposePitch(chordSymbol.RootPitch, chordSymbol.KeyInstruction, transposeHalftones);
        }
        var text = pitch_1.Pitch.getNoteEnumString(transposedRootPitch.FundamentalNote);
        if (transposedRootPitch.Accidental !== pitch_2.AccidentalEnum.NONE) {
            text += this.getTextForAccidental(transposedRootPitch.Accidental);
        }
        text += ChordSymbolContainer.getTextFromChordKindEnum(chordSymbol.ChordKind);
        if (chordSymbol.BassPitch !== undefined) {
            var transposedBassPitch = chordSymbol.BassPitch;
            if (MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator !== undefined) {
                transposedBassPitch = MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator.transposePitch(chordSymbol.BassPitch, chordSymbol.KeyInstruction, transposeHalftones);
            }
            text += "/";
            text += pitch_1.Pitch.getNoteEnumString(transposedBassPitch.FundamentalNote);
            text += this.getTextForAccidental(transposedBassPitch.Accidental);
        }
        if (chordSymbol.ChordDegree !== undefined) {
            switch (chordSymbol.ChordDegree.text) {
                case ChordDegreeText.add:
                    text += "add";
                    break;
                case ChordDegreeText.alter:
                    text += "alt";
                    break;
                case ChordDegreeText.subtract:
                    text += "sub";
                    break;
                default:
            }
            text += chordSymbol.ChordDegree.value;
            if (chordSymbol.ChordDegree.alteration !== pitch_2.AccidentalEnum.NONE) {
                text += ChordSymbolContainer.getTextForAccidental(chordSymbol.ChordDegree.alteration);
            }
        }
        return text;
    };
    ChordSymbolContainer.getTextForAccidental = function (alteration) {
        var text = "";
        switch (alteration) {
            case pitch_2.AccidentalEnum.DOUBLEFLAT:
                text += "bb";
                break;
            case pitch_2.AccidentalEnum.FLAT:
                text += "b";
                break;
            case pitch_2.AccidentalEnum.SHARP:
                text += "#";
                break;
            case pitch_2.AccidentalEnum.DOUBLESHARP:
                text += "x";
                break;
            default:
        }
        return text;
    };
    ChordSymbolContainer.getTextFromChordKindEnum = function (kind) {
        var text = "";
        switch (kind) {
            case ChordSymbolEnum.major:
                break;
            case ChordSymbolEnum.minor:
                text += "m";
                break;
            case ChordSymbolEnum.augmented:
                text += "aug";
                break;
            case ChordSymbolEnum.diminished:
                text += "dim";
                break;
            case ChordSymbolEnum.dominant:
                text += "7";
                break;
            case ChordSymbolEnum.majorseventh:
                text += "maj7";
                break;
            case ChordSymbolEnum.minorseventh:
                text += "m7";
                break;
            case ChordSymbolEnum.diminishedseventh:
                text += "dim7";
                break;
            case ChordSymbolEnum.augmentedseventh:
                text += "aug7";
                break;
            case ChordSymbolEnum.halfdiminished:
                text += "m7b5";
                break;
            case ChordSymbolEnum.majorminor:
                text += "";
                break;
            case ChordSymbolEnum.majorsixth:
                text += "maj6";
                break;
            case ChordSymbolEnum.minorsixth:
                text += "m6";
                break;
            case ChordSymbolEnum.dominantninth:
                text += "9";
                break;
            case ChordSymbolEnum.majorninth:
                text += "maj9";
                break;
            case ChordSymbolEnum.minorninth:
                text += "m9";
                break;
            case ChordSymbolEnum.dominant11th:
                text += "11";
                break;
            case ChordSymbolEnum.major11th:
                text += "maj11";
                break;
            case ChordSymbolEnum.minor11th:
                text += "m11";
                break;
            case ChordSymbolEnum.dominant13th:
                text += "13";
                break;
            case ChordSymbolEnum.major13th:
                text += "maj13";
                break;
            case ChordSymbolEnum.minor13th:
                text += "m13";
                break;
            case ChordSymbolEnum.suspendedsecond:
                text += "sus2";
                break;
            case ChordSymbolEnum.suspendedfourth:
                text += "sus4";
                break;
            case ChordSymbolEnum.Neapolitan:
            case ChordSymbolEnum.Italian:
            case ChordSymbolEnum.French:
            case ChordSymbolEnum.German:
            case ChordSymbolEnum.pedal:
            case ChordSymbolEnum.power:
            case ChordSymbolEnum.Tristan:
                break;
            default:
                break;
        }
        return text;
    };
    return ChordSymbolContainer;
}());
exports.ChordSymbolContainer = ChordSymbolContainer;
var Degree = (function () {
    function Degree(value, alteration, text) {
        this.value = value;
        this.alteration = alteration;
        this.text = text;
    }
    return Degree;
}());
exports.Degree = Degree;
(function (ChordDegreeText) {
    ChordDegreeText[ChordDegreeText["add"] = 0] = "add";
    ChordDegreeText[ChordDegreeText["alter"] = 1] = "alter";
    ChordDegreeText[ChordDegreeText["subtract"] = 2] = "subtract";
})(exports.ChordDegreeText || (exports.ChordDegreeText = {}));
var ChordDegreeText = exports.ChordDegreeText;
(function (ChordSymbolEnum) {
    ChordSymbolEnum[ChordSymbolEnum["major"] = 0] = "major";
    ChordSymbolEnum[ChordSymbolEnum["minor"] = 1] = "minor";
    ChordSymbolEnum[ChordSymbolEnum["augmented"] = 2] = "augmented";
    ChordSymbolEnum[ChordSymbolEnum["diminished"] = 3] = "diminished";
    ChordSymbolEnum[ChordSymbolEnum["dominant"] = 4] = "dominant";
    ChordSymbolEnum[ChordSymbolEnum["majorseventh"] = 5] = "majorseventh";
    ChordSymbolEnum[ChordSymbolEnum["minorseventh"] = 6] = "minorseventh";
    ChordSymbolEnum[ChordSymbolEnum["diminishedseventh"] = 7] = "diminishedseventh";
    ChordSymbolEnum[ChordSymbolEnum["augmentedseventh"] = 8] = "augmentedseventh";
    ChordSymbolEnum[ChordSymbolEnum["halfdiminished"] = 9] = "halfdiminished";
    ChordSymbolEnum[ChordSymbolEnum["majorminor"] = 10] = "majorminor";
    ChordSymbolEnum[ChordSymbolEnum["majorsixth"] = 11] = "majorsixth";
    ChordSymbolEnum[ChordSymbolEnum["minorsixth"] = 12] = "minorsixth";
    ChordSymbolEnum[ChordSymbolEnum["dominantninth"] = 13] = "dominantninth";
    ChordSymbolEnum[ChordSymbolEnum["majorninth"] = 14] = "majorninth";
    ChordSymbolEnum[ChordSymbolEnum["minorninth"] = 15] = "minorninth";
    ChordSymbolEnum[ChordSymbolEnum["dominant11th"] = 16] = "dominant11th";
    ChordSymbolEnum[ChordSymbolEnum["major11th"] = 17] = "major11th";
    ChordSymbolEnum[ChordSymbolEnum["minor11th"] = 18] = "minor11th";
    ChordSymbolEnum[ChordSymbolEnum["dominant13th"] = 19] = "dominant13th";
    ChordSymbolEnum[ChordSymbolEnum["major13th"] = 20] = "major13th";
    ChordSymbolEnum[ChordSymbolEnum["minor13th"] = 21] = "minor13th";
    ChordSymbolEnum[ChordSymbolEnum["suspendedsecond"] = 22] = "suspendedsecond";
    ChordSymbolEnum[ChordSymbolEnum["suspendedfourth"] = 23] = "suspendedfourth";
    ChordSymbolEnum[ChordSymbolEnum["Neapolitan"] = 24] = "Neapolitan";
    ChordSymbolEnum[ChordSymbolEnum["Italian"] = 25] = "Italian";
    ChordSymbolEnum[ChordSymbolEnum["French"] = 26] = "French";
    ChordSymbolEnum[ChordSymbolEnum["German"] = 27] = "German";
    ChordSymbolEnum[ChordSymbolEnum["pedal"] = 28] = "pedal";
    ChordSymbolEnum[ChordSymbolEnum["power"] = 29] = "power";
    ChordSymbolEnum[ChordSymbolEnum["Tristan"] = 30] = "Tristan";
})(exports.ChordSymbolEnum || (exports.ChordSymbolEnum = {}));
var ChordSymbolEnum = exports.ChordSymbolEnum;

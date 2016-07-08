"use strict";
var pitch_1 = require("../../Common/DataObjects/pitch");
var KeyInstruction_1 = require("../VoiceData/Instructions/KeyInstruction");
var Dictionary_1 = require("typescript-collections/dist/lib/Dictionary");
var AccidentalCalculator = (function () {
    function AccidentalCalculator(symbolFactory) {
        this.keySignatureNoteAlterationsDict = new Dictionary_1.default();
        this.currentAlterationsComparedToKeyInstructionDict = [];
        this.currentInMeasureNoteAlterationsDict = new Dictionary_1.default();
        this.symbolFactory = symbolFactory;
    }
    Object.defineProperty(AccidentalCalculator.prototype, "ActiveKeyInstruction", {
        get: function () {
            return this.activeKeyInstruction;
        },
        set: function (value) {
            this.activeKeyInstruction = value;
            this.reactOnKeyInstructionChange();
        },
        enumerable: true,
        configurable: true
    });
    AccidentalCalculator.prototype.doCalculationsAtEndOfMeasure = function () {
        this.currentInMeasureNoteAlterationsDict.clear();
        for (var _i = 0, _a = this.keySignatureNoteAlterationsDict.keys(); _i < _a.length; _i++) {
            var key = _a[_i];
            this.currentInMeasureNoteAlterationsDict.setValue(key, this.keySignatureNoteAlterationsDict.getValue(key));
        }
    };
    AccidentalCalculator.prototype.checkAccidental = function (graphicalNote, pitch, grace, graceScalingFactor) {
        if (pitch === undefined) {
            return;
        }
        var pitchKey = pitch.FundamentalNote + pitch.Octave * 12;
        var pitchKeyGivenInMeasureDict = this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey);
        if ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental !== pitch_1.AccidentalEnum.NONE)) {
            if (this.currentAlterationsComparedToKeyInstructionDict.indexOf(pitchKey) === -1) {
                this.currentAlterationsComparedToKeyInstructionDict.push(pitchKey);
            }
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        }
        else if (this.currentAlterationsComparedToKeyInstructionDict.indexOf(pitchKey) !== -1
            && ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
                || (!pitchKeyGivenInMeasureDict && pitch.Accidental === pitch_1.AccidentalEnum.NONE))) {
            delete this.currentAlterationsComparedToKeyInstructionDict[pitchKey];
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        }
    };
    AccidentalCalculator.prototype.reactOnKeyInstructionChange = function () {
        var noteEnums = KeyInstruction_1.KeyInstruction.getNoteEnumList(this.activeKeyInstruction);
        var keyAccidentalType;
        if (this.activeKeyInstruction.Key > 0) {
            keyAccidentalType = pitch_1.AccidentalEnum.SHARP;
        }
        else {
            keyAccidentalType = pitch_1.AccidentalEnum.FLAT;
        }
        this.keySignatureNoteAlterationsDict.clear();
        this.currentAlterationsComparedToKeyInstructionDict.length = 0;
        for (var octave = -9; octave < 9; octave++) {
            for (var i = 0; i < noteEnums.length; i++) {
                this.keySignatureNoteAlterationsDict.setValue(noteEnums[i] + octave * 12, keyAccidentalType);
            }
        }
        this.doCalculationsAtEndOfMeasure();
    };
    return AccidentalCalculator;
}());
exports.AccidentalCalculator = AccidentalCalculator;

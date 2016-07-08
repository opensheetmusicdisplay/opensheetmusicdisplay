"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbstractNotationInstruction_1 = require("./AbstractNotationInstruction");
var pitch_1 = require("../../../Common/DataObjects/pitch");
var pitch_2 = require("../../../Common/DataObjects/pitch");
var KeyInstruction = (function (_super) {
    __extends(KeyInstruction, _super);
    function KeyInstruction(sourceStaffEntry, key, mode) {
        if (sourceStaffEntry === void 0) { sourceStaffEntry = undefined; }
        if (key === void 0) { key = 0; }
        if (mode === void 0) { mode = KeyEnum.major; }
        _super.call(this, sourceStaffEntry);
        this.Key = key;
        this.mode = mode;
    }
    KeyInstruction.copy = function (keyInstruction) {
        var newKeyInstruction = new KeyInstruction(keyInstruction.parent, keyInstruction.Key, keyInstruction.Mode);
        return newKeyInstruction;
    };
    KeyInstruction.getNoteEnumList = function (instruction) {
        var enums = [];
        if (instruction.keyType > 0) {
            for (var i = 0; i < instruction.keyType; i++) {
                enums.push(KeyInstruction.sharpPositionList[i]);
            }
        }
        if (instruction.keyType < 0) {
            for (var i = 0; i < Math.abs(instruction.keyType); i++) {
                enums.push(KeyInstruction.flatPositionList[i]);
            }
        }
        return enums;
    };
    KeyInstruction.getAllPossibleMajorKeyInstructions = function () {
        var keyInstructionList = [];
        for (var keyType = -7; keyType < 7; keyType++) {
            var currentKeyInstruction = new KeyInstruction(undefined, keyType, KeyEnum.major);
            keyInstructionList.push(currentKeyInstruction);
        }
        return keyInstructionList;
    };
    Object.defineProperty(KeyInstruction.prototype, "Key", {
        get: function () {
            return this.keyType;
        },
        set: function (value) {
            this.keyType = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(KeyInstruction.prototype, "Mode", {
        get: function () {
            return this.mode;
        },
        set: function (value) {
            this.mode = value;
        },
        enumerable: true,
        configurable: true
    });
    KeyInstruction.prototype.getFundamentalNotesOfAccidentals = function () {
        var noteList = [];
        if (this.keyType > 0) {
            for (var i = 0; i < this.keyType; i++) {
                noteList.push(KeyInstruction.sharpPositionList[i]);
            }
        }
        else if (this.keyType < 0) {
            for (var i = 0; i < -this.keyType; i++) {
                noteList.push(KeyInstruction.flatPositionList[i]);
            }
        }
        return noteList;
    };
    KeyInstruction.prototype.getAlterationForPitch = function (pitch) {
        if (this.keyType > 0 && KeyInstruction.sharpPositionList.indexOf(pitch.FundamentalNote) <= this.keyType) {
            return pitch_2.AccidentalEnum.SHARP;
        }
        else if (this.keyType < 0 && KeyInstruction.flatPositionList.indexOf(pitch.FundamentalNote) <= Math.abs(this.keyType)) {
            return pitch_2.AccidentalEnum.FLAT;
        }
        return pitch_2.AccidentalEnum.NONE;
    };
    KeyInstruction.prototype.ToString = function () {
        return "Key: " + this.keyType + "" + this.mode;
    };
    KeyInstruction.prototype.OperatorEquals = function (key2) {
        var key1 = this;
        if (key1 === key2) {
            return true;
        }
        if ((key1 === undefined) || (key2 === undefined)) {
            return false;
        }
        return (key1.Key === key2.Key && key1.Mode === key2.Mode);
    };
    KeyInstruction.prototype.OperatorNotEqual = function (key2) {
        return !(this.OperatorEquals(key2));
    };
    KeyInstruction.sharpPositionList = [pitch_1.NoteEnum.F, pitch_1.NoteEnum.C, pitch_1.NoteEnum.G, pitch_1.NoteEnum.D, pitch_1.NoteEnum.A, pitch_1.NoteEnum.E, pitch_1.NoteEnum.B];
    KeyInstruction.flatPositionList = [pitch_1.NoteEnum.B, pitch_1.NoteEnum.E, pitch_1.NoteEnum.A, pitch_1.NoteEnum.D, pitch_1.NoteEnum.G, pitch_1.NoteEnum.C, pitch_1.NoteEnum.F];
    return KeyInstruction;
}(AbstractNotationInstruction_1.AbstractNotationInstruction));
exports.KeyInstruction = KeyInstruction;
var NoteEnumToHalfToneLink = (function () {
    function NoteEnumToHalfToneLink(note, halftone) {
        this.note = note;
        this.halfTone = halftone;
    }
    return NoteEnumToHalfToneLink;
}());
exports.NoteEnumToHalfToneLink = NoteEnumToHalfToneLink;
(function (KeyEnum) {
    KeyEnum[KeyEnum["major"] = 0] = "major";
    KeyEnum[KeyEnum["minor"] = 1] = "minor";
    KeyEnum[KeyEnum["none"] = 2] = "none";
})(exports.KeyEnum || (exports.KeyEnum = {}));
var KeyEnum = exports.KeyEnum;

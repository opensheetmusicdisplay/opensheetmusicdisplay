"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbstractNotationInstruction_1 = require("./AbstractNotationInstruction");
var RhythmInstruction = (function (_super) {
    __extends(RhythmInstruction, _super);
    function RhythmInstruction(rhythm, numerator, denominator, rhythmSymbolEnum) {
        _super.call(this, undefined); // FIXME no parent SourceStaffEntry
        this.rhythm = rhythm;
        this.numerator = numerator;
        this.denominator = denominator;
        this.symbolEnum = rhythmSymbolEnum;
    }
    Object.defineProperty(RhythmInstruction.prototype, "Rhythm", {
        get: function () {
            return this.rhythm;
        },
        set: function (value) {
            this.rhythm = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RhythmInstruction.prototype, "SymbolEnum", {
        get: function () {
            return this.symbolEnum;
        },
        set: function (value) {
            this.symbolEnum = value;
        },
        enumerable: true,
        configurable: true
    });
    RhythmInstruction.prototype.clone = function () {
        return new RhythmInstruction(this.rhythm.clone(), this.numerator, this.denominator, this.symbolEnum);
    };
    RhythmInstruction.prototype.OperatorEquals = function (rhythm2) {
        var rhythm1 = this;
        if (rhythm1 === rhythm2) {
            return true;
        }
        if ((rhythm1 === undefined) || (rhythm2 === undefined)) {
            return false;
        }
        return (rhythm1.numerator === rhythm2.numerator && rhythm1.denominator === rhythm2.denominator);
    };
    RhythmInstruction.prototype.OperatorNotEqual = function (rhythm2) {
        var rhythm1 = this;
        return !(rhythm1 === rhythm2);
    };
    RhythmInstruction.prototype.ToString = function () {
        return "Rhythm: " + this.rhythm.toString();
    };
    return RhythmInstruction;
}(AbstractNotationInstruction_1.AbstractNotationInstruction));
exports.RhythmInstruction = RhythmInstruction;
(function (RhythmSymbolEnum) {
    RhythmSymbolEnum[RhythmSymbolEnum["NONE"] = 0] = "NONE";
    RhythmSymbolEnum[RhythmSymbolEnum["COMMON"] = 1] = "COMMON";
    RhythmSymbolEnum[RhythmSymbolEnum["CUT"] = 2] = "CUT";
})(exports.RhythmSymbolEnum || (exports.RhythmSymbolEnum = {}));
var RhythmSymbolEnum = exports.RhythmSymbolEnum;

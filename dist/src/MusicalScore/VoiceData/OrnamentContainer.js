"use strict";
var pitch_1 = require("../../Common/DataObjects/pitch");
var OrnamentContainer = (function () {
    function OrnamentContainer(ornament) {
        this.accidentalAbove = pitch_1.AccidentalEnum.NONE;
        this.accidentalBelow = pitch_1.AccidentalEnum.NONE;
        this.ornament = ornament;
    }
    Object.defineProperty(OrnamentContainer.prototype, "GetOrnament", {
        get: function () {
            return this.ornament;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OrnamentContainer.prototype, "AccidentalAbove", {
        get: function () {
            return this.accidentalAbove;
        },
        set: function (value) {
            this.accidentalAbove = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OrnamentContainer.prototype, "AccidentalBelow", {
        get: function () {
            return this.accidentalBelow;
        },
        set: function (value) {
            this.accidentalBelow = value;
        },
        enumerable: true,
        configurable: true
    });
    return OrnamentContainer;
}());
exports.OrnamentContainer = OrnamentContainer;
(function (OrnamentEnum) {
    OrnamentEnum[OrnamentEnum["Trill"] = 0] = "Trill";
    OrnamentEnum[OrnamentEnum["Turn"] = 1] = "Turn";
    OrnamentEnum[OrnamentEnum["InvertedTurn"] = 2] = "InvertedTurn";
    OrnamentEnum[OrnamentEnum["DelayedTurn"] = 3] = "DelayedTurn";
    OrnamentEnum[OrnamentEnum["DelayedInvertedTurn"] = 4] = "DelayedInvertedTurn";
    OrnamentEnum[OrnamentEnum["Mordent"] = 5] = "Mordent";
    OrnamentEnum[OrnamentEnum["InvertedMordent"] = 6] = "InvertedMordent";
})(exports.OrnamentEnum || (exports.OrnamentEnum = {}));
var OrnamentEnum = exports.OrnamentEnum;

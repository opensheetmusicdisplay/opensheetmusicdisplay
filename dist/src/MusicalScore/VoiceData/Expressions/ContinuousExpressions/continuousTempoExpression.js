"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fraction_1 = require("../../../../Common/DataObjects/fraction");
var abstractTempoExpression_1 = require("../abstractTempoExpression");
var ContinuousTempoExpression = (function (_super) {
    __extends(ContinuousTempoExpression, _super);
    function ContinuousTempoExpression(label, placement, staffNumber, parentMultiTempoExpression) {
        _super.call(this, label, placement, staffNumber, parentMultiTempoExpression);
        //super.label = label;
        //super.placement = placement;
        //super.staffNumber = staffNumber;
        //super.parentMultiTempoExpression = parentMultiTempoExpression;
        this.setTempoType();
    }
    ContinuousTempoExpression.isInputStringContinuousTempo = function (inputString) {
        if (inputString === undefined) {
            return false;
        }
        return (ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoFaster, inputString)
            || ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoSlower, inputString));
    };
    ContinuousTempoExpression.isIncreasingTempo = function (tempoType) {
        return tempoType <= ContinuousTempoType.piuMosso;
    };
    ContinuousTempoExpression.isDecreasingTempo = function (tempoType) {
        return (tempoType >= ContinuousTempoType.allargando) && (tempoType <= ContinuousTempoType.ritenuto);
    };
    Object.defineProperty(ContinuousTempoExpression.prototype, "TempoType", {
        get: function () {
            return this.tempoType;
        },
        set: function (value) {
            this.tempoType = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousTempoExpression.prototype, "StartTempo", {
        get: function () {
            return this.startTempo;
        },
        set: function (value) {
            this.startTempo = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousTempoExpression.prototype, "EndTempo", {
        get: function () {
            return this.endTempo;
        },
        set: function (value) {
            this.endTempo = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousTempoExpression.prototype, "AbsoluteEndTimestamp", {
        get: function () {
            return this.absoluteEndTimestamp;
        },
        set: function (value) {
            this.absoluteEndTimestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousTempoExpression.prototype, "AbsoluteTimestamp", {
        get: function () {
            return this.ParentMultiTempoExpression.AbsoluteTimestamp;
        },
        enumerable: true,
        configurable: true
    });
    ContinuousTempoExpression.prototype.getAbsoluteFloatTimestamp = function () {
        return this.ParentMultiTempoExpression.AbsoluteTimestamp.RealValue;
    };
    ContinuousTempoExpression.prototype.getInterpolatedTempo = function (currentAbsoluteTimestamp) {
        var continuousAbsoluteStartTimestamp = fraction_1.Fraction.plus(this.parentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.parentMultiTempoExpression.Timestamp);
        if (currentAbsoluteTimestamp.lt(continuousAbsoluteStartTimestamp)) {
            return -1;
        }
        if (currentAbsoluteTimestamp.lt(this.absoluteEndTimestamp)) {
            return -2;
        }
        var interpolationRatio = fraction_1.Fraction.minus(currentAbsoluteTimestamp, continuousAbsoluteStartTimestamp).RealValue
            / fraction_1.Fraction.minus(this.absoluteEndTimestamp, continuousAbsoluteStartTimestamp).RealValue;
        var interpolatedTempo = Math.max(0.0, Math.min(250.0, this.startTempo + (this.endTempo - this.startTempo) * interpolationRatio));
        return interpolatedTempo;
    };
    ContinuousTempoExpression.prototype.setTempoType = function () {
        if (ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoFaster, this.label)) {
            this.tempoType = ContinuousTempoType.accelerando;
        }
        else if (ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoSlower, this.label)) {
            this.tempoType = ContinuousTempoType.ritardando;
        }
    };
    ContinuousTempoExpression.listContinuousTempoFaster = ["accelerando", "piu mosso", "poco piu", "stretto"];
    ContinuousTempoExpression.listContinuousTempoSlower = [
        "poco meno", "meno mosso", "piu lento", "calando", "allargando", "rallentando", "ritardando",
        "ritenuto", "ritard.", "ritard", "rit.", "rit", "riten.", "riten",
    ];
    return ContinuousTempoExpression;
}(abstractTempoExpression_1.AbstractTempoExpression));
exports.ContinuousTempoExpression = ContinuousTempoExpression;
(function (ContinuousTempoType) {
    ContinuousTempoType[ContinuousTempoType["accelerando"] = 0] = "accelerando";
    ContinuousTempoType[ContinuousTempoType["stretto"] = 1] = "stretto";
    ContinuousTempoType[ContinuousTempoType["stringendo"] = 2] = "stringendo";
    ContinuousTempoType[ContinuousTempoType["mosso"] = 3] = "mosso";
    ContinuousTempoType[ContinuousTempoType["piuMosso"] = 4] = "piuMosso";
    ContinuousTempoType[ContinuousTempoType["allargando"] = 5] = "allargando";
    ContinuousTempoType[ContinuousTempoType["calando"] = 6] = "calando";
    ContinuousTempoType[ContinuousTempoType["menoMosso"] = 7] = "menoMosso";
    ContinuousTempoType[ContinuousTempoType["rallentando"] = 8] = "rallentando";
    ContinuousTempoType[ContinuousTempoType["ritardando"] = 9] = "ritardando";
    ContinuousTempoType[ContinuousTempoType["ritard"] = 10] = "ritard";
    ContinuousTempoType[ContinuousTempoType["rit"] = 11] = "rit";
    ContinuousTempoType[ContinuousTempoType["ritenuto"] = 12] = "ritenuto";
    ContinuousTempoType[ContinuousTempoType["rubato"] = 13] = "rubato";
    ContinuousTempoType[ContinuousTempoType["precipitando"] = 14] = "precipitando";
})(exports.ContinuousTempoType || (exports.ContinuousTempoType = {}));
var ContinuousTempoType = exports.ContinuousTempoType;

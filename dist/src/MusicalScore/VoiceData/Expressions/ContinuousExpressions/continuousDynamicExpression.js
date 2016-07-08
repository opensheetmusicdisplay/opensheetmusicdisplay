"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var abstractExpression_1 = require("../abstractExpression");
var fraction_1 = require("../../../../Common/DataObjects/fraction");
var ContinuousDynamicExpression = (function (_super) {
    __extends(ContinuousDynamicExpression, _super);
    //constructor(placement: PlacementEnum, staffNumber: number, label: string) {
    //    this.label = label;
    //    this.placement = placement;
    //    this.staffNumber = staffNumber;
    //    this.startVolume = -1;
    //    this.endVolume = -1;
    //    this.setType();
    //}
    function ContinuousDynamicExpression(dynamicType, placement, staffNumber, label) {
        _super.call(this);
        this.dynamicType = dynamicType;
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.startVolume = -1;
        this.endVolume = -1;
        this.setType();
    }
    Object.defineProperty(ContinuousDynamicExpression.prototype, "DynamicType", {
        get: function () {
            return this.dynamicType;
        },
        set: function (value) {
            this.dynamicType = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "StartMultiExpression", {
        get: function () {
            return this.startMultiExpression;
        },
        set: function (value) {
            this.startMultiExpression = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "EndMultiExpression", {
        get: function () {
            return this.endMultiExpression;
        },
        set: function (value) {
            this.endMultiExpression = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "Placement", {
        get: function () {
            return this.placement;
        },
        set: function (value) {
            this.placement = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "StartVolume", {
        get: function () {
            return this.startVolume;
        },
        set: function (value) {
            this.startVolume = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "EndVolume", {
        get: function () {
            return this.endVolume;
        },
        set: function (value) {
            this.endVolume = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContinuousDynamicExpression.prototype, "Label", {
        get: function () {
            return this.label;
        },
        set: function (value) {
            this.label = value;
            this.setType();
        },
        enumerable: true,
        configurable: true
    });
    ContinuousDynamicExpression.isInputStringContinuousDynamic = function (inputString) {
        if (inputString === undefined) {
            return false;
        }
        return (ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicIncreasing, inputString)
            || ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicDecreasing, inputString));
    };
    ContinuousDynamicExpression.prototype.getInterpolatedDynamic = function (currentAbsoluteTimestamp) {
        var continuousAbsoluteStartTimestamp = this.StartMultiExpression.AbsoluteTimestamp;
        var continuousAbsoluteEndTimestamp;
        if (this.EndMultiExpression !== undefined) {
            continuousAbsoluteEndTimestamp = this.EndMultiExpression.AbsoluteTimestamp;
        }
        else {
            continuousAbsoluteEndTimestamp = fraction_1.Fraction.plus(this.startMultiExpression.SourceMeasureParent.AbsoluteTimestamp, this.startMultiExpression.SourceMeasureParent.Duration);
        }
        if (currentAbsoluteTimestamp.lt(continuousAbsoluteStartTimestamp)) {
            return -1;
        }
        if (currentAbsoluteTimestamp.lt(continuousAbsoluteEndTimestamp)) {
            return -2;
        }
        var interpolationRatio = fraction_1.Fraction.minus(currentAbsoluteTimestamp, continuousAbsoluteStartTimestamp).RealValue
            / fraction_1.Fraction.minus(continuousAbsoluteEndTimestamp, continuousAbsoluteStartTimestamp).RealValue;
        var interpolatedVolume = Math.max(0.0, Math.min(99.9, this.startVolume + (this.endVolume - this.startVolume) * interpolationRatio));
        return interpolatedVolume;
    };
    ContinuousDynamicExpression.prototype.isWedge = function () {
        return this.label === undefined;
    };
    ContinuousDynamicExpression.prototype.setType = function () {
        if (ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicIncreasing, this.label)) {
            this.dynamicType = ContDynamicEnum.crescendo;
        }
        else if (ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicDecreasing, this.label)) {
            this.dynamicType = ContDynamicEnum.diminuendo;
        }
    };
    ContinuousDynamicExpression.listContinuousDynamicIncreasing = ["crescendo", "cresc", "cresc.", "cres."];
    ContinuousDynamicExpression.listContinuousDynamicDecreasing = ["decrescendo", "decresc", "decr.", "diminuendo", "dim.", "dim"];
    return ContinuousDynamicExpression;
}(abstractExpression_1.AbstractExpression));
exports.ContinuousDynamicExpression = ContinuousDynamicExpression;
(function (ContDynamicEnum) {
    ContDynamicEnum[ContDynamicEnum["crescendo"] = 0] = "crescendo";
    ContDynamicEnum[ContDynamicEnum["diminuendo"] = 1] = "diminuendo";
})(exports.ContDynamicEnum || (exports.ContDynamicEnum = {}));
var ContDynamicEnum = exports.ContDynamicEnum;

"use strict";
var OctaveShift = (function () {
    function OctaveShift(type, octave) {
        this.setOctaveShiftValue(type, octave);
    }
    Object.defineProperty(OctaveShift.prototype, "Type", {
        get: function () {
            return this.octaveValue;
        },
        set: function (value) {
            this.octaveValue = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OctaveShift.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OctaveShift.prototype, "ParentStartMultiExpression", {
        get: function () {
            return this.startMultiExpression;
        },
        set: function (value) {
            this.startMultiExpression = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OctaveShift.prototype, "ParentEndMultiExpression", {
        get: function () {
            return this.endMultiExpression;
        },
        set: function (value) {
            this.endMultiExpression = value;
        },
        enumerable: true,
        configurable: true
    });
    OctaveShift.prototype.setOctaveShiftValue = function (type, octave) {
        if (octave === 1 && type === "down") {
            this.octaveValue = OctaveEnum.VA8;
        }
        else if (octave === 1 && type === "up") {
            this.octaveValue = OctaveEnum.VB8;
        }
        else if (octave === 2 && type === "down") {
            this.octaveValue = OctaveEnum.MA15;
        }
        else if (octave === 2 && type === "up") {
            this.octaveValue = OctaveEnum.MB15;
        }
        else {
            this.octaveValue = OctaveEnum.NONE;
        }
    };
    return OctaveShift;
}());
exports.OctaveShift = OctaveShift;
(function (OctaveEnum) {
    OctaveEnum[OctaveEnum["VA8"] = 0] = "VA8";
    OctaveEnum[OctaveEnum["VB8"] = 1] = "VB8";
    OctaveEnum[OctaveEnum["MA15"] = 2] = "MA15";
    OctaveEnum[OctaveEnum["MB15"] = 3] = "MB15";
    OctaveEnum[OctaveEnum["NONE"] = 4] = "NONE";
})(exports.OctaveEnum || (exports.OctaveEnum = {}));
var OctaveEnum = exports.OctaveEnum;

"use strict";
var Staff = (function () {
    function Staff(parentInstrument, instrumentStaffId) {
        this.voices = [];
        this.volume = 1;
        this.parentInstrument = parentInstrument;
        this.id = instrumentStaffId;
        this.audible = true;
        this.following = true;
    }
    Object.defineProperty(Staff.prototype, "ParentInstrument", {
        get: function () {
            return this.parentInstrument;
        },
        set: function (value) {
            this.parentInstrument = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Staff.prototype, "Voices", {
        get: function () {
            return this.voices;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Staff.prototype, "Id", {
        get: function () {
            return this.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Staff.prototype, "Volume", {
        get: function () {
            return this.volume;
        },
        set: function (value) {
            this.volume = value;
        },
        enumerable: true,
        configurable: true
    });
    return Staff;
}());
exports.Staff = Staff;

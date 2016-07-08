"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var VerticalSourceStaffEntryContainer = (function () {
    function VerticalSourceStaffEntryContainer(parentMeasure, timestamp, size) {
        this.staffEntries = [];
        this.comments = [];
        this.timestamp = timestamp;
        this.size = size;
        this.staffEntries = new Array(size);
        this.parentMeasure = parentMeasure;
    }
    VerticalSourceStaffEntryContainer.prototype.$get$ = function (index) {
        return this.staffEntries[index];
    };
    VerticalSourceStaffEntryContainer.prototype.$set$ = function (index, value) {
        this.staffEntries[index] = value;
    };
    Object.defineProperty(VerticalSourceStaffEntryContainer.prototype, "Timestamp", {
        get: function () {
            return this.timestamp;
        },
        set: function (value) {
            this.timestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VerticalSourceStaffEntryContainer.prototype, "StaffEntries", {
        get: function () {
            return this.staffEntries;
        },
        set: function (value) {
            this.staffEntries = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VerticalSourceStaffEntryContainer.prototype, "Comments", {
        get: function () {
            return this.comments;
        },
        set: function (value) {
            this.comments = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VerticalSourceStaffEntryContainer.prototype, "ParentMeasure", {
        get: function () {
            return this.parentMeasure;
        },
        set: function (value) {
            this.parentMeasure = value;
        },
        enumerable: true,
        configurable: true
    });
    VerticalSourceStaffEntryContainer.prototype.getAbsoluteTimestamp = function () {
        return fraction_1.Fraction.plus(this.timestamp, this.parentMeasure.AbsoluteTimestamp);
    };
    return VerticalSourceStaffEntryContainer;
}());
exports.VerticalSourceStaffEntryContainer = VerticalSourceStaffEntryContainer;

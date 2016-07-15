"use strict";
var VerticalGraphicalStaffEntryContainer = (function () {
    function VerticalGraphicalStaffEntryContainer(numberOfEntries, absoluteTimestamp) {
        this.staffEntries = [];
        this.absoluteTimestamp = absoluteTimestamp;
        for (var i = 0; i < numberOfEntries; i++) {
            this.staffEntries.push(undefined);
        }
    }
    Object.defineProperty(VerticalGraphicalStaffEntryContainer.prototype, "Index", {
        get: function () {
            return this.index;
        },
        set: function (value) {
            this.index = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VerticalGraphicalStaffEntryContainer.prototype, "AbsoluteTimestamp", {
        get: function () {
            return this.absoluteTimestamp;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VerticalGraphicalStaffEntryContainer.prototype, "StaffEntries", {
        //
        //public set AbsoluteTimestamp(value: Fraction) {
        //    this.absoluteTimestamp = value;
        //}
        get: function () {
            return this.staffEntries;
        },
        set: function (value) {
            this.staffEntries = value;
        },
        enumerable: true,
        configurable: true
    });
    VerticalGraphicalStaffEntryContainer.compareByTimestamp = function (x, y) {
        var xValue = x.absoluteTimestamp.RealValue;
        var yValue = y.absoluteTimestamp.RealValue;
        if (xValue < yValue) {
            return -1;
        }
        else if (xValue > yValue) {
            return 1;
        }
        else {
            return 0;
        }
    };
    VerticalGraphicalStaffEntryContainer.prototype.getFirstNonNullStaffEntry = function () {
        for (var idx = 0, len = this.staffEntries.length; idx < len; ++idx) {
            var graphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry !== undefined) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    };
    return VerticalGraphicalStaffEntryContainer;
}());
exports.VerticalGraphicalStaffEntryContainer = VerticalGraphicalStaffEntryContainer;

"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BoundingBox_1 = require("./BoundingBox");
var GraphicalObject_1 = require("./GraphicalObject");
var StaffLineActivitySymbol_1 = require("./StaffLineActivitySymbol");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var StaffLine = (function (_super) {
    __extends(StaffLine, _super);
    function StaffLine(parentSystem, parentStaff) {
        _super.call(this);
        this.measures = [];
        this.staffLines = new Array(5);
        this.parentMusicSystem = parentSystem;
        this.parentStaff = parentStaff;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, parentSystem.PositionAndShape);
    }
    Object.defineProperty(StaffLine.prototype, "Measures", {
        get: function () {
            return this.measures;
        },
        set: function (value) {
            this.measures = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffLine.prototype, "StaffLines", {
        get: function () {
            return this.staffLines;
        },
        set: function (value) {
            this.staffLines = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffLine.prototype, "ParentMusicSystem", {
        get: function () {
            return this.parentMusicSystem;
        },
        set: function (value) {
            this.parentMusicSystem = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffLine.prototype, "ParentStaff", {
        get: function () {
            return this.parentStaff;
        },
        set: function (value) {
            this.parentStaff = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffLine.prototype, "SkyLine", {
        get: function () {
            return this.skyLine;
        },
        set: function (value) {
            this.skyLine = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffLine.prototype, "BottomLine", {
        get: function () {
            return this.bottomLine;
        },
        set: function (value) {
            this.bottomLine = value;
        },
        enumerable: true,
        configurable: true
    });
    StaffLine.prototype.addActivitySymbolClickArea = function () {
        var activitySymbol = new StaffLineActivitySymbol_1.StaffLineActivitySymbol(this);
        var staffLinePsi = this.PositionAndShape;
        activitySymbol.PositionAndShape.RelativePosition =
            new PointF2D_1.PointF2D(staffLinePsi.RelativePosition.x + staffLinePsi.BorderRight + 0.5, staffLinePsi.RelativePosition.y + 0.5);
        this.parentMusicSystem.PositionAndShape.ChildElements.push(activitySymbol.PositionAndShape);
    };
    StaffLine.prototype.isPartOfMultiStaffInstrument = function () {
        var instrument = this.parentStaff.ParentInstrument;
        if (instrument.Staves.length > 1) {
            return true;
        }
        return false;
    };
    StaffLine.prototype.findClosestStaffEntry = function (xPosition) {
        var closestStaffentry = undefined;
        var difference = Number.MAX_VALUE;
        for (var idx = 0, len = this.Measures.length; idx < len; ++idx) {
            var graphicalMeasure = this.Measures[idx];
            for (var idx2 = 0, len2 = graphicalMeasure.staffEntries.length; idx2 < len2; ++idx2) {
                var graphicalStaffEntry = graphicalMeasure.staffEntries[idx2];
                if (Math.abs(graphicalStaffEntry.PositionAndShape.RelativePosition.x - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.x) < 5.0) {
                    difference = Math.abs(graphicalStaffEntry.PositionAndShape.RelativePosition.x - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.x);
                    closestStaffentry = graphicalStaffEntry;
                }
            }
        }
        return closestStaffentry;
    };
    return StaffLine;
}(GraphicalObject_1.GraphicalObject));
exports.StaffLine = StaffLine;

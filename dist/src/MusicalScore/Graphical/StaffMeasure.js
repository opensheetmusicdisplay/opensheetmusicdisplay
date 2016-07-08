"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var fraction_1 = require("../../Common/DataObjects/fraction");
var BoundingBox_1 = require("./BoundingBox");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var StaffMeasure = (function (_super) {
    __extends(StaffMeasure, _super);
    function StaffMeasure(staff, parentSourceMeasure, staffLine) {
        if (staff === void 0) { staff = undefined; }
        if (parentSourceMeasure === void 0) { parentSourceMeasure = undefined; }
        if (staffLine === void 0) { staffLine = undefined; }
        _super.call(this);
        this.measureNumber = -1;
        this.parentStaff = staff;
        this.parentSourceMeasure = parentSourceMeasure;
        this.parentStaffLine = staffLine;
        if (staffLine !== undefined) {
            this.parentStaff = staffLine.ParentStaff;
            this.PositionAndShape = new BoundingBox_1.BoundingBox(this, staffLine.PositionAndShape);
        }
        else {
            this.PositionAndShape = new BoundingBox_1.BoundingBox(this);
        }
        this.PositionAndShape.BorderBottom = 4;
        if (this.parentSourceMeasure !== undefined) {
            this.measureNumber = this.parentSourceMeasure.MeasureNumber;
        }
        this.staffEntries = [];
    }
    Object.defineProperty(StaffMeasure.prototype, "ParentStaff", {
        get: function () {
            return this.parentStaff;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffMeasure.prototype, "MeasureNumber", {
        get: function () {
            return this.measureNumber;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffMeasure.prototype, "FirstInstructionStaffEntry", {
        get: function () {
            return this.firstInstructionStaffEntry;
        },
        set: function (value) {
            this.firstInstructionStaffEntry = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffMeasure.prototype, "LastInstructionStaffEntry", {
        get: function () {
            return this.lastInstructionStaffEntry;
        },
        set: function (value) {
            this.lastInstructionStaffEntry = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffMeasure.prototype, "ParentStaffLine", {
        get: function () {
            return this.parentStaffLine;
        },
        set: function (value) {
            this.parentStaffLine = value;
            if (this.parentStaffLine !== undefined) {
                this.PositionAndShape.Parent = this.parentStaffLine.PositionAndShape;
            }
        },
        enumerable: true,
        configurable: true
    });
    StaffMeasure.prototype.resetLayout = function () {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.getLineWidth = function (line) {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.addClefAtBegin = function (clef) {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.addKeyAtBegin = function (currentKey, previousKey, currentClef) {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.addRhythmAtBegin = function (rhythm) {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.addClefAtEnd = function (clef) {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.setPositionInStaffline = function (xPos) {
        this.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(xPos, 0);
    };
    StaffMeasure.prototype.setWidth = function (width) {
        this.PositionAndShape.BorderRight = width;
    };
    StaffMeasure.prototype.layoutSymbols = function () {
        throw new Error("not implemented");
    };
    StaffMeasure.prototype.findGraphicalStaffEntryFromTimestamp = function (relativeTimestamp) {
        for (var idx = 0, len = this.staffEntries.length; idx < len; ++idx) {
            var graphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.relInMeasureTimestamp === relativeTimestamp) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    };
    StaffMeasure.prototype.findGraphicalStaffEntryFromVerticalContainerTimestamp = function (absoluteTimestamp) {
        for (var idx = 0, len = this.staffEntries.length; idx < len; ++idx) {
            var graphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.sourceStaffEntry.VerticalContainerParent.getAbsoluteTimestamp() === absoluteTimestamp) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    };
    StaffMeasure.prototype.hasSameDurationWithSourceMeasureParent = function () {
        var duration = new fraction_1.Fraction(0, 1);
        for (var idx = 0, len = this.staffEntries.length; idx < len; ++idx) {
            var graphicalStaffEntry = this.staffEntries[idx];
            duration.Add(graphicalStaffEntry.findStaffEntryMinNoteLength());
        }
        return duration === this.parentSourceMeasure.Duration;
    };
    StaffMeasure.prototype.hasMultipleVoices = function () {
        if (this.staffEntries.length === 0) {
            return false;
        }
        var voices = [];
        for (var idx = 0, len = this.staffEntries.length; idx < len; ++idx) {
            var staffEntry = this.staffEntries[idx];
            for (var idx2 = 0, len2 = staffEntry.sourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                var voiceEntry = staffEntry.sourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0) {
                    voices.push(voiceEntry.ParentVoice);
                }
            }
        }
        if (voices.length > 1) {
            return true;
        }
        return false;
    };
    StaffMeasure.prototype.isVisible = function () {
        return this.ParentStaff.ParentInstrument.Visible;
    };
    StaffMeasure.prototype.getGraphicalMeasureDurationFromStaffEntries = function () {
        var duration = new fraction_1.Fraction(0, 1);
        var voices = [];
        for (var idx = 0, len = this.staffEntries.length; idx < len; ++idx) {
            var graphicalStaffEntry = this.staffEntries[idx];
            for (var idx2 = 0, len2 = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                var voiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0) {
                    voices.push(voiceEntry.ParentVoice);
                }
            }
        }
        for (var idx = 0, len = voices.length; idx < len; ++idx) {
            var voice = voices[idx];
            var voiceDuration = new fraction_1.Fraction(0, 1);
            for (var idx2 = 0, len2 = this.staffEntries.length; idx2 < len2; ++idx2) {
                var graphicalStaffEntry = this.staffEntries[idx2];
                for (var idx3 = 0, len3 = graphicalStaffEntry.notes.length; idx3 < len3; ++idx3) {
                    var graphicalNotes = graphicalStaffEntry.notes[idx3];
                    if (graphicalNotes.length > 0 && graphicalNotes[0].sourceNote.ParentVoiceEntry.ParentVoice === voice) {
                        voiceDuration.Add(graphicalNotes[0].graphicalNoteLength);
                    }
                }
            }
            if (voiceDuration > duration) {
                duration = fraction_1.Fraction.createFromFraction(voiceDuration);
            }
        }
        return duration;
    };
    StaffMeasure.prototype.addGraphicalStaffEntry = function (graphicalStaffEntry) {
        this.staffEntries.push(graphicalStaffEntry);
        this.PositionAndShape.ChildElements.push(graphicalStaffEntry.PositionAndShape);
    };
    StaffMeasure.prototype.addGraphicalStaffEntryAtTimestamp = function (staffEntry) {
        if (staffEntry !== undefined) {
            if (this.staffEntries.length === 0 || this.staffEntries[this.staffEntries.length - 1].relInMeasureTimestamp < staffEntry.relInMeasureTimestamp) {
                this.staffEntries.push(staffEntry);
            }
            else {
                for (var i = this.staffEntries.length - 1; i >= 0; i--) {
                    if (this.staffEntries[i].relInMeasureTimestamp < staffEntry.relInMeasureTimestamp) {
                        this.staffEntries.splice(i + 1, 0, staffEntry);
                        break;
                    }
                    if (i === 0) {
                        this.staffEntries.splice(i, 0, staffEntry);
                    }
                }
            }
            this.PositionAndShape.ChildElements.push(staffEntry.PositionAndShape);
        }
    };
    StaffMeasure.prototype.beginsWithLineRepetition = function () {
        var sourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.beginsWithLineRepetition();
    };
    StaffMeasure.prototype.endsWithLineRepetition = function () {
        var sourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.endsWithLineRepetition();
    };
    StaffMeasure.prototype.beginsWithWordRepetition = function () {
        var sourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.beginsWithWordRepetition();
    };
    StaffMeasure.prototype.endsWithWordRepetition = function () {
        var sourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.endsWithWordRepetition();
    };
    return StaffMeasure;
}(GraphicalObject_1.GraphicalObject));
exports.StaffMeasure = StaffMeasure;

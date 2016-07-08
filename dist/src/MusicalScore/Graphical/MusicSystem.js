"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Instrument_1 = require("../Instrument");
var BoundingBox_1 = require("./BoundingBox");
var fraction_1 = require("../../Common/DataObjects/fraction");
var TextAlignment_1 = require("../../Common/Enums/TextAlignment");
var GraphicalLabel_1 = require("./GraphicalLabel");
var GraphicalObject_1 = require("./GraphicalObject");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var SystemLinesEnum_1 = require("./SystemLinesEnum");
var Dictionary_1 = require("typescript-collections/dist/lib/Dictionary");
var collectionUtil_1 = require("../../Util/collectionUtil");
var SystemLinePosition_1 = require("./SystemLinePosition");
var MusicSystem = (function (_super) {
    __extends(MusicSystem, _super);
    function MusicSystem(parent, id) {
        _super.call(this);
        this.needsToBeRedrawn = true;
        this.staffLines = [];
        this.graphicalMeasures = [];
        this.labels = new Dictionary_1.default();
        this.measureNumberLabels = [];
        this.objectsToRedraw = [];
        this.instrumentBrackets = [];
        this.groupBrackets = [];
        this.graphicalMarkedAreas = [];
        this.graphicalComments = [];
        this.systemLines = [];
        this.parent = parent;
        this.id = id;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, parent.PositionAndShape);
        this.maxLabelLength = 0.0;
        this.rules = this.parent.Parent.ParentMusicSheet.Rules;
    }
    Object.defineProperty(MusicSystem.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        set: function (value) {
            this.parent = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "StaffLines", {
        get: function () {
            return this.staffLines;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "GraphicalMeasures", {
        get: function () {
            return this.graphicalMeasures;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "MeasureNumberLabels", {
        get: function () {
            return this.measureNumberLabels;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "Labels", {
        get: function () {
            return this.labels.keys();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "ObjectsToRedraw", {
        get: function () {
            return this.objectsToRedraw;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "InstrumentBrackets", {
        get: function () {
            return this.instrumentBrackets;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "GroupBrackets", {
        get: function () {
            return this.groupBrackets;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "GraphicalMarkedAreas", {
        get: function () {
            return this.graphicalMarkedAreas;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "GraphicalComments", {
        get: function () {
            return this.graphicalComments;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "SystemLines", {
        get: function () {
            return this.systemLines;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSystem.prototype, "Id", {
        get: function () {
            return this.id;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * This method creates the left vertical Line connecting all staves of the MusicSystem.
     * @param lineWidth
     * @param systemLabelsRightMargin
     */
    MusicSystem.prototype.createSystemLeftLine = function (lineWidth, systemLabelsRightMargin) {
        var xPosition = -lineWidth / 2;
        if (this === this.parent.MusicSystems[0] && this.parent === this.parent.Parent.MusicPages[0]) {
            xPosition = this.maxLabelLength + systemLabelsRightMargin - lineWidth / 2;
        }
        var top = this.staffLines[0].Measures[0];
        var bottom = undefined;
        if (this.staffLines.length > 1) {
            bottom = this.staffLines[this.staffLines.length - 1].Measures[0];
        }
        var leftSystemLine = this.createSystemLine(xPosition, lineWidth, SystemLinesEnum_1.SystemLinesEnum.SingleThin, SystemLinePosition_1.SystemLinePosition.MeasureBegin, this, top, bottom);
        this.SystemLines.push(leftSystemLine);
        this.boundingBox.ChildElements.push(leftSystemLine.PositionAndShape);
        leftSystemLine.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(xPosition, 0);
        leftSystemLine.PositionAndShape.BorderLeft = 0;
        leftSystemLine.PositionAndShape.BorderRight = lineWidth;
        leftSystemLine.PositionAndShape.BorderTop = 0;
        leftSystemLine.PositionAndShape.BorderBottom = this.boundingBox.Size.height;
        this.createLinesForSystemLine(leftSystemLine);
    };
    /**
     * This method creates the vertical Lines after the End of all StaffLine's Measures
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param measureIndex the measure index within the staffline
     * @param measure
     */
    MusicSystem.prototype.createVerticalLineForMeasure = function (xPosition, lineWidth, lineType, linePosition, measureIndex, measure) {
        var staffLine = measure.ParentStaffLine;
        var staffLineRelative = new PointF2D_1.PointF2D(staffLine.PositionAndShape.RelativePosition.x, staffLine.PositionAndShape.RelativePosition.y);
        var staves = staffLine.ParentStaff.ParentInstrument.Staves;
        if (staffLine.ParentStaff === staves[0]) {
            var bottomMeasure = undefined;
            if (staves.length > 1) {
                bottomMeasure = this.getBottomStaffLine(staffLine).Measures[measureIndex];
            }
            var singleVerticalLineAfterMeasure = this.createSystemLine(xPosition, lineWidth, lineType, linePosition, this, measure, bottomMeasure);
            var systemXPosition = staffLineRelative.x + xPosition;
            singleVerticalLineAfterMeasure.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(systemXPosition, 0);
            singleVerticalLineAfterMeasure.PositionAndShape.BorderLeft = 0;
            singleVerticalLineAfterMeasure.PositionAndShape.BorderRight = lineWidth;
            this.SystemLines.push(singleVerticalLineAfterMeasure);
            this.boundingBox.ChildElements.push(singleVerticalLineAfterMeasure.PositionAndShape);
        }
    };
    MusicSystem.prototype.setYPositionsToVerticalLineObjectsAndCreateLines = function (rules) {
        // empty
    };
    MusicSystem.prototype.calculateBorders = function (rules) {
        // empty
    };
    MusicSystem.prototype.alignBeginInstructions = function () {
        // empty
    };
    MusicSystem.prototype.GetLeftBorderAbsoluteXPosition = function () {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].Measures[0].beginInstructionsWidth;
    };
    MusicSystem.prototype.GetRightBorderAbsoluteXPosition = function () {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].StaffLines[0].End.x;
    };
    MusicSystem.prototype.AddStaffMeasures = function (graphicalMeasures) {
        for (var idx = 0, len = graphicalMeasures.length; idx < len; ++idx) {
            var graphicalMeasure = graphicalMeasures[idx];
            graphicalMeasure.parentMusicSystem = this;
        }
        this.graphicalMeasures.push(graphicalMeasures);
    };
    MusicSystem.prototype.GetSystemsFirstTimeStamp = function () {
        return this.graphicalMeasures[0][0].parentSourceMeasure.AbsoluteTimestamp;
    };
    MusicSystem.prototype.GetSystemsLastTimeStamp = function () {
        var m = this.graphicalMeasures[this.graphicalMeasures.length - 1][0].parentSourceMeasure;
        return fraction_1.Fraction.plus(m.AbsoluteTimestamp, m.Duration);
    };
    MusicSystem.prototype.createInstrumentBrackets = function (instruments, staffHeight) {
        for (var idx = 0, len = instruments.length; idx < len; ++idx) {
            var instrument = instruments[idx];
            if (instrument.Staves.length > 1) {
                var firstStaffLine = undefined, lastStaffLine = undefined;
                for (var idx2 = 0, len2 = this.staffLines.length; idx2 < len2; ++idx2) {
                    var staffLine = this.staffLines[idx2];
                    if (staffLine.ParentStaff === instrument.Staves[0]) {
                        firstStaffLine = staffLine;
                    }
                    if (staffLine.ParentStaff === instrument.Staves[instrument.Staves.length - 1]) {
                        lastStaffLine = staffLine;
                    }
                }
                if (firstStaffLine !== undefined && lastStaffLine !== undefined) {
                    var rightUpper = new PointF2D_1.PointF2D(firstStaffLine.PositionAndShape.RelativePosition.x, firstStaffLine.PositionAndShape.RelativePosition.y);
                    var rightLower = new PointF2D_1.PointF2D(lastStaffLine.PositionAndShape.RelativePosition.x, lastStaffLine.PositionAndShape.RelativePosition.y + staffHeight);
                    this.createInstrumentBracket(rightUpper, rightLower);
                }
            }
        }
    };
    MusicSystem.prototype.createGroupBrackets = function (instrumentGroups, staffHeight, recursionDepth) {
        for (var idx = 0, len = instrumentGroups.length; idx < len; ++idx) {
            var instrumentGroup = instrumentGroups[idx];
            if (instrumentGroup.InstrumentalGroups.length < 1) {
                continue;
            }
            var instrument1 = this.findFirstVisibleInstrumentInInstrumentalGroup(instrumentGroup);
            var instrument2 = this.findLastVisibleInstrumentInInstrumentalGroup(instrumentGroup);
            if (instrument1 === undefined || instrument2 === undefined) {
                continue;
            }
            var firstStaffLine = undefined, lastStaffLine = undefined;
            for (var idx2 = 0, len2 = this.staffLines.length; idx2 < len2; ++idx2) {
                var staffLine = this.staffLines[idx2];
                if (staffLine.ParentStaff === instrument1.Staves[0]) {
                    firstStaffLine = staffLine;
                }
                if (staffLine.ParentStaff === collectionUtil_1.CollectionUtil.last(instrument2.Staves)) {
                    lastStaffLine = staffLine;
                }
            }
            if (firstStaffLine !== undefined && lastStaffLine !== undefined) {
                var rightUpper = new PointF2D_1.PointF2D(firstStaffLine.PositionAndShape.RelativePosition.x, firstStaffLine.PositionAndShape.RelativePosition.y);
                var rightLower = new PointF2D_1.PointF2D(lastStaffLine.PositionAndShape.RelativePosition.x, lastStaffLine.PositionAndShape.RelativePosition.y + staffHeight);
                this.createGroupBracket(rightUpper, rightLower, staffHeight, recursionDepth);
            }
            if (instrumentGroup.InstrumentalGroups.length < 1) {
                continue;
            }
            this.createGroupBrackets(instrumentGroup.InstrumentalGroups, staffHeight, recursionDepth + 1);
        }
    };
    MusicSystem.prototype.createMusicSystemLabel = function (instrumentLabelTextHeight, systemLabelsRightMargin, labelMarginBorderFactor) {
        if (this.parent === this.parent.Parent.MusicPages[0] && this === this.parent.MusicSystems[0]) {
            var instruments = this.parent.Parent.ParentMusicSheet.getVisibleInstruments();
            for (var idx = 0, len = instruments.length; idx < len; ++idx) {
                var instrument = instruments[idx];
                var graphicalLabel = new GraphicalLabel_1.GraphicalLabel(instrument.NameLabel, instrumentLabelTextHeight, TextAlignment_1.TextAlignment.LeftCenter, this.boundingBox);
                graphicalLabel.setLabelPositionAndShapeBorders();
                this.labels.setValue(graphicalLabel, instrument);
                this.boundingBox.ChildElements.push(graphicalLabel.PositionAndShape);
                graphicalLabel.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, 0.0);
            }
            this.maxLabelLength = 0.0;
            var labels = this.labels.keys();
            for (var idx = 0, len = labels.length; idx < len; ++idx) {
                var label = labels[idx];
                if (label.PositionAndShape.Size.width > this.maxLabelLength) {
                    this.maxLabelLength = label.PositionAndShape.Size.width;
                }
            }
            this.updateMusicSystemStaffLineXPosition(systemLabelsRightMargin);
        }
    };
    MusicSystem.prototype.setMusicSystemLabelsYPosition = function () {
        var _this = this;
        if (this.parent === this.parent.Parent.MusicPages[0] && this === this.parent.MusicSystems[0]) {
            this.labels.forEach(function (key, value) {
                var ypositionSum = 0;
                var staffCounter = 0;
                for (var i = 0; i < _this.staffLines.length; i++) {
                    if (_this.staffLines[i].ParentStaff.ParentInstrument === value) {
                        for (var j = i; j < _this.staffLines.length; j++) {
                            var staffLine = _this.staffLines[j];
                            if (staffLine.ParentStaff.ParentInstrument !== value) {
                                break;
                            }
                            ypositionSum += staffLine.PositionAndShape.RelativePosition.y;
                            staffCounter++;
                        }
                        break;
                    }
                }
                if (staffCounter > 0) {
                    key.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, ypositionSum / staffCounter + 2.0);
                }
            });
        }
    };
    MusicSystem.prototype.checkStaffEntriesForStaffEntryLink = function () {
        var first = false;
        var second = false;
        for (var i = 0; i < this.staffLines.length - 1; i++) {
            for (var idx = 0, len = this.staffLines[i].Measures.length; idx < len; ++idx) {
                var measure = this.staffLines[i].Measures[idx];
                for (var idx2 = 0, len2 = measure.staffEntries.length; idx2 < len2; ++idx2) {
                    var staffEntry = measure.staffEntries[idx2];
                    if (staffEntry.sourceStaffEntry.Link !== undefined) {
                        first = true;
                    }
                }
            }
            for (var idx = 0, len = this.staffLines[i + 1].Measures.length; idx < len; ++idx) {
                var measure = this.staffLines[i + 1].Measures[idx];
                for (var idx2 = 0, len2 = measure.staffEntries.length; idx2 < len2; ++idx2) {
                    var staffEntry = measure.staffEntries[idx2];
                    if (staffEntry.sourceStaffEntry.Link !== undefined) {
                        second = true;
                    }
                }
            }
        }
        if (first && second) {
            return true;
        }
        return false;
    };
    MusicSystem.prototype.getBottomStaffLine = function (topStaffLine) {
        var staves = topStaffLine.ParentStaff.ParentInstrument.Staves;
        var last = staves[staves.length - 1];
        for (var _i = 0, _a = topStaffLine.ParentMusicSystem.staffLines; _i < _a.length; _i++) {
            var line = _a[_i];
            if (line.ParentStaff === last) {
                return line;
            }
        }
        return undefined;
    };
    /**
     * Here the system line is generated, which acts as the container of graphical lines and dots that will be finally rendered.
     * It holds al the logical parameters of the system line.
     * @param xPosition The x position within the system
     * @param lineWidth The total x width
     * @param lineType The line type enum
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    MusicSystem.prototype.createSystemLine = function (xPosition, lineWidth, lineType, linePosition, musicSystem, topMeasure, bottomMeasure) {
        if (bottomMeasure === void 0) { bottomMeasure = undefined; }
        throw new Error("not implemented");
    };
    /// <summary>
    /// This method creates all the graphical lines and dots needed to render a system line (e.g. bold-thin-dots..).
    /// </summary>
    /// <param name="psSystemLine"></param>
    MusicSystem.prototype.createLinesForSystemLine = function (systemLine) {
        //Empty
    };
    MusicSystem.prototype.calcInstrumentsBracketsWidth = function () {
        throw new Error("not implemented");
    };
    MusicSystem.prototype.createInstrumentBracket = function (rightUpper, rightLower) {
        throw new Error("not implemented");
    };
    MusicSystem.prototype.createGroupBracket = function (rightUpper, rightLower, staffHeight, recursionDepth) {
        throw new Error("not implemented");
    };
    MusicSystem.prototype.findFirstVisibleInstrumentInInstrumentalGroup = function (instrumentalGroup) {
        for (var idx = 0, len = instrumentalGroup.InstrumentalGroups.length; idx < len; ++idx) {
            var groupOrInstrument = instrumentalGroup.InstrumentalGroups[idx];
            if (groupOrInstrument instanceof Instrument_1.Instrument) {
                if (groupOrInstrument.Visible === true) {
                    return groupOrInstrument;
                }
                continue;
            }
            return this.findFirstVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
        }
        return undefined;
    };
    MusicSystem.prototype.findLastVisibleInstrumentInInstrumentalGroup = function (instrumentalGroup) {
        var groupOrInstrument;
        for (var i = instrumentalGroup.InstrumentalGroups.length - 1; i >= 0; i--) {
            groupOrInstrument = instrumentalGroup.InstrumentalGroups[i];
            if (groupOrInstrument instanceof Instrument_1.Instrument) {
                if (groupOrInstrument.Visible === true) {
                    return groupOrInstrument;
                }
                continue;
            }
            return this.findLastVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
        }
        return undefined;
    };
    MusicSystem.prototype.updateMusicSystemStaffLineXPosition = function (systemLabelsRightMargin) {
        for (var idx = 0, len = this.StaffLines.length; idx < len; ++idx) {
            var staffLine = this.StaffLines[idx];
            var relative = staffLine.PositionAndShape.RelativePosition;
            relative.x = this.maxLabelLength + systemLabelsRightMargin;
            staffLine.PositionAndShape.RelativePosition = relative;
            staffLine.PositionAndShape.BorderRight = this.boundingBox.Size.width - this.maxLabelLength - systemLabelsRightMargin;
            for (var i = 0; i < staffLine.StaffLines.length; i++) {
                var lineEnd = new PointF2D_1.PointF2D(staffLine.PositionAndShape.Size.width, staffLine.StaffLines[i].End.y);
                staffLine.StaffLines[i].End = lineEnd;
            }
        }
    };
    return MusicSystem;
}(GraphicalObject_1.GraphicalObject));
exports.MusicSystem = MusicSystem;

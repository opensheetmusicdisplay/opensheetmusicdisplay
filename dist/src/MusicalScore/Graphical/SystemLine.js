"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SystemLinesEnum_1 = require("./SystemLinesEnum");
var BoundingBox_1 = require("./BoundingBox");
var GraphicalObject_1 = require("./GraphicalObject");
var SystemLine = (function (_super) {
    __extends(SystemLine, _super);
    function SystemLine(lineType, linePosition, musicSystem, topMeasure, bottomMeasure) {
        if (bottomMeasure === void 0) { bottomMeasure = undefined; }
        _super.call(this);
        this.lineType = lineType;
        this.linePosition = linePosition;
        this.parentMusicSystem = musicSystem;
        this.topMeasure = topMeasure;
        this.bottomMeasure = bottomMeasure;
        this.parentTopStaffLine = topMeasure.ParentStaffLine;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, musicSystem.PositionAndShape);
    }
    SystemLine.getObjectWidthForLineType = function (rules, systemLineType) {
        switch (systemLineType) {
            case SystemLinesEnum_1.SystemLinesEnum.SingleThin:
                return rules.SystemThinLineWidth;
            case SystemLinesEnum_1.SystemLinesEnum.DoubleThin:
                return rules.SystemThinLineWidth * 2 + rules.DistanceBetweenVerticalSystemLines;
            case SystemLinesEnum_1.SystemLinesEnum.ThinBold:
                return rules.SystemThinLineWidth + rules.SystemBoldLineWidth + rules.DistanceBetweenVerticalSystemLines;
            case SystemLinesEnum_1.SystemLinesEnum.BoldThinDots:
                return rules.SystemThinLineWidth + rules.SystemBoldLineWidth + rules.DistanceBetweenVerticalSystemLines + rules.SystemDotWidth +
                    rules.DistanceBetweenDotAndLine;
            case SystemLinesEnum_1.SystemLinesEnum.DotsThinBold:
                return rules.SystemThinLineWidth + rules.SystemBoldLineWidth + rules.DistanceBetweenVerticalSystemLines + rules.SystemDotWidth +
                    rules.DistanceBetweenDotAndLine;
            case SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots:
                return 2 * rules.SystemBoldLineWidth + 2 * rules.SystemDotWidth + 2 * rules.DistanceBetweenDotAndLine +
                    rules.DistanceBetweenVerticalSystemLines;
            default:
                return 0;
        }
    };
    return SystemLine;
}(GraphicalObject_1.GraphicalObject));
exports.SystemLine = SystemLine;

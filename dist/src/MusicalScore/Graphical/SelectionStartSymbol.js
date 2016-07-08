"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var DrawingEnums_1 = require("./DrawingEnums");
var GraphicalLine_1 = require("./GraphicalLine");
var GraphicalObject_1 = require("./GraphicalObject");
var BoundingBox_1 = require("./BoundingBox");
var collectionUtil_1 = require("../../Util/collectionUtil");
var SelectionStartSymbol = (function (_super) {
    __extends(SelectionStartSymbol, _super);
    function SelectionStartSymbol(system, xPosition) {
        _super.call(this);
        var xCoordinate = xPosition;
        var yCoordinate = system.PositionAndShape.AbsolutePosition.y;
        var lineThickness = 0.4;
        var height = collectionUtil_1.CollectionUtil.last(system.StaffLines).PositionAndShape.RelativePosition.y + 4;
        this.verticalLine = new GraphicalLine_1.GraphicalLine(new PointF2D_1.PointF2D(xCoordinate, yCoordinate), new PointF2D_1.PointF2D(xCoordinate, yCoordinate + height), lineThickness, DrawingEnums_1.OutlineAndFillStyleEnum.SelectionSymbol);
        for (var idx = 0, len = system.StaffLines.length; idx < len; ++idx) {
            var staffLine = system.StaffLines[idx];
            var anchor = new PointF2D_1.PointF2D(xCoordinate, yCoordinate + staffLine.PositionAndShape.RelativePosition.y);
            var arrowPoints = new Array(7);
            arrowPoints[0].x = anchor.x + 4;
            arrowPoints[0].y = anchor.y + 2;
            arrowPoints[1].x = anchor.x + 2.5;
            arrowPoints[1].y = anchor.y + 0.5;
            arrowPoints[2].x = anchor.x + 2.5;
            arrowPoints[2].y = anchor.y + 1.3;
            arrowPoints[3].x = anchor.x + 1;
            arrowPoints[3].y = anchor.y + 1.3;
            arrowPoints[4].x = anchor.x + 1;
            arrowPoints[4].y = anchor.y + 2.7;
            arrowPoints[5].x = anchor.x + 2.5;
            arrowPoints[5].y = anchor.y + 2.7;
            arrowPoints[6].x = anchor.x + 2.5;
            arrowPoints[6].y = anchor.y + 3.5;
            this.arrows.push(arrowPoints);
        }
        this.boundingBox = new BoundingBox_1.BoundingBox(this);
        this.boundingBox.AbsolutePosition = new PointF2D_1.PointF2D(xCoordinate, yCoordinate);
        this.boundingBox.BorderLeft = -lineThickness;
        this.boundingBox.BorderRight = 4;
        this.boundingBox.BorderBottom = height;
    }
    return SelectionStartSymbol;
}(GraphicalObject_1.GraphicalObject));
exports.SelectionStartSymbol = SelectionStartSymbol;

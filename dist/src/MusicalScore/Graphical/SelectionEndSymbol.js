"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var DrawingEnums_1 = require("./DrawingEnums");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var BoundingBox_1 = require("./BoundingBox");
var GraphicalLine_1 = require("./GraphicalLine");
var collectionUtil_1 = require("../../Util/collectionUtil");
var SelectionEndSymbol = (function (_super) {
    __extends(SelectionEndSymbol, _super);
    function SelectionEndSymbol(system, xPosition) {
        _super.call(this);
        var xCoordinate = xPosition;
        var yCoordinate = system.PositionAndShape.AbsolutePosition.y;
        var lineThickness = 0.4;
        var height = collectionUtil_1.CollectionUtil.last(system.StaffLines).PositionAndShape.RelativePosition.y + 4;
        this.verticalLine = new GraphicalLine_1.GraphicalLine(new PointF2D_1.PointF2D(xCoordinate, yCoordinate), new PointF2D_1.PointF2D(xCoordinate, yCoordinate + height), lineThickness, DrawingEnums_1.OutlineAndFillStyleEnum.SelectionSymbol);
        for (var idx = 0, len = system.StaffLines.length; idx < len; ++idx) {
            var staffLine = system.StaffLines[idx];
            var anchor = new PointF2D_1.PointF2D(xCoordinate, yCoordinate + staffLine.PositionAndShape.RelativePosition.y);
            var arrowPoints = new Array(3);
            anchor.y -= .2;
            arrowPoints[0].x = anchor.x - 3;
            arrowPoints[0].y = anchor.y + 1.2;
            arrowPoints[1].x = anchor.x - 2;
            arrowPoints[1].y = anchor.y + 0.4;
            arrowPoints[2].x = anchor.x - 2;
            arrowPoints[2].y = anchor.y + 2;
            this.arrows.push(arrowPoints);
            var linePoints = new Array(8);
            var arrowThickness = .8;
            anchor.x -= .1;
            anchor.y += .3;
            var hilfsVar = .2;
            linePoints[0].x = anchor.x - 2;
            linePoints[0].y = anchor.y + 1.5 - hilfsVar;
            linePoints[1].x = anchor.x - 1;
            linePoints[1].y = anchor.y + 1.5 - hilfsVar;
            linePoints[2].x = anchor.x - 1;
            linePoints[2].y = anchor.y + 2.5;
            linePoints[3].x = anchor.x - 2;
            linePoints[3].y = anchor.y + 2.5;
            linePoints[4].x = linePoints[0].x;
            linePoints[4].y = linePoints[0].y - arrowThickness;
            linePoints[5].x = linePoints[4].x + arrowThickness + 1;
            linePoints[5].y = linePoints[4].y;
            linePoints[6].x = linePoints[5].x;
            linePoints[6].y = linePoints[3].y + arrowThickness;
            linePoints[7].x = linePoints[3].x;
            linePoints[7].y = linePoints[6].y;
            this.arrowlines.push(linePoints);
        }
        this.boundingBox = new BoundingBox_1.BoundingBox(this);
        this.boundingBox.AbsolutePosition = new PointF2D_1.PointF2D(xCoordinate, yCoordinate);
        this.boundingBox.BorderLeft = -lineThickness;
        this.boundingBox.BorderRight = 4;
        this.boundingBox.BorderBottom = height;
    }
    return SelectionEndSymbol;
}(GraphicalObject_1.GraphicalObject));
exports.SelectionEndSymbol = SelectionEndSymbol;

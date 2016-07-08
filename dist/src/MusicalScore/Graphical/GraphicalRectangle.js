"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BoundingBox_1 = require("./BoundingBox");
var GraphicalObject_1 = require("./GraphicalObject");
var GraphicalRectangle = (function (_super) {
    __extends(GraphicalRectangle, _super);
    function GraphicalRectangle(upperLeftPoint, lowerRightPoint, parent, style) {
        _super.call(this);
        this.boundingBox = new BoundingBox_1.BoundingBox(parent);
        this.boundingBox.RelativePosition = upperLeftPoint;
        this.boundingBox.BorderRight = lowerRightPoint.x - upperLeftPoint.x;
        this.boundingBox.BorderBottom = lowerRightPoint.y - upperLeftPoint.y;
        this.style = style;
    }
    return GraphicalRectangle;
}(GraphicalObject_1.GraphicalObject));
exports.GraphicalRectangle = GraphicalRectangle;

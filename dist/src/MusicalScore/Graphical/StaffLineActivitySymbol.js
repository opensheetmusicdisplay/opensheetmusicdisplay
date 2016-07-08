"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var BoundingBox_1 = require("./BoundingBox");
var StaffLineActivitySymbol = (function (_super) {
    __extends(StaffLineActivitySymbol, _super);
    function StaffLineActivitySymbol(staffLine) {
        _super.call(this);
        this.parentStaffLine = staffLine;
        var staffLinePsi = staffLine.PositionAndShape;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, staffLinePsi);
        this.boundingBox.BorderRight = 6;
        this.boundingBox.BorderBottom = 4.5;
        this.boundingBox.BorderLeft = -1.5;
        this.boundingBox.BorderTop = -1.5;
    }
    return StaffLineActivitySymbol;
}(GraphicalObject_1.GraphicalObject));
exports.StaffLineActivitySymbol = StaffLineActivitySymbol;

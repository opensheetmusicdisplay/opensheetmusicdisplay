"use strict";
var SizeF2D_1 = require("./SizeF2D");
var PointF2D_1 = require("./PointF2D");
var RectangleF2D = (function () {
    function RectangleF2D(x, y, width, height) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    RectangleF2D.createFromLocationAndSize = function (location, size) {
        return new RectangleF2D(location.x, location.y, size.width, size.height);
    };
    Object.defineProperty(RectangleF2D.prototype, "Location", {
        get: function () {
            return new PointF2D_1.PointF2D(this.x, this.y);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RectangleF2D.prototype, "Size", {
        get: function () {
            return new SizeF2D_1.SizeF2D(this.width, this.height);
        },
        enumerable: true,
        configurable: true
    });
    return RectangleF2D;
}());
exports.RectangleF2D = RectangleF2D;

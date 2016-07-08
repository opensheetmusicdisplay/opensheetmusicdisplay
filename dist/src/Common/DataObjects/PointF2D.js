"use strict";
var PointF2D = (function () {
    function PointF2D(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
    Object.defineProperty(PointF2D, "Empty", {
        get: function () {
            return new PointF2D();
        },
        enumerable: true,
        configurable: true
    });
    PointF2D.pointsAreEqual = function (p1, p2) {
        return (p1.x === p2.x && p1.y === p2.y);
    };
    PointF2D.prototype.ToString = function () {
        return "[" + this.x + ", " + this.y + "]";
    };
    return PointF2D;
}());
exports.PointF2D = PointF2D;

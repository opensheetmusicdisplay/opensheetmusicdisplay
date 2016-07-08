"use strict";
var Exceptions_1 = require("../Exceptions");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var SizeF2D_1 = require("../../Common/DataObjects/SizeF2D");
var RectangleF2D_1 = require("../../Common/DataObjects/RectangleF2D");
var BoundingBox = (function () {
    function BoundingBox(dataObject, parent) {
        if (dataObject === void 0) { dataObject = undefined; }
        if (parent === void 0) { parent = undefined; }
        this.isSymbol = false;
        this.relativePositionHasBeenSet = false;
        this.xBordersHaveBeenSet = false;
        this.yBordersHaveBeenSet = false;
        this.absolutePosition = new PointF2D_1.PointF2D();
        this.relativePosition = new PointF2D_1.PointF2D();
        this.size = new SizeF2D_1.SizeF2D();
        this.borderLeft = 0;
        this.borderRight = 0;
        this.borderTop = 0;
        this.borderBottom = 0;
        this.borderMarginLeft = 0;
        this.borderMarginRight = 0;
        this.borderMarginTop = 0;
        this.borderMarginBottom = 0;
        this.childElements = [];
        this.parent = parent;
        this.dataObject = dataObject;
        this.xBordersHaveBeenSet = false;
        this.yBordersHaveBeenSet = false;
    }
    Object.defineProperty(BoundingBox.prototype, "RelativePositionHasBeenSet", {
        get: function () {
            return this.relativePositionHasBeenSet;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "XBordersHaveBeenSet", {
        get: function () {
            return this.xBordersHaveBeenSet;
        },
        set: function (value) {
            this.xBordersHaveBeenSet = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "YBordersHaveBeenSet", {
        get: function () {
            return this.yBordersHaveBeenSet;
        },
        set: function (value) {
            this.yBordersHaveBeenSet = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "AbsolutePosition", {
        get: function () {
            return this.absolutePosition;
        },
        set: function (value) {
            this.absolutePosition = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "RelativePosition", {
        get: function () {
            return this.relativePosition;
        },
        set: function (value) {
            this.relativePosition = value;
            this.relativePositionHasBeenSet = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "Size", {
        get: function () {
            return this.size;
        },
        set: function (value) {
            this.size = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "MarginSize", {
        get: function () {
            return this.marginSize;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "UpperLeftCorner", {
        get: function () {
            return this.upperLeftCorner;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "UpperLeftMarginCorner", {
        get: function () {
            return this.upperLeftMarginCorner;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderLeft", {
        get: function () {
            return this.borderLeft;
        },
        set: function (value) {
            this.borderLeft = value;
            this.calculateRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderRight", {
        get: function () {
            return this.borderRight;
        },
        set: function (value) {
            this.borderRight = value;
            this.calculateRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderTop", {
        get: function () {
            return this.borderTop;
        },
        set: function (value) {
            this.borderTop = value;
            this.calculateRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderBottom", {
        get: function () {
            return this.borderBottom;
        },
        set: function (value) {
            this.borderBottom = value;
            this.calculateRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderMarginLeft", {
        get: function () {
            return this.borderMarginLeft;
        },
        set: function (value) {
            this.borderMarginLeft = value;
            this.calculateMarginRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderMarginRight", {
        get: function () {
            return this.borderMarginRight;
        },
        set: function (value) {
            this.borderMarginRight = value;
            this.calculateMarginRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderMarginTop", {
        get: function () {
            return this.borderMarginTop;
        },
        set: function (value) {
            this.borderMarginTop = value;
            this.calculateMarginRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BorderMarginBottom", {
        get: function () {
            return this.borderMarginBottom;
        },
        set: function (value) {
            this.borderMarginBottom = value;
            this.calculateMarginRectangle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BoundingRectangle", {
        get: function () {
            return this.boundingRectangle;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "BoundingMarginRectangle", {
        get: function () {
            return this.boundingMarginRectangle;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "ChildElements", {
        get: function () {
            return this.childElements;
        },
        set: function (value) {
            this.childElements = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        set: function (value) {
            this.parent = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoundingBox.prototype, "DataObject", {
        get: function () {
            return this.dataObject;
        },
        enumerable: true,
        configurable: true
    });
    BoundingBox.prototype.setAbsolutePositionFromParent = function () {
        if (this.parent !== undefined) {
            this.absolutePosition.x = this.parent.AbsolutePosition.x + this.relativePosition.x;
            this.absolutePosition.y = this.parent.AbsolutePosition.y + this.relativePosition.y;
        }
        else {
            this.absolutePosition = this.relativePosition;
        }
    };
    BoundingBox.prototype.calculateAbsolutePositionsRecursiveWithoutTopelement = function () {
        this.absolutePosition.x = 0.0;
        this.absolutePosition.y = 0.0;
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var child = this.ChildElements[idx];
            child.calculateAbsolutePositionsRecursive(this.absolutePosition.x, this.absolutePosition.y);
        }
    };
    BoundingBox.prototype.calculateAbsolutePositionsRecursive = function (x, y) {
        this.absolutePosition.x = this.relativePosition.x + x;
        this.absolutePosition.y = this.relativePosition.y + y;
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var child = this.ChildElements[idx];
            child.calculateAbsolutePositionsRecursive(this.absolutePosition.x, this.absolutePosition.y);
        }
    };
    BoundingBox.prototype.calculateBoundingBox = function () {
        if (this.childElements.length === 0) {
            return;
        }
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var childElement = this.ChildElements[idx];
            childElement.calculateBoundingBox();
        }
        var minLeft = Number.MAX_VALUE;
        var maxRight = Number.MIN_VALUE;
        var minTop = Number.MAX_VALUE;
        var maxBottom = Number.MIN_VALUE;
        var minMarginLeft = Number.MAX_VALUE;
        var maxMarginRight = Number.MIN_VALUE;
        var minMarginTop = Number.MAX_VALUE;
        var maxMarginBottom = Number.MIN_VALUE;
        if (this.isSymbol) {
            minLeft = this.borderLeft;
            maxRight = this.borderRight;
            minTop = this.borderTop;
            maxBottom = this.borderBottom;
            minMarginLeft = this.borderMarginLeft;
            maxMarginRight = this.borderMarginRight;
            minMarginTop = this.borderMarginTop;
            maxMarginBottom = this.borderMarginBottom;
        }
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var childElement = this.ChildElements[idx];
            minLeft = Math.min(minLeft, childElement.relativePosition.x + childElement.borderLeft);
            maxRight = Math.max(maxRight, childElement.relativePosition.x + childElement.borderRight);
            minTop = Math.min(minTop, childElement.relativePosition.y + childElement.borderTop);
            maxBottom = Math.max(maxBottom, childElement.relativePosition.y + childElement.borderBottom);
            minMarginLeft = Math.min(minMarginLeft, childElement.relativePosition.x + childElement.borderMarginLeft);
            maxMarginRight = Math.max(maxMarginRight, childElement.relativePosition.x + childElement.borderMarginRight);
            minMarginTop = Math.min(minMarginTop, childElement.relativePosition.y + childElement.borderMarginTop);
            maxMarginBottom = Math.max(maxMarginBottom, childElement.relativePosition.y + childElement.borderMarginBottom);
        }
        this.borderLeft = minLeft;
        this.borderRight = maxRight;
        this.borderTop = minTop;
        this.borderBottom = maxBottom;
        this.borderMarginLeft = minMarginLeft;
        this.borderMarginRight = maxMarginRight;
        this.borderMarginTop = minMarginTop;
        this.borderMarginBottom = maxMarginBottom;
        this.calculateRectangle();
        this.calculateMarginRectangle();
        this.xBordersHaveBeenSet = true;
        this.yBordersHaveBeenSet = true;
    };
    BoundingBox.prototype.calculateTopBottomBorders = function () {
        if (this.childElements.length === 0) {
            return;
        }
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var childElement = this.ChildElements[idx];
            childElement.calculateTopBottomBorders();
        }
        var minTop = Number.MAX_VALUE;
        var maxBottom = Number.MIN_VALUE;
        var minMarginTop = Number.MAX_VALUE;
        var maxMarginBottom = Number.MIN_VALUE;
        if (this.yBordersHaveBeenSet) {
            minTop = this.borderTop;
            maxBottom = this.borderBottom;
            minMarginTop = this.borderMarginTop;
            maxMarginBottom = this.borderMarginBottom;
        }
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var childElement = this.ChildElements[idx];
            minTop = Math.min(minTop, childElement.relativePosition.y + childElement.borderTop);
            maxBottom = Math.max(maxBottom, childElement.relativePosition.y + childElement.borderBottom);
            minMarginTop = Math.min(minMarginTop, childElement.relativePosition.y + childElement.borderMarginTop);
            maxMarginBottom = Math.max(maxMarginBottom, childElement.relativePosition.y + childElement.borderMarginBottom);
        }
        this.borderTop = minTop;
        this.borderBottom = maxBottom;
        this.borderMarginTop = minMarginTop;
        this.borderMarginBottom = maxMarginBottom;
        this.calculateRectangle();
        this.calculateMarginRectangle();
    };
    BoundingBox.prototype.computeNonOverlappingPositionWithMargin = function (placementPsi, direction, position) {
        this.RelativePosition = new PointF2D_1.PointF2D(position.x, position.y);
        this.setAbsolutePositionFromParent();
        var currentPosition = 0.0;
        var hasBeenMoved = false;
        do {
            switch (direction) {
                case ColDirEnum.Left:
                case ColDirEnum.Right:
                    currentPosition = this.relativePosition.x;
                    placementPsi.calculateMarginPositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.x) > 0.001;
                    break;
                case ColDirEnum.Up:
                case ColDirEnum.Down:
                    currentPosition = this.relativePosition.y;
                    placementPsi.calculateMarginPositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.y) > 0.001;
                    break;
                default:
                    throw new Exceptions_1.ArgumentOutOfRangeException("direction");
            }
        } while (hasBeenMoved);
    };
    BoundingBox.prototype.collisionDetection = function (psi) {
        var overlapWidth = Math.min(this.AbsolutePosition.x + this.borderRight, psi.absolutePosition.x + psi.borderRight)
            - Math.max(this.AbsolutePosition.x + this.borderLeft, psi.absolutePosition.x + psi.borderLeft);
        var overlapHeight = Math.min(this.AbsolutePosition.y + this.borderBottom, psi.absolutePosition.y + psi.borderBottom)
            - Math.max(this.AbsolutePosition.y + this.borderTop, psi.absolutePosition.y + psi.borderTop);
        if (overlapWidth > 0 && overlapHeight > 0) {
            return true;
        }
        return false;
    };
    BoundingBox.prototype.liesInsideBorders = function (psi) {
        var leftBorderInside = (this.AbsolutePosition.x + this.borderLeft) <= (psi.absolutePosition.x + psi.borderLeft)
            && (psi.absolutePosition.x + psi.borderLeft) <= (this.AbsolutePosition.x + this.borderRight);
        var rightBorderInside = (this.AbsolutePosition.x + this.borderLeft) <= (psi.absolutePosition.x + psi.borderRight)
            && (psi.absolutePosition.x + psi.borderRight) <= (this.AbsolutePosition.x + this.borderRight);
        if (leftBorderInside && rightBorderInside) {
            var topBorderInside = (this.AbsolutePosition.y + this.borderTop) <= (psi.absolutePosition.y + psi.borderTop)
                && (psi.absolutePosition.y + psi.borderTop) <= (this.AbsolutePosition.y + this.borderBottom);
            var bottomBorderInside = (this.AbsolutePosition.y + this.borderTop) <= (psi.absolutePosition.y + psi.borderBottom)
                && (psi.absolutePosition.y + psi.borderBottom) <= (this.AbsolutePosition.y + this.borderBottom);
            if (topBorderInside && bottomBorderInside) {
                return true;
            }
        }
        return false;
    };
    BoundingBox.prototype.pointLiesInsideBorders = function (position) {
        var xInside = (this.AbsolutePosition.x + this.borderLeft) <= position.x && position.x <= (this.AbsolutePosition.x + this.borderRight);
        if (xInside) {
            var yInside = (this.AbsolutePosition.y + this.borderTop) <= position.y && position.y <= (this.AbsolutePosition.y + this.borderBottom);
            if (yInside) {
                return true;
            }
        }
        return false;
    };
    BoundingBox.prototype.marginCollisionDetection = function (psi) {
        var overlapWidth = Math.min(this.AbsolutePosition.x + this.borderMarginRight, psi.absolutePosition.x + psi.borderMarginRight)
            - Math.max(this.AbsolutePosition.x + this.borderMarginLeft, psi.absolutePosition.x + psi.borderMarginLeft);
        var overlapHeight = Math.min(this.AbsolutePosition.y + this.borderMarginBottom, psi.absolutePosition.y + psi.borderMarginBottom)
            - Math.max(this.AbsolutePosition.y + this.borderMarginTop, psi.absolutePosition.y + psi.borderMarginTop);
        if (overlapWidth > 0 && overlapHeight > 0) {
            return true;
        }
        return false;
    };
    BoundingBox.prototype.liesInsideMargins = function (psi) {
        var leftMarginInside = (this.AbsolutePosition.x + this.borderMarginLeft) <= (psi.absolutePosition.x + psi.borderMarginLeft)
            && (psi.absolutePosition.x + psi.borderMarginLeft) <= (this.AbsolutePosition.x + this.borderMarginRight);
        var rightMarginInside = (this.AbsolutePosition.x + this.borderMarginLeft) <= (psi.absolutePosition.x + psi.borderMarginRight)
            && (psi.absolutePosition.x + psi.borderMarginRight) <= (this.AbsolutePosition.x + this.borderMarginRight);
        if (leftMarginInside && rightMarginInside) {
            var topMarginInside = (this.AbsolutePosition.y + this.borderMarginTop) <= (psi.absolutePosition.y + psi.borderMarginTop)
                && (psi.absolutePosition.y + psi.borderMarginTop) <= (this.AbsolutePosition.y + this.borderMarginBottom);
            var bottomMarginInside = (this.AbsolutePosition.y + this.borderMarginTop) <= (psi.absolutePosition.y + psi.borderMarginBottom)
                && (psi.absolutePosition.y + psi.borderMarginBottom) <= (this.AbsolutePosition.y + this.borderMarginBottom);
            if (topMarginInside && bottomMarginInside) {
                return true;
            }
        }
        return false;
    };
    BoundingBox.prototype.pointLiesInsideMargins = function (position) {
        var xInside = (this.AbsolutePosition.x + this.borderMarginLeft) <= position.x
            && position.x <= (this.AbsolutePosition.x + this.borderMarginRight);
        if (xInside) {
            var yInside = (this.AbsolutePosition.y + this.borderMarginTop) <= position.y
                && position.y <= (this.AbsolutePosition.y + this.borderMarginBottom);
            if (yInside) {
                return true;
            }
        }
        return false;
    };
    BoundingBox.prototype.computeNonOverlappingPosition = function (placementPsi, direction, position) {
        this.RelativePosition = new PointF2D_1.PointF2D(position.x, position.y);
        this.setAbsolutePositionFromParent();
        var currentPosition = 0.0;
        var hasBeenMoved = false;
        do {
            switch (direction) {
                case ColDirEnum.Left:
                case ColDirEnum.Right:
                    currentPosition = this.relativePosition.x;
                    placementPsi.calculatePositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.x) > 0.0001;
                    break;
                case ColDirEnum.Up:
                case ColDirEnum.Down:
                    currentPosition = this.relativePosition.y;
                    placementPsi.calculatePositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.y) > 0.0001;
                    break;
                default:
                    throw new Exceptions_1.ArgumentOutOfRangeException("direction");
            }
        } while (hasBeenMoved);
    };
    BoundingBox.prototype.getClickedObjectOfType = function (clickPosition) {
        var obj = this.dataObject;
        if (this.pointLiesInsideBorders(clickPosition) && (obj !== undefined)) {
            return obj;
        }
        for (var idx = 0, len = this.childElements.length; idx < len; ++idx) {
            var psi = this.childElements[idx];
            var innerObject = psi.getClickedObjectOfType(clickPosition);
            if (innerObject !== undefined) {
                return innerObject;
            }
        }
        return undefined;
    };
    BoundingBox.prototype.getObjectsInRegion = function (region, liesInside) {
        if (liesInside === void 0) { liesInside = true; }
        if (this.dataObject !== undefined) {
            if (liesInside) {
                if (region.liesInsideBorders(this)) {
                    return [this.dataObject];
                }
            }
            else {
                if (region.collisionDetection(this)) {
                    return [this.dataObject];
                }
            }
        }
        var result = [];
        for (var _i = 0, _a = this.childElements; _i < _a.length; _i++) {
            var child = _a[_i];
            result.concat(child.getObjectsInRegion(region, liesInside));
        }
        return result;
        //return this.childElements.SelectMany(psi => psi.getObjectsInRegion<T>(region, liesInside));
    };
    BoundingBox.prototype.calculateRectangle = function () {
        this.upperLeftCorner = new PointF2D_1.PointF2D(this.borderLeft, this.borderTop);
        this.size = new SizeF2D_1.SizeF2D(this.borderRight - this.borderLeft, this.borderBottom - this.borderTop);
        this.boundingRectangle = RectangleF2D_1.RectangleF2D.createFromLocationAndSize(this.upperLeftCorner, this.size);
    };
    BoundingBox.prototype.calculateMarginRectangle = function () {
        this.upperLeftMarginCorner = new PointF2D_1.PointF2D(this.borderMarginLeft, this.borderMarginTop);
        this.marginSize = new SizeF2D_1.SizeF2D(this.borderMarginRight - this.borderMarginLeft, this.borderMarginBottom - this.borderMarginTop);
        this.boundingMarginRectangle = RectangleF2D_1.RectangleF2D.createFromLocationAndSize(this.upperLeftMarginCorner, this.marginSize);
    };
    BoundingBox.prototype.calculateMarginPositionAlongDirection = function (toBePlaced, direction) {
        if (this === toBePlaced) {
            return;
        }
        if (this.isSymbol && this.marginCollisionDetection(toBePlaced)) {
            var shiftDistance = 0;
            switch (direction) {
                case ColDirEnum.Left:
                    shiftDistance = (this.absolutePosition.x + this.borderMarginLeft) - (toBePlaced.absolutePosition.x + toBePlaced.borderMarginRight);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Right:
                    shiftDistance = (this.absolutePosition.x + this.borderMarginRight) - (toBePlaced.absolutePosition.x + toBePlaced.borderMarginLeft);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Up:
                    shiftDistance = (this.absolutePosition.y + this.borderMarginTop) - (toBePlaced.absolutePosition.y + toBePlaced.borderMarginBottom);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                case ColDirEnum.Down:
                    shiftDistance = (this.absolutePosition.y + this.borderMarginBottom) - (toBePlaced.absolutePosition.y + toBePlaced.borderMarginTop);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                default:
                    throw new Exceptions_1.ArgumentOutOfRangeException("direction");
            }
        }
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var childElement = this.ChildElements[idx];
            childElement.calculateMarginPositionAlongDirection(toBePlaced, direction);
        }
    };
    BoundingBox.prototype.calculatePositionAlongDirection = function (toBePlaced, direction) {
        if (this === toBePlaced) {
            return;
        }
        if (this.isSymbol && this.collisionDetection(toBePlaced)) {
            var shiftDistance = void 0;
            switch (direction) {
                case ColDirEnum.Left:
                    shiftDistance = (this.absolutePosition.x + this.borderLeft) - (toBePlaced.absolutePosition.x + toBePlaced.borderRight);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Right:
                    shiftDistance = (this.absolutePosition.x + this.borderRight) - (toBePlaced.absolutePosition.x + toBePlaced.borderLeft);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Up:
                    shiftDistance = (this.absolutePosition.y + this.borderTop) - (toBePlaced.absolutePosition.y + toBePlaced.borderBottom);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                case ColDirEnum.Down:
                    shiftDistance = (this.absolutePosition.y + this.borderBottom) - (toBePlaced.absolutePosition.y + toBePlaced.borderTop);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                default:
                    throw new Exceptions_1.ArgumentOutOfRangeException("direction");
            }
        }
        for (var idx = 0, len = this.ChildElements.length; idx < len; ++idx) {
            var childElement = this.ChildElements[idx];
            childElement.calculatePositionAlongDirection(toBePlaced, direction);
        }
    };
    return BoundingBox;
}());
exports.BoundingBox = BoundingBox;
(function (ColDirEnum) {
    ColDirEnum[ColDirEnum["Left"] = 0] = "Left";
    ColDirEnum[ColDirEnum["Right"] = 1] = "Right";
    ColDirEnum[ColDirEnum["Up"] = 2] = "Up";
    ColDirEnum[ColDirEnum["Down"] = 3] = "Down";
})(exports.ColDirEnum || (exports.ColDirEnum = {}));
var ColDirEnum = exports.ColDirEnum;

"use strict";
var DrawingEnums_1 = require("./DrawingEnums");
var GraphicalLine = (function () {
    function GraphicalLine(start, end, width, styleEnum) {
        if (width === void 0) { width = 0; }
        if (styleEnum === void 0) { styleEnum = DrawingEnums_1.OutlineAndFillStyleEnum.BaseWritingColor; }
        this.start = start;
        this.end = end;
        this.width = width;
        this.styleId = styleEnum;
    }
    Object.defineProperty(GraphicalLine.prototype, "Start", {
        get: function () {
            return this.start;
        },
        set: function (value) {
            this.start = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalLine.prototype, "End", {
        get: function () {
            return this.end;
        },
        set: function (value) {
            this.end = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalLine.prototype, "Width", {
        get: function () {
            return this.width;
        },
        set: function (value) {
            this.width = value;
        },
        enumerable: true,
        configurable: true
    });
    return GraphicalLine;
}());
exports.GraphicalLine = GraphicalLine;

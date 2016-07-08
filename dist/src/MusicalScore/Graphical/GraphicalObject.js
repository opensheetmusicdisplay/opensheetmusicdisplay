"use strict";
var GraphicalObject = (function () {
    function GraphicalObject() {
    }
    Object.defineProperty(GraphicalObject.prototype, "PositionAndShape", {
        get: function () {
            return this.boundingBox;
        },
        set: function (value) {
            this.boundingBox = value;
        },
        enumerable: true,
        configurable: true
    });
    return GraphicalObject;
}());
exports.GraphicalObject = GraphicalObject;

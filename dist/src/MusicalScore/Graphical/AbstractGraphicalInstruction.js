"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var AbstractGraphicalInstruction = (function (_super) {
    __extends(AbstractGraphicalInstruction, _super);
    function AbstractGraphicalInstruction(parent) {
        _super.call(this);
        this.parent = parent;
    }
    Object.defineProperty(AbstractGraphicalInstruction.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        set: function (value) {
            this.parent = value;
        },
        enumerable: true,
        configurable: true
    });
    return AbstractGraphicalInstruction;
}(GraphicalObject_1.GraphicalObject));
exports.AbstractGraphicalInstruction = AbstractGraphicalInstruction;

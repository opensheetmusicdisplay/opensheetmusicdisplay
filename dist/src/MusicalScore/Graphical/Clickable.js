"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var Clickable = (function (_super) {
    __extends(Clickable, _super);
    function Clickable() {
        _super.apply(this, arguments);
    }
    return Clickable;
}(GraphicalObject_1.GraphicalObject));
exports.Clickable = Clickable;

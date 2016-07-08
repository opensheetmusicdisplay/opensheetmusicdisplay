"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var octaveShift_1 = require("../VoiceData/Expressions/ContinuousExpressions/octaveShift");
var BoundingBox_1 = require("./BoundingBox");
var MusicSymbol_1 = require("./MusicSymbol");
var Exceptions_1 = require("../Exceptions");
var GraphicalOctaveShift = (function (_super) {
    __extends(GraphicalOctaveShift, _super);
    function GraphicalOctaveShift(octaveShift, parent) {
        _super.call(this);
        this.getOctaveShift = octaveShift;
        this.setSymbol();
        // ToDo: set the size again due to the given symbol...
        //this.PositionAndShape = new BoundingBox(parent, this.octaveSymbol, this);
        this.PositionAndShape = new BoundingBox_1.BoundingBox(this, parent);
    }
    GraphicalOctaveShift.prototype.setSymbol = function () {
        switch (this.getOctaveShift.Type) {
            case octaveShift_1.OctaveEnum.VA8:
                this.octaveSymbol = MusicSymbol_1.MusicSymbol.VA8;
                break;
            case octaveShift_1.OctaveEnum.VB8:
                this.octaveSymbol = MusicSymbol_1.MusicSymbol.VB8;
                break;
            case octaveShift_1.OctaveEnum.MA15:
                this.octaveSymbol = MusicSymbol_1.MusicSymbol.MA15;
                break;
            case octaveShift_1.OctaveEnum.MB15:
                this.octaveSymbol = MusicSymbol_1.MusicSymbol.MB15;
                break;
            default:
                throw new Exceptions_1.ArgumentOutOfRangeException("");
        }
    };
    return GraphicalOctaveShift;
}(GraphicalObject_1.GraphicalObject));
exports.GraphicalOctaveShift = GraphicalOctaveShift;

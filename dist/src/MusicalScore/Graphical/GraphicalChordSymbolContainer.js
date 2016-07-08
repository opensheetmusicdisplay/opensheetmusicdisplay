"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var TextAlignment_1 = require("../../Common/Enums/TextAlignment");
var Label_1 = require("../Label");
var GraphicalLabel_1 = require("./GraphicalLabel");
var ChordSymbolContainer_1 = require("../VoiceData/ChordSymbolContainer");
var BoundingBox_1 = require("./BoundingBox");
var GraphicalObject_1 = require("./GraphicalObject");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var GraphicalChordSymbolContainer = (function (_super) {
    __extends(GraphicalChordSymbolContainer, _super);
    function GraphicalChordSymbolContainer(chordSymbolContainer, parent, textHeight, transposeHalftones) {
        _super.call(this);
        this.chordSymbolContainer = chordSymbolContainer;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, parent);
        this.calculateLabel(textHeight, transposeHalftones);
    }
    Object.defineProperty(GraphicalChordSymbolContainer.prototype, "GetChordSymbolContainer", {
        get: function () {
            return this.chordSymbolContainer;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalChordSymbolContainer.prototype, "GetGraphicalLabel", {
        get: function () {
            return this.graphicalLabel;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalChordSymbolContainer.prototype.calculateLabel = function (textHeight, transposeHalftones) {
        var text = ChordSymbolContainer_1.ChordSymbolContainer.calculateChordText(this.chordSymbolContainer, transposeHalftones);
        this.graphicalLabel = new GraphicalLabel_1.GraphicalLabel(new Label_1.Label(text), textHeight, TextAlignment_1.TextAlignment.CenterBottom, this.boundingBox);
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, 0.0);
        this.boundingBox.ChildElements.push(this.graphicalLabel.PositionAndShape);
    };
    return GraphicalChordSymbolContainer;
}(GraphicalObject_1.GraphicalObject));
exports.GraphicalChordSymbolContainer = GraphicalChordSymbolContainer;

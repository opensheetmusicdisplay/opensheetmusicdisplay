"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var TextAlignment_1 = require("../../Common/Enums/TextAlignment");
var Clickable_1 = require("./Clickable");
var BoundingBox_1 = require("./BoundingBox");
var EngravingRules_1 = require("./EngravingRules");
var MusicSheetCalculator_1 = require("./MusicSheetCalculator");
var GraphicalLabel = (function (_super) {
    __extends(GraphicalLabel, _super);
    function GraphicalLabel(label, textHeight, alignment, parent) {
        if (parent === void 0) { parent = undefined; }
        _super.call(this);
        this.label = label;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, parent);
        this.label.fontHeight = textHeight;
        this.label.textAlignment = alignment;
    }
    Object.defineProperty(GraphicalLabel.prototype, "Label", {
        get: function () {
            return this.label;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalLabel.prototype.toString = function () {
        return this.label.text;
    };
    GraphicalLabel.prototype.setLabelPositionAndShapeBorders = function () {
        if (this.Label.text.trim() === "") {
            return;
        }
        var labelMarginBorderFactor = EngravingRules_1.EngravingRules.Rules.LabelMarginBorderFactor;
        var widthToHeightRatio = MusicSheetCalculator_1.MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(this.Label.text, this.Label.font, this.Label.fontStyle);
        var height = this.Label.fontHeight;
        var width = height * widthToHeightRatio;
        var psi = this.PositionAndShape;
        switch (this.Label.textAlignment) {
            case TextAlignment_1.TextAlignment.CenterBottom:
                psi.BorderTop = -height;
                psi.BorderLeft = -width / 2;
                psi.BorderBottom = 0;
                psi.BorderRight = width / 2;
                break;
            case TextAlignment_1.TextAlignment.CenterCenter:
                psi.BorderTop = -height / 2;
                psi.BorderLeft = -width / 2;
                psi.BorderBottom = height / 2;
                psi.BorderRight = width / 2;
                break;
            case TextAlignment_1.TextAlignment.CenterTop:
                psi.BorderTop = 0;
                psi.BorderLeft = -width / 2;
                psi.BorderBottom = height;
                psi.BorderRight = width / 2;
                break;
            case TextAlignment_1.TextAlignment.LeftBottom:
                psi.BorderTop = -height;
                psi.BorderLeft = 0;
                psi.BorderBottom = 0;
                psi.BorderRight = width;
                break;
            case TextAlignment_1.TextAlignment.LeftCenter:
                psi.BorderTop = -height / 2;
                psi.BorderLeft = 0;
                psi.BorderBottom = height / 2;
                psi.BorderRight = width;
                break;
            case TextAlignment_1.TextAlignment.LeftTop:
                psi.BorderTop = 0;
                psi.BorderLeft = 0;
                psi.BorderBottom = height;
                psi.BorderRight = width;
                break;
            case TextAlignment_1.TextAlignment.RightBottom:
                psi.BorderTop = -height;
                psi.BorderLeft = -width;
                psi.BorderBottom = 0;
                psi.BorderRight = 0;
                break;
            case TextAlignment_1.TextAlignment.RightCenter:
                psi.BorderTop = -height / 2;
                psi.BorderLeft = -width;
                psi.BorderBottom = height / 2;
                psi.BorderRight = 0;
                break;
            case TextAlignment_1.TextAlignment.RightTop:
                psi.BorderTop = 0;
                psi.BorderLeft = -width;
                psi.BorderBottom = height;
                psi.BorderRight = 0;
                break;
            default:
        }
        psi.BorderMarginTop = psi.BorderTop - height * labelMarginBorderFactor;
        psi.BorderMarginLeft = psi.BorderLeft - height * labelMarginBorderFactor;
        psi.BorderMarginBottom = psi.BorderBottom + height * labelMarginBorderFactor;
        psi.BorderMarginRight = psi.BorderRight + height * labelMarginBorderFactor;
    };
    return GraphicalLabel;
}(Clickable_1.Clickable));
exports.GraphicalLabel = GraphicalLabel;

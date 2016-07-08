"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Vex = require("vexflow");
var MusicSheetDrawer_1 = require("../MusicSheetDrawer");
var RectangleF2D_1 = require("../../../Common/DataObjects/RectangleF2D");
var PointF2D_1 = require("../../../Common/DataObjects/PointF2D");
/**
 * Created by Matthias on 22.06.2016.
 */
var VexFlowMusicSheetDrawer = (function (_super) {
    __extends(VexFlowMusicSheetDrawer, _super);
    function VexFlowMusicSheetDrawer(canvas, textMeasurer, isPreviewImageDrawer) {
        if (isPreviewImageDrawer === void 0) { isPreviewImageDrawer = false; }
        _super.call(this, textMeasurer, isPreviewImageDrawer);
        this.renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        this.ctx = this.renderer.getContext();
    }
    VexFlowMusicSheetDrawer.prototype.scale = function (k) {
        this.ctx.scale(k, k);
    };
    VexFlowMusicSheetDrawer.prototype.resize = function (x, y) {
        this.renderer.resize(x, y);
    };
    VexFlowMusicSheetDrawer.prototype.translate = function (x, y) {
        // FIXME
        this.ctx.vexFlowCanvasContext.translate(x, y);
    };
    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    VexFlowMusicSheetDrawer.prototype.calculatePixelDistance = function (unitDistance) {
        // ToDo: implement!
        return unitDistance * 10.0;
    };
    VexFlowMusicSheetDrawer.prototype.drawMeasure = function (measure) {
        measure.setAbsoluteCoordinates(measure.PositionAndShape.AbsolutePosition.x * measure.unit, measure.PositionAndShape.AbsolutePosition.y * measure.unit);
        return measure.draw(this.ctx);
    };
    /**
     * Renders a Label to the screen (e.g. Title, composer..)
     * @param graphicalLabel holds the label string, the text height in units and the font parameters
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param bitmapWidth Not needed for now.
     * @param bitmapHeight Not needed for now.
     * @param heightInPixel the height of the text in screen coordinates
     * @param screenPosition the position of the lower left corner of the text in screen coordinates
     */
    VexFlowMusicSheetDrawer.prototype.renderLabel = function (graphicalLabel, layer, bitmapWidth, bitmapHeight, heightInPixel, screenPosition) {
        // ToDo: implement!
        var ctx = this.ctx.vexFlowCanvasContext;
        ctx.font = Math.floor(graphicalLabel.Label.fontHeight * 10) + "px 'Times New Roman'";
        console.log(graphicalLabel.Label.text, screenPosition.x, screenPosition.y);
        ctx.fillText(graphicalLabel.Label.text, screenPosition.x, screenPosition.y);
    };
    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     */
    VexFlowMusicSheetDrawer.prototype.renderRectangle = function (rectangle, layer, styleId) {
        // ToDo: implement!
    };
    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    VexFlowMusicSheetDrawer.prototype.applyScreenTransformation = function (point) {
        // ToDo: implement!
        return new PointF2D_1.PointF2D(point.x * 10.0, point.y * 10.0);
    };
    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    VexFlowMusicSheetDrawer.prototype.applyScreenTransformationForRect = function (rectangle) {
        // FIXME Check if correct
        return new RectangleF2D_1.RectangleF2D(rectangle.x * 10, rectangle.y * 10, rectangle.width * 10, rectangle.height * 10);
    };
    return VexFlowMusicSheetDrawer;
}(MusicSheetDrawer_1.MusicSheetDrawer));
exports.VexFlowMusicSheetDrawer = VexFlowMusicSheetDrawer;

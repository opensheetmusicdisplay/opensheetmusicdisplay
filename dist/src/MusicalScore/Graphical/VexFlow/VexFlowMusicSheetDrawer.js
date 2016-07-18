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
var VexFlowConverter_1 = require("./VexFlowConverter");
var VexFlowTextMeasurer_1 = require("./VexFlowTextMeasurer");
var VexFlowMusicSheetDrawer = (function (_super) {
    __extends(VexFlowMusicSheetDrawer, _super);
    function VexFlowMusicSheetDrawer(titles, canvas, isPreviewImageDrawer) {
        if (isPreviewImageDrawer === void 0) { isPreviewImageDrawer = false; }
        _super.call(this, new VexFlowTextMeasurer_1.VexFlowTextMeasurer(), isPreviewImageDrawer);
        this.zoom = 1.0;
        this.renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        this.vfctx = this.renderer.getContext();
        // The following is a hack to retrieve the actual canvas' drawing context
        // Not supposed to work forever....
        this.ctx = this.vfctx.vexFlowCanvasContext;
        this.titles = titles;
    }
    /**
     * Zoom the rendering areas
     * @param k is the zoom factor
     */
    VexFlowMusicSheetDrawer.prototype.scale = function (k) {
        this.zoom = k;
        this.vfctx.scale(k, k);
    };
    /**
     * Resize the rendering areas
     * @param x
     * @param y
     */
    VexFlowMusicSheetDrawer.prototype.resize = function (x, y) {
        this.renderer.resize(x, y);
    };
    VexFlowMusicSheetDrawer.prototype.translate = function (x, y) {
        // Translation seems not supported by VexFlow
        this.ctx.translate(x, y);
    };
    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    VexFlowMusicSheetDrawer.prototype.calculatePixelDistance = function (unitDistance) {
        return unitDistance * 10.0;
    };
    VexFlowMusicSheetDrawer.prototype.drawMeasure = function (measure) {
        measure.setAbsoluteCoordinates(measure.PositionAndShape.AbsolutePosition.x * 10.0, measure.PositionAndShape.AbsolutePosition.y * 10.0);
        return measure.draw(this.vfctx);
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
        if (screenPosition.y < 0) {
            // Temportary solution for title labels
            var div = document.createElement("div");
            div.style.fontSize = (graphicalLabel.Label.fontHeight * this.zoom * 10.0) + "px";
            //span.style.width = (bitmapWidth * this.zoom * 1.1) + "px";
            //span.style.height = (bitmapHeight * this.zoom * 1.1) + "px";
            //span.style.overflow = "hidden";
            div.style.fontFamily = "Times New Roman";
            //span.style.marginLeft = (screenPosition.x * this.zoom) + "px";
            div.style.textAlign = "center";
            div.appendChild(document.createTextNode(graphicalLabel.Label.text));
            this.titles.appendChild(div);
            return;
        }
        var ctx = this.vfctx.vexFlowCanvasContext;
        var old = ctx.font;
        ctx.font = VexFlowConverter_1.VexFlowConverter.font(graphicalLabel.Label.fontHeight * 10.0, graphicalLabel.Label.fontStyle, graphicalLabel.Label.font);
        ctx.fillText(graphicalLabel.Label.text, screenPosition.x, screenPosition.y + heightInPixel);
        ctx.font = old;
    };
    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     */
    VexFlowMusicSheetDrawer.prototype.renderRectangle = function (rectangle, layer, styleId) {
        var old = this.ctx.fillStyle;
        this.ctx.fillStyle = VexFlowConverter_1.VexFlowConverter.style(styleId);
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        this.ctx.fillStyle = old;
    };
    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    VexFlowMusicSheetDrawer.prototype.applyScreenTransformation = function (point) {
        return new PointF2D_1.PointF2D(point.x * 10.0, point.y * 10.0);
    };
    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    VexFlowMusicSheetDrawer.prototype.applyScreenTransformationForRect = function (rectangle) {
        return new RectangleF2D_1.RectangleF2D(rectangle.x * 10.0, rectangle.y * 10.0, rectangle.width * 10.0, rectangle.height * 10.0);
    };
    return VexFlowMusicSheetDrawer;
}(MusicSheetDrawer_1.MusicSheetDrawer));
exports.VexFlowMusicSheetDrawer = VexFlowMusicSheetDrawer;

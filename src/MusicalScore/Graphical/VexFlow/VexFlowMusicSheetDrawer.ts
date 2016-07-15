import Vex = require("vexflow");
import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {GraphicalLabel} from "../GraphicalLabel";
import {VexFlowConverter} from "./VexFlowConverter";
import {VexFlowTextMeasurer} from "./VexFlowTextMeasurer";

export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private renderer: Vex.Flow.Renderer;
    private vfctx: Vex.Flow.CanvasContext;
    private ctx: CanvasRenderingContext2D;
    private titles: HTMLElement;
    private zoom: number = 1.0;

    constructor(titles: HTMLElement, canvas: HTMLCanvasElement, isPreviewImageDrawer: boolean = false) {
        super(new VexFlowTextMeasurer(), isPreviewImageDrawer);
        this.renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        this.vfctx = this.renderer.getContext();
        // The following is a hack to retrieve the actual canvas' drawing context
        // Not supposed to work forever....
        this.ctx = (this.vfctx as any).vexFlowCanvasContext;
        this.titles = titles;
    }

    /**
     * Zoom the rendering areas
     * @param k is the zoom factor
     */
    public scale(k: number): void {
        this.zoom = k;
        this.vfctx.scale(k, k);
    }

    /**
     * Resize the rendering areas
     * @param x
     * @param y
     */
    public resize(x: number, y: number): void {
        this.renderer.resize(x, y);
    }

    public translate(x: number, y: number): void {
        // Translation seems not supported by VexFlow
        this.ctx.translate(x, y);
    }

    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    public calculatePixelDistance(unitDistance: number): number {
        return unitDistance * 10.0;
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * 10.0,
            measure.PositionAndShape.AbsolutePosition.y * 10.0
        );
        return measure.draw(this.vfctx);
    }

    /**
     * Renders a Label to the screen (e.g. Title, composer..)
     * @param graphicalLabel holds the label string, the text height in units and the font parameters
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param bitmapWidth Not needed for now.
     * @param bitmapHeight Not needed for now.
     * @param heightInPixel the height of the text in screen coordinates
     * @param screenPosition the position of the lower left corner of the text in screen coordinates
     */
    protected renderLabel(graphicalLabel: GraphicalLabel, layer: number, bitmapWidth: number,
                          bitmapHeight: number, heightInPixel: number, screenPosition: PointF2D): void {
        if (screenPosition.y < 0) {
            // Temportary solution for title labels
            let div: HTMLElement = document.createElement("div");
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
        let ctx: CanvasRenderingContext2D = (this.vfctx as any).vexFlowCanvasContext;
        let old: string = ctx.font;
        ctx.font = VexFlowConverter.font(
            graphicalLabel.Label.fontHeight * 10.0,
            graphicalLabel.Label.fontStyle,
            graphicalLabel.Label.font
        );
        ctx.fillText(graphicalLabel.Label.text, screenPosition.x, screenPosition.y + heightInPixel);
        ctx.font = old;
    }

    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number): void {
        let old: string|CanvasGradient|CanvasPattern = this.ctx.fillStyle;
        this.ctx.fillStyle = VexFlowConverter.style(styleId);
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        this.ctx.fillStyle = old;
    }

    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    protected applyScreenTransformation(point: PointF2D): PointF2D {
        return new PointF2D(point.x * 10.0, point.y * 10.0);
    }

    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D {
        return new RectangleF2D(rectangle.x * 10.0, rectangle.y * 10.0, rectangle.width * 10.0, rectangle.height * 10.0);
    }
}

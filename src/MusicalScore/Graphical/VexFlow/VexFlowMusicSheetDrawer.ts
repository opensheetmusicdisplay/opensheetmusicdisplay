import Vex = require("vexflow");
import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {GraphicalLabel} from "../GraphicalLabel";
/**
 * Created by Matthias on 22.06.2016.
 */
export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private renderer: Vex.Flow.Renderer;
    private ctx: Vex.Flow.CanvasContext;

    constructor(canvas: HTMLCanvasElement, textMeasurer: ITextMeasurer, isPreviewImageDrawer: boolean = false) {
        super(textMeasurer, isPreviewImageDrawer);
        this.renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        this.ctx = this.renderer.getContext();
    }

    public scale(k: number): void {
        this.ctx.scale(k, k);
    }

    public resize(x: number, y: number): void {
        this.renderer.resize(x, y);
    }

    public translate(x: number, y: number): void {
        // FIXME
        (this.ctx as any).vexFlowCanvasContext.translate(x, y);
    }

    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    public calculatePixelDistance(unitDistance: number): number {
        // ToDo: implement!
        return unitDistance * 10.0;
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * (measure as VexFlowMeasure).unit,
            measure.PositionAndShape.AbsolutePosition.y * (measure as VexFlowMeasure).unit
        );
        return measure.draw(this.ctx);
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
        // ToDo: implement!
        let ctx: CanvasRenderingContext2D = (this.ctx as any).vexFlowCanvasContext;
        ctx.font = Math.floor(graphicalLabel.Label.fontHeight * 10) + "px 'Times New Roman'";
        console.log(graphicalLabel.Label.text, screenPosition.x, screenPosition.y);
        ctx.fillText(graphicalLabel.Label.text, screenPosition.x, screenPosition.y);
    }

    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number): void {
        // ToDo: implement!
    }

    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    protected applyScreenTransformation(point: PointF2D): PointF2D {
        // ToDo: implement!
        return new PointF2D(point.x * 10.0, point.y * 10.0);
    }

    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D {
        // FIXME Check if correct
        return new RectangleF2D(rectangle.x * 10, rectangle.y * 10, rectangle.width * 10, rectangle.height * 10);
    }
}

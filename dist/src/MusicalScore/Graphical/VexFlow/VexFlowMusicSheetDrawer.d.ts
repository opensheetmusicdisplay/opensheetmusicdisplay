import { MusicSheetDrawer } from "../MusicSheetDrawer";
import { RectangleF2D } from "../../../Common/DataObjects/RectangleF2D";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalLabel } from "../GraphicalLabel";
export declare class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private renderer;
    private vfctx;
    private ctx;
    private titles;
    private zoom;
    constructor(titles: HTMLElement, canvas: HTMLCanvasElement, isPreviewImageDrawer?: boolean);
    /**
     * Zoom the rendering areas
     * @param k is the zoom factor
     */
    scale(k: number): void;
    /**
     * Resize the rendering areas
     * @param x
     * @param y
     */
    resize(x: number, y: number): void;
    translate(x: number, y: number): void;
    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    calculatePixelDistance(unitDistance: number): number;
    protected drawMeasure(measure: VexFlowMeasure): void;
    /**
     * Renders a Label to the screen (e.g. Title, composer..)
     * @param graphicalLabel holds the label string, the text height in units and the font parameters
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param bitmapWidth Not needed for now.
     * @param bitmapHeight Not needed for now.
     * @param heightInPixel the height of the text in screen coordinates
     * @param screenPosition the position of the lower left corner of the text in screen coordinates
     */
    protected renderLabel(graphicalLabel: GraphicalLabel, layer: number, bitmapWidth: number, bitmapHeight: number, heightInPixel: number, screenPosition: PointF2D): void;
    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number): void;
    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    protected applyScreenTransformation(point: PointF2D): PointF2D;
    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D;
}

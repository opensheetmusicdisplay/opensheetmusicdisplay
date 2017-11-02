import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {GraphicalLabel} from "../GraphicalLabel";
import {VexFlowTextMeasurer} from "./VexFlowTextMeasurer";
import {MusicSystem} from "../MusicSystem";
import {GraphicalObject} from "../GraphicalObject";
import {GraphicalLayers} from "../DrawingEnums";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowBackend} from "./VexFlowBackend";

/**
 * This is a global constant which denotes the height in pixels of the space between two lines of the stave
 * (when zoom = 1.0)
 * @type number
 */
export const unitInPixels: number = 10;

export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private backend: VexFlowBackend;
    private zoom: number = 1.0;

    constructor(element: HTMLElement,
                backend: VexFlowBackend,
                isPreviewImageDrawer: boolean = false) {
        super(new VexFlowTextMeasurer(), isPreviewImageDrawer);
        this.backend = backend;
    }

    public clear(): void {
        this.backend.clear();
    }

    /**
     * Zoom the rendering areas
     * @param k is the zoom factor
     */
    public scale(k: number): void {
        this.zoom = k;
        this.backend.scale(this.zoom);
    }

    /**
     * Resize the rendering areas
     * @param x
     * @param y
     */
    public resize(x: number, y: number): void {
        this.backend.resize(x, y);
    }

    public translate(x: number, y: number): void {
        this.backend.translate(x, y);
    }

    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    public calculatePixelDistance(unitDistance: number): number {
        return unitDistance * unitInPixels;
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * unitInPixels,
            measure.PositionAndShape.AbsolutePosition.y * unitInPixels
        );
        measure.draw(this.backend.getContext());

        // Draw the StaffEntries
        for (let staffEntry of measure.staffEntries) {
            this.drawStaffEntry(staffEntry);
        }
    }

    private drawStaffEntry(staffEntry: GraphicalStaffEntry): void {
        // Draw ChordSymbol
        if (staffEntry.graphicalChordContainer !== undefined) {
            this.drawLabel(staffEntry.graphicalChordContainer.GetGraphicalLabel, <number>GraphicalLayers.Notes);
        }
    }

    protected drawInstrumentBrace(bracket: GraphicalObject, system: MusicSystem): void {
        // empty
    }

    protected drawGroupBracket(bracket: GraphicalObject, system: MusicSystem): void {
        // empty
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
        const height: number = graphicalLabel.Label.fontHeight * unitInPixels;
        const { fontStyle, font, text } = graphicalLabel.Label;

        this.backend.renderText(height, fontStyle, font, text, heightInPixel, screenPosition);
    }

    /**
     * Renders a rectangle with the given style to the screen.
     * It is given in screen coordinates.
     * @param rectangle the rect in screen coordinates
     * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
     * @param styleId the style id
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number): void {
       this.backend.renderRectangle(rectangle, styleId);
    }

    /**
     * Converts a point from unit to pixel space.
     * @param point
     * @returns {PointF2D}
     */
    protected applyScreenTransformation(point: PointF2D): PointF2D {
        return new PointF2D(point.x * unitInPixels, point.y * unitInPixels);
    }

    /**
     * Converts a rectangle from unit to pixel space.
     * @param rectangle
     * @returns {RectangleF2D}
     */
    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D {
        return new RectangleF2D(rectangle.x * unitInPixels, rectangle.y * unitInPixels, rectangle.width * unitInPixels, rectangle.height * unitInPixels);
    }
}

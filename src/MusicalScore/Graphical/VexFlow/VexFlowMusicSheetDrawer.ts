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
import {VexFlowInstrumentBracket} from "./VexFlowInstrumentBracket";
import {VexFlowInstrumentBrace} from "./VexFlowInstrumentBrace";
import {GraphicalLyricEntry} from "../GraphicalLyricEntry";
import {StaffLine} from "../StaffLine";

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
        for (const voiceID in measure.vfVoices) {
            if (measure.vfVoices.hasOwnProperty(voiceID)) {
                const tickables: Vex.Flow.Tickable[] = measure.vfVoices[voiceID].tickables;
                for (const tick of tickables) {
                    if ((<any>tick).getAttribute("type") === "StaveNote" && process.env.DEBUG) {
                        tick.getBoundingBox().draw(this.backend.getContext());
                    }
                }
            }
        }

        // Draw the StaffEntries
        for (const staffEntry of measure.staffEntries) {
            this.drawStaffEntry(staffEntry);
        }
    }

    // private drawPixel(coord: PointF2D): void {
    //     coord = this.applyScreenTransformation(coord);
    //     const ctx: any = this.backend.getContext();
    //     const oldStyle: string = ctx.fillStyle;
    //     ctx.fillStyle = "#00FF00FF";
    //     ctx.fillRect( coord.x, coord.y, 2, 2 );
    //     ctx.fillStyle = oldStyle;
    // }

    public drawLine(start: PointF2D, stop: PointF2D): void {
        start = this.applyScreenTransformation(start);
        stop = this.applyScreenTransformation(stop);
        this.backend.renderLine(start, stop);
    }

    protected drawSkyLine(staffline: StaffLine): void {
        // FIXME: Put into generic method to be used by bottom and sykline
        const scale: number = 0.1;
        const skyLine: number[] = staffline.SkyLine.map(v => (v - Math.max(...staffline.SkyLine)) * scale);
        const indices: number[] = [];
        let currentValue: number = 0;

        for (let i: number = 0; i < skyLine.length; i++) {
            if (skyLine[i] !== currentValue) {
                indices.push(i);
                currentValue = skyLine[i];
            }
        }

        const absolute: PointF2D = staffline.PositionAndShape.AbsolutePosition;
        if (indices.length > 0) {
            // This should be done at the SkyLine getter -> downsampling
            const samplingUnit: number = (skyLine.length / staffline.PositionAndShape.Size.width); //EngravingRules.Rules.SamplingUnit;

            let horizontalStart: PointF2D = new PointF2D(absolute.x, absolute.y);
            let horizontalEnd: PointF2D = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y);
            this.drawLine(horizontalStart, horizontalEnd);

            let verticalStart: PointF2D;
            let verticalEnd: PointF2D;

            if (skyLine[0] >= 0) {
                verticalStart = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y);
                verticalEnd = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y + skyLine[indices[0]]);
                this.drawLine(verticalStart, verticalEnd);
            }

            for (let i: number = 1; i < indices.length; i++) {
                horizontalStart = new PointF2D(indices[i - 1] / samplingUnit + absolute.x, absolute.y + skyLine[indices[i - 1]]);
                horizontalEnd = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + skyLine[indices[i - 1]]);
                this.drawLine(horizontalStart, horizontalEnd);

                verticalStart = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + skyLine[indices[i - 1]]);
                verticalEnd = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + skyLine[indices[i]]);
                this.drawLine(verticalStart, verticalEnd);
            }

            if (indices[indices.length - 1] < skyLine.length) {
                horizontalStart = new PointF2D(indices[indices.length - 1] / samplingUnit + absolute.x, absolute.y + skyLine[indices[indices.length - 1]]);
                horizontalEnd = new PointF2D(absolute.x + staffline.PositionAndShape.Size.width, absolute.y + skyLine[indices[indices.length - 1]]);
                this.drawLine(horizontalStart, horizontalEnd);
            } else {
                horizontalStart = new PointF2D(indices[indices.length - 1] / samplingUnit + absolute.x, absolute.y);
                horizontalEnd = new PointF2D(absolute.x + staffline.PositionAndShape.Size.width, absolute.y);
                this.drawLine(horizontalStart, horizontalEnd);
            }
        } else {
            // Flat line
            const start: PointF2D = new PointF2D(absolute.x, absolute.y);
            const end: PointF2D = new PointF2D(absolute.x + staffline.PositionAndShape.Size.width, absolute.y);
            this.drawLine(start, end);
        }
    }
    protected drawBottomLine(staffline: StaffLine): void {
        // staffline.BottomLine.forEach((value, idx) => this.drawPixel(new PointF2D(idx, value)));
    }


    private drawStaffEntry(staffEntry: GraphicalStaffEntry): void {
        // Draw ChordSymbol
        if (staffEntry.graphicalChordContainer !== undefined) {
            this.drawLabel(staffEntry.graphicalChordContainer.GetGraphicalLabel, <number>GraphicalLayers.Notes);
        }
        if (staffEntry.LyricsEntries.length > 0) {
            this.drawLyrics(staffEntry.LyricsEntries, <number>GraphicalLayers.Notes);
        }
    }

    /**
     * Draw all lyrics to the canvas
     * @param lyricEntries Array of lyric entries to be drawn
     * @param layer Number of the layer that the lyrics should be drawn in
     */
    private drawLyrics(lyricEntries: GraphicalLyricEntry[], layer: number): void {
        lyricEntries.forEach(lyricsEntry => this.drawLabel(lyricsEntry.GraphicalLabel, layer));
    }

    protected drawInstrumentBrace(brace: GraphicalObject, system: MusicSystem): void {
        // Draw InstrumentBrackets at beginning of line
        const vexBrace: VexFlowInstrumentBrace = (brace as VexFlowInstrumentBrace);
        vexBrace.draw(this.backend.getContext());
    }

    protected drawGroupBracket(bracket: GraphicalObject, system: MusicSystem): void {
        // Draw InstrumentBrackets at beginning of line
        const vexBrace: VexFlowInstrumentBracket = (bracket as VexFlowInstrumentBracket);
        vexBrace.draw(this.backend.getContext());
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
     * @param alpha alpha value between 0 and 1
     */
    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number, alpha: number): void {
       this.backend.renderRectangle(rectangle, styleId, alpha);
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

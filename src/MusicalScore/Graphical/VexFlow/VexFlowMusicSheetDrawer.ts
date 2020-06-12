import Vex from "vexflow";
import { MusicSheetDrawer } from "../MusicSheetDrawer";
import { RectangleF2D } from "../../../Common/DataObjects/RectangleF2D";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalLabel } from "../GraphicalLabel";
import { VexFlowTextMeasurer } from "./VexFlowTextMeasurer";
import { MusicSystem } from "../MusicSystem";
import { GraphicalObject } from "../GraphicalObject";
import { GraphicalLayers } from "../DrawingEnums";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowBackend } from "./VexFlowBackend";
import { VexFlowOctaveShift } from "./VexFlowOctaveShift";
import { VexFlowInstantaneousDynamicExpression } from "./VexFlowInstantaneousDynamicExpression";
import { VexFlowInstrumentBracket } from "./VexFlowInstrumentBracket";
import { VexFlowInstrumentBrace } from "./VexFlowInstrumentBrace";
import { GraphicalLyricEntry } from "../GraphicalLyricEntry";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { StaffLine } from "../StaffLine";
import { GraphicalSlur } from "../GraphicalSlur";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { GraphicalInstantaneousTempoExpression } from "../GraphicalInstantaneousTempoExpression";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import log = require("loglevel");
import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { DrawingParameters } from "../DrawingParameters";
import { GraphicalMusicPage } from "../GraphicalMusicPage";
import { GraphicalMusicSheet } from "../GraphicalMusicSheet";
import { GraphicalUnknownExpression } from "../GraphicalUnknownExpression";

/**
 * This is a global constant which denotes the height in pixels of the space between two lines of the stave
 * (when zoom = 1.0)
 * @type number
 */
export const unitInPixels: number = 10;

export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    private backend: VexFlowBackend;
    private backends: VexFlowBackend[] = [];
    private zoom: number = 1.0;
    private pageIdx: number = 0; // this is a bad solution, should use MusicPage.PageNumber instead.

    constructor(drawingParameters: DrawingParameters = new DrawingParameters()) {
        super(new VexFlowTextMeasurer(drawingParameters.Rules), drawingParameters);
    }

    public get Backends(): VexFlowBackend[] {
        return this.backends;
    }

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        this.pageIdx = 0;
        for (const graphicalMusicPage of graphicalMusicSheet.MusicPages) {
            const backend: VexFlowBackend = this.backends[this.pageIdx];
            backend.graphicalMusicPage = graphicalMusicPage;
            backend.scale(this.zoom);
            //backend.resize(graphicalMusicSheet.ParentMusicSheet.pageWidth * unitInPixels * this.zoom,
            //               EngravingRules.Rules.PageHeight * unitInPixels * this.zoom);
            this.pageIdx += 1;
        }

        this.pageIdx = 0;
        this.backend = this.backends[0];
        super.drawSheet(graphicalMusicSheet);
    }

    protected drawPage(page: GraphicalMusicPage): void {
        this.backend = this.backends[page.PageNumber - 1]; // TODO we may need to set this in a couple of other places. this.pageIdx is a bad solution
        super.drawPage(page);
        this.pageIdx += 1;
        this.backend = this.backends[this.pageIdx];
    }

    public clear(): void {
        for (const backend of this.backends) {
            backend.clear();
        }
    }

    public setZoom(zoom: number): void {
        this.zoom = zoom;
    }

    /**
     * Converts a distance from unit to pixel space.
     * @param unitDistance the distance in units
     * @returns {number} the distance in pixels
     */
    public calculatePixelDistance(unitDistance: number): number {
        return unitDistance * unitInPixels;
    }

    protected drawStaffLine(staffLine: StaffLine): void {
        super.drawStaffLine(staffLine);
        const absolutePos: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
        if (this.rules.RenderSlurs) {
            this.drawSlurs(staffLine as VexFlowStaffLine, absolutePos);
        }
    }

    private drawSlurs(vfstaffLine: VexFlowStaffLine, absolutePos: PointF2D): void {
        for (const graphicalSlur of vfstaffLine.GraphicalSlurs) {
            // don't draw crossed slurs, as their curve calculation is not implemented yet:
            if (graphicalSlur.slur.isCrossed()) {
                continue;
            }
            this.drawSlur(graphicalSlur, absolutePos);
        }
    }

    private drawSlur(graphicalSlur: GraphicalSlur, abs: PointF2D): void {
        const curvePointsInPixels: PointF2D[] = [];
        // 1) create inner or original curve:
        const p1: PointF2D = new PointF2D(graphicalSlur.bezierStartPt.x + abs.x, graphicalSlur.bezierStartPt.y + abs.y);
        const p2: PointF2D = new PointF2D(graphicalSlur.bezierStartControlPt.x + abs.x, graphicalSlur.bezierStartControlPt.y + abs.y);
        const p3: PointF2D = new PointF2D(graphicalSlur.bezierEndControlPt.x + abs.x, graphicalSlur.bezierEndControlPt.y + abs.y);
        const p4: PointF2D = new PointF2D(graphicalSlur.bezierEndPt.x + abs.x, graphicalSlur.bezierEndPt.y + abs.y);

        // put screen transformed points into array
        curvePointsInPixels.push(this.applyScreenTransformation(p1));
        curvePointsInPixels.push(this.applyScreenTransformation(p2));
        curvePointsInPixels.push(this.applyScreenTransformation(p3));
        curvePointsInPixels.push(this.applyScreenTransformation(p4));

        // 2) create second outer curve to create a thickness for the curve:
        if (graphicalSlur.placement === PlacementEnum.Above) {
            p1.y -= 0.05;
            p2.y -= 0.3;
            p3.y -= 0.3;
            p4.y -= 0.05;
        } else {
            p1.y += 0.05;
            p2.y += 0.3;
            p3.y += 0.3;
            p4.y += 0.05;
        }

        // put screen transformed points into array
        curvePointsInPixels.push(this.applyScreenTransformation(p1));
        curvePointsInPixels.push(this.applyScreenTransformation(p2));
        curvePointsInPixels.push(this.applyScreenTransformation(p3));
        curvePointsInPixels.push(this.applyScreenTransformation(p4));
        this.backend.renderCurve(curvePointsInPixels);
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * unitInPixels,
            measure.PositionAndShape.AbsolutePosition.y * unitInPixels
        );
        try {
            measure.draw(this.backend.getContext());
            // Vexflow errors can happen here. If we don't catch errors, rendering will stop after this measure.
        } catch (ex) {
            log.warn("VexFlowMusicSheetDrawer.drawMeasure", ex);
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

    /** Draws a line in the current backend. Only usable while pages are drawn sequentially, because backend reference is updated in that process.
     *  To add your own lines after rendering, use DrawOverlayLine.
     */
    protected drawLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF", lineWidth: number = 0.2): void {
        // TODO maybe the backend should be given as an argument here as well, otherwise this can't be used after rendering of multiple pages is done.
        start = this.applyScreenTransformation(start);
        stop = this.applyScreenTransformation(stop);
        /*if (!this.backend) {
            this.backend = this.backends[0];
        }*/
        this.backend.renderLine(start, stop, color, lineWidth * unitInPixels);
    }

    /** Lets a user/developer draw an overlay line on the score. Use this instead of drawLine, which is for OSMD internally only.
     *  The MusicPage has to be specified, because each page and Vexflow backend has its own relative coordinates.
     *  (the AbsolutePosition of a GraphicalNote is relative to its backend)
     *  To get a MusicPage, use GraphicalNote.ParentMusicPage.
     */
    public DrawOverlayLine(start: PointF2D, stop: PointF2D, musicPage: GraphicalMusicPage,
                           color: string = "#FF0000FF", lineWidth: number = 0.2): void {
        if (!musicPage.PageNumber || musicPage.PageNumber > this.backends.length || musicPage.PageNumber < 1) {
            console.log("VexFlowMusicSheetDrawer.drawOverlayLine: invalid page number / music page number doesn't correspond to an existing backend.");
            return;
        }
        const musicPageIndex: number = musicPage.PageNumber - 1;
        const backendToUse: VexFlowBackend = this.backends[musicPageIndex];

        start = this.applyScreenTransformation(start);
        stop = this.applyScreenTransformation(stop);
        backendToUse.renderLine(start, stop, color, lineWidth * unitInPixels);
    }

    protected drawSkyLine(staffline: StaffLine): void {
        const startPosition: PointF2D = staffline.PositionAndShape.AbsolutePosition;
        const width: number = staffline.PositionAndShape.Size.width;
        this.drawSampledLine(staffline.SkyLine, startPosition, width);
    }

    protected drawBottomLine(staffline: StaffLine): void {
        const startPosition: PointF2D = new PointF2D(staffline.PositionAndShape.AbsolutePosition.x,
                                                     staffline.PositionAndShape.AbsolutePosition.y);
        const width: number = staffline.PositionAndShape.Size.width;
        this.drawSampledLine(staffline.BottomLine, startPosition, width, "#0000FFFF");
    }

    /**
     * Draw a line with a width and start point in a chosen color (used for skyline/bottom line debugging) from
     * a simple array
     * @param line numeric array. 0 marks the base line. Direction given by sign. Dimensions in units
     * @param startPosition Start position in units
     * @param width Max line width in units
     * @param color Color to paint in. Default is red
     */
    private drawSampledLine(line: number[], startPosition: PointF2D, width: number, color: string = "#FF0000FF"): void {
        const indices: number[] = [];
        let currentValue: number = 0;
        //Loops through bottom line, grabs all indices that don't equal the previously grabbed index
        //Starting with 0 (gets index of all line changes)
        for (let i: number = 0; i < line.length; i++) {
            if (line[i] !== currentValue) {
                indices.push(i);
                currentValue = line[i];
            }
        }

        const absolute: PointF2D = startPosition;
        if (indices.length > 0) {
            const samplingUnit: number = this.rules.SamplingUnit;

            let horizontalStart: PointF2D = new PointF2D(absolute.x, absolute.y);
            let horizontalEnd: PointF2D = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y);
            this.drawLine(horizontalStart, horizontalEnd, color);

            let verticalStart: PointF2D;
            let verticalEnd: PointF2D;

            if (line[0] >= 0) {
                verticalStart = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y);
                verticalEnd = new PointF2D(indices[0] / samplingUnit + absolute.x, absolute.y + line[indices[0]]);
                this.drawLine(verticalStart, verticalEnd, color);
            }

            for (let i: number = 1; i < indices.length; i++) {
                horizontalStart = new PointF2D(indices[i - 1] / samplingUnit + absolute.x, absolute.y + line[indices[i - 1]]);
                horizontalEnd = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + line[indices[i - 1]]);
                this.drawLine(horizontalStart, horizontalEnd, color);

                verticalStart = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + line[indices[i - 1]]);
                verticalEnd = new PointF2D(indices[i] / samplingUnit + absolute.x, absolute.y + line[indices[i]]);
                this.drawLine(verticalStart, verticalEnd, color);
            }

            if (indices[indices.length - 1] < line.length) {
                horizontalStart = new PointF2D(indices[indices.length - 1] / samplingUnit + absolute.x, absolute.y + line[indices[indices.length - 1]]);
                horizontalEnd = new PointF2D(absolute.x + width, absolute.y + line[indices[indices.length - 1]]);
                this.drawLine(horizontalStart, horizontalEnd, color);
            } else {
                horizontalStart = new PointF2D(indices[indices.length - 1] / samplingUnit + absolute.x, absolute.y);
                horizontalEnd = new PointF2D(absolute.x + width, absolute.y);
                this.drawLine(horizontalStart, horizontalEnd, color);
            }
        } else {
            // Flat line
            const start: PointF2D = new PointF2D(absolute.x, absolute.y);
            const end: PointF2D = new PointF2D(absolute.x + width, absolute.y);
            this.drawLine(start, end, color);
        }
    }



    private drawStaffEntry(staffEntry: GraphicalStaffEntry): void {
        // Draw ChordSymbols
        if (staffEntry.graphicalChordContainers !== undefined && staffEntry.graphicalChordContainers.length > 0) {
            for (const graphicalChordContainer of staffEntry.graphicalChordContainers) {
                this.drawLabel(graphicalChordContainer.GetGraphicalLabel, <number>GraphicalLayers.Notes);
            }
        }
        if (this.rules.RenderLyrics) {
            if (staffEntry.LyricsEntries.length > 0) {
                this.drawLyrics(staffEntry.LyricsEntries, <number>GraphicalLayers.Notes);
            }
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

    protected drawOctaveShifts(staffLine: StaffLine): void {
        for (const graphicalOctaveShift of staffLine.OctaveShifts) {
            if (graphicalOctaveShift) {
                const vexFlowOctaveShift: VexFlowOctaveShift = graphicalOctaveShift as VexFlowOctaveShift;
                const ctx: Vex.IRenderContext = this.backend.getContext();
                const textBracket: Vex.Flow.TextBracket = vexFlowOctaveShift.getTextBracket();
                textBracket.setContext(ctx);
                textBracket.draw();
            }
        }
    }

    protected drawExpressions(staffline: StaffLine): void {
        // Draw all Expressions
        for (const abstractGraphicalExpression of staffline.AbstractExpressions) {
            // Draw InstantaniousDynamics
            if (abstractGraphicalExpression instanceof GraphicalInstantaneousDynamicExpression) {
                this.drawInstantaneousDynamic((abstractGraphicalExpression as VexFlowInstantaneousDynamicExpression));
                // Draw InstantaniousTempo
            } else if (abstractGraphicalExpression instanceof GraphicalInstantaneousTempoExpression) {
                this.drawLabel((abstractGraphicalExpression as GraphicalInstantaneousTempoExpression).GraphicalLabel, GraphicalLayers.Notes);
                // Draw ContinuousDynamics
            } else if (abstractGraphicalExpression instanceof GraphicalContinuousDynamicExpression) {
                this.drawContinuousDynamic((abstractGraphicalExpression as VexFlowContinuousDynamicExpression));
                // Draw ContinuousTempo
                // } else if (abstractGraphicalExpression instanceof GraphicalContinuousTempoExpression) {
                //     this.drawLabel((abstractGraphicalExpression as GraphicalContinuousTempoExpression).GraphicalLabel, GraphicalLayers.Notes);
                // // Draw Mood
                // } else if (abstractGraphicalExpression instanceof GraphicalMoodExpression) {
                //     GraphicalMoodExpression; graphicalMood = (GraphicalMoodExpression); abstractGraphicalExpression;
                //     drawLabel(graphicalMood.GetGraphicalLabel, <number>GraphicalLayers.Notes);
            // Draw Unknown
            } else if (abstractGraphicalExpression instanceof GraphicalUnknownExpression) {
                this.drawLabel(abstractGraphicalExpression.Label, <number>GraphicalLayers.Notes);
            } else {
                log.warn("Unkown type of expression!");
            }
        }
    }

    protected drawInstantaneousDynamic(instantaneousDynamic: GraphicalInstantaneousDynamicExpression): void {
        this.drawLabel((instantaneousDynamic as VexFlowInstantaneousDynamicExpression).Label, <number>GraphicalLayers.Notes);
    }

    protected drawContinuousDynamic(graphicalExpression: VexFlowContinuousDynamicExpression): void {
        if (graphicalExpression.IsVerbal) {
            this.drawLabel(graphicalExpression.Label, <number>GraphicalLayers.Notes);
        } else {
            for (const line of graphicalExpression.Lines) {
                const start: PointF2D = new PointF2D(graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.x + line.Start.x,
                                                     graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.y + line.Start.y);
                const end: PointF2D = new PointF2D(graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.x + line.End.x,
                                                   graphicalExpression.ParentStaffLine.PositionAndShape.AbsolutePosition.y + line.End.y);
                this.drawLine(start, end, "black", line.Width);
            }
        }
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
        const { font, text } = graphicalLabel.Label;
        let color: string;
        if (this.rules.ColoringEnabled) {
            color = graphicalLabel.Label.colorDefault;
            if (!color) {
                color = this.rules.DefaultColorLabel;
            }
        }
        let { fontStyle, fontFamily } = graphicalLabel.Label;
        if (!fontStyle) {
            fontStyle = this.rules.DefaultFontStyle;
        }
        if (!fontFamily) {
            fontFamily = this.rules.DefaultFontFamily;
        }
        this.backend.renderText(height, fontStyle, font, text, heightInPixel, screenPosition, color, graphicalLabel.Label.fontFamily);
        // font currently unused, replaced by fontFamily
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

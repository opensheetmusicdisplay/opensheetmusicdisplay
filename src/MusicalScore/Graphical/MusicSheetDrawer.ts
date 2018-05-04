import {EngravingRules} from "./EngravingRules";
import {ITextMeasurer} from "../Interfaces/ITextMeasurer";
import {GraphicalMusicSheet} from "./GraphicalMusicSheet";
import {BoundingBox} from "./BoundingBox";
import {GraphicalLayers, OutlineAndFillStyleEnum} from "./DrawingEnums";
import {DrawingParameters} from "./DrawingParameters";
import {GraphicalLine} from "./GraphicalLine";
import {RectangleF2D} from "../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalRectangle} from "./GraphicalRectangle";
import {GraphicalLabel} from "./GraphicalLabel";
import {Label} from "../Label";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
import {ArgumentOutOfRangeException} from "../Exceptions";
import {SelectionStartSymbol} from "./SelectionStartSymbol";
import {SelectionEndSymbol} from "./SelectionEndSymbol";
import {MusicSystem} from "./MusicSystem";
import {StaffMeasure} from "./StaffMeasure";
import {StaffLine} from "./StaffLine";
import {SystemLine} from "./SystemLine";
import {MusicSymbol} from "./MusicSymbol";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {Instrument} from "../Instrument";
import {MusicSymbolDrawingStyle, PhonicScoreModes} from "./DrawingMode";
import {GraphicalOctaveShift} from "./GraphicalOctaveShift";
import {GraphicalObject} from "./GraphicalObject";

/**
 * Draw a [[GraphicalMusicSheet]] (through the .drawSheet method)
 *
 * The drawing is implemented with a top-down approach, starting from a music sheet, going through pages, systems, staffs...
 * ... and ending in notes, beams, accidentals and other symbols.
 * It's worth to say, that this class just draws the symbols and graphical elements, using the positions that have been computed before.
 * But in any case, some of these previous positioning algorithms need the sizes of the concrete symbols (NoteHeads, sharps, flats, keys...).
 * Therefore, there are some static functions on the 'Bounding Boxes' section used to compute these symbol boxes at the
 * beginning for the later use in positioning algorithms.
 *
 * This class also includes the resizing and positioning of the symbols due to user interaction like zooming or panning.
 */
export abstract class MusicSheetDrawer {
    public drawingParameters: DrawingParameters = new DrawingParameters();
    public splitScreenLineColor: number;
    public midiPlaybackAvailable: boolean;

    protected rules: EngravingRules;
    protected graphicalMusicSheet: GraphicalMusicSheet;
    protected textMeasurer: ITextMeasurer;
    private phonicScoreMode: PhonicScoreModes = PhonicScoreModes.Manual;

    constructor(textMeasurer: ITextMeasurer,
                isPreviewImageDrawer: boolean = false) {
        this.textMeasurer = textMeasurer;
        this.splitScreenLineColor = -1;
        if (isPreviewImageDrawer) {
            this.drawingParameters.setForThumbmail();
        } else {
            this.drawingParameters.setForAllOn();
        }
    }

    public set Mode(value: PhonicScoreModes) {
        this.phonicScoreMode = value;
    }

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = graphicalMusicSheet.ParentMusicSheet.Rules;
        this.drawSplitScreenLine();
        if (this.drawingParameters.drawCursors) {
            for (const line of graphicalMusicSheet.Cursors) {
                const psi: BoundingBox = new BoundingBox(line);
                psi.AbsolutePosition = line.Start;
                psi.BorderBottom = line.End.y - line.Start.y;
                psi.BorderRight = line.Width / 2.0;
                psi.BorderLeft = -line.Width / 2.0;
                if (this.isVisible(psi)) {
                    this.drawLineAsVerticalRectangle(line, <number>GraphicalLayers.Cursor);
                }
            }
        }
        // Draw the vertical ScrollIndicator
        if (this.drawingParameters.drawScrollIndicator) {
            this.drawScrollIndicator();
        }
        // Draw all the pages
        for (const page of this.graphicalMusicSheet.MusicPages) {
            this.drawPage(page);
        }
    }

    public drawLineAsHorizontalRectangle(line: GraphicalLine, layer: number): void {
        let rectangle: RectangleF2D = new RectangleF2D(line.Start.x, line.End.y - line.Width / 2, line.End.x - line.Start.x, line.Width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawLineAsVerticalRectangle(line: GraphicalLine, layer: number): void {
        const lineStart: PointF2D = line.Start;
        const lineWidth: number = line.Width;
        let rectangle: RectangleF2D = new RectangleF2D(lineStart.x - lineWidth / 2, lineStart.y, lineWidth, line.End.y - lineStart.y);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawLineAsHorizontalRectangleWithOffset(line: GraphicalLine, offset: PointF2D, layer: number): void {
        const start: PointF2D = new PointF2D(line.Start.x + offset.x, line.Start.y + offset.y);
        const end: PointF2D = new PointF2D(line.End.x + offset.x, line.End.y + offset.y);
        const width: number = line.Width;
        let rectangle: RectangleF2D = new RectangleF2D(start.x, end.y - width / 2, end.x - start.x, width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawLineAsVerticalRectangleWithOffset(line: GraphicalLine, offset: PointF2D, layer: number): void {
        const start: PointF2D = new PointF2D(line.Start.x + offset.x, line.Start.y + offset.y);
        const end: PointF2D = new PointF2D(line.End.x + offset.x, line.End.y + offset.y);
        const width: number = line.Width;
        let rectangle: RectangleF2D = new RectangleF2D(start.x, start.y, width, end.y - start.y);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawRectangle(rect: GraphicalRectangle, layer: number): void {
        const psi: BoundingBox = rect.PositionAndShape;
        let rectangle: RectangleF2D = new RectangleF2D(psi.AbsolutePosition.x, psi.AbsolutePosition.y, psi.BorderRight, psi.BorderBottom);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, <number>rect.style);
    }

    public calculatePixelDistance(unitDistance: number): number {
        throw new Error("not implemented");
    }

    public drawLabel(graphicalLabel: GraphicalLabel, layer: number): void {
        if (!this.isVisible(graphicalLabel.PositionAndShape)) {
            return;
        }
        const label: Label = graphicalLabel.Label;
        if (label.text.trim() === "") {
            return;
        }
        const screenPosition: PointF2D = this.applyScreenTransformation(graphicalLabel.PositionAndShape.AbsolutePosition);
        const heightInPixel: number = this.calculatePixelDistance(label.fontHeight);
        const widthInPixel: number = heightInPixel * this.textMeasurer.computeTextWidthToHeightRatio(label.text, label.font, label.fontStyle);
        const bitmapWidth: number = <number>Math.ceil(widthInPixel);
        const bitmapHeight: number = <number>Math.ceil(heightInPixel * 1.2);
        switch (label.textAlignment) {
            case TextAlignment.LeftTop:
                break;
            case TextAlignment.LeftCenter:
                screenPosition.y -= <number>bitmapHeight / 2;
                break;
            case TextAlignment.LeftBottom:
                screenPosition.y -= bitmapHeight;
                break;
            case TextAlignment.CenterTop:
                screenPosition.x -= <number>bitmapWidth / 2;
                break;
            case TextAlignment.CenterCenter:
                screenPosition.x -= <number>bitmapWidth / 2;
                screenPosition.y -= <number>bitmapHeight / 2;
                break;
            case TextAlignment.CenterBottom:
                screenPosition.x -= <number>bitmapWidth / 2;
                screenPosition.y -= bitmapHeight;
                break;
            case TextAlignment.RightTop:
                screenPosition.x -= bitmapWidth;
                break;
            case TextAlignment.RightCenter:
                screenPosition.x -= bitmapWidth;
                screenPosition.y -= <number>bitmapHeight / 2;
                break;
            case TextAlignment.RightBottom:
                screenPosition.x -= bitmapWidth;
                screenPosition.y -= bitmapHeight;
                break;
            default:
                throw new ArgumentOutOfRangeException("");
        }
        this.renderLabel(graphicalLabel, layer, bitmapWidth, bitmapHeight, heightInPixel, screenPosition);
    }

    protected applyScreenTransformation(point: PointF2D): PointF2D {
        throw new Error("not implemented");
    }

    protected applyScreenTransformations(points: PointF2D[]): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (const point of points) {
            transformedPoints.push(this.applyScreenTransformation(point));
        }
        return transformedPoints;
    }

    protected applyScreenTransformationForRect(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }

    protected drawSplitScreenLine(): void {
        // empty
    }

    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number, alpha: number = 1): void {
        throw new Error("not implemented");
    }

    protected drawScrollIndicator(): void {
        // empty
    }

    protected drawSelectionStartSymbol(symbol: SelectionStartSymbol): void {
        // empty
    }

    protected drawSelectionEndSymbol(symbol: SelectionEndSymbol): void {
        // empty
    }

    protected renderLabel(graphicalLabel: GraphicalLabel, layer: number, bitmapWidth: number,
                          bitmapHeight: number, heightInPixel: number, screenPosition: PointF2D): void {
        throw new Error("not implemented");
    }

    protected renderSystemToScreen(system: MusicSystem, systemBoundingBoxInPixels: RectangleF2D,
                                   absBoundingRectWithMargin: RectangleF2D): void {
        // empty
    }

    protected drawMeasure(measure: StaffMeasure): void {
        throw new Error("not implemented");
    }

    protected drawSkyLine(staffLine: StaffLine): void {
        // empty
    }

    protected drawBottomLine(staffLine: StaffLine): void {
        // empty
    }

    protected drawInstrumentBrace(brace: GraphicalObject, system: MusicSystem): void {
        // empty
    }

    protected drawGroupBracket(bracket: GraphicalObject, system: MusicSystem): void {
        // empty
    }

    protected isVisible(psi: BoundingBox): boolean {
        return true;
    }

    protected drawMusicSystem(system: MusicSystem): void {
        const absBoundingRectWithMargin: RectangleF2D = this.getSystemAbsBoundingRect(system);
        const systemBoundingBoxInPixels: RectangleF2D = this.getSytemBoundingBoxInPixels(absBoundingRectWithMargin);
        this.drawMusicSystemComponents(system, systemBoundingBoxInPixels, absBoundingRectWithMargin);
    }

    protected getSytemBoundingBoxInPixels(absBoundingRectWithMargin: RectangleF2D): RectangleF2D {
        const systemBoundingBoxInPixels: RectangleF2D = this.applyScreenTransformationForRect(absBoundingRectWithMargin);
        systemBoundingBoxInPixels.x = Math.round(systemBoundingBoxInPixels.x);
        systemBoundingBoxInPixels.y = Math.round(systemBoundingBoxInPixels.y);
        return systemBoundingBoxInPixels;
    }

    protected getSystemAbsBoundingRect(system: MusicSystem): RectangleF2D {
        const relBoundingRect: RectangleF2D = system.PositionAndShape.BoundingRectangle;
        const absBoundingRectWithMargin: RectangleF2D = new RectangleF2D(
            system.PositionAndShape.AbsolutePosition.x + system.PositionAndShape.BorderLeft - 1,
            system.PositionAndShape.AbsolutePosition.y + system.PositionAndShape.BorderTop - 1,
            (relBoundingRect.width + 6), (relBoundingRect.height + 2)
        );
        return absBoundingRectWithMargin;
    }

    protected drawMusicSystemComponents(musicSystem: MusicSystem, systemBoundingBoxInPixels: RectangleF2D,
                                        absBoundingRectWithMargin: RectangleF2D): void {
        const selectStartSymb: SelectionStartSymbol = this.graphicalMusicSheet.SelectionStartSymbol;
        const selectEndSymb: SelectionEndSymbol = this.graphicalMusicSheet.SelectionEndSymbol;
        if (this.drawingParameters.drawSelectionStartSymbol) {
            if (selectStartSymb !== undefined && this.isVisible(selectStartSymb.PositionAndShape)) {
                this.drawSelectionStartSymbol(selectStartSymb);
            }
        }
        if (this.drawingParameters.drawSelectionEndSymbol) {
            if (selectEndSymb !== undefined && this.isVisible(selectEndSymb.PositionAndShape)) {
                this.drawSelectionEndSymbol(selectEndSymb);
            }
        }
        for (const staffLine of musicSystem.StaffLines) {
            this.drawStaffLine(staffLine);
        }
        for (const systemLine of musicSystem.SystemLines) {
            this.drawSystemLineObject(systemLine);
        }
        if (musicSystem === musicSystem.Parent.MusicSystems[0] && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
            for (const label of musicSystem.Labels) {
                this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }
        for (const bracket of musicSystem.InstrumentBrackets) {
            this.drawInstrumentBrace(bracket, musicSystem);
        }
        for (const bracket of musicSystem.GroupBrackets) {
            this.drawGroupBracket(bracket, musicSystem);
        }
        if (!this.leadSheet) {
            for (const measureNumberLabel of musicSystem.MeasureNumberLabels) {
                this.drawLabel(measureNumberLabel, <number>GraphicalLayers.Notes);
            }
        }
        for (const staffLine of musicSystem.StaffLines) {
            this.drawStaffLineSymbols(staffLine);
        }
        if (this.drawingParameters.drawMarkedAreas) {
            this.drawMarkedAreas(musicSystem);
        }
        if (this.drawingParameters.drawComments) {
            this.drawComment(musicSystem);
        }
    }

    protected activateSystemRendering(systemId: number, absBoundingRect: RectangleF2D,
                                      systemBoundingBoxInPixels: RectangleF2D, createNewImage: boolean): boolean {
        return true;
    }

    protected drawSystemLineObject(systemLine: SystemLine): void {
        // empty
    }

    protected drawStaffLine(staffLine: StaffLine): void {
        for (const measure of staffLine.Measures) {
            this.drawMeasure(measure);
        }

        if (staffLine.LyricsDashes.length > 0) {
            this.drawDashes(staffLine.LyricsDashes);
        }
    }

    /**
     * Draw all dashes to the canvas
     * @param lyricsDashes Array of lyric dashes to be drawn
     * @param layer Number of the layer that the lyrics should be drawn in
     */
    protected drawDashes(lyricsDashes: GraphicalLabel[]): void {
        lyricsDashes.forEach(dash => this.drawLabel(dash, <number>GraphicalLayers.Notes));
    }

    // protected drawSlur(slur: GraphicalSlur, abs: PointF2D): void {
    //
    // }

    protected drawOctaveShift(staffLine: StaffLine, graphicalOctaveShift: GraphicalOctaveShift): void {
        this.drawSymbol(graphicalOctaveShift.octaveSymbol, MusicSymbolDrawingStyle.Normal, graphicalOctaveShift.PositionAndShape.AbsolutePosition);
        const absolutePos: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
        if (graphicalOctaveShift.dashesStart.x < graphicalOctaveShift.dashesEnd.x) {
            const horizontalLine: GraphicalLine = new GraphicalLine(graphicalOctaveShift.dashesStart, graphicalOctaveShift.dashesEnd,
                                                                    this.rules.OctaveShiftLineWidth);
            this.drawLineAsHorizontalRectangleWithOffset(horizontalLine, absolutePos, <number>GraphicalLayers.Notes);
        }
        if (!graphicalOctaveShift.endsOnDifferentStaffLine || graphicalOctaveShift.isSecondPart) {
            let verticalLine: GraphicalLine;
            const dashEnd: PointF2D = graphicalOctaveShift.dashesEnd;
            const octShiftVertLineLength: number = this.rules.OctaveShiftVerticalLineLength;
            const octShiftLineWidth: number = this.rules.OctaveShiftLineWidth;
            if (graphicalOctaveShift.octaveSymbol === MusicSymbol.VA8 || graphicalOctaveShift.octaveSymbol === MusicSymbol.MA15) {
                verticalLine = new GraphicalLine(dashEnd, new PointF2D(dashEnd.x, dashEnd.y + octShiftVertLineLength), octShiftLineWidth);
            } else {
                verticalLine = new GraphicalLine(new PointF2D(dashEnd.x, dashEnd.y - octShiftVertLineLength), dashEnd, octShiftLineWidth);
            }
            this.drawLineAsVerticalRectangleWithOffset(verticalLine, absolutePos, <number>GraphicalLayers.Notes);
        }
    }

    protected drawStaffLines(staffLine: StaffLine): void {
        if (staffLine.StaffLines !== undefined) {
            const position: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
            for (let i: number = 0; i < 5; i++) {
                this.drawLineAsHorizontalRectangleWithOffset(staffLine.StaffLines[i], position, <number>GraphicalLayers.Notes);
            }
        }
    }

    // protected drawEnding(ending: GraphicalRepetitionEnding, absolutePosition: PointF2D): void {
    //     if (undefined !== ending.Left)
    //         drawLineAsVerticalRectangle(ending.Left, absolutePosition, <number>GraphicalLayers.Notes);
    //     this.drawLineAsHorizontalRectangle(ending.Top, absolutePosition, <number>GraphicalLayers.Notes);
    //     if (undefined !== ending.Right)
    //         drawLineAsVerticalRectangle(ending.Right, absolutePosition, <number>GraphicalLayers.Notes);
    //     this.drawLabel(ending.Label, <number>GraphicalLayers.Notes);
    // }
    // protected drawInstantaniousDynamic(expression: GraphicalInstantaniousDynamicExpression): void {
    //     expression.ExpressionSymbols.forEach(function (expressionSymbol) {
    //         let position: PointF2D = expressionSymbol.PositionAndShape.AbsolutePosition;
    //         let symbol: MusicSymbol = expressionSymbol.GetSymbol;
    //         drawSymbol(symbol, MusicSymbolDrawingStyle.Normal, position);
    //     });
    // }
    // protected drawContinuousDynamic(expression: GraphicalContinuousDynamicExpression,
    //     absolute: PointF2D): void {
    //     throw new Error("not implemented");
    // }
    protected drawSymbol(symbol: MusicSymbol, symbolStyle: MusicSymbolDrawingStyle, position: PointF2D,
                         scalingFactor: number = 1, layer: number = <number>GraphicalLayers.Notes): void {
        //empty
    }

    protected get leadSheet(): boolean {
        return this.graphicalMusicSheet.LeadSheet;
    }

    protected set leadSheet(value: boolean) {
        this.graphicalMusicSheet.LeadSheet = value;
    }

    private drawPage(page: GraphicalMusicPage): void {
        if (!this.isVisible(page.PositionAndShape)) {
            return;
        }

        for (const system of page.MusicSystems) {
            if (this.isVisible(system.PositionAndShape)) {
                this.drawMusicSystem(system);
            }
        }
        if (page === page.Parent.MusicPages[0]) {
            for (const label of page.Labels) {
                this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }
        // Draw bounding boxes for debug purposes. This has to be at the end because only
        // then all the calculations and recalculations are done
        if (process.env.DRAW_BOUNDING_BOX_ELEMENT) {
            this.drawBoundingBoxes(page.PositionAndShape, 0, process.env.DRAW_BOUNDING_BOX_ELEMENT);
        }

    }

    /**
     * Draw bounding boxes aroung GraphicalObjects
     * @param startBox Bounding Box that is used as a staring point to recursively go through all child elements
     * @param layer Layer to draw to
     * @param type Type of element to show bounding boxes for as string.
     */
    private drawBoundingBoxes(startBox: BoundingBox, layer: number = 0, type: string = "all"): void {
        const dataObjectString: string = (startBox.DataObject.constructor as any).name;
        if (startBox.BoundingRectangle !== undefined && (dataObjectString === type || type === "all")) {
            const relBoundingRect: RectangleF2D = startBox.BoundingRectangle;
            let tmpRect: RectangleF2D = new RectangleF2D(startBox.AbsolutePosition.x + startBox.BorderLeft,
                                                         startBox.AbsolutePosition.y + startBox.BorderTop ,
                                                         (relBoundingRect.width + 0), (relBoundingRect.height + 0));
            tmpRect = this.applyScreenTransformationForRect(tmpRect);
            this.renderRectangle(tmpRect, <number>GraphicalLayers.Background, layer, 0.5);
            this.renderLabel(new GraphicalLabel(new Label(dataObjectString), 1.2, TextAlignment.CenterCenter),
                             layer, tmpRect.width, tmpRect.height, tmpRect.height, new PointF2D(tmpRect.x, tmpRect.y + 12));
        }
        layer++;
        startBox.ChildElements.forEach(bb => this.drawBoundingBoxes(bb, layer, type));
    }

    private drawMarkedAreas(system: MusicSystem): void {
        for (const markedArea of system.GraphicalMarkedAreas) {
            if (markedArea !== undefined) {
                if (markedArea.systemRectangle !== undefined) {
                    this.drawRectangle(markedArea.systemRectangle, <number>GraphicalLayers.Background);
                }
                if (markedArea.settings !== undefined) {
                    this.drawLabel(markedArea.settings, <number>GraphicalLayers.Comment);
                }
                if (markedArea.labelRectangle !== undefined) {
                    this.drawRectangle(markedArea.labelRectangle, <number>GraphicalLayers.Background);
                }
                if (markedArea.label !== undefined) {
                    this.drawLabel(markedArea.label, <number>GraphicalLayers.Comment);
                }
            }
        }
    }

    private drawComment(system: MusicSystem): void {
        for (const comment of system.GraphicalComments) {
            if (comment !== undefined) {
                if (comment.settings !== undefined) {
                    this.drawLabel(comment.settings, <number>GraphicalLayers.Comment);
                }
                if (comment.label !== undefined) {
                    this.drawLabel(comment.label, <number>GraphicalLayers.Comment);
                }
            }
        }
    }

    private drawStaffLineSymbols(staffLine: StaffLine): void {
        const parentInst: Instrument = staffLine.ParentStaff.ParentInstrument;
        const absX: number = staffLine.PositionAndShape.AbsolutePosition.x;
        const absY: number = staffLine.PositionAndShape.AbsolutePosition.y + 2;
        const borderRight: number = staffLine.PositionAndShape.BorderRight;
        if (parentInst.highlight && this.drawingParameters.drawHighlights) {
            this.drawLineAsHorizontalRectangle(
                new GraphicalLine(
                    new PointF2D(absX, absY),
                    new PointF2D(absX + borderRight, absY),
                    4,
                    OutlineAndFillStyleEnum.Highlighted
                ),
                <number>GraphicalLayers.Highlight
            );
        }
        let style: MusicSymbolDrawingStyle = MusicSymbolDrawingStyle.Disabled;
        let symbol: MusicSymbol = MusicSymbol.PLAY;
        let drawSymbols: boolean = this.drawingParameters.drawActivitySymbols;
        switch (this.phonicScoreMode) {
            case PhonicScoreModes.Midi:
                symbol = MusicSymbol.PLAY;
                if (this.midiPlaybackAvailable && staffLine.ParentStaff.audible) {
                    style = MusicSymbolDrawingStyle.PlaybackSymbols;
                }
                break;
            case PhonicScoreModes.Following:
                symbol = MusicSymbol.MIC;
                if (staffLine.ParentStaff.following) {
                    style = MusicSymbolDrawingStyle.FollowSymbols;
                }
                break;
            default:
                drawSymbols = false;
                break;
        }
        if (drawSymbols) {
            const p: PointF2D = new PointF2D(absX + borderRight + 2, absY);
            this.drawSymbol(symbol, style, p);
        }
        if (this.drawingParameters.drawErrors) {
            for (const measure of staffLine.Measures) {
                const measurePSI: BoundingBox = measure.PositionAndShape;
                const absXPSI: number = measurePSI.AbsolutePosition.x;
                const absYPSI: number = measurePSI.AbsolutePosition.y + 2;
                if (measure.hasError && this.graphicalMusicSheet.ParentMusicSheet.DrawErroneousMeasures) {
                    this.drawLineAsHorizontalRectangle(
                        new GraphicalLine(
                            new PointF2D(absXPSI, absYPSI),
                            new PointF2D(absXPSI + measurePSI.BorderRight, absYPSI),
                            4,
                            OutlineAndFillStyleEnum.ErrorUnderlay
                        ),
                        <number>GraphicalLayers.MeasureError
                    );
                }
            }
        }
    }
}

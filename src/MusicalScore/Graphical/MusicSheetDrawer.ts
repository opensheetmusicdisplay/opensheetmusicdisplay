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
            for (let line of graphicalMusicSheet.Cursors) {
                let psi: BoundingBox = new BoundingBox(line);
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
        for (let page of this.graphicalMusicSheet.MusicPages) {
            this.drawPage(page);
        }
    }

    public drawLineAsHorizontalRectangle(line: GraphicalLine, layer: number): void {
        let rectangle: RectangleF2D = new RectangleF2D(line.Start.x, line.End.y - line.Width / 2, line.End.x - line.Start.x, line.Width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawLineAsVerticalRectangle(line: GraphicalLine, layer: number): void {
        let lineStart: PointF2D = line.Start;
        let lineWidth: number = line.Width;
        let rectangle: RectangleF2D = new RectangleF2D(lineStart.x - lineWidth / 2, lineStart.y, lineWidth, line.End.y - lineStart.y);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawLineAsHorizontalRectangleWithOffset(line: GraphicalLine, offset: PointF2D, layer: number): void {
        let start: PointF2D = new PointF2D(line.Start.x + offset.x, line.Start.y + offset.y);
        let end: PointF2D = new PointF2D(line.End.x + offset.x, line.End.y + offset.y);
        let width: number = line.Width;
        let rectangle: RectangleF2D = new RectangleF2D(start.x, end.y - width / 2, end.x - start.x, width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawLineAsVerticalRectangleWithOffset(line: GraphicalLine, offset: PointF2D, layer: number): void {
        let start: PointF2D = new PointF2D(line.Start.x + offset.x, line.Start.y + offset.y);
        let end: PointF2D = new PointF2D(line.End.x + offset.x, line.End.y + offset.y);
        let width: number = line.Width;
        let rectangle: RectangleF2D = new RectangleF2D(start.x, start.y, width, end.y - start.y);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    }

    public drawRectangle(rect: GraphicalRectangle, layer: number): void {
        let psi: BoundingBox = rect.PositionAndShape;
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
        let label: Label = graphicalLabel.Label;
        if (label.text.trim() === "") {
            return;
        }
        let screenPosition: PointF2D = this.applyScreenTransformation(graphicalLabel.PositionAndShape.AbsolutePosition);
        let heightInPixel: number = this.calculatePixelDistance(label.fontHeight);
        let widthInPixel: number = heightInPixel * this.textMeasurer.computeTextWidthToHeightRatio(label.text, label.font, label.fontStyle);
        let bitmapWidth: number = <number>Math.ceil(widthInPixel);
        let bitmapHeight: number = <number>Math.ceil(heightInPixel * 1.2);
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
        let transformedPoints: PointF2D[] = [];
        for (let point of points) {
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

    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number): void {
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

    protected drawInstrumentBracket(bracket: GraphicalObject, system: MusicSystem): void {
        // empty
    }

    protected drawGroupBracket(bracket: GraphicalObject, system: MusicSystem): void {
        // empty
    }

    protected isVisible(psi: BoundingBox): boolean {
        return true;
    }

    protected drawMusicSystem(system: MusicSystem): void {
        let absBoundingRectWithMargin: RectangleF2D = this.getSystemAbsBoundingRect(system);
        let systemBoundingBoxInPixels: RectangleF2D = this.getSytemBoundingBoxInPixels(absBoundingRectWithMargin);
        this.drawMusicSystemComponents(system, systemBoundingBoxInPixels, absBoundingRectWithMargin);
    }

    protected getSytemBoundingBoxInPixels(absBoundingRectWithMargin: RectangleF2D): RectangleF2D {
        let systemBoundingBoxInPixels: RectangleF2D = this.applyScreenTransformationForRect(absBoundingRectWithMargin);
        systemBoundingBoxInPixels.x = Math.round(systemBoundingBoxInPixels.x);
        systemBoundingBoxInPixels.y = Math.round(systemBoundingBoxInPixels.y);
        return systemBoundingBoxInPixels;
    }

    protected getSystemAbsBoundingRect(system: MusicSystem): RectangleF2D {
        let relBoundingRect: RectangleF2D = system.PositionAndShape.BoundingRectangle;
        let absBoundingRectWithMargin: RectangleF2D = new RectangleF2D(
            system.PositionAndShape.AbsolutePosition.x + system.PositionAndShape.BorderLeft - 1,
            system.PositionAndShape.AbsolutePosition.y + system.PositionAndShape.BorderTop - 1,
            (relBoundingRect.width + 6), (relBoundingRect.height + 2)
        );
        return absBoundingRectWithMargin;
    }

    protected drawMusicSystemComponents(musicSystem: MusicSystem, systemBoundingBoxInPixels: RectangleF2D,
                                        absBoundingRectWithMargin: RectangleF2D): void {
        let selectStartSymb: SelectionStartSymbol = this.graphicalMusicSheet.SelectionStartSymbol;
        let selectEndSymb: SelectionEndSymbol = this.graphicalMusicSheet.SelectionEndSymbol;
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
        for (let staffLine of musicSystem.StaffLines) {
            this.drawStaffLine(staffLine);
        }
        for (let systemLine of musicSystem.SystemLines) {
            this.drawSystemLineObject(systemLine);
        }
        if (musicSystem === musicSystem.Parent.MusicSystems[0] && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
            for (let label of musicSystem.Labels) {
                this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }
        for (let bracket of musicSystem.InstrumentBrackets) {
            this.drawInstrumentBracket(bracket, musicSystem);
        }
        for (let bracket of musicSystem.GroupBrackets) {
            this.drawGroupBracket(bracket, musicSystem);
        }
        if (!this.leadSheet) {
            for (let measureNumberLabel of musicSystem.MeasureNumberLabels) {
                this.drawLabel(measureNumberLabel, <number>GraphicalLayers.Notes);
            }
        }
        for (let staffLine of musicSystem.StaffLines) {
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
        for (let measure of staffLine.Measures) {
            this.drawMeasure(measure);
        }
    }

    // protected drawSlur(slur: GraphicalSlur, abs: PointF2D): void {
    //
    // }

    protected drawOctaveShift(staffLine: StaffLine, graphicalOctaveShift: GraphicalOctaveShift): void {
        this.drawSymbol(graphicalOctaveShift.octaveSymbol, MusicSymbolDrawingStyle.Normal, graphicalOctaveShift.PositionAndShape.AbsolutePosition);
        let absolutePos: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
        if (graphicalOctaveShift.dashesStart.x < graphicalOctaveShift.dashesEnd.x) {
            let horizontalLine: GraphicalLine = new GraphicalLine(graphicalOctaveShift.dashesStart, graphicalOctaveShift.dashesEnd,
                                                                  this.rules.OctaveShiftLineWidth);
            this.drawLineAsHorizontalRectangleWithOffset(horizontalLine, absolutePos, <number>GraphicalLayers.Notes);
        }
        if (!graphicalOctaveShift.endsOnDifferentStaffLine || graphicalOctaveShift.isSecondPart) {
            let verticalLine: GraphicalLine;
            let dashEnd: PointF2D = graphicalOctaveShift.dashesEnd;
            let octShiftVertLineLength: number = this.rules.OctaveShiftVerticalLineLength;
            let octShiftLineWidth: number = this.rules.OctaveShiftLineWidth;
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
            let position: PointF2D = staffLine.PositionAndShape.AbsolutePosition;
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
        for (let system of page.MusicSystems) {
            if (this.isVisible(system.PositionAndShape)) {
                this.drawMusicSystem(system);
            }
        }
        if (page === page.Parent.MusicPages[0]) {
            for (let label of page.Labels) {
                this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }
    }

    private drawMarkedAreas(system: MusicSystem): void {
        for (let markedArea of system.GraphicalMarkedAreas) {
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
        for (let comment of system.GraphicalComments) {
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
        let parentInst: Instrument = staffLine.ParentStaff.ParentInstrument;
        let absX: number = staffLine.PositionAndShape.AbsolutePosition.x;
        let absY: number = staffLine.PositionAndShape.AbsolutePosition.y + 2;
        let borderRight: number = staffLine.PositionAndShape.BorderRight;
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
            let p: PointF2D = new PointF2D(absX + borderRight + 2, absY);
            this.drawSymbol(symbol, style, p);
        }
        if (this.drawingParameters.drawErrors) {
            for (let measure of staffLine.Measures) {
                let measurePSI: BoundingBox = measure.PositionAndShape;
                let absXPSI: number = measurePSI.AbsolutePosition.x;
                let absYPSI: number = measurePSI.AbsolutePosition.y + 2;
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

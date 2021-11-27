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
import {TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import {ArgumentOutOfRangeException} from "../Exceptions";
import {SelectionStartSymbol} from "./SelectionStartSymbol";
import {SelectionEndSymbol} from "./SelectionEndSymbol";
import {MusicSystem} from "./MusicSystem";
import {GraphicalMeasure} from "./GraphicalMeasure";
import {StaffLine} from "./StaffLine";
import {SystemLine} from "./SystemLine";
import {MusicSymbol} from "./MusicSymbol";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {Instrument} from "../Instrument";
import {MusicSymbolDrawingStyle, PhonicScoreModes} from "./DrawingMode";
import {GraphicalObject} from "./GraphicalObject";
import { GraphicalInstantaneousDynamicExpression } from "./GraphicalInstantaneousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "./GraphicalContinuousDynamicExpression";
// eslint-disable-next-line
import { VexFlowContinuousDynamicExpression, VexFlowGraphicalNote, VexFlowInstrumentBracket, VexFlowMeasure, VexFlowStaffEntry, VexFlowStaffLine, VexFlowVoiceEntry } from "./VexFlow";
import { StaffLineActivitySymbol } from "./StaffLineActivitySymbol";
// import { FontStyles } from "../../Common/Enums/FontStyles";

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
    public drawingParameters: DrawingParameters;
    public splitScreenLineColor: number;
    public midiPlaybackAvailable: boolean;
    public drawableBoundingBoxElement: string = "None"; // process.env.DRAW_BOUNDING_BOX_ELEMENT;

    public skyLineVisible: boolean = false;
    public bottomLineVisible: boolean = false;

    protected rules: EngravingRules;
    protected graphicalMusicSheet: GraphicalMusicSheet;
    protected textMeasurer: ITextMeasurer;
    private phonicScoreMode: PhonicScoreModes = PhonicScoreModes.Manual;

    constructor(textMeasurer: ITextMeasurer,
                drawingParameters: DrawingParameters) {
        this.textMeasurer = textMeasurer;
        this.splitScreenLineColor = -1;
        this.drawingParameters = drawingParameters;
        this.rules = drawingParameters.Rules;
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
                if (!line) {
                    // TODO GraphicalMusicSheet.calculateCursorLineAtTimestamp() can return undefined.
                    // why does this happen in the VexFlowMusicSheetDrawer_Test? (it("draws cursor..."))
                    continue;
                }
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
        // Draw the pages
        const pagesToDraw: number = Math.min(this.graphicalMusicSheet.MusicPages.length, this.rules.MaxPageToDrawNumber);
        for (let i: number = 0; i < pagesToDraw; i ++) {
            const page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[i];
            this.drawPage(page);
        }
    }

    public drawLineAsHorizontalRectangle(line: GraphicalLine, layer: number): void {
        let rectangle: RectangleF2D = new RectangleF2D(line.Start.x, line.End.y - line.Width / 2, line.End.x - line.Start.x, line.Width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId, line.colorHex);
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

    public drawLabel(graphicalLabel: GraphicalLabel, layer: number): Node {
        if (!this.isVisible(graphicalLabel.PositionAndShape)) {
            return undefined;
        }
        const label: Label = graphicalLabel.Label;
        if (label.text.trim() === "") {
            return undefined;
        }
        const screenPosition: PointF2D = this.applyScreenTransformation(graphicalLabel.PositionAndShape.AbsolutePosition);
        const fontHeightInPixel: number = this.calculatePixelDistance(label.fontHeight);
        const widthInPixel: number = this.calculatePixelDistance(graphicalLabel.PositionAndShape.Size.width);
        const bitmapWidth: number = Math.ceil(widthInPixel);
        const bitmapHeight: number = Math.ceil(fontHeightInPixel * (0.2 + graphicalLabel.TextLines.length));

        switch (label.textAlignment) {
            // Adjust the OSMD-calculated positions to rendering coordinates
            // These have to match the Border settings in GraphicalLabel.setLabelPositionAndShapeBorders()
            // TODO isn't this a Vexflow-specific transformation that should be in VexflowMusicSheetDrawer?
            case TextAlignmentEnum.LeftTop:
                break;
            case TextAlignmentEnum.LeftCenter:
                screenPosition.y -= bitmapHeight / 2;
                break;
            case TextAlignmentEnum.LeftBottom:
                screenPosition.y -= bitmapHeight;
                break;
            case TextAlignmentEnum.CenterTop:
                screenPosition.x -= bitmapWidth / 2;
                break;
            case TextAlignmentEnum.CenterCenter:
                screenPosition.x -= bitmapWidth / 2;
                screenPosition.y -= bitmapHeight / 2;
                break;
            case TextAlignmentEnum.CenterBottom:
                screenPosition.x -= bitmapWidth / 2;
                screenPosition.y -= bitmapHeight;
                break;
            case TextAlignmentEnum.RightTop:
                screenPosition.x -= bitmapWidth;
                break;
            case TextAlignmentEnum.RightCenter:
                screenPosition.x -= bitmapWidth;
                screenPosition.y -= bitmapHeight / 2;
                break;
            case TextAlignmentEnum.RightBottom:
                screenPosition.x -= bitmapWidth;
                screenPosition.y -= bitmapHeight;
                break;
            default:
                throw new ArgumentOutOfRangeException("");
        }

        return this.renderLabel(graphicalLabel, layer, bitmapWidth, bitmapHeight, fontHeightInPixel, screenPosition);
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

    protected renderRectangle(rectangle: RectangleF2D, layer: number, styleId: number, colorHex: string = undefined, alpha: number = 1): Node {
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
                          bitmapHeight: number, heightInPixel: number, screenPosition: PointF2D): Node {
        throw new Error("not implemented");
    }

    protected renderSystemToScreen(system: MusicSystem, systemBoundingBoxInPixels: RectangleF2D,
                                   absBoundingRectWithMargin: RectangleF2D): void {
        // empty
    }

    protected drawMeasure(measure: GraphicalMeasure): void {
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

            if (this.rules.RenderLyrics) {
                // draw lyric dashes
                if (staffLine.LyricsDashes.length > 0) {
                    this.drawDashes(staffLine.LyricsDashes);
                }

                // draw lyric lines (e.g. LyricExtends: "dich,___")
                if (staffLine.LyricLines.length > 0) {
                    this.drawLyricLines(staffLine.LyricLines, staffLine);
                }
            }
        }
        for (const systemLine of musicSystem.SystemLines) {
            this.drawSystemLineObject(systemLine);
        }
        if (musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
            for (const label of musicSystem.Labels) {
                label.SVGNode = this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }

        const instruments: Instrument[] = this.graphicalMusicSheet.ParentMusicSheet.Instruments;
        const instrumentsVisible: number = instruments.filter((instrument) => instrument.Visible).length;
        for (const bracket of musicSystem.InstrumentBrackets) {
            this.drawInstrumentBrace(bracket, musicSystem);
        }

        if (instruments.length > 0) {
            // TODO instead of this check we could save what instruments are in the group bracket,
            //   and only draw it if all these instruments are visible.
            //   Currently the instruments/stafflines aren't saved in the bracket however.
            if (instrumentsVisible > 1) {
                for (const bracket of musicSystem.GroupBrackets) {
                    this.drawGroupBracket(bracket, musicSystem);
                }
            } else {
                for (const bracket of musicSystem.GroupBrackets) {
                    (bracket as VexFlowInstrumentBracket).Visible = false; //.setType(Vex.Flow.StaveConnector.type.NONE);
                }
            }
        }

        if (!this.leadSheet) {
            for (const measureNumberLabel of musicSystem.MeasureNumberLabels) {
                measureNumberLabel.SVGNode = this.drawLabel(measureNumberLabel, <number>GraphicalLayers.Notes);
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

        if (this.rules.RenderLyrics) {
            if (staffLine.LyricsDashes.length > 0) {
                this.drawDashes(staffLine.LyricsDashes);
            }
        }
        this.drawOctaveShifts(staffLine);

        this.drawExpressions(staffLine);

        if (this.skyLineVisible) {
            this.drawSkyLine(staffLine);
        }

        if (this.bottomLineVisible) {
            this.drawBottomLine(staffLine);
        }
    }

    protected drawLyricLines(lyricLines: GraphicalLine[], staffLine: StaffLine): void {
        staffLine.LyricLines.forEach(lyricLine => {
            // TODO maybe we should put this in the calculation (MusicSheetCalculator.calculateLyricExtend)
            // then we can also remove staffLine argument
            // but same addition doesn't work in calculateLyricExtend, because y-spacing happens after lyrics positioning
            lyricLine.Start.y += staffLine.PositionAndShape.AbsolutePosition.y;
            lyricLine.End.y += staffLine.PositionAndShape.AbsolutePosition.y;
            lyricLine.Start.x += staffLine.PositionAndShape.AbsolutePosition.x;
            lyricLine.End.x += staffLine.PositionAndShape.AbsolutePosition.x;
            this.drawGraphicalLine(lyricLine, this.rules.LyricUnderscoreLineWidth);
        });
    }

    protected drawExpressions(staffline: StaffLine): void {
        // implemented by subclass (VexFlowMusicSheetDrawer)
    }

    protected drawGraphicalLine(graphicalLine: GraphicalLine, lineWidth: number, colorOrStyle: string = "black"): Node {
        /* TODO similar checks as in drawLabel
        if (!this.isVisible(new BoundingBox(graphicalLine.Start,)) {
            return;
        }
        */
        return this.drawLine(graphicalLine.Start, graphicalLine.End, colorOrStyle, lineWidth);
    }

    protected drawLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF", lineWidth: number): Node {
        // implemented by subclass (VexFlowMusicSheetDrawer)
        return undefined;
    }

    /**
     * Draw all dashes to the canvas
     * @param lyricsDashes Array of lyric dashes to be drawn
     * @param layer Number of the layer that the lyrics should be drawn in
     */
    protected drawDashes(lyricsDashes: GraphicalLabel[]): void {
        lyricsDashes.forEach(dash => dash.SVGNode = this.drawLabel(dash, <number>GraphicalLayers.Notes));
    }

    // protected drawSlur(slur: GraphicalSlur, abs: PointF2D): void {
    //
    // }

    protected drawOctaveShifts(staffLine: StaffLine): void {
        return;
    }

    protected drawStaffLines(staffLine: StaffLine): void {
        if (staffLine.StaffLines) {
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

    /**
     * Draws an instantaneous dynamic expression (p, pp, f, ff, ...) to the canvas
     * @param instantaneousDynamic GraphicalInstantaneousDynamicExpression to be drawn
     */
    protected drawInstantaneousDynamic(instantaneousDynamic: GraphicalInstantaneousDynamicExpression): void {
        throw new Error("not implemented");
    }

    /**
     * Draws a continuous dynamic expression (wedges) to the canvas
     * @param expression GraphicalContinuousDynamicExpression to be drawn
     */
    protected drawContinuousDynamic(expression: GraphicalContinuousDynamicExpression): void {
        throw new Error("not implemented");
    }

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

    protected drawPage(page: GraphicalMusicPage): void {
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
                label.SVGNode = this.drawLabel(label, <number>GraphicalLayers.Notes);
            }
        }
        // Draw bounding boxes for debug purposes. This has to be at the end because only
        // then all the calculations and recalculations are done
        if (this.drawableBoundingBoxElement) {
            this.drawBoundingBoxes(page.PositionAndShape, 0, this.drawableBoundingBoxElement);
        }
    }

    /**
     * Draw bounding boxes aroung GraphicalObjects
     * @param startBox Bounding Box that is used as a staring point to recursively go through all child elements
     * @param layer Layer to draw to
     * @param type Type of element to show bounding boxes for as string.
     */
    private drawBoundingBoxes(startBox: BoundingBox, layer: number = 0, type: string = "all"): void {
        const dataObjectString: string = (startBox.DataObject.constructor as any).name; // only works with non-minified build or sourcemap
        let typeMatch: boolean = false;
        if (type === "all") {
            typeMatch = true;
        } else {
            if (type === "VexFlowStaffEntry") {
                typeMatch = startBox.DataObject instanceof VexFlowStaffEntry;
            } else if (type === "VexFlowMeasure") {
                typeMatch = startBox.DataObject instanceof VexFlowMeasure;
            } else if (type === "VexFlowGraphicalNote") {
                typeMatch = startBox.DataObject instanceof VexFlowGraphicalNote;
            } else if (type === "VexFlowVoiceEntry") {
                typeMatch = startBox.DataObject instanceof VexFlowVoiceEntry;
            } else if (type === "GraphicalLabel") {
                typeMatch = startBox.DataObject instanceof GraphicalLabel;
            } else if (type === "VexFlowStaffLine") {
                typeMatch = startBox.DataObject instanceof VexFlowStaffLine;
            } else if (type === "SystemLine") {
                typeMatch = startBox.DataObject instanceof SystemLine;
            } else if (type === "StaffLineActivitySymbol") {
                typeMatch = startBox.DataObject instanceof StaffLineActivitySymbol;
            } else if (type === "VexFlowContinuousDynamicExpression") {
                typeMatch = startBox.DataObject instanceof VexFlowContinuousDynamicExpression;
            }
        }
        if (typeMatch || dataObjectString === type) {
            this.drawBoundingBox(startBox, undefined, true, dataObjectString, layer);
        }
        layer++;
        startBox.ChildElements.forEach(bb => this.drawBoundingBoxes(bb, layer, type));
    }

    public drawBoundingBox(bbox: BoundingBox,
        color: string = undefined, drawCross: boolean = false, labelText: string = undefined, layer: number = 0
    ): Node {
        let tmpRect: RectangleF2D = new RectangleF2D(bbox.AbsolutePosition.x + bbox.BorderMarginLeft,
            bbox.AbsolutePosition.y + bbox.BorderMarginTop,
            bbox.BorderMarginRight - bbox.BorderMarginLeft,
            bbox.BorderMarginBottom - bbox.BorderMarginTop);
        if (drawCross) {
            this.drawLineAsHorizontalRectangle(new GraphicalLine(
                new PointF2D(bbox.AbsolutePosition.x - 1, bbox.AbsolutePosition.y),
                new PointF2D(bbox.AbsolutePosition.x + 1, bbox.AbsolutePosition.y),
                0.1,
                OutlineAndFillStyleEnum.BaseWritingColor,
                color),
                layer - 1);

            this.drawLineAsVerticalRectangle(new GraphicalLine(
                new PointF2D(bbox.AbsolutePosition.x, bbox.AbsolutePosition.y - 1),
                new PointF2D(bbox.AbsolutePosition.x, bbox.AbsolutePosition.y + 1),
                0.1,
                OutlineAndFillStyleEnum.BaseWritingColor,
                color),
                layer - 1);
        }

        tmpRect = this.applyScreenTransformationForRect(tmpRect);
        const rectNode: Node = this.renderRectangle(tmpRect, <number>GraphicalLayers.Background, layer, color, 0.5);
        if (labelText) {
            const label: Label = new Label(labelText);
            this.renderLabel(new GraphicalLabel(label, 0.8, TextAlignmentEnum.CenterCenter, this.rules),
                layer, tmpRect.width, tmpRect.height, tmpRect.height, new PointF2D(tmpRect.x, tmpRect.y + 12));
            // theoretically we should return the nodes from renderLabel here as well, so they can also be removed later
        }
        return rectNode;
    }

    private drawMarkedAreas(system: MusicSystem): void {
        for (const markedArea of system.GraphicalMarkedAreas) {
            if (markedArea) {
                if (markedArea.systemRectangle) {
                    this.drawRectangle(markedArea.systemRectangle, <number>GraphicalLayers.Background);
                }
                if (markedArea.settings) {
                    markedArea.settings.SVGNode = this.drawLabel(markedArea.settings, <number>GraphicalLayers.Comment);
                }
                if (markedArea.labelRectangle) {
                    this.drawRectangle(markedArea.labelRectangle, <number>GraphicalLayers.Background);
                }
                if (markedArea.label) {
                    markedArea.label.SVGNode = this.drawLabel(markedArea.label, <number>GraphicalLayers.Comment);
                }
            }
        }
    }

    private drawComment(system: MusicSystem): void {
        for (const comment of system.GraphicalComments) {
            if (comment) {
                if (comment.settings) {
                    comment.settings.SVGNode = this.drawLabel(comment.settings, <number>GraphicalLayers.Comment);
                }
                if (comment.label) {
                    comment.label.SVGNode = this.drawLabel(comment.label, <number>GraphicalLayers.Comment);
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

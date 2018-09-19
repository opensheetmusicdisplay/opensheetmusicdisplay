import { EngravingRules } from "./EngravingRules";

export enum DrawingParametersEnum {
    allon = "allon",
    compact = "compact",
    default = "default",
    leadsheet = "leadsheet",
    preview = "preview",
    thumbnail = "thumbnail",
}

export class DrawingParameters {
    /** will set other settings if changed with set method */
    private drawingParametersEnum: DrawingParametersEnum;
    public drawHighlights: boolean;
    public drawErrors: boolean;
    public drawSelectionStartSymbol: boolean;
    public drawSelectionEndSymbol: boolean;
    public drawCursors: boolean;
    public drawActivitySymbols: boolean;
    public drawScrollIndicator: boolean;
    public drawComments: boolean;
    public drawMarkedAreas: boolean;
    public drawTitle: boolean = true;
    public drawSubtitle: boolean = true;
    public drawLyricist: boolean = true;
    public drawComposer: boolean = true;
    public drawCredits: boolean = true;
    public drawPartNames: boolean = true;
    /** Draw notes set to be invisible (print-object="no" in XML). */
    public drawHiddenNotes: boolean = false;
    public defaultColorNoteHead: string; // TODO not yet supported
    public defaultColorStem: string; // TODO not yet supported

    constructor(drawingParameters: DrawingParametersEnum = DrawingParametersEnum.default) {
        this.DrawingParametersEnum = drawingParameters;
    }

    /** Sets drawing parameters enum and changes settings flags accordingly. */
    public set DrawingParametersEnum(drawingParametersEnum: DrawingParametersEnum) {
        this.drawingParametersEnum = drawingParametersEnum;
        switch (drawingParametersEnum) {
            case DrawingParametersEnum.allon:
                this.setForAllOn();
                break;
            case DrawingParametersEnum.thumbnail:
                this.setForThumbnail();
                break;
            case DrawingParametersEnum.leadsheet:
                this.setForLeadsheet();
                break;
            case DrawingParametersEnum.compact:
                this.setForCompactMode();
                break;
            case DrawingParametersEnum.default:
            default:
                this.setForDefault();
        }
    }

    public get DrawingParametersEnum(): DrawingParametersEnum {
        return this.drawingParametersEnum;
    }

    public setForAllOn(): void {
        this.drawHighlights = true;
        this.drawErrors = true;
        this.drawSelectionStartSymbol = true;
        this.drawSelectionEndSymbol = true;
        this.drawCursors = true;
        this.drawActivitySymbols = true;
        this.drawScrollIndicator = true;
        this.drawComments = true;
        this.drawMarkedAreas = true;
        this.drawTitle = true;
        this.drawSubtitle = true;
        this.drawCredits = true;
        this.drawPartNames = true;
        this.drawHiddenNotes = true;
    }

    public setForDefault(): void {
        this.setForAllOn();
        this.drawHiddenNotes = false;
    }

    public setForThumbnail(): void {
        this.drawHighlights = false;
        this.drawErrors = false;
        this.drawSelectionStartSymbol = false;
        this.drawSelectionStartSymbol = false;
        this.drawCursors = false;
        this.drawActivitySymbols = false;
        this.drawScrollIndicator = false;
        this.drawComments = true;
        this.drawMarkedAreas = true;
        this.drawHiddenNotes = false;
    }

    public setForCompactMode(): void {
        this.setForDefault();
        EngravingRules.Rules.CompactMode = true;
        this.drawTitle = false;
        EngravingRules.Rules.RenderTitle = false;
        this.drawSubtitle = false;
        EngravingRules.Rules.RenderSubtitle = false;
        this.drawComposer = false;
        EngravingRules.Rules.RenderComposer = false;
        this.drawLyricist = false;
        EngravingRules.Rules.RenderLyricist = false;
        this.drawCredits = false;
        this.drawPartNames = true;
        this.drawHiddenNotes = false;
    }

    public setForLeadsheet(): void {
        this.drawHighlights = false;
        this.drawErrors = false;
        this.drawSelectionStartSymbol = true;
        this.drawSelectionEndSymbol = true;
        this.drawCursors = true;
        this.drawActivitySymbols = false;
        this.drawScrollIndicator = true;
        this.drawComments = true;
        this.drawMarkedAreas = true;
    }

    //#region GETTER / SETTER
    public get DrawTitle(): boolean {
        return this.drawTitle;
    }

    public set DrawTitle(value: boolean) {
        this.drawTitle = value;
        EngravingRules.Rules.RenderTitle = value;
        if (!value) { // don't draw subtitle if title isn't drawn
            this.DrawSubtitle = false;
        }
    }

    public get DrawSubtitle(): boolean {
        return this.drawSubtitle;
    }

    public set DrawSubtitle(value: boolean) {
        this.drawTitle = value;
        EngravingRules.Rules.RenderSubtitle = value;
    }

    public get DrawLyricist(): boolean {
        return this.drawLyricist;
    }

    public set DrawLyricist(value: boolean) {
        this.drawLyricist = value;
        EngravingRules.Rules.RenderLyricist = value;
    }

    public get DrawPartNames(): boolean {
        return this.drawPartNames;
    }

    public set DrawPartNames(value: boolean) {
        this.drawPartNames = value;
        EngravingRules.Rules.RenderInstrumentNames = value;
    }
}

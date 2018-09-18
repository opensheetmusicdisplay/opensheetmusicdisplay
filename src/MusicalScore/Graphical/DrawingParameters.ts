export enum DrawingParametersEnum {
    AllOn = "allon",
    Compact = "compact",
    Default = "default",
    Leadsheet = "leadsheet",
    Preview = "preview",
    Thumbnail = "thumbnail",
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
    public drawCredits: boolean = true;
    public drawPartName: boolean = true;
    /** Draw notes set to be invisible (print-object="no" in XML). */
    public drawHiddenNotes: boolean = false;
    public defaultColorNoteHead: string; // TODO not yet supported
    public defaultColorStem: string; // TODO not yet supported

    constructor(drawingParameters: DrawingParametersEnum = DrawingParametersEnum.Default) {
        this.DrawingParametersEnum = drawingParameters;
    }

    /** Sets drawing parameters enum and changes settings flags accordingly. */
    public set DrawingParametersEnum(drawingParametersEnum: DrawingParametersEnum) {
        this.drawingParametersEnum = drawingParametersEnum;
        switch (drawingParametersEnum) {
            case DrawingParametersEnum.AllOn:
                this.setForAllOn();
                break;
            case DrawingParametersEnum.Thumbnail:
                this.setForThumbnail();
                break;
            case DrawingParametersEnum.Leadsheet:
                this.setForLeadsheet();
                break;
            case DrawingParametersEnum.Compact:
                this.setForCompactMode();
                break;
            case DrawingParametersEnum.Default:
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
        this.drawCredits = true;
        this.drawPartName = true;
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
        this.drawTitle = false;
        this.drawCredits = false;
        this.drawPartName = false;
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
}

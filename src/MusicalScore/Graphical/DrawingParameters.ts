export enum DrawingParametersEnum {
    AllOn,
    Default, // default is AllOn for now
    Leadsheet,
    Preview,
    Thumbnail,
}

export class DrawingParameters {
    private drawingParametersEnum: DrawingParametersEnum; // will control other settings if changed with set method
    public drawHighlights: boolean;
    public drawErrors: boolean;
    public drawSelectionStartSymbol: boolean;
    public drawSelectionEndSymbol: boolean;
    public drawCursors: boolean;
    public drawActivitySymbols: boolean;
    public drawScrollIndicator: boolean;
    public drawComments: boolean;
    public drawMarkedAreas: boolean;

    public static DrawingParametersStringToEnum(stringParameter: string): DrawingParametersEnum {
        switch (stringParameter.toLowerCase()) {
            case "allOn":
                return DrawingParametersEnum.AllOn;
            case "default":
                return DrawingParametersEnum.Default;
            case "leadsheet":
                return DrawingParametersEnum.Leadsheet;
            case "preview":
                return DrawingParametersEnum.Preview;
            case "thumbnail":
                return DrawingParametersEnum.Thumbnail;
            default:
                return DrawingParametersEnum.Default;
        }
    }

    public set DrawingParametersEnum(drawingParametersEnum: DrawingParametersEnum) {
        this.drawingParametersEnum = drawingParametersEnum;
        switch (drawingParametersEnum) {
            case DrawingParametersEnum.Default:
            case DrawingParametersEnum.AllOn:
                this.setForAllOn();
                break;
            case DrawingParametersEnum.Thumbnail:
                this.setForThumbnail();
                break;
            case DrawingParametersEnum.Leadsheet:
                this.setForLeadsheet();
                break;
            default:
                this.setForAllOn();
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

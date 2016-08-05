export class DrawingParameters {
    public drawHighlights: boolean;
    public drawErrors: boolean;
    public drawSelectionStartSymbol: boolean;
    public drawSelectionEndSymbol: boolean;
    public drawCursors: boolean;
    public drawActivitySymbols: boolean;
    public drawScrollIndicator: boolean;
    public drawComments: boolean;
    public drawMarkedAreas: boolean;

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

    public setForThumbmail(): void {
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

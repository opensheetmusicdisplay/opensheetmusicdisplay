export class Label {
    constructor() {

    }
    constructor(text: string) {
        this.text = text;
    }
    constructor(text: string, alignment: PSTextAlignment) {
        this.text = text;
        this.textAlignment = alignment;
    }
    constructor(symbol: FontInfo.MusicFontSymbol, alignment: PSTextAlignment) {
        this.font = PSFonts.PhonicScore;
        var symbolInfo: FontInfo.SymbolInfo = FontInfo.Info.getSymbolInfo(symbol);
        this.text = symbolInfo.symbol;
        this.textAlignment = alignment;
    }
    private text: string;
    private color: PSColor = PSColor.Black;
    private font: PSFonts = PSFonts.TimesNewRoman;
    private fontStyle: PSFontStyles = PSFontStyles.Regular;
    private textAlignment: PSTextAlignment = PSTextAlignment.LeftBottom;
    private fontHeight: number = 2;
    public get Text(): string {
        return this.text;
    }
    public set Text(value: string) {
        this.text = value;
    }
    public get Color(): PSColor {
        return this.color;
    }
    public set Color(value: PSColor) {
        this.color = value;
    }
    public get Font(): PSFonts {
        return this.font;
    }
    public set Font(value: PSFonts) {
        this.font = value;
    }
    public get FontStyle(): PSFontStyles {
        return this.fontStyle;
    }
    public set FontStyle(value: PSFontStyles) {
        this.fontStyle = value;
    }
    public get FontHeight(): number {
        return this.fontHeight;
    }
    public set FontHeight(value: number) {
        this.fontHeight = value;
    }
    public get TextAlignment(): PSTextAlignment {
        return this.textAlignment;
    }
    public set TextAlignment(value: PSTextAlignment) {
        this.textAlignment = value;
    }
    public ToString(): string {
        return this.Text;
    }
}
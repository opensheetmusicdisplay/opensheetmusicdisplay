// FIXME
type PSTextAlignment = any;
type PSFontStyles = any;
type PSColor = any;
type PSFonts = any;

export class Label {
  constructor(arg1: string/*|FontInfo.MusicFontSymbol*/, alignment?: PSTextAlignment) {
      //if (arg1 instanceof string) {
      this.text = <string>arg1;
      //} else if (arg1 instanceof FontInfo.MusicFontSymbol) {
      //    this.font = PSFonts.PhonicScore;
      //    let symbolInfo: FontInfo.SymbolInfo = FontInfo.Info.getSymbolInfo(<FontInfo.MusicFontSymbol>arg1);
      //    this.text = symbolInfo.symbol;
      //}
      if (alignment !== undefined) {
          this.textAlignment = alignment;
      }
    }

    private text: string; // FIXME:
    private color: PSColor; //= PSColor.Black;
    private font: PSFonts; // = PSFonts.TimesNewRoman;
    private fontStyle: PSFontStyles; // = PSFontStyles.Regular;
    private textAlignment: PSTextAlignment; // = PSTextAlignment.LeftBottom;
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

import {TextAlignment} from "../Common/Enums/TextAlignment";
import {OSMDColor} from "../Common/DataObjects/osmdColor";
import {Fonts} from "../Common/Enums/Fonts";
import {FontStyles} from "../Common/Enums/FontStyles";

export class Label {
    // FIXME contructor
    constructor(arg1: string/*|FontInfo.MusicFontSymbol*/, alignment?: TextAlignment) {
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
    private color: OSMDColor = OSMDColor.Black;
    private font: Fonts = Fonts.TimesNewRoman;
    private fontStyle: FontStyles = FontStyles.Regular;
    private textAlignment: TextAlignment = TextAlignment.LeftBottom;
    private fontHeight: number = 2;

    public get Text(): string {
        return this.text;
    }
    public set Text(value: string) {
        this.text = value;
    }
    public get Color(): OSMDColor {
        return this.color;
    }
    public set Color(value: OSMDColor) {
        this.color = value;
    }
    public get Font(): Fonts {
        return this.font;
    }
    public set Font(value: Fonts) {
        this.font = value;
    }
    public get FontStyle(): FontStyles {
        return this.fontStyle;
    }
    public set FontStyle(value: FontStyles) {
        this.fontStyle = value;
    }
    public get FontHeight(): number {
        return this.fontHeight;
    }
    public set FontHeight(value: number) {
        this.fontHeight = value;
    }
    public get TextAlignment(): TextAlignment {
        return this.textAlignment;
    }
    public set TextAlignment(value: TextAlignment) {
        this.textAlignment = value;
    }
    public ToString(): string {
        return this.text;
    }
}

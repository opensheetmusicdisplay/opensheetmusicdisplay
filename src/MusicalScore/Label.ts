import {OSMDTextAlignment} from "../Common/Enums/osmdTextAlignment";
import {OSMDColor} from "../Common/DataObjects/osmdColor";
import {OSMDFonts} from "../Common/Enums/osmdFonts";
import {OSMDFontStyles} from "../Common/Enums/osmdFontStyles";

export class Label {
    // FIXME contructor
    constructor(arg1: string/*|FontInfo.MusicFontSymbol*/, alignment?: OSMDTextAlignment) {
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
    private font: OSMDFonts = OSMDFonts.TimesNewRoman;
    private fontStyle: OSMDFontStyles = OSMDFontStyles.Regular;
    private textAlignment: OSMDTextAlignment = OSMDTextAlignment.LeftBottom;
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
    public get Font(): OSMDFonts {
        return this.font;
    }
    public set Font(value: OSMDFonts) {
        this.font = value;
    }
    public get FontStyle(): OSMDFontStyles {
        return this.fontStyle;
    }
    public set FontStyle(value: OSMDFontStyles) {
        this.fontStyle = value;
    }
    public get FontHeight(): number {
        return this.fontHeight;
    }
    public set FontHeight(value: number) {
        this.fontHeight = value;
    }
    public get TextAlignment(): OSMDTextAlignment {
        return this.textAlignment;
    }
    public set TextAlignment(value: OSMDTextAlignment) {
        this.textAlignment = value;
    }
    public ToString(): string {
        return this.text;
    }
}

import {MusicSymbol} from "./MusicSymbol";
import {SizeF_2D} from "../../Common/DataObjects/SizeF_2D";
import {PointF_2D} from "../../Common/DataObjects/PointF_2D";
import {BoundingBox} from "./BoundingBox";
export class FontInfo {
    protected static info: FontInfo = new FontInfo();
    protected symbolMapping: Dictionary<MusicSymbol, SymbolInfo> = new Dictionary<MusicSymbol, SymbolInfo>();
    constructor() {
        this.createSymbols();
    }
    public static get Info(): FontInfo {
        return FontInfo.info;
    }
    public updateSymbol(symbol: MusicSymbol, newSymbolInfo: SymbolInfo): void {
        this.symbolMapping[symbol] = newSymbolInfo;
    }
    public getSymbolInfo(symbol: MusicSymbol): SymbolInfo {
        try {
            return this.symbolMapping[symbol];
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "FontInfo.getSymbolInfo", ex);
            return new SymbolInfo();
        }

    }
    public getBoundingBox(symbol: MusicSymbol): SizeF_2D {
        try {
            return this.symbolMapping[symbol].boundingBox;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "FontInfo.getBoundingBox", ex);
            return new SizeF_2D();
        }

    }
    public addBoundingBox(symbol: MusicSymbol, boundingBox: SizeF_2D): void {
        var si: SymbolInfo = this.symbolMapping[symbol];
        si.boundingBox = boundingBox;
        this.symbolMapping.Remove(symbol);
        this.symbolMapping.Add(symbol, si);
    }
    public getCenterDistance(symbol: SymbolInfo): SizeF_2D {
        var symbolBox: SizeF_2D = symbol.boundingBox;
        var symbolCenter: PointF_2D = symbol.center;
        var centerDistance: SizeF_2D = new SizeF_2D(symbolBox.Width * symbolCenter.X, symbolBox.Height * symbolCenter.Y);
        return centerDistance;
    }
    public fillPSI(psi: BoundingBox, symbol: MusicSymbol): void {
        this.fillPSI(psi, symbol, 1.0f);
    }
    public fillPSI(psi: BoundingBox, symbol: MusicSymbol, scaleFactor: number): void {
        var symbolInfo: SymbolInfo = this.symbolMapping[symbol];
        var symbolBox: SizeF_2D = symbolInfo.boundingBox;
        var symbolCenter: PointF_2D = symbolInfo.center;
        var centerDistance: SizeF_2D = new SizeF_2D(symbolBox.Width * symbolCenter.X, symbolBox.Height * symbolCenter.Y);
        var symbolMargins: SymbolMargins = symbolInfo.margins;
        psi.BorderLeft = -centerDistance.Width * scaleFactor;
        psi.BorderRight = (symbolBox.Width - centerDistance.Width) * scaleFactor;
        psi.BorderTop = -centerDistance.Height * scaleFactor;
        psi.BorderBottom = (symbolBox.Height - centerDistance.Height) * scaleFactor;
        psi.BorderMarginLeft = (-centerDistance.Width - symbolBox.Width * symbolMargins.left) * scaleFactor;
        psi.BorderMarginRight = (symbolBox.Width - centerDistance.Width + symbolBox.Width * symbolMargins.right) * scaleFactor;
        psi.BorderMarginTop = (-centerDistance.Height - symbolBox.Height * symbolMargins.top) * scaleFactor;
        psi.BorderMarginBottom = (symbolBox.Height - centerDistance.Height + symbolBox.Height * symbolMargins.bottom) * scaleFactor;
    }
    protected getString(symbol: MusicSymbol): string {
        try {
            return this.symbolMapping[symbol].symbol;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "FontInfo.getString", ex);
            return null;
        }

    }
    protected getScaleFactor(symbol: MusicSymbol): number {
        try {
            return this.symbolMapping[symbol].scaleFactor;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "FontInfo.getScaleFactor", ex);
            return -1F;
        }

    }
    private createSymbols(): void {
        var scaleVector: number[] = 1,1, 3, 3, 3,
            3, 3, 3, 3,
            3, 1, 1, 7f,
                3.5f, 4, 1, 1,
                    2.0f, 3.4f,
                        0.6f, 0.6f, 3, 2,
                            3, 4, 5,
                            2.2f, 2.55f, 2.5f, 2.2f, 1,
                                2, 2, 2, 2,
                                2, 2, 2, 2,
                                2, 2, 0.4f,
                                    1, 1,
                                    1, 0.2f, 1, 1.5f, 1.5f,
                                        0.75f * 2,
                                            0.75f * 3,
                                                0.75f * (1 + 1865.0f / 2680.0f),
        0.75f * (1 + 1865.0f / 2680.0f),
        0.75f * (1 + 1865.0f / 2680.0f),
        0.75f * (1 + 1865.0f / 2680.0f),
        2.7f, 3.0f,
            2, 7.987f, 7.987f, 7.987f, 7.987f,
                4.228f, 4.228f, 4.228f, 4.228f,
                    1.25f, 0.75f, 1.05f, 0.85f, 1.05f,
                        1.1f, 2, 1.9f,
                            1.2f, 1.2f, 1.35f, 1.2f, 1.2f,
                                1, 1.7f, 1.8f,
                                    1.09f, 0.77f,
                                        3.0f;
        var centerVector: PointF_2D[] = new PointF_2D(0.5f, 0.5f),
        new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.0f, 1.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 1.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 1.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 1.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(500.0f / 940.0f, 1660.0f / 2675.0f),
            new PointF_2D(500.0f / 1830.0f, 760.0f / 2680.0f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(400.0f / 925.0f, 1210.0f / 2680.0f),
            new PointF_2D(400.0f / 1500.0f, 360.0f / 2680.0f),
            new PointF_2D(480.0f / 1190.0f, 260.0f / 2680.0f),
            new PointF_2D(510.0f / 1040.0f, 190.0f / 2680.0f),
            new PointF_2D(535.0f / 960.0f, 160.0f / 2680.0f),
            new PointF_2D(400.0f / 990.0f, 1960.0f / 2680.0f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(785.0f / 1570.0f, 1960.0f / 2680.0f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.0f, 0.0f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(2880.0f / 5760.0f, 2250.0f / 2680.0f),
            new PointF_2D(2850.0f / 5700.0f, 1810.0f / 2680.0f),
            new PointF_2D(450.0f / 900.0f, 1560.0f / 2680.0f),
            new PointF_2D(5250.0f / 10500.0f, 1340.0f / 2680.0f),
            new PointF_2D(1787.0f / 3574.0f, 1340.0f / 2680.0f),
            new PointF_2D(872.0f / 1744.0f, 1340.0f / 2680.0f),
            new PointF_2D(872.0f / 1744.0f, 1340.0f / 2680.0f),
            new PointF_2D(1500.0f / 3000.0f, 1865.0f / 2680.0f),
            new PointF_2D(1100.0f / 2200.0f, 1865.0f / 2680.0f),
            new PointF_2D(1000.0f / 2000.0f, 2680.0f / 2680.0f),
            new PointF_2D(1250.0f / 2500.0f, 2680.0f / 2680.0f),
            new PointF_2D(2330.0f / 4660.0f, 2680.0f / 2680.0f),
            new PointF_2D(1430.0f / 2860.0f, 2680.0f / 2680.0f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.63f, 0.5448f),
            new PointF_2D(0.63f, 0.667f),
            new PointF_2D(0.63f, 0.5448f),
            new PointF_2D(0.63f, 0.667f),
            new PointF_2D(0.2f, 0.224f),
            new PointF_2D(0.2f, 0.4067f),
            new PointF_2D(0.2f, 0.224f),
            new PointF_2D(0.2f, 0.4067f),
            new PointF_2D(0.5f, 0.653f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.52f, 0.925f),
            new PointF_2D(0.5f, 1f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.634f),
            new PointF_2D(0.5f, 0.5f),
            new PointF_2D(0.5f, 0.5f);
        var marginVector: SymbolMargins[] = new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
        new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.05f, 0.05f, 0.05f, 0.05f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.05f, 0.05f),
            new SymbolMargins(0.1f, 0.1f, 0.05f, 0.05f),
            new SymbolMargins(0.1f, 0.1f, 0.05f, 0.05f),
            new SymbolMargins(0.05f, 0.05f, 0.05f, 0.05f),
            new SymbolMargins(0.1f, 0.1f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.2f, 0.2f),
            new SymbolMargins(0.7f, 0.7f, 0.7f, 0.7f),
            new SymbolMargins(0.2f, 0.2f, 0.3f, 0.3f),
            new SymbolMargins(0.2f, 0.2f, 0.3f, 0.3f),
            new SymbolMargins(0.1f, 0.1f, 0.2f, 0.2f),
            new SymbolMargins(0.1f, 0.1f, 1.0f, 1.0f),
            new SymbolMargins(0.1f, 0.1f, 0.2f, 0.2f),
            new SymbolMargins(0.3f, 0.3f, 0.2f, 0.2f),
            new SymbolMargins(0.3f, 0.3f, 0.2f, 0.2f),
            new SymbolMargins(0.0f, 0.0f, 0.2f, 0.2f),
            new SymbolMargins(0.0f, 0.0f, 0.2f, 0.2f),
            new SymbolMargins(0.0f, 0.0f, 0.2f, 0.2f),
            new SymbolMargins(0.0f, 0.0f, 0.2f, 0.2f),
            new SymbolMargins(0.0f, 0.0f, 0.2f, 0.2f),
            new SymbolMargins(0.0f, 0.0f, 0.2f, 0.2f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.05f, 0.05f, 0.05f, 0.05f),
            new SymbolMargins(0.05f, 0.05f, 0.05f, 0.05f),
            new SymbolMargins(0.05f, 0.05f, 0.05f, 0.05f),
            new SymbolMargins(0.05f, 0.05f, 0.05f, 0.05f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f),
            new SymbolMargins(0.1f, 0.1f, 0.1f, 0.1f);
        var values: Array = Enum.GetValues(/*typeof*/MusicSymbol);
        var i: number = 0;
        for (var c: string = <string>0x21; c <<string>0x21 + values.Length; c++) {
            var si: SymbolInfo = new SymbolInfo(c.ToString(), i, scaleVector[i], centerVector[i], marginVector[i]);
            this.symbolMapping.Add(<MusicSymbol>values.GetValue(i), si);
            i++;
        }
    }
}
export class SymbolInfo {
    public symbol: string;
    public id: number;
    public scaleFactor: number;
    public boundingBox: SizeF_2D;
    public center: PointF_2D;
    public margins: SymbolMargins;
    constructor(symbol: string, id: number, scaleFactor: number, center: PointF_2D, margins: SymbolMargins) {
        this();
        this.symbol = symbol;
        this.id = id;
        this.scaleFactor = scaleFactor;
        this.center = center;
        this.margins = margins;
    }
    public get ScaleFactor(): number {
        return this.scaleFactor;
    }
    public set ScaleFactor(value: number) {
        this.scaleFactor = value;
    }
    public get BoundingBox(): SizeF_2D {
        return this.boundingBox;
    }
    public set BoundingBox(value: SizeF_2D) {
        this.boundingBox = value;
    }
    public get Center(): PointF_2D {
        return this.center;
    }
    public set Center(value: PointF_2D) {
        this.center = value;
    }
    public get Margins(): SymbolMargins {
        return this.margins;
    }
    public set Margins(value: SymbolMargins) {
        this.margins = value;
    }
}

export class SymbolMargins {
    public left: number;
    public right: number;
    public top: number;
    public bottom: number;
    constructor(left: number, right: number, top: number = 0, bottom: number = 0) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }
}

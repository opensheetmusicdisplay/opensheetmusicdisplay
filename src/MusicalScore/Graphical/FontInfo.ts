import {MusicSymbol} from "./MusicSymbol";
import {SizeF2D} from "../../Common/DataObjects/SizeF2D";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {BoundingBox} from "./BoundingBox";
import {Logging} from "../../Common/logging";

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
        } catch (ex) {
            Logging.debug("FontInfo.getSymbolInfo", ex);
            return new SymbolInfo();
        }

    }
    public getBoundingBox(symbol: MusicSymbol): SizeF2D {
        try {
            return this.symbolMapping[symbol].boundingBox;
        } catch (ex) {
            Logging.debug("FontInfo.getBoundingBox", ex);
            return new SizeF2D();
        }

    }
    public addBoundingBox(symbol: MusicSymbol, boundingBox: SizeF2D): void {
        let si: SymbolInfo = this.symbolMapping[symbol];
        si.boundingBox = boundingBox;
        this.symbolMapping.Remove(symbol);
        this.symbolMapping.push(symbol, si);
    }
    public getCenterDistance(symbol: SymbolInfo): SizeF2D {
        let symbolBox: SizeF2D = symbol.boundingBox;
        let symbolCenter: PointF2D = symbol.center;
        let centerDistance: SizeF2D = new SizeF2D(symbolBox.width * symbolCenter.x, symbolBox.height * symbolCenter.y);
        return centerDistance;
    }
    public fillPSI(psi: BoundingBox, symbol: MusicSymbol): void {
        this.fillPSI(psi, symbol, 1.0);
    }
    public fillPSI(psi: BoundingBox, symbol: MusicSymbol, scaleFactor: number): void {
        let symbolInfo: SymbolInfo = this.symbolMapping[symbol];
        let symbolBox: SizeF2D = symbolInfo.boundingBox;
        let symbolCenter: PointF2D = symbolInfo.center;
        let centerDistance: SizeF2D = new SizeF2D(symbolBox.width * symbolCenter.x, symbolBox.height * symbolCenter.y);
        let symbolMargins: SymbolMargins = symbolInfo.margins;
        psi.BorderLeft = -centerDistance.width * scaleFactor;
        psi.BorderRight = (symbolBox.width - centerDistance.width) * scaleFactor;
        psi.BorderTop = -centerDistance.height * scaleFactor;
        psi.BorderBottom = (symbolBox.height - centerDistance.height) * scaleFactor;
        psi.BorderMarginLeft = (-centerDistance.width - symbolBox.width * symbolMargins.left) * scaleFactor;
        psi.BorderMarginRight = (symbolBox.width - centerDistance.width + symbolBox.width * symbolMargins.right) * scaleFactor;
        psi.BorderMarginTop = (-centerDistance.height - symbolBox.height * symbolMargins.top) * scaleFactor;
        psi.BorderMarginBottom = (symbolBox.height - centerDistance.height + symbolBox.height * symbolMargins.bottom) * scaleFactor;
    }
    protected getString(symbol: MusicSymbol): string {
        try {
            return this.symbolMapping[symbol].symbol;
        } catch (ex) {
            Logging.debug("FontInfo.getString", ex);
            return undefined;
        }

    }
    protected getScaleFactor(symbol: MusicSymbol): number {
        try {
            return this.symbolMapping[symbol].scaleFactor;
        } catch (ex) {
            Logging.debug("FontInfo.getScaleFactor", ex);
            return -1;
        }

    }
    private createSymbols(): void {
        let scaleVector: number[] = [1, 1, 3, 3, 3,
            3, 3, 3, 3,
            3, 1, 1, 7,
            3.5, 4, 1, 1,
            2.0, 3.4,
            0.6, 0.6, 3, 2,
            3, 4, 5,
            2.2, 2.55, 2.5, 2.2, 1,
            2, 2, 2, 2,
            2, 2, 2, 2,
            2, 2, 0.4,
            1, 1,
            1, 0.2, 1, 1.5, 1.5,
            0.75 * 2,
            0.75 * 3,
            0.75 * (1 + 1865.0 / 2680.0),
            0.75 * (1 + 1865.0 / 2680.0),
            0.75 * (1 + 1865.0 / 2680.0),
            0.75 * (1 + 1865.0 / 2680.0),
            2.7, 3.0,
            2, 7.987, 7.987, 7.987, 7.987,
            4.228, 4.228, 4.228, 4.228,
            1.25, 0.75, 1.05, 0.85, 1.05,
            1.1, 2, 1.9,
            1.2, 1.2, 1.35, 1.2, 1.2,
            1, 1.7, 1.8, 1.09, 0.77, 3.0];
        let centerVector: PointF2D[] = [new PointF2D(0.5, 0.5),
        new PointF2D(0.5, 0.5),
            new PointF2D(0.0, 1.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 1.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 1.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 1.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(500.0 / 940.0, 1660.0 / 2675.0),
            new PointF2D(500.0 / 1830.0, 760.0 / 2680.0),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(400.0 / 925.0, 1210.0 / 2680.0),
            new PointF2D(400.0 / 1500.0, 360.0 / 2680.0),
            new PointF2D(480.0 / 1190.0, 260.0 / 2680.0),
            new PointF2D(510.0 / 1040.0, 190.0 / 2680.0),
            new PointF2D(535.0 / 960.0, 160.0 / 2680.0),
            new PointF2D(400.0 / 990.0, 1960.0 / 2680.0),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(785.0 / 1570.0, 1960.0 / 2680.0),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.0, 0.0),
            new PointF2D(0.5, 0.5),
            new PointF2D(2880.0 / 5760.0, 2250.0 / 2680.0),
            new PointF2D(2850.0 / 5700.0, 1810.0 / 2680.0),
            new PointF2D(450.0 / 900.0, 1560.0 / 2680.0),
            new PointF2D(5250.0 / 10500.0, 1340.0 / 2680.0),
            new PointF2D(1787.0 / 3574.0, 1340.0 / 2680.0),
            new PointF2D(872.0 / 1744.0, 1340.0 / 2680.0),
            new PointF2D(872.0 / 1744.0, 1340.0 / 2680.0),
            new PointF2D(1500.0 / 3000.0, 1865.0 / 2680.0),
            new PointF2D(1100.0 / 2200.0, 1865.0 / 2680.0),
            new PointF2D(1000.0 / 2000.0, 2680.0 / 2680.0),
            new PointF2D(1250.0 / 2500.0, 2680.0 / 2680.0),
            new PointF2D(2330.0 / 4660.0, 2680.0 / 2680.0),
            new PointF2D(1430.0 / 2860.0, 2680.0 / 2680.0),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.63, 0.5448),
            new PointF2D(0.63, 0.667),
            new PointF2D(0.63, 0.5448),
            new PointF2D(0.63, 0.667),
            new PointF2D(0.2, 0.224),
            new PointF2D(0.2, 0.4067),
            new PointF2D(0.2, 0.224),
            new PointF2D(0.2, 0.4067),
            new PointF2D(0.5, 0.653),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.52, 0.925),
            new PointF2D(0.5, 1),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.634),
            new PointF2D(0.5, 0.5),
            new PointF2D(0.5, 0.5)];
        let marginVector: SymbolMargins[] = [new SymbolMargins(0.1, 0.1, 0.1, 0.1),
        new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.05, 0.05, 0.05, 0.05),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.05, 0.05),
            new SymbolMargins(0.1, 0.1, 0.05, 0.05),
            new SymbolMargins(0.1, 0.1, 0.05, 0.05),
            new SymbolMargins(0.05, 0.05, 0.05, 0.05),
            new SymbolMargins(0.1, 0.1),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.2, 0.2),
            new SymbolMargins(0.7, 0.7, 0.7, 0.7),
            new SymbolMargins(0.2, 0.2, 0.3, 0.3),
            new SymbolMargins(0.2, 0.2, 0.3, 0.3),
            new SymbolMargins(0.1, 0.1, 0.2, 0.2),
            new SymbolMargins(0.1, 0.1, 1.0, 1.0),
            new SymbolMargins(0.1, 0.1, 0.2, 0.2),
            new SymbolMargins(0.3, 0.3, 0.2, 0.2),
            new SymbolMargins(0.3, 0.3, 0.2, 0.2),
            new SymbolMargins(0.0, 0.0, 0.2, 0.2),
            new SymbolMargins(0.0, 0.0, 0.2, 0.2),
            new SymbolMargins(0.0, 0.0, 0.2, 0.2),
            new SymbolMargins(0.0, 0.0, 0.2, 0.2),
            new SymbolMargins(0.0, 0.0, 0.2, 0.2),
            new SymbolMargins(0.0, 0.0, 0.2, 0.2),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.05, 0.05, 0.05, 0.05),
            new SymbolMargins(0.05, 0.05, 0.05, 0.05),
            new SymbolMargins(0.05, 0.05, 0.05, 0.05),
            new SymbolMargins(0.05, 0.05, 0.05, 0.05),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1),
            new SymbolMargins(0.1, 0.1, 0.1, 0.1)];
        let values: Array = Enum.GetValues(/*typeof*/MusicSymbol);
        let i: number = 0;
        for (let c: string = <string>0x21; c <<string>0x21 + values.length; c++) {
            let si: SymbolInfo = new SymbolInfo(c.ToString(), i, scaleVector[i], centerVector[i], marginVector[i]);
            this.symbolMapping.push(<MusicSymbol>values.GetValue(i), si);
            i++;
        }
    }
}
export class SymbolInfo {
    public symbol: string;
    public id: number;
    public scaleFactor: number;
    public boundingBox: SizeF2D;
    public center: PointF2D;
    public margins: SymbolMargins;
    constructor(symbol: string, id: number, scaleFactor: number, center: PointF2D, margins: SymbolMargins) {
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
    public get BoundingBox(): SizeF2D {
        return this.boundingBox;
    }
    public set BoundingBox(value: SizeF2D) {
        this.boundingBox = value;
    }
    public get Center(): PointF2D {
        return this.center;
    }
    public set Center(value: PointF2D) {
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

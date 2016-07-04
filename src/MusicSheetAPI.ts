import {IXmlElement} from "./Common/FileIO/Xml";
import {VexFlowMusicSheetCalculator} from "./MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {MusicSheetReader} from "./MusicalScore/ScoreIO/MusicSheetReader";
import {GraphicalMusicSheet} from "./MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheetCalculator} from "./MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetDrawer} from "./MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {MusicSheet} from "./MusicalScore/MusicSheet";
import {VexFlowTextMeasurer} from "./MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer";

export class MusicSheetAPI {
    constructor() {
        return;
    }

    private canvas: HTMLCanvasElement;
    private sheet: MusicSheet;
    private drawer: VexFlowMusicSheetDrawer;
    private graphic: GraphicalMusicSheet;
    private width: number;
    private zoom: number = 1.0;
    private unit: number = 10;

    public load(sheet: Element): void {
        let score: IXmlElement = new IXmlElement(sheet.getElementsByTagName("score-partwise")[0]);
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "path missing");
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        this.display();
    }

    public setCanvas(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.drawer = new VexFlowMusicSheetDrawer(canvas, new VexFlowTextMeasurer());
    }

    public setWidth(width: number): void {
        if (width === this.width) {
            return;
        }
        this.width = width;
        this.display();
    }

    public scale(k: number): void {
        this.zoom = k;
        this.display();
    }

    public display(): void {
        if (this.width === undefined) {
            return;
        }
        if (this.canvas === undefined) {
            return;
        }
        if (this.sheet === undefined) {
            return;
        }
        this.sheet.pageWidth = this.width / this.zoom / this.unit;
        this.graphic.reCalculate();
        // Update Sheet Page
        let height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * this.unit * this.zoom;
        this.drawer.resize(
            this.width,
            height
        );
        this.drawer.scale(this.zoom);
        this.drawer.drawSheet(this.graphic);
    }

    public free(): void {
        this.canvas = undefined;
        this.sheet = undefined;
        return;
    }
}

(<any>window).osmd = {
    "MusicSheet":  MusicSheetAPI,
};

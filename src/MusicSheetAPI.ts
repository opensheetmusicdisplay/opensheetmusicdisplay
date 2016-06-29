import {MusicSheetDrawer} from "./MusicalScore/Graphical/MusicSheetDrawer";
import {IXmlElement} from "./Common/FileIO/Xml";
import {VexFlowMusicSheetCalculator} from "./MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {MusicSheetReader} from "./MusicalScore/ScoreIO/MusicSheetReader";
import {GraphicalMusicSheet} from "./MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheetCalculator} from "./MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetDrawer} from "./MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {MusicSheet} from "./MusicalScore/MusicSheet";

export class MusicSheetAPI {
    constructor() {
        return;
    }

    private canvas: HTMLCanvasElement;
    private sheet: MusicSheet;
    private drawer: MusicSheetDrawer;
    private calc: MusicSheetCalculator;
    private width: number;

    public load(sheet: Element): void {
        let score: IXmlElement = new IXmlElement(sheet.getElementsByTagName("score-partwise")[0]);
        this.calc = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "path missing");
        if (this.width) {
            this.display();
        }
    }

    public setCanvas(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.drawer = new VexFlowMusicSheetDrawer(canvas);
    }

    public setWidth(width: number): void {
        this.width = width;
        this.display();
    }

    public display(): void {
        if (this.canvas === undefined) {
            throw new Error("Call .setCanvas first");
        }
        if (this.sheet === undefined) {
            return;
        }
        let gms: GraphicalMusicSheet = new GraphicalMusicSheet(this.sheet, this.calc);
        this.drawer.drawSheet(gms);
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

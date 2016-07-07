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
        this.free();
    }

    private canvas: HTMLCanvasElement;
    private sheet: MusicSheet;
    private drawer: VexFlowMusicSheetDrawer;
    private graphic: GraphicalMusicSheet;
    private width: number;
    private zoom: number = 1.0;
    private unit: number = 10.0;

    /**
     * Initialize this object to default values
     */
    public free(): void {
        this.width = undefined;
        this.canvas = undefined;
        this.sheet = undefined;
        this.drawer = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.unit = 10.0;
    }

    /**
     * Load a MusicXML file
     * @param doc is the root node of a MusicXML document
     */
    public load(doc: Document): void {
        let elem: Element = doc.getElementsByTagName("score-partwise")[0];
        if (elem === undefined) {
            throw new Error("Invalid partwise MusicXML document");
        }
        let score: IXmlElement = new IXmlElement(elem);
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "*** unknown path ***");
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        this.display();
    }

    /**
     * Set the drawing canvas
     * @param canvas
     */
    public setCanvas(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.drawer = new VexFlowMusicSheetDrawer(canvas, new VexFlowTextMeasurer());
    }

    /**
     * Set the canvas width
     * @param width
     */
    public setWidth(width: number): void {
        if (width === this.width) {
            return;
        }
        this.width = width;
        this.display();
    }

    /**
     * Set the zoom
     * @param k
     */
    public scale(k: number): void {
        this.zoom = k;
        this.display();
    }

    // FIXME: make the following private!
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
        // Set page width
        this.sheet.pageWidth = this.width / this.zoom / this.unit;
        // Calculate again
        this.graphic.reCalculate();
        // Update Sheet Page
        let height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * this.unit * this.zoom;
        this.drawer.resize(
            this.width,
            height
        );
        // Fix the label problem
        // this.drawer.translate(0, 100);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
    }

}

(<any>window).osmd = {
    "MusicSheet":  MusicSheetAPI,
};

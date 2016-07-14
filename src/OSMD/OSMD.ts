import {IXmlElement} from "./../Common/FileIO/Xml";
import {VexFlowMusicSheetCalculator} from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {MusicSheetReader} from "./../MusicalScore/ScoreIO/MusicSheetReader";
import {GraphicalMusicSheet} from "./../MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheetCalculator} from "./../MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetDrawer} from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {MusicSheet} from "./../MusicalScore/MusicSheet";
import {Cursor} from "./Cursor";

export class OSMD {
    /**
     * The easy way of displaying a MusicXML sheet music file
     * @param container is either the id, or the actual "div" element which will host the music sheet
     */
    constructor(container: string|HTMLElement) {
        // Store container element
        if (typeof container === "string") {
            this.container = document.getElementById(<string>container);
        } else if ("appendChild" in <any>container) {
            this.container = <HTMLElement>container;
        }
        // Create the elements inside the container
        this.heading = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.style.zIndex = "0";
        let inner: HTMLElement = document.createElement("div");
        inner.style.position = "relative";
        this.container.appendChild(this.heading);
        inner.appendChild(this.canvas);
        this.container.appendChild(inner);
        // Create the drawer
        this.drawer = new VexFlowMusicSheetDrawer(this.heading, this.canvas);
        // Create the cursor
        this.cursor = new Cursor(inner, this);
    }

    public cursor: Cursor;
    public zoom: number = 1.0;

    private container: HTMLElement;
    private heading: HTMLElement;
    private canvas: HTMLCanvasElement;
    private sheet: MusicSheet;
    private drawer: VexFlowMusicSheetDrawer;
    private graphic: GraphicalMusicSheet;
    private unit: number = 10.0;

    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document, or the string content of a .xml/.mxl file
     */
    public load(content: string|Document): void {
        this.reset();
        let path: string = "Unknown path";
        if (typeof content === "string") {
            let str: string = <string>content;
            if (str.substr(0, 4) === "http") {
                path = str;
                str = this.loadURL(path);
            }
            if (str.substr(0, 4) === "\x04\x03\x4b\x50") {
                // This is a zip file, open the mx
                // TODO
                throw new Error("Not implemented: loading of mxl files!");
            }
            if (str.substr(0, 5) === "<?xml") {
                // Parse the string representing an xml file
                let parser: DOMParser = new DOMParser();
                content = parser.parseFromString(str, "text/xml");
            }
        }

        if (!content || !("nodeName" in <any>content)) {
            throw new Error("Could not ");
        }
        let elem: Element = (<Document>content).getElementsByTagName("score-partwise")[0];
        if (elem === undefined) {
            throw new Error("Invalid partwise MusicXML document");
        }
        let score: IXmlElement = new IXmlElement(elem);
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, path);
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        this.cursor.init(this.sheet.MusicPartManager, this.graphic);
    }

    /**
     * Render the music sheet in the container
     */
    public render(): void {
        this.resetHeadings();
        if (!this.graphic) {
            throw new Error("OSMD: Before rendering a music sheet, please load a MusicXML file");
        }
        let width: number = this.container.offsetWidth;
        if (isNaN(width)) {
            throw new Error("OSMD: Before rendering a music sheet, please set the width of the container");
        }
        // Set page width
        this.sheet.pageWidth = width / this.zoom / this.unit;
        // Calculate again
        this.graphic.reCalculate();
        // Update Sheet Page
        let height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * this.unit * this.zoom;
        this.drawer.resize(width, height);
        // Fix the label problem
        // this.drawer.translate(0, 100);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
        // Update the cursor position
        this.cursor.update();
    }


    private loadURL(url: string): string {
        throw new Error("Loading from URL not implemented.");
    }

    //private loadMXL(content: string): Document {
    //    return undefined;
    //}

    private resetHeadings(): void {
        // Empty this.headings
        while (this.heading.firstChild) {
            this.heading.removeChild(this.heading.firstChild);
        }
    }

    /**
     * Initialize this object to default values
     */
    private reset(): void {
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.unit = 10.0;
        this.resetHeadings();
    }
}

import {IXmlElement} from "./../Common/FileIO/Xml";
import {VexFlowMusicSheetCalculator} from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {MusicSheetReader} from "./../MusicalScore/ScoreIO/MusicSheetReader";
import {GraphicalMusicSheet} from "./../MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheetCalculator} from "./../MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetDrawer} from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {MusicSheet} from "./../MusicalScore/MusicSheet";
import {Cursor} from "./Cursor";
import {MXLtoXMLstring} from "../Common/FileIO/Mxl";
import {Promise} from "es6-promise";
import {handleResize} from "./ResizeHandler";
import {ajax} from "./AJAX";
import {Logging} from "../Common/Logging";
import {Fraction} from "../Common/DataObjects/Fraction";
import {OutlineAndFillStyleEnum} from "../MusicalScore/Graphical/DrawingEnums";

export class OSMD {
    /**
     * The easy way of displaying a MusicXML sheet music file
     * @param container is either the ID, or the actual "div" element which will host the music sheet
     * @autoResize automatically resize the sheet to full page width on window resize
     */
    constructor(container: string|HTMLElement, autoResize: boolean = false) {
        // Store container element
        if (typeof container === "string") {
            // ID passed
            this.container = document.getElementById(<string>container);
        } else if (container && "appendChild" in <any>container) {
            // Element passed
            this.container = <HTMLElement>container;
        }
        if (!this.container) {
            throw new Error("Please pass a valid div container to OSMD");
        }
        // Create the elements inside the container
        this.canvas = document.createElement("canvas");
        this.canvas.style.zIndex = "0";
        let inner: HTMLElement = document.createElement("div");
        inner.style.position = "relative";
        inner.appendChild(this.canvas);
        this.container.appendChild(inner);
        // Create the drawer
        this.drawer = new VexFlowMusicSheetDrawer(this.canvas);
        // Create the cursor
        this.cursor = new Cursor(inner, this);
        if (autoResize) {
            this.autoResize();
        }
    }

    public cursor: Cursor;
    public zoom: number = 1.0;

    private container: HTMLElement;
    private canvas: HTMLCanvasElement;
    private sheet: MusicSheet;
    private drawer: VexFlowMusicSheetDrawer;
    private graphic: GraphicalMusicSheet;

    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document, or the string content of a .xml/.mxl file
     */
    public load(content: string|Document): Promise<{}> {
        // Warning! This function is asynchronous! No error handling is done here.
        this.reset();
        if (typeof content === "string") {
            let str: string = <string>content;
            let self: OSMD = this;
            if (str.substr(0, 4) === "\x50\x4b\x03\x04") {
                // This is a zip file, unpack it first
                return MXLtoXMLstring(str).then(
                    (str: string) => {
                        return self.load(str);
                    },
                    (err: any) => {
                        Logging.debug(err);
                        throw new Error("OSMD: Invalid MXL file");
                    }
                );
            }
            if (str.substr(0, 5) === "<?xml") {
                // Parse the string representing an xml file
                let parser: DOMParser = new DOMParser();
                content = parser.parseFromString(str, "text/xml");
            } else if (str.length < 2083) {
                // Assume now 'str' is a URL
                // Retrieve the file at the given URL
                return ajax(str).then(
                    (s: string) => { return self.load(s); },
                    (exc: Error) => { throw exc; }
                );
            }
        }

        if (!content || !(<any>content).nodeName) {
            return Promise.reject(new Error("OSMD: The document which was provided is invalid"));
        }
        let children: NodeList = (<Document>content).childNodes;
        let elem: Element;
        for (let i: number = 0, length: number = children.length; i < length; i += 1) {
            let node: Node = children[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                elem = <Element>node;
                break;
            }
        }
        if (!elem) {
            return Promise.reject(new Error("OSMD: Document is not a valid 'partwise' MusicXML"));
        }
        let score: IXmlElement = new IXmlElement(elem);
        let calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        let reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "Unknown path");
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        this.cursor.init(this.sheet.MusicPartManager, this.graphic);
        return Promise.resolve({});
    }

    /**
     * Render the music sheet in the container
     */
    public render(): void {
        if (!this.graphic) {
            throw new Error("OSMD: Before rendering a music sheet, please load a MusicXML file");
        }
        let width: number = this.container.offsetWidth;
        // Before introducing the following optimization (maybe irrelevant), tests
        // have to be modified to ensure that width is > 0 when executed
        //if (isNaN(width) || width === 0) {
        //    return;
        //}

        // Set page width
        this.sheet.pageWidth = width / this.zoom / 10.0;
        // Calculate again
        this.graphic.reCalculate();
        this.graphic.Cursors.length = 0;
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(7, 1), OutlineAndFillStyleEnum.PlaybackCursor));
        // Update Sheet Page
        let height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * 10.0 * this.zoom;
        this.drawer.resize(width, height);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
        // Update the cursor position
        this.cursor.update();
    }

    /**
     * Initialize this object to default values
     * FIXME: Probably unnecessary
     */
    private reset(): void {
        this.cursor.hide();
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.canvas.width = 0;
        this.canvas.height = 0;
    }

    /**
     * Attach the appropriate handler to the window.onResize event
     */
    private autoResize(): void {
        let self: OSMD = this;
        handleResize(
            () => {
                // empty
            },
            () => {
                //let width: number = Math.max(
                //    document.documentElement.clientWidth,
                //    document.body.scrollWidth,
                //    document.documentElement.scrollWidth,
                //    document.body.offsetWidth,
                //    document.documentElement.offsetWidth
                //);
                //self.container.style.width = width + "px";
                self.render();
            }
        );
    }
}

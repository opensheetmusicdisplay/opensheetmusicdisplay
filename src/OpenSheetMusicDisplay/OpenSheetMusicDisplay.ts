import {IXmlElement} from "./../Common/FileIO/Xml";
import {VexFlowMusicSheetCalculator} from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {VexFlowBackend} from "./../MusicalScore/Graphical/VexFlow/VexFlowBackend";
import {MusicSheetReader} from "./../MusicalScore/ScoreIO/MusicSheetReader";
import {GraphicalMusicSheet} from "./../MusicalScore/Graphical/GraphicalMusicSheet";
import {MusicSheetCalculator} from "./../MusicalScore/Graphical/MusicSheetCalculator";
import {VexFlowMusicSheetDrawer} from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {SvgVexFlowBackend} from "./../MusicalScore/Graphical/VexFlow/SvgVexFlowBackend";
import {CanvasVexFlowBackend} from "./../MusicalScore/Graphical/VexFlow/CanvasVexFlowBackend";
import {MusicSheet} from "./../MusicalScore/MusicSheet";
import {Cursor} from "./Cursor";
import {MXLHelper} from "../Common/FileIO/Mxl";
import {Promise} from "es6-promise";
import {AJAX} from "./AJAX";
import * as log from "loglevel";

export class OpenSheetMusicDisplay {
    /**
     * The easy way of displaying a MusicXML sheet music file
     * @param container is either the ID, or the actual "div" element which will host the music sheet
     * @autoResize automatically resize the sheet to full page width on window resize
     */
    constructor(container: string|HTMLElement, autoResize: boolean = false, backend: string = "svg") {
        // Store container element
        if (typeof container === "string") {
            // ID passed
            this.container = document.getElementById(<string>container);
        } else if (container && "appendChild" in <any>container) {
            // Element passed
            this.container = <HTMLElement>container;
        }
        if (!this.container) {
            throw new Error("Please pass a valid div container to OpenSheetMusicDisplay");
        }

        if (backend === "svg") {
            this.backend = new SvgVexFlowBackend();
        } else {
            this.backend = new CanvasVexFlowBackend();
        }

        this.backend.initialize(this.container);
        this.canvas = this.backend.getCanvas();
        const inner: HTMLElement = this.backend.getInnerElement();

        // Create the drawer
        this.drawer = new VexFlowMusicSheetDrawer(this.canvas, this.backend, false);
        // Create the cursor
        this.cursor = new Cursor(inner, this);

        if (autoResize) {
            this.autoResize();
        }
    }

    public cursor: Cursor;
    public zoom: number = 1.0;

    private container: HTMLElement;
    private canvas: HTMLElement;
    private backend: VexFlowBackend;
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
            const str: string = <string>content;
            const self: OpenSheetMusicDisplay = this;
            if (str.substr(0, 4) === "\x50\x4b\x03\x04") {
                // This is a zip file, unpack it first
                return MXLHelper.MXLtoXMLstring(str).then(
                    (x: string) => {
                        return self.load(x);
                    },
                    (err: any) => {
                        log.debug(err);
                        throw new Error("OpenSheetMusicDisplay: Invalid MXL file");
                    }
                );
            }
            // Javascript loads strings as utf-16, which is wonderful BS if you want to parse UTF-8 :S
            if (str.substr(0, 3) === "\uf7ef\uf7bb\uf7bf") {
                // UTF with BOM detected, truncate first three bytes and pass along
                return self.load(str.substr(3));
            }
            if (str.substr(0, 5) === "<?xml") {
                // Parse the string representing an xml file
                const parser: DOMParser = new DOMParser();
                content = parser.parseFromString(str, "application/xml");
            } else if (str.length < 2083) {
                // Assume now "str" is a URL
                // Retrieve the file at the given URL
                return AJAX.ajax(str).then(
                    (s: string) => { return self.load(s); },
                    (exc: Error) => { throw exc; }
                );
            }
        }

        if (!content || !(<any>content).nodeName) {
            return Promise.reject(new Error("OpenSheetMusicDisplay: The document which was provided is invalid"));
        }
        const children: NodeList = (<Document>content).childNodes;
        let elem: Element;
        for (let i: number = 0, length: number = children.length; i < length; i += 1) {
            const node: Node = children[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                elem = <Element>node;
                break;
            }
        }
        if (!elem) {
            return Promise.reject(new Error("OpenSheetMusicDisplay: Document is not a valid 'partwise' MusicXML"));
        }
        const score: IXmlElement = new IXmlElement(elem);
        const calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        const reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "Unknown path");
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        this.cursor.init(this.sheet.MusicPartManager, this.graphic);
        log.info(`Loaded sheet ${this.sheet.TitleString} successfully.`);
        return Promise.resolve({});
    }

    /**
     * Render the music sheet in the container
     */
    public render(): void {
        if (!this.graphic) {
            throw new Error("OpenSheetMusicDisplay: Before rendering a music sheet, please load a MusicXML file");
        }
        const width: number = this.container.offsetWidth;
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
        /*this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(0, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(1, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(2, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(3, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(4, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(5, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(6, 4), OutlineAndFillStyleEnum.PlaybackCursor));
        this.graphic.Cursors.push(this.graphic.calculateCursorLineAtTimestamp(new Fraction(7, 4), OutlineAndFillStyleEnum.PlaybackCursor));*/
        // Update Sheet Page
        const height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * 10.0 * this.zoom;
        this.drawer.clear();
        this.drawer.resize(width, height);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
        // Update the cursor position
        this.cursor.update();
    }

    /**
     * Sets the logging level for this OSMD instance. By default, this is set to `warn`.
     *
     * @param: content can be `trace`, `debug`, `info`, `warn` or `error`.
     */
    public setLogLevel(level: string): void {
        switch (level) {
            case "trace":
                log.setLevel(log.levels.TRACE);
                break;
            case "debug":
                log.setLevel(log.levels.DEBUG);
                break;
            case "info":
                log.setLevel(log.levels.INFO);
                break;
            case "warn":
                log.setLevel(log.levels.WARN);
                break;
            case "error":
                log.setLevel(log.levels.ERROR);
                break;
            default:
                log.warn(`Could not set log level to ${level}. Using warn instead.`);
                log.setLevel(log.levels.WARN);
                break;
        }
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
        // this.canvas.width = 0;
        // this.canvas.height = 0;
    }

    /**
     * Attach the appropriate handler to the window.onResize event
     */
    private autoResize(): void {
        const self: OpenSheetMusicDisplay = this;
        this.handleResize(
            () => {
                // empty
            },
            () => {
                // The following code is probably not needed
                // (the width should adapt itself to the max allowed)
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

    /**
     * Helper function for managing window's onResize events
     * @param startCallback is the function called when resizing starts
     * @param endCallback is the function called when resizing (kind-of) ends
     */
    private handleResize(startCallback: () => void, endCallback: () => void): void {
        let rtime: number;
        let timeout: number = undefined;
        const delta: number = 200;

        function resizeEnd(): void {
            timeout = undefined;
            window.clearTimeout(timeout);
            if ((new Date()).getTime() - rtime < delta) {
                timeout = window.setTimeout(resizeEnd, delta);
            } else {
                endCallback();
            }
        }

        function resizeStart(): void {
            rtime = (new Date()).getTime();
            if (!timeout) {
                startCallback();
                rtime = (new Date()).getTime();
                timeout = window.setTimeout(resizeEnd, delta);
            }
        }

        if ((<any>window).attachEvent) {
            // Support IE<9
            (<any>window).attachEvent("onresize", resizeStart);
        } else {
            window.addEventListener("resize", resizeStart);
        }

        window.setTimeout(startCallback, 0);
        window.setTimeout(endCallback, 1);
    }
}

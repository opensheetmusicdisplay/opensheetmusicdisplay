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
import {DrawingParametersEnum, DrawingParameters} from "../MusicalScore/Graphical/DrawingParameters";
import {IOSMDOptions, OSMDOptions} from "./OSMDOptions";

/**
 * The main class and control point of OpenSheetMusicDisplay.<br>
 * It can display MusicXML sheet music files in an HTML element container.<br>
 * After the constructor, use load() and render() to load and render a MusicXML file.
 */
export class OpenSheetMusicDisplay {
    /**
     * Creates and attaches an OpenSheetMusicDisplay object to an HTML element container.<br>
     * After the constructor, use load() and render() to load and render a MusicXML file.
     * @param container The container element OSMD will be rendered into.<br>
     *                  Either a string specifying the ID of an HTML container element,<br>
     *                  or a reference to the HTML element itself (e.g. div)
     * @param options An object for rendering options like the backend (svg/canvas) or autoResize.<br>
     *                For defaults see the OSMDOptionsStandard method in the [[OSMDOptions]] class.
     */
    constructor(container: string|HTMLElement,
                options: IOSMDOptions = OSMDOptions.OSMDOptionsStandard()) {
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

        if (options.backend === undefined || options.backend.toLowerCase() === "svg") {
            this.backend = new SvgVexFlowBackend();
        } else {
            this.backend = new CanvasVexFlowBackend();
        }

        this.setDrawingParameters(options);

        this.backend.initialize(this.container);
        this.canvas = this.backend.getCanvas();
        this.innerElement = this.backend.getInnerElement();
        this.enableOrDisableCursor(this.drawingParameters.drawCursors);

        // Create the drawer
        this.drawer = new VexFlowMusicSheetDrawer(this.canvas, this.backend, this.drawingParameters);

        if (options.autoResize) {
            this.autoResize();
        }
    }

    public cursor: Cursor;
    public zoom: number = 1.0;

    private container: HTMLElement;
    private canvas: HTMLElement;
    private backend: VexFlowBackend;
    private innerElement: HTMLElement;
    private sheet: MusicSheet;
    private drawer: VexFlowMusicSheetDrawer;
    private graphic: GraphicalMusicSheet;
    private drawingParameters: DrawingParameters;

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
        this.sheet = reader.createMusicSheet(score, "Untitled Score");
        if (this.sheet === undefined) {
            // error loading sheet, probably already logged, do nothing
            return Promise.reject(new Error("given music sheet was incomplete or could not be loaded."));
        }
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        if (this.drawingParameters.drawCursors) {
            this.cursor.init(this.sheet.MusicPartManager, this.graphic);
        }
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
        if (this.drawingParameters.drawCursors) {
            this.graphic.Cursors.length = 0;
        }
        // Update Sheet Page
        const height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * 10.0 * this.zoom;
        this.drawer.clear();
        this.drawer.resize(width, height);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
        if (this.drawingParameters.drawCursors) {
            // Update the cursor position
            this.cursor.update();
        }
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
        if (this.drawingParameters.drawCursors) {
            this.cursor.hide();
        }
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
                if (this.graphic !== undefined) {
                    self.render();
                }
            }
        );
    }

    /**
     * Helper function for managing window's onResize events
     * @param startCallback is the function called when resizing starts
     * @param endCallback is the function called when resizing (kind-of) ends
     */
    private handleResize(startCallback: () => void, endCallback: () => void): void {
        if (this.graphic === undefined) {
            return;
        }
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

    /** Enable or disable (hide) the cursor.
     * @param enable whether to enable (true) or disable (false) the cursor
     */
    public enableOrDisableCursor(enable: boolean): void {
        this.drawingParameters.drawCursors = enable;
        if (enable) {
            if (!this.cursor) {
                this.cursor = new Cursor(this.innerElement, this);
                if (this.sheet && this.graphic) { // else init is called in load()
                    this.cursor.init(this.sheet.MusicPartManager, this.graphic);
                }
            }
        } else { // disable cursor
            if (!this.cursor) {
                return;
            }
            this.cursor.hide();
            // this.cursor = undefined;
            // TODO cursor should be disabled, not just hidden. otherwise user can just call osmd.cursor.hide().
            // however, this could cause null calls (cursor.next() etc), maybe that needs some solution.
        }
    }

    //#region GETTER / SETTER
    private setDrawingParameters(options: IOSMDOptions): void {
        this.drawingParameters = new DrawingParameters();
        if (options.drawingParameters) {
            this.drawingParameters.DrawingParametersEnum =
                (<any>DrawingParametersEnum)[options.drawingParameters.toLowerCase()];
        }
        // individual drawing parameters options
        if (options.disableCursor) {
            this.drawingParameters.drawCursors = false;
        }
        if (options.drawHiddenNotes) {
            this.drawingParameters.drawHiddenNotes = true;
        }
        if (options.drawTitle !== undefined) {
            this.drawingParameters.DrawTitle = options.drawTitle;
        }
        if (options.drawPartNames !== undefined) {
            this.drawingParameters.DrawPartNames = options.drawPartNames;
        }
        if (options.drawLyricist !== undefined) {
            this.drawingParameters.DrawLyricist = options.drawLyricist;
        }
        if (options.drawCredits !== undefined) {
            this.drawingParameters.drawCredits = options.drawCredits;
        }
        if (options.defaultColorNoteHead) {
            this.drawingParameters.defaultColorNoteHead = options.defaultColorNoteHead;
        }
        if (options.defaultColorStem) {
            this.drawingParameters.defaultColorStem = options.defaultColorStem;
        }
    }

    public set DrawSkyLine(value: boolean) {
        if (this.drawer) {
            this.drawer.skyLineVisible = value;
            this.render();
        }
    }

    public get DrawSkyLine(): boolean {
        return this.drawer.skyLineVisible;
    }

    public set DrawBottomLine(value: boolean) {
        if (this.drawer) {
            this.drawer.bottomLineVisible = value;
            this.render();
        }
    }

    public get DrawBottomLine(): boolean {
        return this.drawer.bottomLineVisible;
    }

    public set DrawBoundingBox(value: string) {
        this.drawer.drawableBoundingBoxElement = value;
        this.render();
    }

    public get DrawBoundingBox(): string {
        return this.drawer.drawableBoundingBoxElement;
    }
    //#endregion
}

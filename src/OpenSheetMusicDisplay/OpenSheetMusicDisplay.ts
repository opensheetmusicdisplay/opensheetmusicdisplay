import { IXmlElement } from "./../Common/FileIO/Xml";
import { VexFlowMusicSheetCalculator } from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { VexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/VexFlowBackend";
import { MusicSheetReader } from "./../MusicalScore/ScoreIO/MusicSheetReader";
import { GraphicalMusicSheet } from "./../MusicalScore/Graphical/GraphicalMusicSheet";
import { MusicSheetCalculator } from "./../MusicalScore/Graphical/MusicSheetCalculator";
import { VexFlowMusicSheetDrawer } from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { SvgVexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/SvgVexFlowBackend";
import { CanvasVexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/CanvasVexFlowBackend";
import { MusicSheet } from "./../MusicalScore/MusicSheet";
import { Cursor } from "./Cursor";
import { MXLHelper } from "../Common/FileIO/Mxl";
import { Promise } from "es6-promise";
import { AJAX } from "./AJAX";
import * as log from "loglevel";
import { DrawingParametersEnum, DrawingParameters, ColoringModes } from "../MusicalScore/Graphical/DrawingParameters";
import { IOSMDOptions, OSMDOptions, AutoBeamOptions } from "./OSMDOptions";
import { EngravingRules } from "../MusicalScore/Graphical/EngravingRules";
import { AbstractExpression } from "../MusicalScore/VoiceData/Expressions/AbstractExpression";
import { Dictionary } from "typescript-collections";
import { NoteEnum } from "..";
import { AutoColorSet } from "../MusicalScore";

/**
 * The main class and control point of OpenSheetMusicDisplay.<br>
 * It can display MusicXML sheet music files in an HTML element container.<br>
 * After the constructor, use load() and render() to load and render a MusicXML file.
 */
export class OpenSheetMusicDisplay {
    private version: string = "0.7.1d-dev"; // getter: this.Version
    // at release, bump version and change to -release, afterwards to -dev again

    /**
     * Creates and attaches an OpenSheetMusicDisplay object to an HTML element container.<br>
     * After the constructor, use load() and render() to load and render a MusicXML file.
     * @param container The container element OSMD will be rendered into.<br>
     *                  Either a string specifying the ID of an HTML container element,<br>
     *                  or a reference to the HTML element itself (e.g. div)
     * @param options An object for rendering options like the backend (svg/canvas) or autoResize.<br>
     *                For defaults see the OSMDOptionsStandard method in the [[OSMDOptions]] class.
     */
    constructor(container: string | HTMLElement,
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

        if (options.autoResize === undefined) {
            options.autoResize = true;
        }
        this.setOptions(options);
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
    private autoResizeEnabled: boolean;
    private resizeHandlerAttached: boolean;
    private followCursor: boolean;

    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document, or the string content of a .xml/.mxl file
     */
    public load(content: string | Document): Promise<{}> {
        // Warning! This function is asynchronous! No error handling is done here.
        this.reset();
        if (typeof content === "string") {

            const str: string = <string>content;
            const self: OpenSheetMusicDisplay = this;
            if (str.substr(0, 4) === "\x50\x4b\x03\x04") {
                log.debug("[OSMD] This is a zip file, unpack it first: " + str);
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
                log.debug("[OSMD] UTF with BOM detected, truncate first three bytes and pass along: " + str);
                // UTF with BOM detected, truncate first three bytes and pass along
                return self.load(str.substr(3));
            }
            if (str.substr(0, 5) === "<?xml") {
                log.debug("[OSMD] Finally parsing XML content, length: " + str.length);
                // Parse the string representing an xml file
                const parser: DOMParser = new DOMParser();
                content = parser.parseFromString(str, "application/xml");
            } else if (str.length < 2083) {
                log.debug("[OSMD] Retrieve the file at the given URL: " + str);
                // Assume now "str" is a URL
                // Retrieve the file at the given URL
                return AJAX.ajax(str).then(
                    (s: string) => { return self.load(s); },
                    (exc: Error) => { throw exc; }
                );
            } else {
                console.error("Missing else branch?");
            }
        }

        if (!content || !(<any>content).nodeName) {
            return Promise.reject(new Error("OpenSheetMusicDisplay: The document which was provided is invalid"));
        }
        const xmlDocument: Document = (<Document>content);
        const xmlDocumentNodes: NodeList = xmlDocument.childNodes;
        log.debug("[OSMD] load(), Document url: " + xmlDocument.URL);

        let scorePartwiseElement: Element;
        for (let i: number = 0, length: number = xmlDocumentNodes.length; i < length; i += 1) {
            const node: Node = xmlDocumentNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                scorePartwiseElement = <Element>node;
                break;
            }
        }
        if (!scorePartwiseElement) {
            console.error("Could not parse MusicXML, no valid partwise element found");
            return Promise.reject(new Error("OpenSheetMusicDisplay: Document is not a valid 'partwise' MusicXML"));
        }
        const score: IXmlElement = new IXmlElement(scorePartwiseElement);
        const calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator();
        const reader: MusicSheetReader = new MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "Untitled Score");
        if (this.sheet === undefined) {
            // error loading sheet, probably already logged, do nothing
            return Promise.reject(new Error("given music sheet was incomplete or could not be loaded."));
        }
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        if (this.drawingParameters.drawCursors && this.cursor) {
            this.cursor.init(this.sheet.MusicPartManager, this.graphic);
        }
        log.info(`[OSMD] Loaded sheet ${this.sheet.TitleString} successfully.`);
        return Promise.resolve({});
    }

    /**
     * Render the music sheet in the container
     */
    public render(): void {
        if (!this.graphic) {
            throw new Error("OpenSheetMusicDisplay: Before rendering a music sheet, please load a MusicXML file");
        }
        this.drawer.clear(); // clear canvas before setting width

        // Set page width
        const width: number = this.container.offsetWidth;
        this.sheet.pageWidth = width / this.zoom / 10.0;
        // Before introducing the following optimization (maybe irrelevant), tests
        // have to be modified to ensure that width is > 0 when executed
        //if (isNaN(width) || width === 0) {
        //    return;
        //}

        // Calculate again
        this.graphic.reCalculate();
        const height: number = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * 10.0 * this.zoom;
        if (this.drawingParameters.drawCursors) {
            this.graphic.Cursors.length = 0;
        }
        // Update Sheet Page
        this.drawer.resize(width, height);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
        if (this.drawingParameters.drawCursors && this.cursor) {
            // Update the cursor position
            this.cursor.update();
        }
    }

    /** States whether the render() function can be safely called. */
    public IsReadyToRender(): boolean {
        return this.graphic !== undefined;
    }

    /** Clears what OSMD has drawn on its canvas. */
    public clear(): void {
        this.drawer.clear();
        this.reset(); // without this, resize will draw loaded sheet again
    }

    /** Set OSMD rendering options using an IOSMDOptions object.
     *  Can be called during runtime. Also called by constructor.
     *  For example, setOptions({autoResize: false}) will disable autoResize even during runtime.
     */
    public setOptions(options: IOSMDOptions): void {
        if (!this.drawingParameters) {
            this.drawingParameters = new DrawingParameters();
        }
        if (options === undefined || options === null) {
            log.warn("warning: osmd.setOptions() called without an options parameter, has no effect."
                + "\n" + "example usage: osmd.setOptions({drawCredits: false, drawPartNames: false})");
            return;
        }
        if (options.drawingParameters) {
            this.drawingParameters.DrawingParametersEnum =
                (<any>DrawingParametersEnum)[options.drawingParameters.toLowerCase()];
        }

        const updateExistingBackend: boolean = this.backend !== undefined;
        if (options.backend !== undefined || this.backend === undefined) {
            if (updateExistingBackend) {
                // TODO doesn't work yet, still need to create a new OSMD object

                this.drawer.clear();

                // musicSheetCalculator.clearSystemsAndMeasures() // maybe? don't have reference though
                // musicSheetCalculator.clearRecreatedObjects();
            }
            if (options.backend === undefined || options.backend.toLowerCase() === "svg") {
                this.backend = new SvgVexFlowBackend();
            } else {
                this.backend = new CanvasVexFlowBackend();
            }
            this.backend.initialize(this.container);
            this.canvas = this.backend.getCanvas();
            this.innerElement = this.backend.getInnerElement();
            this.enableOrDisableCursor(this.drawingParameters.drawCursors);
            // Create the drawer
            this.drawer = new VexFlowMusicSheetDrawer(this.canvas, this.backend, this.drawingParameters);
        }

        // individual drawing parameters options
        if (options.autoBeam !== undefined) {
            EngravingRules.Rules.AutoBeamNotes = options.autoBeam;
        }
        const autoBeamOptions: AutoBeamOptions = options.autoBeamOptions;
        if (autoBeamOptions) {
            if (autoBeamOptions.maintain_stem_directions === undefined) {
                autoBeamOptions.maintain_stem_directions = false;
            }
            EngravingRules.Rules.AutoBeamOptions = autoBeamOptions;
            if (autoBeamOptions.groups && autoBeamOptions.groups.length) {
                for (const fraction of autoBeamOptions.groups) {
                    if (fraction.length !== 2) {
                        throw new Error("Each fraction in autoBeamOptions.groups must be of length 2, e.g. [3,4] for beaming three fourths");
                    }
                }
            }
        }

        if (options.coloringMode !== undefined) {
            this.setColoringMode(options);
        }
        if (options.coloringEnabled !== undefined) {
            EngravingRules.Rules.ColoringEnabled = options.coloringEnabled;
        }
        if (options.colorStemsLikeNoteheads !== undefined) {
            EngravingRules.Rules.ColorStemsLikeNoteheads = options.colorStemsLikeNoteheads;
        }
        if (options.disableCursor) {
            this.drawingParameters.drawCursors = false;
            this.enableOrDisableCursor(this.drawingParameters.drawCursors);
        }
        // alternative to if block: this.drawingsParameters.drawCursors = options.drawCursors !== false. No if, but always sets drawingParameters.
        // note that every option can be undefined, which doesn't mean the option should be set to false.
        if (options.drawHiddenNotes) {
            this.drawingParameters.drawHiddenNotes = true;
        }
        if (options.drawCredits !== undefined) {
            this.drawingParameters.DrawCredits = options.drawCredits; // sets DrawComposer, DrawTitle, DrawSubtitle, DrawLyricist.
        }
        if (options.drawComposer !== undefined) {
            this.drawingParameters.DrawComposer = options.drawComposer;
        }
        if (options.drawTitle !== undefined) {
            this.drawingParameters.DrawTitle = options.drawTitle;
        }
        if (options.drawSubtitle !== undefined) {
            this.drawingParameters.DrawSubtitle = options.drawSubtitle;
        }
        if (options.drawLyricist !== undefined) {
            this.drawingParameters.DrawLyricist = options.drawLyricist;
        }
        if (options.drawPartNames !== undefined) {
            this.drawingParameters.DrawPartNames = options.drawPartNames; // indirectly writes to EngravingRules
        }
        if (options.drawPartAbbreviations !== undefined) {
            EngravingRules.Rules.RenderPartAbbreviations = options.drawPartAbbreviations;
        }
        if (options.drawFingerings === false) {
            EngravingRules.Rules.RenderFingerings = false;
        }
        if (options.drawMeasureNumbers !== undefined) {
            EngravingRules.Rules.RenderMeasureNumbers = options.drawMeasureNumbers;
        }
        if (options.measureNumberInterval !== undefined) {
            EngravingRules.Rules.MeasureNumberLabelOffset = options.measureNumberInterval;
        }
        if (options.fingeringPosition !== undefined) {
            EngravingRules.Rules.FingeringPosition = AbstractExpression.PlacementEnumFromString(options.fingeringPosition);
        }
        if (options.fingeringInsideStafflines !== undefined) {
            EngravingRules.Rules.FingeringInsideStafflines = options.fingeringInsideStafflines;
        }
        if (options.followCursor !== undefined) {
            this.FollowCursor = options.followCursor;
        }
        if (options.setWantedStemDirectionByXml !== undefined) {
            EngravingRules.Rules.SetWantedStemDirectionByXml = options.setWantedStemDirectionByXml;
        }
        if (options.defaultColorNotehead) {
            EngravingRules.Rules.DefaultColorNotehead = options.defaultColorNotehead;
        }
        if (options.defaultColorRest) {
            EngravingRules.Rules.DefaultColorRest = options.defaultColorRest;
        }
        if (options.defaultColorStem) {
            EngravingRules.Rules.DefaultColorStem = options.defaultColorStem;
        }
        if (options.defaultColorLabel) {
            EngravingRules.Rules.DefaultColorLabel = options.defaultColorLabel;
        }
        if (options.defaultColorTitle) {
            EngravingRules.Rules.DefaultColorTitle = options.defaultColorTitle;
        }
        if (options.defaultFontFamily) {
            EngravingRules.Rules.DefaultFontFamily = options.defaultFontFamily; // default "Times New Roman", also used if font family not found
        }
        if (options.drawUpToMeasureNumber) {
            EngravingRules.Rules.MaxMeasureToDrawIndex = options.drawUpToMeasureNumber - 1;
        }
        if (options.drawFromMeasureNumber) {
            EngravingRules.Rules.MinMeasureToDrawIndex = options.drawFromMeasureNumber - 1;
        }
        if (options.tupletsRatioed) {
            EngravingRules.Rules.TupletsRatioed = true;
        }
        if (options.tupletsBracketed) {
            EngravingRules.Rules.TupletsBracketed = true;
        }
        if (options.tripletsBracketed) {
            EngravingRules.Rules.TripletsBracketed = true;
        }
        if (options.autoResize) {
            if (!this.resizeHandlerAttached) {
                this.autoResize();
            }
            this.autoResizeEnabled = true;
        } else if (options.autoResize === false) { // not undefined
            this.autoResizeEnabled = false;
            // we could remove the window EventListener here, but not necessary.
        }
    }

    public setColoringMode(options: IOSMDOptions): void {
        if (options.coloringMode === ColoringModes.XML) {
            EngravingRules.Rules.ColoringMode = ColoringModes.XML;
            return;
        }
        const noteIndices: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B, -1];
        let colorSetString: string[];
        if (options.coloringMode === ColoringModes.CustomColorSet) {
            if (!options.coloringSetCustom || options.coloringSetCustom.length !== 8) {
                throw new Error("Invalid amount of colors: With coloringModes.customColorSet, " +
                    "you have to provide a coloringSetCustom parameter with 8 strings (C to B, rest note).");
            }
            // validate strings input
            for (const colorString of options.coloringSetCustom) {
                const regExp: RegExp = /^\#[0-9a-fA-F]{6}$/;
                if (!regExp.test(colorString)) {
                    throw new Error(
                        "One of the color strings in options.coloringSetCustom was not a valid HTML Hex color:\n" + colorString);
                }
            }
            colorSetString = options.coloringSetCustom;
        } else if (options.coloringMode === ColoringModes.AutoColoring) {
            colorSetString = [];
            const keys: string[] = Object.keys(AutoColorSet);
            for (let i: number = 0; i < keys.length; i++) {
                colorSetString.push(AutoColorSet[keys[i]]);
            }
        } // for both cases:
        const coloringSetCurrent: Dictionary<NoteEnum | number, string> = new Dictionary<NoteEnum | number, string>();
        for (let i: number = 0; i < noteIndices.length; i++) {
            coloringSetCurrent.setValue(noteIndices[i], colorSetString[i]);
        }
        coloringSetCurrent.setValue(-1, colorSetString[7]);
        EngravingRules.Rules.ColoringSetCurrent = coloringSetCurrent;

        EngravingRules.Rules.ColoringMode = options.coloringMode;
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

    public getLogLevel(): number {
        return log.getLevel();
    }

    /**
     * Initialize this object to default values
     * FIXME: Probably unnecessary
     */
    private reset(): void {
        if (this.drawingParameters.drawCursors && this.cursor) {
            this.cursor.hide();
        }
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
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
                if (self.IsReadyToRender()) {
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
        let rtime: number;
        let timeout: number = undefined;
        const delta: number = 200;
        const self: OpenSheetMusicDisplay = this;

        function resizeStart(): void {
            if (!self.AutoResizeEnabled) {
                return;
            }
            rtime = (new Date()).getTime();
            if (!timeout) {
                startCallback();
                rtime = (new Date()).getTime();
                timeout = window.setTimeout(resizeEnd, delta);
            }
        }

        function resizeEnd(): void {
            timeout = undefined;
            window.clearTimeout(timeout);
            if ((new Date()).getTime() - rtime < delta) {
                timeout = window.setTimeout(resizeEnd, delta);
            } else {
                endCallback();
            }
        }

        if ((<any>window).attachEvent) {
            // Support IE<9
            (<any>window).attachEvent("onresize", resizeStart);
        } else {
            window.addEventListener("resize", resizeStart);
        }
        this.resizeHandlerAttached = true;

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

    public get AutoResizeEnabled(): boolean {
        return this.autoResizeEnabled;
    }
    public set AutoResizeEnabled(value: boolean) {
        this.autoResizeEnabled = value;
    }

    public set FollowCursor(value: boolean) {
        this.followCursor = value;
    }

    public get FollowCursor(): boolean {
        return this.followCursor;
    }

    public get Sheet(): MusicSheet {
        return this.sheet;
    }
    public get Drawer(): VexFlowMusicSheetDrawer {
        return this.drawer;
    }
    public get GraphicSheet(): GraphicalMusicSheet {
        return this.graphic;
    }
    public get DrawingParameters(): DrawingParameters {
        return this.drawingParameters;
    }
    public get EngravingRules(): EngravingRules { // custom getter, useful for engraving parameter setting in Demo
        return EngravingRules.Rules;
    }
    /** Returns the version of OSMD this object is built from (the version you are using). */
    public get Version(): string {
        return this.version;
    }
    //#endregion
}

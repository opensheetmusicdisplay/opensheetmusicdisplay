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
import { MXLFile, MXLHelper } from "../Common/FileIO/Mxl";
import { AJAX } from "./AJAX";
import log from "loglevel";
import { DrawingParameters } from "../MusicalScore/Graphical/DrawingParameters";
import { DrawingParametersEnum } from "../Common/Enums/DrawingParametersEnum";
import { ColoringModes } from "../Common/Enums/ColoringModes";
import { IOSMDOptions, OSMDOptions, AutoBeamOptions, BackendType, CursorOptions, CursorType } from "./OSMDOptions";
import { EngravingRules, PageFormat } from "../MusicalScore/Graphical/EngravingRules";
import { AbstractExpression } from "../MusicalScore/VoiceData/Expressions/AbstractExpression";
import { Dictionary } from "typescript-collections";
import { AutoColorSet } from "../MusicalScore/Graphical/DrawingEnums";
import { GraphicalMusicPage } from "../MusicalScore/Graphical/GraphicalMusicPage";
import { MusicPartManagerIterator } from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import { ITransposeCalculator } from "../MusicalScore/Interfaces/ITransposeCalculator";
import { NoteEnum } from "../Common/DataObjects/Pitch";
import { GraphicalNote } from "../MusicalScore/Graphical/GraphicalNote";
import { Fraction } from "../Common/DataObjects/Fraction";
import { MultiExpression } from "../MusicalScore/VoiceData/Expressions/MultiExpression";
import { OctaveShift } from "../MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { GraphicalLyricEntry } from "../MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalChordSymbolContainer } from "../MusicalScore/Graphical/GraphicalChordSymbolContainer";
import { GraphicalLabel } from "../MusicalScore/Graphical/GraphicalLabel";
import { MultiTempoExpression } from "../MusicalScore/VoiceData/Expressions/MultiTempoExpression";
import { MidiExporter, MidiExportOptions } from "../MusicalScore/Export/MidiExporter";
import { PointF2D } from "../Common/DataObjects/PointF2D";
import { GraphicalStaffEntry } from "../MusicalScore/Graphical/GraphicalStaffEntry";
import { MusicSystem } from "../MusicalScore/Graphical/MusicSystem";
import { GraphicalMeasure } from "../MusicalScore/Graphical/GraphicalMeasure";
import { AbstractGraphicalExpression } from "../MusicalScore/Graphical/AbstractGraphicalExpression";
import { countLedgerLineNotesForTransposition as countLedgerLineNotesOnMusicSheet } from "./ledgerLineTranspositionCount";
import { RangeSelectionElementCollector } from "./RangeSelectionElementCollector";
import {
    createResolvedRangeSelectionConfig,
    ResolvedRangeSelectionConfig,
    RangeSelectionAnchor,
    RangeSelectionDirection,
    RangeSelectionPayload
} from "./RangeSelection";
import { TemposCalculator } from "../MusicalScore/ScoreIO/MusicSymbolModules/TemposCalculator";

/**
 * The main class and control point of OpenSheetMusicDisplay.<br>
 * It can display MusicXML sheet music files in an HTML element container.<br>
 * After the constructor, use load() and render() to load and render a MusicXML file.
 */
export class OpenSheetMusicDisplay {
    protected version: string = "1.9.9-dev"; // getter: this.Version
    // at release, bump version and change to -release, afterwards to -dev again
    private lastMinMeasureToDrawIndex: number = 0;
    private lastMaxMeasureToDrawIndex: number = Number.MAX_SAFE_INTEGER;

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
        this.backendType = BackendType.SVG; // default, can be changed by options
        this.setOptions(options);
    }

    /** Options from which OSMD creates cursors in enableOrDisableCursors(). */
    public cursorsOptions: CursorOptions[] = [];
    public cursors: Cursor[] = [];
    public get cursor(): Cursor { // lowercase for backwards compatibility since cursor -> cursors change
        return this.cursors[0];
    }
    public get Cursor(): Cursor {
        return this.cursor;
    }
    public zoom: number = 1.0;
    protected zoomUpdated: boolean = false;
    /** Timeout in milliseconds used in osmd.load(string) when string is a URL. */
    public loadUrlTimeout: number = 5000;

    protected container: HTMLElement;
    protected backendType: BackendType;
    protected needBackendUpdate: boolean;
    protected sheet: MusicSheet;
    protected drawer: VexFlowMusicSheetDrawer;
    protected drawBoundingBox: string;
    protected drawSkyLine: boolean;
    protected drawBottomLine: boolean;
    protected graphic: GraphicalMusicSheet;
    protected drawingParameters: DrawingParameters;
    protected rules: EngravingRules;
    private staffOpacityOverrides: Map<number, number> = new Map();
    protected autoResizeEnabled: boolean;
    protected resizeHandlerAttached: boolean;
    protected followCursor: boolean;
    /** A function that is executed when the XML has been read.
     * The return value will be used as the actual XML OSMD parses,
     * so you can make modifications to the xml that OSMD will use.
     * Note that this is (re-)set on osmd.setOptions as `{return xml}`, unless you specify the function in the options. */
    public OnXMLRead: (xml: string) => string;
    public rangeSelection: ResolvedRangeSelectionConfig = createResolvedRangeSelectionConfig();
    private rangeInteractionOverlay: HTMLDivElement;
    private rangeInteractionBoundElements: HTMLElement[] = [];
    private isRangeDragging: boolean = false;
    private hasActiveRangeSelectionOpacity: boolean = false;
    private rangeOpacityUpdateTimeoutId: number = 0;
    private lastRangeOpacityUpdateTimestampMs: number = 0;
    private pendingRangePointerMoveAnchor: RangeSelectionAnchor;
    private rangePointerMoveAnimationFrameId: number = 0;
    private rangeTouchAutoScrollAnimationFrameId: number = 0;
    private rangeViewportUpdateAnimationFrameId: number = 0;
    private rangeViewportSettleUpdateTimeoutId: number = 0;
    private rangeViewportScrollTarget: HTMLElement | Window;
    private readonly rangeOpacityTouchedGraphicalNotes: Set<GraphicalNote> = new Set<GraphicalNote>();
    private readonly rangeOpacityTouchedNoteheadElements: Set<SVGElement> = new Set<SVGElement>();
    private readonly rangeOpacityTouchedElements: Set<Element> = new Set<Element>();
    private readonly rangeSelectionElementCollector: RangeSelectionElementCollector = new RangeSelectionElementCollector();
    private needsCommittedRangeAnchorRefresh: boolean = false;
    private hoverAnchor: RangeSelectionAnchor;
    private dragStartAnchor: RangeSelectionAnchor;
    private dragCurrentAnchor: RangeSelectionAnchor;
    private pendingTouchRangeStartAnchor: RangeSelectionAnchor;
    private activeDragBound: "start" | "end" | "both" = "both";
    private rangeDragPointerCaptureElement: Element;
    private rangeDragPointerId: number = -1;
    private activeTouchPointerId: number = -1;
    private activeTouchStartClientX: number = 0;
    private activeTouchStartClientY: number = 0;
    private activeTouchMoved: boolean = false;
    private activeTouchDownAnchor: RangeSelectionAnchor;
    private activeTouchDragClientX: number = 0;
    private activeTouchDragClientY: number = 0;
    private touchDragScrollLockEnabled: boolean = false;
    private touchDragNativeScrollSuppressed: boolean = false;
    private isRangeHandleDragging: boolean = false;
    private touchPendingAction: "none" | "setOrCommit" | "clearSelection" = "none";
    private readonly rangePointerMoveListener: (event: PointerEvent) => void = (event: PointerEvent): void => this.onRangePointerMove(event);
    private readonly rangePointerDownListener: (event: PointerEvent) => void = (event: PointerEvent): void => this.onRangePointerDown(event);
    private readonly rangePointerUpListener: (event: PointerEvent) => void = (event: PointerEvent): void => this.onRangePointerUp(event);
    private readonly rangePointerCancelListener: (event: PointerEvent) => void = (event: PointerEvent): void => this.onRangePointerCancel(event);
    private readonly rangePointerLeaveListener: (event: PointerEvent) => void = (event: PointerEvent): void => this.onRangePointerLeave(event);
    private readonly touchMoveDuringRangeDragListener: (event: TouchEvent) => void = (event: TouchEvent): void => this.onTouchMoveDuringRangeDrag(event);
    private readonly rangeViewportUpdateListener: () => void = (): void => {
        this.scheduleRangeViewportUpdate();
        this.scheduleRangeViewportSettleUpdate();
    };

    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document,
     *   or the string content of a .xml/.mxl file, or a file blob.
     * @param tempTitle is used as the title for the piece if there is no title in the XML.
     */
    public load(content: string | Document | Blob, tempTitle: string = "Untitled Score"): Promise<{}> {
        // Warning! This function is asynchronous! No error handling is done here.
        this.reset();
        const self: OpenSheetMusicDisplay = this;
        if (content instanceof Blob) {
            const mxlFile: MXLFile = new MXLFile(content);
            // check if this is a zip / mxl file
            return mxlFile.tryUnzip().then(() => {
                if (mxlFile.unzipSuccessful) {
                    return mxlFile.getXmlString().then((xmlString) => {
                        return self.load(xmlString);
                    });
                } else {
                    // not a zip
                    if (content instanceof Blob) { // always true. unfortunately need to check again for linter
                        return content.text().then((blobString) => {
                            return self.load(blobString);
                        });
                    }
                }
            });
        } else if (typeof content === "string") {
            const str: string = <string>content;
            // console.log("substring: " + str.substr(0, 5));
            if (str.startsWith("\x50\x4b\x03\x04")) {
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
            if (str.startsWith("\uf7ef\uf7bb\uf7bf")) {
                log.debug("[OSMD] UTF with BOM detected, truncate first 3 bytes and pass along: " + str);
                // UTF with BOM detected, truncate first three bytes and pass along
                return self.load(str.substring(3));
            }
            let trimmedStr: string = str;
            if (/^\s/.test(trimmedStr)) { // only trim if we need to. (end of string is irrelevant)
                trimmedStr = trimmedStr.trim(); // trim away empty lines at beginning etc
            }
            if (trimmedStr.startsWith("<?xml")) { // first character is sometimes null, making first five characters '<?xm'.
                const modifiedXml: string = this.OnXMLRead(trimmedStr); // by default just returns trimmedStr unless a function options.OnXMLRead was set.
                log.debug("[OSMD] Finally parsing XML content, length: " + modifiedXml.length);
                // Parse the string representing an xml file
                const parser: DOMParser = new DOMParser();
                content = parser.parseFromString(modifiedXml, "application/xml");
            } else if (trimmedStr.length < 2083) { // TODO do proper URL format check
                log.debug("[OSMD] Retrieve the file at the given URL: " + trimmedStr);
                // Assume now "str" is a URL
                // Retrieve the file at the given URL
                return AJAX.ajax(trimmedStr, this.loadUrlTimeout).then(
                    (s: string) => { return self.load(s); },
                    (exc: Error) => { throw exc; }
                );
            } else {
                console.error("[OSMD] osmd.load(string): Could not process string. Did not find <?xml at beginning.");
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
        const temposCalculator: TemposCalculator = new TemposCalculator();
        const reader: MusicSheetReader = new MusicSheetReader([temposCalculator], this.rules);
        this.sheet = reader.createMusicSheet(score, tempTitle);
        if (this.sheet === undefined) {
            // error loading sheet, probably already logged, do nothing
            return Promise.reject(new Error("given music sheet was incomplete or could not be loaded."));
        }
        // if (this.sheet.TitleString === "osmd.Version") {
        //     this.sheet.TitleString = "OSMD version: " + this.Version; // useful for debug e.g. when console not available
        // }
        log.info(`[OSMD] Loaded sheet ${this.sheet.TitleString} successfully.`);

        this.needBackendUpdate = true;
        this.updateGraphic();

        return Promise.resolve({});
    }

    /**
     * (Re-)creates the graphic sheet from the music sheet
     */
    public updateGraphic(): void {
        const calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator(this.rules);
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        if (this.drawingParameters.drawCursors) {
            this.cursors.forEach(cursor => {
                cursor.init(this.sheet.MusicPartManager, this.graphic);
            });
        }
        if (this.drawingParameters.DrawingParametersEnum === DrawingParametersEnum.leadsheet) {
            this.graphic.LeadSheet = true;
        }
    }

    /** Render the loaded music sheet to the container. */
    public render(): void {
        if (!this.graphic) {
            throw new Error("OSMD: load() needs to be called before render()");
        }
        this.rangeSelectionElementCollector.invalidate();
        this.drawer?.clear(); // clear canvas before setting width
        // this.graphic.GetCalculator.clearSystemsAndMeasures(); // maybe?
        // this.graphic.GetCalculator.clearRecreatedObjects();

        // drawing range: check if pickup measure and start or end measure number > 1
        if (this.Sheet.SourceMeasures[0].ImplicitMeasure) {
            if (this.rules.MinMeasureToDrawNumber > 1) {
                this.rules.MinMeasureToDrawIndex = this.rules.MinMeasureToDrawNumber; // -1 for index, +1 for pickup
            }
            if (this.rules.MaxMeasureToDrawNumber > 0) {
                this.rules.MaxMeasureToDrawIndex = this.rules.MaxMeasureToDrawNumber; // -1 for index, +1 for pickup
            }
        }

        // Set page width
        let width: number = this.container.offsetWidth;
        if (this.rules.RenderSingleHorizontalStaffline) {
            width = this.rules.SheetMaximumWidth; // set safe maximum (browser limit), will be reduced later
            // reduced later in MusicSheetCalculator.calculatePageLabels (sets sheet.pageWidth to page.PositionAndShape.Size.width before labels)
            // rough calculation:
            // width = 600 * this.sheet.SourceMeasures.length;
        }
        // log.debug("[OSMD] render width: " + width);

        this.sheet.pageWidth = width / this.zoom / 10.0;
        if (this.rules.PageFormat && !this.rules.PageFormat.IsUndefined) {
            this.rules.PageHeight = this.sheet.pageWidth / this.rules.PageFormat.aspectRatio;
            log.debug("[OSMD] PageHeight: " + this.rules.PageHeight);
        } else {
            log.debug("[OSMD] endless/undefined pageformat, id: " + this.rules.PageFormat.idString);
            this.rules.PageHeight = 100001; // infinite page height // TODO maybe Number.MAX_VALUE or Math.pow(10, 20)?
        }

        // Before introducing the following optimization (maybe irrelevant), tests
        // have to be modified to ensure that width is > 0 when executed
        //if (isNaN(width) || width === 0) {
        //    return;
        //}

        // Rebuild measures when drawing range changed so state like 8va spans is seeded correctly
        const currentMinIndex: number = this.rules.MinMeasureToDrawIndex;
        const currentMaxIndex: number = this.rules.MaxMeasureToDrawIndex;
        if (this.lastMinMeasureToDrawIndex !== currentMinIndex || this.lastMaxMeasureToDrawIndex !== currentMaxIndex) {
            this.graphic.Initialize();
            this.graphic.GetCalculator.prepareGraphicalMusicSheet();
            this.lastMinMeasureToDrawIndex = currentMinIndex;
            this.lastMaxMeasureToDrawIndex = currentMaxIndex;
        }

        // Calculate again
        this.graphic.reCalculate();

        if (this.drawingParameters.drawCursors) {
            this.graphic.Cursors.length = 0;
        }

        // needBackendUpdate is well intentioned, but we need to cover all cases.
        //   backends also need an update when this.zoom was set from outside, which unfortunately doesn't have a setter method to set this in.
        //   so just for compatibility, we need to assume users set osmd.zoom, so we'd need to check whether it was changed compared to last time.
        if (true || this.needBackendUpdate) {
            this.createOrRefreshRenderBackend();
            this.needBackendUpdate = false;
        }

        this.drawer.setZoom(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);

        this.enableOrDisableCursors(this.drawingParameters.drawCursors);

        if (this.drawingParameters.drawCursors) {
            // Update the cursor position
            this.cursors.forEach(cursor => {
                cursor.update();
            });
        }
        this.reapplyStaffOpacityOverrides();
        this.syncInteractiveRangeSelection();
        this.needsCommittedRangeAnchorRefresh = true;
        this.renderRangeSelection();
        this.zoomUpdated = false;
        this.rules.RenderCount++;
        //console.log("[OSMD] render finished");
    }

    protected createOrRefreshRenderBackend(): void {
        // console.log("[OSMD] createOrRefreshRenderBackend()");

        // Remove old backends
        if (this.drawer && this.drawer.Backends) {
            // removing single children to remove all is error-prone, because sometimes a random SVG-child remains.
            // for (const backend of this.drawer.Backends) {
            //     backend.removeFromContainer(this.container);
            // }
            if (this.drawer.Backends[0]) {
                this.drawer.Backends[0].removeAllChildrenFromContainer(this.container);
            }
            for (const backend of this.drawer.Backends) {
                backend.free();
            }
            this.drawer.Backends.clear();
        }

        // Create the drawer
        this.drawingParameters.Rules = this.rules;
        this.drawer = new VexFlowMusicSheetDrawer(this.drawingParameters); // note that here the drawer.drawableBoundingBoxElement is lost. now saved in OSMD.
        this.drawer.drawableBoundingBoxElement = this.DrawBoundingBox;
        this.drawer.bottomLineVisible = this.drawBottomLine;
        this.drawer.skyLineVisible = this.drawSkyLine;

        // Set page width
        let width: number = this.container.offsetWidth;
        if (this.rules.RenderSingleHorizontalStaffline) {
            width = (this.EngravingRules.PageLeftMargin + this.graphic.MusicPages[0].PositionAndShape.Size.width + this.EngravingRules.PageRightMargin)
                * 10 * this.zoom;
            // this.container.style.width = width + "px";
            // console.log("width: " + width)
        }
        // TODO width may need to be coordinated with render() where width is also used
        let height: number;
        const canvasDimensionsLimit: number = 32767; // browser limitation. Chrome/Firefox (16 bit, 32768 causes an error).
        // Could be calculated by canvas-size module.
        // see #678 on Github and here: https://stackoverflow.com/a/11585939/10295942

        // TODO check if resize is necessary. set needResize or something when size was changed
        for (const page of this.graphic.MusicPages) {
            if (page.PageNumber > this.rules.MaxPageToDrawNumber) {
                break; // don't add the bounding boxes of pages that aren't drawn to the container height etc
            }
            const backend: VexFlowBackend = this.createBackend(this.backendType, page);
            const sizeWarningPartTwo: string = " exceeds CanvasBackend limit of 32767. Cutting off score.";
            if (backend.getOSMDBackendType() === BackendType.Canvas && width > canvasDimensionsLimit) {
                log.warn("[OSMD] Warning: width of " + width + sizeWarningPartTwo);
                width = canvasDimensionsLimit;
            }
            if (this.rules.PageFormat && !this.rules.PageFormat.IsUndefined) {
                height = width / this.rules.PageFormat.aspectRatio;
                // console.log("pageformat given. height: " + page.PositionAndShape.Size.height);
            } else {
                height = page.PositionAndShape.Size.height;
                height += this.rules.PageBottomMargin;
                if (backend.getOSMDBackendType() === BackendType.Canvas) {
                    height += 0.1; // Canvas bug: cuts off bottom pixel with PageBottomMargin = 0. Doesn't happen with SVG.
                    //  we could only add 0.1 if PageBottomMargin === 0, but that would mean a margin of 0.1 has no effect compared to 0.
                }
                //height += this.rules.CompactMode ? this.rules.PageTopMarginNarrow : this.rules.PageTopMargin;
                // adding the PageTopMargin with a composer label leads to the margin also added to the bottom of the page
                height += page.PositionAndShape.BorderTop;
                // try to respect elements like composer cut off: this gets messy.
                // if (page.PositionAndShape.BorderTop < 0 && this.rules.PageTopMargin === 0) {
                //     height += page.PositionAndShape.BorderTop + this.rules.PageTopMargin;
                // }
                if (this.rules.RenderTitle) {
                    height += this.rules.TitleTopDistance;
                }
                height *= this.zoom * 10.0;
                // console.log("pageformat not given. height: " + page.PositionAndShape.Size.height);
            }
            if (backend.getOSMDBackendType() === BackendType.Canvas && height > canvasDimensionsLimit) {
                log.warn("[OSMD] Warning: height of " + height + sizeWarningPartTwo);
                height = Math.min(height, canvasDimensionsLimit); // this cuts off the the score, but doesn't break rendering.
                // TODO optional: reduce zoom to fit the score within the limit.
            }

            backend.resize(width, height); // this resets strokeStyle for Canvas
            backend.clear(); // set bgcolor if defined (this.rules.PageBackgroundColor, see OSMDOptions)
            backend.getContext().setFillStyle(this.rules.DefaultColorMusic);
            backend.getContext().setStrokeStyle(this.rules.DefaultColorMusic); // needs to be set after resize()
            this.drawer.Backends.push(backend);
            this.graphic.drawer = this.drawer;
        }
    }

    // for now SVG only, see generateImages_browserless (PNG/SVG)
    public exportSVG(): void {
        if (!this.drawer) {
            return;
        }
        for (const backend of this.drawer.Backends) {
            if (backend instanceof SvgVexFlowBackend) {
                (backend as SvgVexFlowBackend).export();
            }
            // if we add CanvasVexFlowBackend exporting, rename function to export() or exportImages() again
        }
    }

    /**
     * Export the loaded music sheet as a MIDI file.
     * @param options Optional MIDI export options
     * @returns Uint8Array containing the MIDI file data, or undefined if no sheet is loaded
     */
    public exportMIDI(options?: MidiExportOptions): Uint8Array | undefined {
        if (!this.sheet) {
            log.warn("[OSMD] exportMIDI(): No music sheet loaded.");
            return undefined;
        }
        const exporter: MidiExporter = new MidiExporter(this.sheet, options);
        return exporter.export();
    }

    /**
     * Export the loaded music sheet as a MIDI file and trigger a download.
     * @param filename Optional filename for the download (default: based on sheet title)
     * @param options Optional MIDI export options
     */
    public exportMIDIDownload(filename?: string, options?: MidiExportOptions): void {
        if (!this.sheet) {
            log.warn("[OSMD] exportMIDIDownload(): No music sheet loaded.");
            return;
        }
        const exporter: MidiExporter = new MidiExporter(this.sheet, options);
        exporter.exportAndDownload(filename);
    }

    /** States whether the render() function can be safely called. */
    public IsReadyToRender(): boolean {
        return this.graphic !== undefined;
    }

    /**
     * Gets all lyric entries across all pages and measures.
     * Useful for adding hover/click handlers to lyrics.
     * Returns empty array if sheet is not loaded or rendered.
     */
    public getAllLyricEntries(): GraphicalLyricEntry[] {
        if (!this.graphic) {
            return [];
        }
        return this.graphic.getAllLyricEntries();
    }

    /**
     * Gets all chord symbol containers across all pages and measures.
     * Useful for adding hover/click handlers to harmony symbols.
     * Returns empty array if sheet is not loaded or rendered.
     */
    public getAllChordSymbolContainers(): GraphicalChordSymbolContainer[] {
        if (!this.graphic) {
            return [];
        }
        return this.graphic.getAllChordSymbolContainers();
    }

    /** Clears what OSMD has drawn on its canvas. */
    public clear(): void {
        this.drawer?.clear();
        this.reset(); // without this, resize will draw loaded sheet again
    }

    /** Returns the currently committed interactive range selection, if any. */
    public getRangeSelection(): RangeSelectionPayload {
        if (!this.dragStartAnchor || !this.dragCurrentAnchor) {
            return undefined;
        }
        return this.createSelectionPayload("committed", this.dragStartAnchor, this.dragCurrentAnchor, false);
    }

    /** Programmatically sets the interactive range selection using absolute score timestamps. */
    public setRangeSelection(start: Fraction, end: Fraction): void {
        if (!this.graphic || !start || !end) {
            return;
        }
        const startAnchor: RangeSelectionAnchor = this.createAnchorFromTimestamp(start);
        const endAnchor: RangeSelectionAnchor = this.createAnchorFromTimestamp(end);
        if (!startAnchor || !endAnchor) {
            return;
        }
        this.dragStartAnchor = startAnchor;
        this.dragCurrentAnchor = endAnchor;
        this.pendingTouchRangeStartAnchor = undefined;
        this.renderRangeSelection();
        this.emitRangeSelection("committed", startAnchor, endAnchor, false);
    }

    /** Clears the interactive range selection and removes all related overlays. */
    public clearRangeSelection(emitCallback: boolean = true): void {
        const hadSelection: boolean = !!(this.dragStartAnchor && this.dragCurrentAnchor);
        const startAnchor: RangeSelectionAnchor = this.dragStartAnchor;
        const endAnchor: RangeSelectionAnchor = this.dragCurrentAnchor;
        this.dragStartAnchor = undefined;
        this.dragCurrentAnchor = undefined;
        this.pendingTouchRangeStartAnchor = undefined;
        this.activeDragBound = "both";
        this.isRangeDragging = false;
        this.emitRangeHandleDragging(false);
        this.resetTouchGestureState();
        this.renderRangeSelection();
        if (emitCallback && hadSelection && startAnchor && endAnchor) {
            this.emitRangeSelection("cleared", startAnchor, endAnchor, false);
        }
    }

    /** Set OSMD rendering options using an IOSMDOptions object.
     *  Can be called during runtime. Also called by constructor.
     *  For example, setOptions({autoResize: false}) will disable autoResize even during runtime.
     */
    public setOptions(options: IOSMDOptions): void {
        if (!this.rules) {
            this.rules = new EngravingRules();
        }
        if (!this.drawingParameters && !options.drawingParameters) {
            this.drawingParameters = new DrawingParameters(DrawingParametersEnum.default, this.rules);
            // if "default", will be created below
        } else if (options.drawingParameters) {
            if (!this.drawingParameters) {
                this.drawingParameters = new DrawingParameters(DrawingParametersEnum[options.drawingParameters], this.rules);
            } else {
                this.drawingParameters.DrawingParametersEnum =
                    (<any>DrawingParametersEnum)[options.drawingParameters.toLowerCase()];
                    // see DrawingParameters.ts: set DrawingParametersEnum, and DrawingParameters.ts:setForCompactTightMode()
            }
        }
        if (options === undefined || options === null) {
            log.warn("warning: osmd.setOptions() called without an options parameter, has no effect."
                + "\n" + "example usage: osmd.setOptions({drawCredits: false, drawPartNames: false})");
            return;
        }
        this.OnXMLRead = function(xml): string {return xml;};
        if (options.onXMLRead) {
            this.OnXMLRead = options.onXMLRead;
        }
        if (options.rangeSelection !== undefined) {
            if (options.rangeSelection.callbacks !== undefined) {
                this.rangeSelection.callbacks = {
                    ...this.rangeSelection.callbacks,
                    ...options.rangeSelection.callbacks
                };
            }
            if (options.rangeSelection.options !== undefined) {
                this.rangeSelection.options = {
                    ...this.rangeSelection.options,
                    ...options.rangeSelection.options
                };
                if (options.rangeSelection.options.enabled !== undefined) {
                    this.rangeSelection.enabled = options.rangeSelection.options.enabled;
                }
            }
            if (options.rangeSelection.enabled !== undefined) {
                this.rangeSelection.enabled = options.rangeSelection.enabled;
            }
        }
        // Backwards compatibility with legacy top-level range options/callbacks.
        if ("onRangeSelectionChange" in options) {
            this.rangeSelection.callbacks.onChange = options.onRangeSelectionChange;
        }
        if ("onRangeSelectionLoopRequest" in options) {
            this.rangeSelection.callbacks.onLoopRequest = options.onRangeSelectionLoopRequest;
        }
        if ("onRangeSelectionClearRequest" in options) {
            this.rangeSelection.callbacks.onClearRequest = options.onRangeSelectionClearRequest;
        }
        if ("onRangeSelectionControlsRender" in options) {
            this.rangeSelection.callbacks.onControlsRender = options.onRangeSelectionControlsRender;
        }
        if ("onRangeHandleDraggingChange" in options) {
            this.rangeSelection.callbacks.onHandleDraggingChange = options.onRangeHandleDraggingChange;
        }
        if (options.interactiveRangeSelection !== undefined) {
            this.rangeSelection.enabled = options.interactiveRangeSelection;
        }
        if (options.interactiveRangeSelectionOptions !== undefined) {
            this.rangeSelection.options = {
                ...this.rangeSelection.options,
                ...options.interactiveRangeSelectionOptions
            };
            if (options.interactiveRangeSelectionOptions.enabled !== undefined) {
                this.rangeSelection.enabled = options.interactiveRangeSelectionOptions.enabled;
            }
        }

        const backendNotInitialized: boolean = !this.drawer || !this.drawer.Backends || this.drawer.Backends.length < 1;
        let needBackendUpdate: boolean = backendNotInitialized;
        if (options.backend !== undefined) {
            const backendTypeGiven: BackendType = OSMDOptions.BackendTypeFromString(options.backend);
            needBackendUpdate = needBackendUpdate || this.backendType !== backendTypeGiven;
            this.backendType = backendTypeGiven;
        }
        this.needBackendUpdate = needBackendUpdate;
        // TODO this is a necessary step during the OSMD constructor. Maybe move this somewhere else

        // individual drawing parameters options
        if (options.autoBeam !== undefined) { // only change an option if it was given in options, otherwise it will be undefined
            this.rules.AutoBeamNotes = options.autoBeam;
        }
        const autoBeamOptions: AutoBeamOptions = options.autoBeamOptions;
        if (autoBeamOptions) {
            if (autoBeamOptions.maintain_stem_directions === undefined) {
                autoBeamOptions.maintain_stem_directions = false;
            }
            this.rules.AutoBeamOptions = autoBeamOptions;
            if (autoBeamOptions.groups && autoBeamOptions.groups.length) {
                for (const fraction of autoBeamOptions.groups) {
                    if (fraction.length !== 2) {
                        throw new Error("Each fraction in autoBeamOptions.groups must be of length 2, e.g. [3,4] for beaming three fourths");
                    }
                }
            }
        }
        if (options.percussionOneLineCutoff !== undefined) {
            this.rules.PercussionOneLineCutoff = options.percussionOneLineCutoff;
        }
        if (this.rules.PercussionOneLineCutoff !== 0 &&
            options.percussionForceVoicesOneLineCutoff !== undefined) {
            this.rules.PercussionForceVoicesOneLineCutoff = options.percussionForceVoicesOneLineCutoff;
        }
        if (options.alignRests !== undefined) {
            this.rules.AlignRests = options.alignRests;
        }
        if (options.calculateMultiVoiceRestCollisions !== undefined) {
            this.rules.CalculateMultiVoiceRestCollisions = options.calculateMultiVoiceRestCollisions;
        }
        if (options.coloringMode !== undefined) {
            this.setColoringMode(options);
        }
        if (options.coloringEnabled !== undefined) {
            this.rules.ColoringEnabled = options.coloringEnabled;
        }
        if (options.colorStemsLikeNoteheads !== undefined) {
            this.rules.ColorStemsLikeNoteheads = options.colorStemsLikeNoteheads;
        }
        if (options.disableCursor) {
            this.drawingParameters.drawCursors = false;
        }

        // alternative to if block: this.drawingsParameters.drawCursors = options.drawCursors !== false. No if, but always sets drawingParameters.
        // note that every option can be undefined, which doesn't mean the option should be set to false.
        if (options.drawHiddenNotes) {
            this.drawingParameters.drawHiddenNotes = true; // not yet supported
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
        if (options.drawMetronomeMarks !== undefined) {
            this.rules.MetronomeMarksDrawn = options.drawMetronomeMarks;
        }
        if (options.drawPartNames !== undefined) {
            this.drawingParameters.DrawPartNames = options.drawPartNames; // indirectly writes to EngravingRules

            // by default, disable part abbreviations too, unless set explicitly.
            if (!options.drawPartAbbreviations) {
                this.rules.RenderPartAbbreviations = options.drawPartNames;
            }
        }
        if (options.drawPartAbbreviations !== undefined) {
            this.rules.RenderPartAbbreviations = options.drawPartAbbreviations;
        }
        if (options.drawPartAbbreviationsOnFirstSystem !== undefined) {
            this.rules.RenderPartAbbreviationsOnFirstSystem = options.drawPartAbbreviationsOnFirstSystem;
        }
        if (options.drawFingerings === false) {
            this.rules.RenderFingerings = false;
        }
        if (options.drawMeasureNumbers !== undefined) {
            this.rules.RenderMeasureNumbers = options.drawMeasureNumbers;
        }
        if (options.drawMeasureNumbersOnlyAtSystemStart) {
            this.rules.RenderMeasureNumbersOnlyAtSystemStart = options.drawMeasureNumbersOnlyAtSystemStart;
        }
        if (options.drawLyrics !== undefined) {
            this.rules.RenderLyrics = options.drawLyrics;
        }
        if (options.drawTimeSignatures !== undefined) {
            this.rules.RenderTimeSignatures = options.drawTimeSignatures;
        }
        if (options.drawSlurs !== undefined) {
            this.rules.RenderSlurs = options.drawSlurs;
        }
        if (options.measureNumberInterval !== undefined) {
            this.rules.MeasureNumberLabelOffset = options.measureNumberInterval;
        }
        if (options.useXMLMeasureNumbers !== undefined) {
            this.rules.UseXMLMeasureNumbers = options.useXMLMeasureNumbers;
        }
        if (options.fingeringPosition !== undefined) {
            this.rules.FingeringPosition = AbstractExpression.PlacementEnumFromString(options.fingeringPosition);
        }
        if (options.fingeringInsideStafflines !== undefined) {
            this.rules.FingeringInsideStafflines = options.fingeringInsideStafflines;
        }
        if (options.newSystemFromXML !== undefined) {
            this.rules.NewSystemAtXMLNewSystemAttribute = options.newSystemFromXML;
        }
        if (options.newSystemFromNewPageInXML !== undefined) {
            this.rules.NewSystemAtXMLNewPageAttribute = options.newSystemFromNewPageInXML;
        }
        if (options.newPageFromXML !== undefined) {
            this.rules.NewPageAtXMLNewPageAttribute = options.newPageFromXML;
        }
        if (options.fillEmptyMeasuresWithWholeRest !== undefined) {
            this.rules.FillEmptyMeasuresWithWholeRest = options.fillEmptyMeasuresWithWholeRest;
        }
        if (options.followCursor !== undefined) {
            this.FollowCursor = options.followCursor;
        }
        if (options.setWantedStemDirectionByXml !== undefined) {
            this.rules.SetWantedStemDirectionByXml = options.setWantedStemDirectionByXml;
        }
        if (options.darkMode) {
            this.rules.applyDefaultColorMusic("#FFFFFF");
            this.rules.PageBackgroundColor = "#000000";
            this.rules.DarkModeEnabled = true;
        } else if (options.darkMode === false) { // not if undefined!
            this.rules.applyDefaultColorMusic("#000000");
            this.rules.PageBackgroundColor = undefined;
            this.rules.DarkModeEnabled = false;
        }
        if (options.defaultColorMusic) {
            this.rules.applyDefaultColorMusic(options.defaultColorMusic);
        }
        if (options.defaultColorNotehead) {
            this.rules.DefaultColorNotehead = options.defaultColorNotehead;
        }
        if (options.defaultColorRest) {
            this.rules.DefaultColorRest = options.defaultColorRest;
        }
        if (options.defaultColorStem) {
            this.rules.DefaultColorStem = options.defaultColorStem;
        }
        if (options.defaultColorLabel) {
            this.rules.DefaultColorLabel = options.defaultColorLabel;
        }
        if (options.defaultColorTitle) {
            this.rules.DefaultColorTitle = options.defaultColorTitle;
        }
        if (options.defaultFontFamily) {
            this.rules.DefaultFontFamily = options.defaultFontFamily; // default "Times New Roman", also used if font family not found
        }
        if (options.defaultFontStyle) {
            this.rules.DefaultFontStyle = options.defaultFontStyle; // e.g. FontStyles.Bold
        }
        if (options.drawUpToMeasureNumber >= 0) {
            this.rules.MaxMeasureToDrawIndex = Math.max(options.drawUpToMeasureNumber - 1, 0);
            this.rules.MaxMeasureToDrawNumber = options.drawUpToMeasureNumber;
        }
        if (options.drawFromMeasureNumber >= 0) {
            this.rules.MinMeasureToDrawIndex = Math.max(options.drawFromMeasureNumber - 1, 0);
            this.rules.MinMeasureToDrawNumber = options.drawFromMeasureNumber;
            // if there's a pickup measure (index and number 0), the start index might need to be + 1
            //   depending on which measure you start rendering from (measure 2 for example, instead of 0),
            //   so it is currently useful to store this option value separately from the index, to readjust the index.
        }
        if (options.drawUpToPageNumber) {
            this.rules.MaxPageToDrawNumber = options.drawUpToPageNumber;
        }
        if (options.drawUpToSystemNumber) {
            this.rules.MaxSystemToDrawNumber = options.drawUpToSystemNumber;
        }
        if (options.tupletsRatioed) {
            this.rules.TupletsRatioed = true;
        }
        if (options.tupletsBracketed) {
            this.rules.TupletsBracketed = true;
        }
        if (options.tripletsBracketed) {
            this.rules.TripletsBracketed = true;
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
        if (options.pageFormat !== undefined) { // only change this option if it was given, see above
            this.setPageFormat(options.pageFormat);
        }
        if (options.pageBackgroundColor !== undefined) {
            this.rules.PageBackgroundColor = options.pageBackgroundColor;
        }
        if (options.renderSingleHorizontalStaffline !== undefined) {
            this.rules.RenderSingleHorizontalStaffline = options.renderSingleHorizontalStaffline;
        }
        if (options.spacingFactorSoftmax !== undefined) {
            this.rules.SoftmaxFactorVexFlow = options.spacingFactorSoftmax;
        }
        if (options.spacingBetweenTextLines !== undefined) {
            this.rules.SpacingBetweenTextLines = options.spacingBetweenTextLines;
        }
        if (options.stretchLastSystemLine !== undefined) {
            this.rules.StretchLastSystemLine = options.stretchLastSystemLine;
        }
        if (options.autoGenerateMultipleRestMeasuresFromRestMeasures !== undefined) {
            this.rules.AutoGenerateMultipleRestMeasuresFromRestMeasures = options.autoGenerateMultipleRestMeasuresFromRestMeasures;
        }
        if (options.cursorsOptions !== undefined) {
            this.cursorsOptions = options.cursorsOptions;
        } else {
            // Preserve existing polyfill setting if not explicitly overridden
            const existingPolyfill: boolean = this.cursorsOptions?.[0]?.followCursorPolyfill;
            const newPolyfill: boolean = options.followCursorPolyfill !== undefined ? options.followCursorPolyfill : existingPolyfill;

            this.cursorsOptions = [{
                type: CursorType.Standard,
                color: this.EngravingRules.DefaultColorCursor,
                alpha: 0.5,
                follow: true,
                followCursorPolyfill: newPolyfill
            }];
        }
        if (options.preferredSkyBottomLineBatchCalculatorBackend !== undefined) {
            this.rules.PreferredSkyBottomLineBatchCalculatorBackend = options.preferredSkyBottomLineBatchCalculatorBackend;
        }
        if (options.skyBottomLineBatchMinMeasures !== undefined) {
            this.rules.SkyBottomLineBatchMinMeasures = options.skyBottomLineBatchMinMeasures;
        }
        this.syncInteractiveRangeSelection();
    }

    public setColoringMode(options: IOSMDOptions): void {
        if (options.coloringMode === ColoringModes.XML) {
            this.rules.ColoringMode = ColoringModes.XML;
            return;
        }
        const noteIndices: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
        let colorSetString: string[];
        if (options.coloringMode === ColoringModes.CustomColorSet) {
            if (!options.coloringSetCustom || options.coloringSetCustom.length !== 8) {
                throw new Error("Invalid amount of colors: With coloringModes.customColorSet, " +
                    "you have to provide a coloringSetCustom parameter (array) with 8 strings (C to B, rest note).");
            }
            // validate strings input
            for (const colorString of options.coloringSetCustom) {
                const regExp: RegExp = /^#[0-9a-fA-F]{6}$/;
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
        coloringSetCurrent.setValue(-1, colorSetString.last()); // index 7. Unfortunately -1 is not a NoteEnum value, so we can't put it into noteIndices
        this.rules.ColoringSetCurrent = coloringSetCurrent;
        this.rules.ColoringMode = options.coloringMode;
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
            case "silent":
                log.setLevel(log.levels.SILENT);
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
    protected reset(): void {
        if (this.drawingParameters.drawCursors) {
            this.cursors.forEach(cursor => {
                cursor.hide();
            });
        }
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.rules.RenderCount = 0;
        this.staffOpacityOverrides.clear();
        this.rangeSelectionElementCollector.invalidate();
        this.clearRangeSelection(false);
        this.hoverAnchor = undefined;
        this.detachRangeSelectionListeners();
        this.removeRangeSelectionOverlay();
    }

    /**
     * Attach the appropriate handler to the window.onResize event
     */
    protected autoResize(): void {

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

                // recalculate beams, are otherwise not updated and can detach from stems, see #724
                if (this.graphic?.GetCalculator instanceof VexFlowMusicSheetCalculator) { // null and type check
                    (this.graphic.GetCalculator as VexFlowMusicSheetCalculator).beamsNeedUpdate = true;
                }
                if (self.IsReadyToRender()) {
                    self.renderAndScrollBack(); // just calling render() will scroll to the top of the page
                }
            }
        );
    }

    /** Re-render and scroll back to previous scroll bar y position in percent.
     * If the document keeps the same height/length, the scroll bar position will basically be unchanged.
     * For example, if you scroll to the bottom of the page, resize by one pixel (or enable dark mode) and call this,
     *   for the human eye there will be no detectable scrolling or change in the scroll position at all.
     * If you just call render() instead of renderAndScrollBack(),
     *   it will scroll you back to the top of the page, even if you were scrolled to the bottom before. */
    public renderAndScrollBack(): void {
        const previousScrollY: number = window.scrollY;
        const previousScrollHeight: number = document.body.scrollHeight; // height of page
        const previousScrollYPercent: number = previousScrollY / previousScrollHeight;
        this.render();
        const newScrollHeight: number = document.body.scrollHeight; // height of page
        const newScrollY: number = newScrollHeight * previousScrollYPercent;
        window.scrollTo({
            top: newScrollY,
            behavior: "instant" // visually, there is no change in the scroll bar position, as it's the same as before.
        });
    }

    public getActiveOctaveShift(timestamp: Fraction, staffIndex: number, measureIndex: number): OctaveShift | undefined {
        if (!this.sheet || !this.sheet.SourceMeasures?.[measureIndex]) {
            return undefined;
        }
        const measure: MusicSheet["SourceMeasures"][number] = this.sheet.SourceMeasures[measureIndex];
        const measureStart: Fraction = measure.AbsoluteTimestamp;
        const measureEnd: Fraction = Fraction.plus(measureStart, measure.Duration);
        let absTs: Fraction = timestamp;
        if (timestamp.lt(measureStart) || timestamp.gt(measureEnd)) {
            absTs = Fraction.plus(measureStart, timestamp);
        }
        const sourceMeasures: MusicSheet["SourceMeasures"] = this.sheet.SourceMeasures;
        const lastSourceMeasure: MusicSheet["SourceMeasures"][number] = sourceMeasures[sourceMeasures.length - 1];
        const sheetEndTs: Fraction = Fraction.plus(lastSourceMeasure.AbsoluteTimestamp, lastSourceMeasure.Duration);
        for (let m: number = 0; m < sourceMeasures.length; m++) {
            const sm: MusicSheet["SourceMeasures"][number] = sourceMeasures[m];
            const expressions: MultiExpression[] = sm.StaffLinkedExpressions?.[staffIndex];
            if (!expressions) {
                continue;
            }
            for (let i: number = 0; i < expressions.length; i++) {
                const multi: MultiExpression = expressions[i];
                const shift: OctaveShift = multi.OctaveShiftStart || multi.OctaveShiftEnd;
                if (!shift) {
                    continue;
                }
                const start: Fraction = shift.ParentStartMultiExpression?.AbsoluteTimestamp;
                const end: Fraction = shift.ParentEndMultiExpression?.AbsoluteTimestamp ?? sheetEndTs;
                if (start && start.lte(absTs) && !end.lt(absTs)) {
                    return shift;
                }
            }
        }
        return undefined;
    }

    public hasActiveOctaveShift(timestamp: Fraction, staffIndex: number, measureIndex: number): boolean {
        return this.getActiveOctaveShift(timestamp, staffIndex, measureIndex) !== undefined;
    }

    public getBPMTempoFromTimestamp(timestamp: Fraction, measureIndex: number): number | undefined {
        if (!this.sheet || !this.sheet.SourceMeasures?.[measureIndex]) {
            return undefined;
        }
        const measure: MusicSheet["SourceMeasures"][number] = this.sheet.SourceMeasures[measureIndex];
        const measureStart: Fraction = measure.AbsoluteTimestamp;
        const measureEnd: Fraction = Fraction.plus(measureStart, measure.Duration);
        let absTs: Fraction = timestamp;
        if (timestamp.lt(measureStart) || timestamp.gt(measureEnd)) {
            absTs = Fraction.plus(measureStart, timestamp);
        }

        const tempoExpressions: MultiTempoExpression[] = this.sheet.TimestampSortedTempoExpressionsList;
        let activeTempoExpression: MultiTempoExpression | undefined;

        for (let i: number = tempoExpressions.length - 1; i >= 0; i--) {
            const tempoExpr: MultiTempoExpression = tempoExpressions[i];
            const exprStart: Fraction = tempoExpr.AbsoluteTimestamp;

            if (exprStart.gt(absTs)) {
                continue;
            }

            if (tempoExpr.InstantaneousTempo) {
                activeTempoExpression = tempoExpr;
                break;
            }

            if (tempoExpr.ContinuousTempo) {
                const exprEnd: Fraction = tempoExpr.ContinuousTempo.AbsoluteEndTimestamp;
                if (absTs.lte(exprEnd)) {
                    activeTempoExpression = tempoExpr;
                    break;
                }
            }
        }

        if (activeTempoExpression) {
            if (activeTempoExpression.InstantaneousTempo) {
                return activeTempoExpression.InstantaneousTempo.TempoInBpm;
            }
            if (activeTempoExpression.ContinuousTempo) {
                const interpolatedTempo: number = activeTempoExpression.ContinuousTempo.getInterpolatedTempo(absTs);
                if (interpolatedTempo > 0) {
                    return interpolatedTempo;
                }
            }
        }

        if (measure.TempoInBPM > 0) {
            return measure.TempoInBPM;
        }

        return undefined;
    }

    public updateTempo(newInitialBPM: number, render: boolean = true): void {
        if (!this.sheet) {
            return;
        }

        let oldInitialTempo: number = this.sheet.getExpressionsStartTempoInBPM();
        if (oldInitialTempo === 0) {
            if (this.sheet.SourceMeasures.length > 0 && this.sheet.SourceMeasures[0].TempoInBPM > 0) {
                oldInitialTempo = this.sheet.SourceMeasures[0].TempoInBPM;
            } else {
                return;
            }
        }

        if (oldInitialTempo === newInitialBPM) {
            return;
        }

        const ratio: number = newInitialBPM / oldInitialTempo;

        for (const tempoExpr of this.sheet.TimestampSortedTempoExpressionsList) {
            if (tempoExpr.InstantaneousTempo) {
                tempoExpr.InstantaneousTempo.TempoInBpm *= ratio;
            }
            if (tempoExpr.ContinuousTempo) {
                tempoExpr.ContinuousTempo.StartTempo *= ratio;
                tempoExpr.ContinuousTempo.EndTempo *= ratio;
            }
        }

        for (const measure of this.sheet.SourceMeasures) {
            if (measure.TempoInBPM > 0) {
                measure.TempoInBPM *= ratio;
            }
        }

        if (this.sheet.TimestampSortedTempoExpressionsList.length === 0) {
            this.sheet.userStartTempoInBPM *= ratio;
        }

        if (render && this.graphic && this.drawer) {
            this.updateMetronomeMarksInSVG(ratio);
        } else if (render) {
            this.render();
        }
    }

    private updateMetronomeMarksInSVG(ratio: number): void {
        if (!this.drawer || !this.drawer.Backends) {
            return;
        }

        const backends: VexFlowBackend[] = this.drawer.Backends;
        for (const backend of backends) {
            const renderElement: HTMLElement = backend.getRenderElement?.();
            if (renderElement) {
                const bpmGroups: NodeListOf<Element> = renderElement.querySelectorAll("g.vf-bpm");
                if (bpmGroups) {
                    for (const bpmGroup of bpmGroups) {
                        const textNodes: NodeListOf<Element> = bpmGroup.querySelectorAll("text");
                        if (textNodes) {
                            for (const textNode of textNodes) {
                                const textContent: string = textNode.textContent || "";
                                const match: RegExpMatchArray | null = textContent.match(/ = (\d+)/);
                                if (match && match[1]) {
                                    const oldBpm: number = parseFloat(match[1]);
                                    const newBpm: number = Math.round(oldBpm * ratio);
                                    textNode.textContent = textContent.replace(/ = \d+/, " = " + newBpm);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Helper function for managing window's onResize events
     * @param startCallback is the function called when resizing starts
     * @param endCallback is the function called when resizing (kind-of) ends
     */
    protected handleResize(startCallback: () => void, endCallback: () => void): void {
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
    public enableOrDisableCursors(enable: boolean): void {
        this.drawingParameters.drawCursors = enable;
        if (enable) {
            for (let i: number = 0; i < this.cursorsOptions.length; i++){
                // save previous cursor state
                const hidden: boolean = this.cursors[i]?.Hidden ?? true;
                const previousIterator: MusicPartManagerIterator = this.cursors[i]?.Iterator;
                this.cursors[i]?.hide();

                // check which page/backend to draw the cursor on (the pages may have changed since last cursor)
                let backendToDrawOn: VexFlowBackend = this.drawer?.Backends[0];
                if (backendToDrawOn && this.rules.RestoreCursorAfterRerender && this.cursors[i]) {
                    const newPageNumber: number = this.cursors[i].updateCurrentPage();
                    backendToDrawOn = this.drawer.Backends[newPageNumber - 1];
                }
                // create new cursor
                if (backendToDrawOn && backendToDrawOn.getRenderElement()) {
                    this.cursors[i] = new Cursor(backendToDrawOn.getRenderElement(), this, this.cursorsOptions[i]);
                }
                if (this.sheet && this.graphic && this.cursors[i]) { // else init is called in load()
                    this.cursors[i].init(this.sheet.MusicPartManager, this.graphic);
                }

                // restore old cursor state
                if (this.rules.RestoreCursorAfterRerender) {
                    this.cursors[i].hidden = hidden;
                    if (previousIterator) {
                        this.cursors[i].iterator = previousIterator;
                        this.cursors[i].update();
                    }
                }
            }
        } else { // disable cursor
            this.cursors.forEach(cursor => {
                cursor.hide();
            });
            // this.cursor = undefined;
            // TODO cursor should be disabled, not just hidden. otherwise user can just call osmd.cursor.hide().
            // however, this could cause null calls (cursor.next() etc), maybe that needs some solution.
        }
    }

    public createBackend(type: BackendType, page: GraphicalMusicPage): VexFlowBackend {
        let backend: VexFlowBackend;
        if (type === undefined || type === BackendType.SVG) {
            backend = new SvgVexFlowBackend(this.rules);
        } else {
            backend = new CanvasVexFlowBackend(this.rules);
        }
        backend.graphicalMusicPage = page; // the page the backend renders on. needed to identify DOM element to extract image/SVG
        backend.initialize(this.container, this.zoom);
        //backend.getContext().setFillStyle(this.rules.DefaultColorMusic);
        //backend.getContext().setStrokeStyle(this.rules.DefaultColorMusic);
        // color needs to be set after resize() for CanvasBackend
        return backend;
    }

    /** Standard page format options like A4 or Letter, in portrait and landscape. E.g. PageFormatStandards["A4_P"] or PageFormatStandards["Letter_L"]. */
    public static PageFormatStandards: { [type: string]: PageFormat } = {
        "A3_L": new PageFormat(420, 297, "A3_L"), // id strings should use underscores instead of white spaces to facilitate use as URL parameters.
        "A3_P": new PageFormat(297, 420, "A3_P"),
        "A4_L": new PageFormat(297, 210, "A4_L"),
        "A4_P": new PageFormat(210, 297, "A4_P"),
        "A5_L": new PageFormat(210, 148, "A5_L"),
        "A5_P": new PageFormat(148, 210, "A5_P"),
        "A6_L": new PageFormat(148, 105, "A6_L"),
        "A6_P": new PageFormat(105, 148, "A6_P"),
        "Endless": PageFormat.UndefinedPageFormat,
        "Letter_L": new PageFormat(279.4, 215.9, "Letter_L"),
        "Letter_P": new PageFormat(215.9, 279.4, "Letter_P")
    };

    public static StringToPageFormat(pageFormatString: string): PageFormat {
        let pageFormat: PageFormat = PageFormat.UndefinedPageFormat; // default: 'endless' page height, take canvas/container width

        // check for widthxheight parameter, e.g. "800x600"
        if (pageFormatString.match("^[0-9]+x[0-9]+$")) {
            const widthAndHeight: string[] = pageFormatString.split("x");
            const width: number = Number.parseInt(widthAndHeight[0], 10);
            const height: number = Number.parseInt(widthAndHeight[1], 10);
            if (width > 0 && width < 32768 && height > 0 && height < 32768) {
                pageFormat = new PageFormat(width, height, `customPageFormat${pageFormatString}`);
            }
        }

        // check for formatId from OpenSheetMusicDisplay.PageFormatStandards
        pageFormatString = pageFormatString.replace(" ", "_");
        pageFormatString = pageFormatString.replace("Landscape", "L");
        pageFormatString = pageFormatString.replace("Portrait", "P");
        //console.log("change format to: " + formatId);
        if (OpenSheetMusicDisplay.PageFormatStandards.hasOwnProperty(pageFormatString)) {
            pageFormat = OpenSheetMusicDisplay.PageFormatStandards[pageFormatString];
            return pageFormat;
        }
        return pageFormat;
    }

    /** Sets page format by string. Used by setOptions({pageFormat: "A4_P"}) for example. */
    public setPageFormat(formatId: string): void {
        const newPageFormat: PageFormat = OpenSheetMusicDisplay.StringToPageFormat(formatId);
        this.needBackendUpdate = !(newPageFormat.Equals(this.rules.PageFormat));
        this.rules.PageFormat = newPageFormat;
    }

    public setCustomPageFormat(width: number, height: number): void {
        if (width > 0 && height > 0) {
            const f: PageFormat = new PageFormat(width, height);
            this.rules.PageFormat = f;
        }
    }

    //#region GETTER / SETTER
    public set DrawSkyLine(value: boolean) {
        this.drawSkyLine = value;
        if (this.drawer) {
            this.drawer.skyLineVisible = value;
            // this.render(); // note: we probably shouldn't automatically render when someone sets the setter
            //   this can cause a lot of rendering time.
        }
    }
    public get DrawSkyLine(): boolean {
        return this.drawer.skyLineVisible;
    }

    public set DrawBottomLine(value: boolean) {
        this.drawBottomLine = value;
        if (this.drawer) {
            this.drawer.bottomLineVisible = value;
            // this.render(); // note: we probably shouldn't automatically render when someone sets the setter
            //   this can cause a lot of rendering time.
        }
    }
    public get DrawBottomLine(): boolean {
        return this.drawer.bottomLineVisible;
    }
    public set DrawBoundingBox(value: string) {
        this.setDrawBoundingBox(value, true);
    }
    public get DrawBoundingBox(): string {
        return this.drawBoundingBox;
    }
    public setDrawBoundingBox(value: string, render: boolean = false): void {
        this.drawBoundingBox = value;
        if (this.drawer) {
            this.drawer.drawableBoundingBoxElement = value; // drawer is sometimes created anew, losing this value, so it's saved in OSMD now.
        }
        if (render) {
            this.renderAndScrollBack(); // may create new Drawer.
        }
    }

    public get AutoResizeEnabled(): boolean {
        return this.autoResizeEnabled;
    }
    public set AutoResizeEnabled(value: boolean) {
        this.autoResizeEnabled = value;
    }

    public get Zoom(): number {
        return this.zoom;
    }
    public set Zoom(value: number) {
        this.zoom = value;
        this.zoomUpdated = true;
        if (this.graphic?.GetCalculator instanceof VexFlowMusicSheetCalculator) { // null and type check
            (this.graphic.GetCalculator as VexFlowMusicSheetCalculator).beamsNeedUpdate = this.zoomUpdated;
        }
    }

    public set FollowCursor(value: boolean) {
        this.followCursor = value;
    }

    public get FollowCursor(): boolean {
        return this.followCursor;
    }

    public set TransposeCalculator(calculator: ITransposeCalculator) {
        MusicSheetCalculator.transposeCalculator = calculator;
    }

    public get TransposeCalculator(): ITransposeCalculator {
        return MusicSheetCalculator.transposeCalculator;
    }

    /**
     * Read-only: does not set `Sheet.Transpose` or render. Counts printed notes that would fall outside
     * treble D4–G5 or bass F2–B3 if the score were hypothetically transposed by `transposeHalftones` (semitones).
     * Useful to know whether we want to transpose upwards or downwards, i.e. which result would be easier to read!
     */
    public countLedgerLineNotesForTransposition(transposeHalftones: number): number {
        return countLedgerLineNotesOnMusicSheet(this.sheet, transposeHalftones);
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
        return this.rules;
    }
    /** Returns the version of OSMD this object is built from (the version you are using). */
    public get Version(): string {
        return this.version;
    }
    //#endregion

    /**
     * Lowers the opacity of every rendered instance of the staff that matches the provided global staff index.
     * A staff can appear on multiple systems/pages; all of them are updated in-place via the SVG DOM.
     * @param staffIndex Global staff index (`Staff.idInMusicSheet`)
     * @param opacity Target opacity in the range [0, 1]
     */
    public blurStaff(staffIndex: number, opacity: number = 0.3): void {
        this.setStaffOpacity(staffIndex, opacity, 0.3);
    }

    /**
     * Restores the opacity of a staff (across all systems/pages) back to 1.0.
     * @param staffIndex Global staff index (`Staff.idInMusicSheet`)
     */
    public restoreStaff(staffIndex: number): void {
        this.setStaffOpacity(staffIndex, 1.0, 1.0);
    }

    public blurVoice(voiceId: number, opacity: number = 0.2): void {
        if (!this.sheet || !this.graphic) {
            return;
        }

        for (const instrument of this.sheet.Instruments) {
            for (const staff of instrument.Staves) {
                for (const voice of staff.Voices) {
                    if (voice.VoiceId === voiceId) {
                        for (const voiceEntry of voice.VoiceEntries) {
                            for (const note of voiceEntry.Notes) {
                                const gNote: GraphicalNote = this.rules.GNote(note);
                                if (gNote) {
                                    gNote.setOpacity(opacity);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    public blurVoices(voiceIds: number[], opacity: number = 0.2): void {
        if (!this.sheet || !this.graphic) {
            return;
        }

        for (const instrument of this.sheet.Instruments) {
            for (const staff of instrument.Staves) {
                for (const voice of staff.Voices) {
                    if (voiceIds?.includes(voice.VoiceId)) {
                        for (const voiceEntry of voice.VoiceEntries) {
                            for (const note of voiceEntry.Notes) {
                                const gNote: GraphicalNote = this.rules.GNote(note);
                                if (gNote) {
                                    gNote.setOpacity(opacity);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    public blurAllVoicesExceptVoices(voiceIds: number[], opacity: number = 0.2): void {
        if (!this.sheet || !this.graphic) {
            return;
        }

        for (const instrument of this.sheet.Instruments) {
            for (const staff of instrument.Staves) {
                for (const voice of staff.Voices) {
                    if (!voiceIds?.includes(voice.VoiceId)) {
                        for (const voiceEntry of voice.VoiceEntries) {
                            for (const note of voiceEntry.Notes) {
                                const gNote: GraphicalNote = this.rules.GNote(note);
                                if (gNote) {
                                    gNote.setOpacity(opacity);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    public resetOpacity(): void {
        if (!this.sheet || !this.graphic) {
            return;
        }

        for (const instrument of this.sheet.Instruments) {
            for (const staff of instrument.Staves) {
                for (const voice of staff.Voices) {
                    for (const voiceEntry of voice.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            const gNote: GraphicalNote = this.rules.GNote(note);
                            if (gNote) {
                                gNote.setOpacity(1.0);
                            }
                        }
                    }
                }
            }
        }
    }

    private syncInteractiveRangeSelection(): void {
        if (!this.rangeSelection.enabled || !this.graphic || !this.drawer?.Backends?.length) {
            this.detachRangeSelectionListeners();
            this.removeRangeSelectionOverlay();
            return;
        }

        this.ensureRangeSelectionOverlay();
        this.updateRangeSelectionOverlayStyles();
        this.attachRangeSelectionListeners();
        this.attachRangeViewportListeners();
        this.renderRangeSelection();
    }

    private attachRangeSelectionListeners(): void {
        const currentElements: HTMLElement[] = this.drawer.Backends
            .map((backend: VexFlowBackend) => backend.getRenderElement())
            .filter((element: HTMLElement) => !!element);
        const sameBinding: boolean = currentElements.length === this.rangeInteractionBoundElements.length
            && currentElements.every((element: HTMLElement, index: number) => this.rangeInteractionBoundElements[index] === element);
        if (sameBinding) {
            return;
        }
        this.detachRangeSelectionListeners();
        for (const element of currentElements) {
            element.addEventListener("pointermove", this.rangePointerMoveListener, { passive: false });
            element.addEventListener("pointerdown", this.rangePointerDownListener);
            element.addEventListener("pointerleave", this.rangePointerLeaveListener, { passive: true });
            this.rangeInteractionBoundElements.push(element);
        }
        if (this.rangeInteractionBoundElements.length > 0) {
            window.addEventListener("pointerup", this.rangePointerUpListener);
            window.addEventListener("pointercancel", this.rangePointerCancelListener);
        }
    }

    private detachRangeSelectionListeners(): void {
        this.cancelPendingRangeOpacityUpdate();
        this.detachRangeViewportListeners();
        this.resetTouchGestureState();
        this.pendingTouchRangeStartAnchor = undefined;
        this.emitRangeHandleDragging(false);
        this.releaseRangeDragPointerCapture();
        if (this.rangePointerMoveAnimationFrameId !== 0) {
            window.cancelAnimationFrame(this.rangePointerMoveAnimationFrameId);
            this.rangePointerMoveAnimationFrameId = 0;
        }
        if (this.rangeViewportUpdateAnimationFrameId !== 0) {
            window.cancelAnimationFrame(this.rangeViewportUpdateAnimationFrameId);
            this.rangeViewportUpdateAnimationFrameId = 0;
        }
        if (this.rangeViewportSettleUpdateTimeoutId !== 0) {
            window.clearTimeout(this.rangeViewportSettleUpdateTimeoutId);
            this.rangeViewportSettleUpdateTimeoutId = 0;
        }
        this.pendingRangePointerMoveAnchor = undefined;
        for (const element of this.rangeInteractionBoundElements) {
            element.removeEventListener("pointermove", this.rangePointerMoveListener);
            element.removeEventListener("pointerdown", this.rangePointerDownListener);
            element.removeEventListener("pointerleave", this.rangePointerLeaveListener);
            element.style.removeProperty("cursor");
        }
        this.rangeInteractionBoundElements = [];
        window.removeEventListener("pointerup", this.rangePointerUpListener);
        window.removeEventListener("pointercancel", this.rangePointerCancelListener);
    }

    private attachRangeViewportListeners(): void {
        const scrollTarget: HTMLElement | Window = this.getRangeSelectionScrollContainer();
        if (this.rangeViewportScrollTarget === scrollTarget) {
            return;
        }
        this.detachRangeViewportListeners();
        this.rangeViewportScrollTarget = scrollTarget;
        this.rangeViewportScrollTarget.addEventListener("scroll", this.rangeViewportUpdateListener, { passive: true });
        // Capture window-level scroll as a fallback when the app scrolls in wrappers above the detected target.
        window.addEventListener("scroll", this.rangeViewportUpdateListener, { passive: true, capture: true });
        window.addEventListener("resize", this.rangeViewportUpdateListener, { passive: true });
    }

    private detachRangeViewportListeners(): void {
        if (this.rangeViewportScrollTarget) {
            this.rangeViewportScrollTarget.removeEventListener("scroll", this.rangeViewportUpdateListener);
            this.rangeViewportScrollTarget = undefined;
        }
        window.removeEventListener("scroll", this.rangeViewportUpdateListener, true);
        window.removeEventListener("resize", this.rangeViewportUpdateListener);
        if (this.rangeViewportSettleUpdateTimeoutId !== 0) {
            window.clearTimeout(this.rangeViewportSettleUpdateTimeoutId);
            this.rangeViewportSettleUpdateTimeoutId = 0;
        }
    }

    private scheduleRangeViewportUpdate(): void {
        if (this.rangeViewportUpdateAnimationFrameId !== 0) {
            return;
        }
        this.rangeViewportUpdateAnimationFrameId = window.requestAnimationFrame((): void => {
            this.rangeViewportUpdateAnimationFrameId = 0;
            if (!this.rangeSelection.enabled || !this.rangeInteractionOverlay) {
                return;
            }
            if (this.dragStartAnchor || this.dragCurrentAnchor || this.pendingTouchRangeStartAnchor || this.hoverAnchor) {
                this.renderRangeSelection();
            }
        });
    }

    private scheduleRangeViewportSettleUpdate(): void {
        if (this.rangeViewportSettleUpdateTimeoutId !== 0) {
            window.clearTimeout(this.rangeViewportSettleUpdateTimeoutId);
        }
        this.rangeViewportSettleUpdateTimeoutId = window.setTimeout((): void => {
            this.rangeViewportSettleUpdateTimeoutId = 0;
            if (!this.rangeSelection.enabled || !this.rangeInteractionOverlay) {
                return;
            }
            if (this.isRangeDragging || !this.dragStartAnchor || !this.dragCurrentAnchor) {
                return;
            }
            this.renderRangeSelection();
        }, 120);
    }

    private ensureRangeSelectionOverlay(): void {
        if (this.rangeInteractionOverlay) {
            // Backend refresh can remove all container children, which detaches this node.
            // If the reference exists but the node is no longer connected, re-attach it.
            const overlayDetached: boolean = !this.rangeInteractionOverlay.isConnected
                || this.rangeInteractionOverlay.parentElement !== this.container;
            if (!overlayDetached) {
                return;
            }
            this.rangeInteractionOverlay.style.position = "absolute";
            this.rangeInteractionOverlay.style.left = "0";
            this.rangeInteractionOverlay.style.top = "0";
            this.rangeInteractionOverlay.style.right = "0";
            this.rangeInteractionOverlay.style.bottom = "0";
            this.rangeInteractionOverlay.style.pointerEvents = "none";
            this.rangeInteractionOverlay.style.zIndex = this.getSelectionOverlayZIndex().toString();
            this.container.appendChild(this.rangeInteractionOverlay);
            return;
        }
        if (window.getComputedStyle(this.container).position === "static") {
            this.container.style.position = "relative";
        }
        this.rangeInteractionOverlay = document.createElement("div");
        this.rangeInteractionOverlay.className = "osmd-range-selection-overlay";
        this.rangeInteractionOverlay.style.position = "absolute";
        this.rangeInteractionOverlay.style.left = "0";
        this.rangeInteractionOverlay.style.top = "0";
        this.rangeInteractionOverlay.style.right = "0";
        this.rangeInteractionOverlay.style.bottom = "0";
        this.rangeInteractionOverlay.style.pointerEvents = "none";
        this.rangeInteractionOverlay.style.zIndex = this.getSelectionOverlayZIndex().toString();
        this.container.appendChild(this.rangeInteractionOverlay);
    }

    private updateRangeSelectionOverlayStyles(): void {
        if (!this.rangeInteractionOverlay) {
            return;
        }
        this.rangeInteractionOverlay.style.zIndex = this.getSelectionOverlayZIndex().toString();
    }

    private removeRangeSelectionOverlay(): void {
        if (!this.rangeInteractionOverlay) {
            return;
        }
        this.rangeInteractionOverlay.remove();
        this.rangeInteractionOverlay = undefined;
    }

    private onRangePointerMove(event: PointerEvent): void {
        if (!this.rangeSelection.enabled) {
            return;
        }
        if (this.isTouchPointerEvent(event)) {
            this.updateTouchMoveState(event);
            if (event.pointerId !== this.activeTouchPointerId) {
                return;
            }
            if (this.isRangeDragging) {
                this.activeTouchDragClientX = event.clientX;
                this.activeTouchDragClientY = event.clientY;
                event.preventDefault();
            }
            // Let touch gestures default to native page/score scrolling unless we are actively dragging a handle.
            if (!this.isRangeDragging) {
                return;
            }
        }
        const anchor: RangeSelectionAnchor = this.getAnchorFromPointerEvent(event);
        this.updateDesktopRangeCursor(event, anchor);
        if (!anchor) {
            return;
        }
        this.pendingRangePointerMoveAnchor = anchor;
        if (this.rangePointerMoveAnimationFrameId !== 0) {
            return;
        }
        this.rangePointerMoveAnimationFrameId = window.requestAnimationFrame((): void => {
            this.rangePointerMoveAnimationFrameId = 0;
            this.flushRangePointerMove();
        });
    }

    private flushRangePointerMove(): void {
        if (!this.rangeSelection.enabled) {
            this.pendingRangePointerMoveAnchor = undefined;
            return;
        }
        const anchor: RangeSelectionAnchor = this.pendingRangePointerMoveAnchor;
        this.pendingRangePointerMoveAnchor = undefined;
        if (!anchor) {
            return;
        }
        this.hoverAnchor = anchor;
        if (this.isRangeDragging && this.dragStartAnchor) {
            this.dragCurrentAnchor = anchor;
            this.renderRangeSelection();
            this.emitRangeSelection("dragging", this.dragStartAnchor, anchor, true);
            return;
        }
        this.renderRangeSelection();
        this.emitRangeSelection("hover", anchor, anchor, false);
    }

    private onRangePointerDown(event: PointerEvent): void {
        if (!this.rangeSelection.enabled) {
            return;
        }
        if (this.isTouchPointerEvent(event)) {
            this.onRangeTouchPointerDown(event);
            return;
        }
        this.pendingTouchRangeStartAnchor = undefined;
        this.captureRangePointer(event);
        const anchor: RangeSelectionAnchor = this.getAnchorFromPointerEvent(event);
        if (!anchor) {
            return;
        }
        const existingSelection: RangeSelectionPayload = this.getRangeSelection();
        const draggedBound: "start" | "end" | undefined = this.getDraggedBoundFromAnchor(anchor, existingSelection);
        if (existingSelection && !this.isAnchorInsideSelection(anchor, existingSelection)) {
            if (draggedBound) {
                this.isRangeDragging = true;
                if (draggedBound === "start") {
                    // Resize start bound (keep end fixed).
                    this.activeDragBound = "start";
                    this.dragStartAnchor = existingSelection.normalizedEnd;
                } else {
                    // Resize end bound (keep start fixed).
                    this.activeDragBound = "end";
                    this.dragStartAnchor = existingSelection.normalizedStart;
                }
                this.dragCurrentAnchor = anchor;
                this.emitRangeHandleDragging(true);
                this.renderRangeSelection();
                this.emitRangeSelection("dragging", this.dragStartAnchor, this.dragCurrentAnchor, true);
                event.preventDefault();
                return;
            }
            this.clearRangeSelection(true);
            event.preventDefault();
            return;
        }
        this.isRangeDragging = true;
        if (existingSelection) {
            if (draggedBound === "start") {
                // Resize start bound (keep end fixed).
                this.activeDragBound = "start";
                this.dragStartAnchor = existingSelection.normalizedEnd;
                this.dragCurrentAnchor = anchor;
            } else if (draggedBound === "end") {
                // Resize end bound (keep start fixed).
                this.activeDragBound = "end";
                this.dragStartAnchor = existingSelection.normalizedStart;
                this.dragCurrentAnchor = anchor;
            } else {
            this.activeDragBound = "both";
            const startDistance: number = Math.abs(anchor.timestampReal - existingSelection.normalizedStart.timestampReal);
            const endDistance: number = Math.abs(anchor.timestampReal - existingSelection.normalizedEnd.timestampReal);
            if (startDistance <= endDistance) {
                // Resize start bound (keep end fixed).
                this.dragStartAnchor = existingSelection.normalizedEnd;
            } else {
                // Resize end bound (keep start fixed).
                this.dragStartAnchor = existingSelection.normalizedStart;
            }
            this.dragCurrentAnchor = anchor;
            }
        } else {
            this.activeDragBound = "both";
            this.dragStartAnchor = anchor;
            this.dragCurrentAnchor = anchor;
        }
        this.emitRangeHandleDragging(this.activeDragBound !== "both");
        this.renderRangeSelection();
        this.emitRangeSelection("dragging", this.dragStartAnchor, this.dragCurrentAnchor, true);
        event.preventDefault();
    }

    private onRangePointerUp(event: PointerEvent): void {
        if (this.isTouchPointerEvent(event)) {
            this.onRangeTouchPointerUp(event);
            return;
        }
        this.releaseRangeDragPointerCapture();
        this.commitRangeDrag(event);
    }

    private onRangePointerCancel(event: PointerEvent): void {
        if (!this.rangeSelection.enabled || !this.isTouchPointerEvent(event)) {
            return;
        }
        if (event.pointerId !== this.activeTouchPointerId) {
            return;
        }
        this.releaseRangeDragPointerCapture();
        this.commitRangeDrag();
        this.resetTouchGestureState();
    }

    private releaseRangeDragPointerCapture(): void {
        if (!this.rangeDragPointerCaptureElement || this.rangeDragPointerId < 0) {
            return;
        }
        const captureElement: Element & {
            hasPointerCapture?: (pointerId: number) => boolean;
            releasePointerCapture?: (pointerId: number) => void;
        } = this.rangeDragPointerCaptureElement as any;
        if (captureElement.hasPointerCapture?.(this.rangeDragPointerId) && captureElement.releasePointerCapture) {
            captureElement.releasePointerCapture(this.rangeDragPointerId);
        }
        this.rangeDragPointerCaptureElement = undefined;
        this.rangeDragPointerId = -1;
    }

    private onRangePointerLeave(event: PointerEvent): void {
        this.clearDesktopRangeCursor(event);
        if (this.isRangeDragging) {
            return;
        }
        const relatedTarget: Node = event.relatedTarget as Node;
        if (relatedTarget && this.rangeInteractionOverlay?.contains(relatedTarget)) {
            return;
        }
        this.hoverAnchor = undefined;
        this.renderRangeSelection();
    }

    private onRangeTouchPointerDown(event: PointerEvent): void {
        if (this.activeTouchPointerId !== -1 && this.activeTouchPointerId !== event.pointerId) {
            return;
        }
        const anchor: RangeSelectionAnchor = this.getAnchorFromPointerEvent(event);
        if (!anchor) {
            return;
        }
        this.activeTouchPointerId = event.pointerId;
        this.activeTouchStartClientX = event.clientX;
        this.activeTouchStartClientY = event.clientY;
        this.activeTouchMoved = false;
        this.activeTouchDownAnchor = anchor;
        this.activeTouchDragClientX = event.clientX;
        this.activeTouchDragClientY = event.clientY;
        this.touchPendingAction = "none";

        const existingSelection: RangeSelectionPayload = this.getRangeSelection();
        const draggedBound: "start" | "end" | undefined = this.getDraggedBoundFromAnchor(anchor, existingSelection, true);
        if (existingSelection) {
            if (draggedBound) {
                this.pendingTouchRangeStartAnchor = undefined;
                this.captureRangePointer(event);
                this.startRangeHandleDrag(existingSelection, draggedBound, anchor);
                event.preventDefault();
                return;
            }
            if (this.isAnchorInsideSelection(anchor, existingSelection)) {
                return;
            }
            this.touchPendingAction = "clearSelection";
            return;
        }
        this.touchPendingAction = "setOrCommit";
    }

    private onRangeTouchPointerUp(event: PointerEvent): void {
        if (this.activeTouchPointerId !== event.pointerId) {
            return;
        }
        if (this.isRangeDragging) {
            this.releaseRangeDragPointerCapture();
            this.commitRangeDrag(event);
            this.resetTouchGestureState();
            return;
        }
        const isTap: boolean = !this.activeTouchMoved;
        const anchor: RangeSelectionAnchor = this.getAnchorFromPointerEvent(event) ?? this.activeTouchDownAnchor;
        if (isTap) {
            if (this.touchPendingAction === "clearSelection") {
                this.clearRangeSelection(true);
            } else if (this.touchPendingAction === "setOrCommit" && anchor) {
                this.handleTouchTapRangePick(anchor);
            }
        }
        this.resetTouchGestureState();
    }

    private captureRangePointer(event: PointerEvent): void {
        const pointerCaptureElement: Element = event.currentTarget as Element;
        if (pointerCaptureElement?.setPointerCapture) {
            pointerCaptureElement.setPointerCapture(event.pointerId);
            this.rangeDragPointerCaptureElement = pointerCaptureElement;
            this.rangeDragPointerId = event.pointerId;
        }
    }

    private commitRangeDrag(event?: PointerEvent): void {
        if (!this.rangeSelection.enabled || !this.isRangeDragging || !this.dragStartAnchor) {
            return;
        }
        const anchor: RangeSelectionAnchor = (event ? this.getAnchorFromPointerEvent(event) : undefined)
            ?? this.dragCurrentAnchor
            ?? this.dragStartAnchor;
        this.isRangeDragging = false;
        this.dragCurrentAnchor = anchor;
        const committedSelection: RangeSelectionPayload = this.createSelectionPayload("committed", this.dragStartAnchor, this.dragCurrentAnchor, false);
        // If the raw picked range contains no notes (e.g. empty-space click), keep it empty.
        // Do this before snap/padding so we don't accidentally pull in nearby notes.
        if (!this.selectionHasAnyNotes(committedSelection.normalizedStart, committedSelection.normalizedEnd)) {
            this.clearRangeSelection(true);
            return;
        }
        const paddedSelection: RangeSelectionPayload = this.applySelectionPadding(committedSelection, this.activeDragBound);
        this.dragStartAnchor = paddedSelection.normalizedStart;
        this.dragCurrentAnchor = paddedSelection.normalizedEnd;
        this.pendingTouchRangeStartAnchor = undefined;
        this.activeDragBound = "both";
        this.emitRangeHandleDragging(false);
        if (!this.selectionHasAnyNotes(this.dragStartAnchor, this.dragCurrentAnchor)) {
            this.clearRangeSelection(true);
            return;
        }
        this.renderRangeSelection();
        this.emitRangeSelection("committed", this.dragStartAnchor, this.dragCurrentAnchor, false);
    }

    private startRangeHandleDrag(
        existingSelection: RangeSelectionPayload,
        draggedBound: "start" | "end",
        anchor: RangeSelectionAnchor
    ): void {
        this.isRangeDragging = true;
        this.emitRangeHandleDragging(true);
        this.setTouchDragScrollLockEnabled(true);
        this.setTouchDragNativeScrollSuppressed(true);
        this.startTouchDragAutoScroll();
        if (draggedBound === "start") {
            // Resize start bound (keep end fixed).
            this.activeDragBound = "start";
            this.dragStartAnchor = existingSelection.normalizedEnd;
        } else {
            // Resize end bound (keep start fixed).
            this.activeDragBound = "end";
            this.dragStartAnchor = existingSelection.normalizedStart;
        }
        this.dragCurrentAnchor = anchor;
        this.renderRangeSelection();
        this.emitRangeSelection("dragging", this.dragStartAnchor, this.dragCurrentAnchor, true);
    }

    private handleTouchTapRangePick(anchor: RangeSelectionAnchor): void {
        if (!this.pendingTouchRangeStartAnchor) {
            this.pendingTouchRangeStartAnchor = anchor;
            this.hoverAnchor = anchor;
            this.renderRangeSelection();
            this.emitRangeSelection("hover", anchor, anchor, false);
            return;
        }
        this.dragStartAnchor = this.pendingTouchRangeStartAnchor;
        this.dragCurrentAnchor = anchor;
        this.pendingTouchRangeStartAnchor = undefined;
        const committedSelection: RangeSelectionPayload = this.createSelectionPayload("committed", this.dragStartAnchor, this.dragCurrentAnchor, false);
        // If the raw picked range contains no notes, don't snap-expand to nearby notes.
        if (!this.selectionHasAnyNotes(committedSelection.normalizedStart, committedSelection.normalizedEnd)) {
            this.clearRangeSelection(true);
            return;
        }
        const paddedSelection: RangeSelectionPayload = this.applySelectionPadding(committedSelection, "both");
        this.dragStartAnchor = paddedSelection.normalizedStart;
        this.dragCurrentAnchor = paddedSelection.normalizedEnd;
        if (!this.selectionHasAnyNotes(this.dragStartAnchor, this.dragCurrentAnchor)) {
            this.clearRangeSelection(true);
            return;
        }
        this.renderRangeSelection();
        this.emitRangeSelection("committed", this.dragStartAnchor, this.dragCurrentAnchor, false);
    }

    private updateTouchMoveState(event: PointerEvent): void {
        if (event.pointerId !== this.activeTouchPointerId || this.activeTouchMoved) {
            return;
        }
        const movementThresholdPx: number = 10;
        const distanceX: number = Math.abs(event.clientX - this.activeTouchStartClientX);
        const distanceY: number = Math.abs(event.clientY - this.activeTouchStartClientY);
        if (distanceX >= movementThresholdPx || distanceY >= movementThresholdPx) {
            this.activeTouchMoved = true;
            this.touchPendingAction = "none";
        }
    }

    private resetTouchGestureState(): void {
        this.stopTouchDragAutoScroll();
        this.setTouchDragScrollLockEnabled(false);
        this.setTouchDragNativeScrollSuppressed(false);
        this.activeTouchPointerId = -1;
        this.activeTouchMoved = false;
        this.activeTouchDownAnchor = undefined;
        this.activeTouchDragClientX = 0;
        this.activeTouchDragClientY = 0;
        this.touchPendingAction = "none";
    }

    private isTouchPointerEvent(event: PointerEvent): boolean {
        return event.pointerType === "touch";
    }

    private setTouchDragScrollLockEnabled(enabled: boolean): void {
        if (this.touchDragScrollLockEnabled === enabled) {
            return;
        }
        this.touchDragScrollLockEnabled = enabled;
        for (const element of this.rangeInteractionBoundElements) {
            if (enabled) {
                element.style.touchAction = "none";
            } else {
                element.style.removeProperty("touch-action");
            }
        }
    }

    private setTouchDragNativeScrollSuppressed(enabled: boolean): void {
        if (this.touchDragNativeScrollSuppressed === enabled) {
            return;
        }
        this.touchDragNativeScrollSuppressed = enabled;
        if (enabled) {
            // iOS Safari/WKWebView can keep panning unless touchmove is cancelled in capture phase.
            document.addEventListener("touchmove", this.touchMoveDuringRangeDragListener, { passive: false, capture: true });
            window.addEventListener("touchmove", this.touchMoveDuringRangeDragListener, { passive: false, capture: true });
            for (const element of this.rangeInteractionBoundElements) {
                element.addEventListener("touchmove", this.touchMoveDuringRangeDragListener, { passive: false, capture: true });
            }
        } else {
            document.removeEventListener("touchmove", this.touchMoveDuringRangeDragListener, true);
            window.removeEventListener("touchmove", this.touchMoveDuringRangeDragListener, true);
            for (const element of this.rangeInteractionBoundElements) {
                element.removeEventListener("touchmove", this.touchMoveDuringRangeDragListener, true);
            }
        }
    }

    private onTouchMoveDuringRangeDrag(event: TouchEvent): void {
        if (!this.isRangeDragging || this.activeTouchPointerId < 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private emitRangeHandleDragging(isHandleDragging: boolean): void {
        if (this.isRangeHandleDragging === isHandleDragging) {
            return;
        }
        this.isRangeHandleDragging = isHandleDragging;
        if (this.rangeSelection.callbacks.onHandleDraggingChange) {
            this.rangeSelection.callbacks.onHandleDraggingChange(isHandleDragging);
        }
    }

    private updateDesktopRangeCursor(event: PointerEvent, anchor: RangeSelectionAnchor): void {
        if (this.isTouchPointerEvent(event)) {
            return;
        }
        const pointerElement: HTMLElement = event.currentTarget as HTMLElement;
        if (!pointerElement) {
            return;
        }
        const existingSelection: RangeSelectionPayload = this.getRangeSelection();
        const hoveredHandle: "start" | "end" | undefined = this.getDraggedBoundFromAnchor(anchor, existingSelection, false);
        pointerElement.style.cursor = hoveredHandle ? "pointer" : "";
    }

    private clearDesktopRangeCursor(event: PointerEvent): void {
        if (this.isTouchPointerEvent(event)) {
            return;
        }
        const pointerElement: HTMLElement = event.currentTarget as HTMLElement;
        if (!pointerElement) {
            return;
        }
        pointerElement.style.removeProperty("cursor");
    }

    private startTouchDragAutoScroll(): void {
        if (this.rangeTouchAutoScrollAnimationFrameId !== 0) {
            return;
        }
        const step: () => void = (): void => {
            this.rangeTouchAutoScrollAnimationFrameId = 0;
            if (!this.isRangeDragging || this.activeTouchPointerId < 0) {
                return;
            }
            const scrollContainer: HTMLElement | Window = this.getTouchDragScrollContainer();
            const scrollDeltaY: number = this.getTouchDragScrollDeltaY(scrollContainer, this.activeTouchDragClientY);
            if (scrollDeltaY !== 0) {
                if (this.isWindowObject(scrollContainer)) {
                    scrollContainer.scrollBy(0, scrollDeltaY);
                } else {
                    scrollContainer.scrollTop += scrollDeltaY;
                }
                const anchorFromScroll: RangeSelectionAnchor = this.getAnchorFromClientPoint(this.activeTouchDragClientX, this.activeTouchDragClientY);
                if (anchorFromScroll && this.dragStartAnchor) {
                    this.dragCurrentAnchor = anchorFromScroll;
                    this.renderRangeSelection();
                    this.emitRangeSelection("dragging", this.dragStartAnchor, this.dragCurrentAnchor, true);
                }
            }
            this.rangeTouchAutoScrollAnimationFrameId = window.requestAnimationFrame(step);
        };
        this.rangeTouchAutoScrollAnimationFrameId = window.requestAnimationFrame(step);
    }

    private stopTouchDragAutoScroll(): void {
        if (this.rangeTouchAutoScrollAnimationFrameId === 0) {
            return;
        }
        window.cancelAnimationFrame(this.rangeTouchAutoScrollAnimationFrameId);
        this.rangeTouchAutoScrollAnimationFrameId = 0;
    }

    private getTouchDragScrollContainer(): HTMLElement | Window {
        let current: HTMLElement = this.container;
        while (current && current !== document.body) {
            const styles: CSSStyleDeclaration = window.getComputedStyle(current);
            const overflowY: string = styles.overflowY;
            const isScrollable: boolean = (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
                && current.scrollHeight > current.clientHeight;
            if (isScrollable) {
                return current;
            }
            current = current.parentElement;
        }
        return window;
    }

    private getRangeSelectionScrollContainer(): HTMLElement | Window {
        let current: HTMLElement = this.container;
        while (current && current !== document.body) {
            const styles: CSSStyleDeclaration = window.getComputedStyle(current);
            const overflowY: string = styles.overflowY;
            const isScrollable: boolean = (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
                && current.scrollHeight > current.clientHeight;
            if (isScrollable) {
                return current;
            }
            current = current.parentElement;
        }
        return window;
    }

    private getTouchDragScrollDeltaY(scrollContainer: HTMLElement | Window, clientY: number): number {
        const edgeThresholdPx: number = this.getRangeSelectionSnapPaddingPx();
        const minSpeedPxPerFrame: number = 2;
        const maxSpeedPxPerFrame: number = 10;
        let top: number;
        let bottom: number;
        if (this.isWindowObject(scrollContainer)) {
            top = 0;
            bottom = window.innerHeight;
        } else {
            const rect: DOMRect = scrollContainer.getBoundingClientRect();
            top = rect.top;
            bottom = rect.bottom;
        }
        if (clientY < top + edgeThresholdPx) {
            const ratio: number = Math.max(0, (top + edgeThresholdPx - clientY) / edgeThresholdPx);
            const speed: number = minSpeedPxPerFrame + (maxSpeedPxPerFrame - minSpeedPxPerFrame) * ratio;
            return -Math.round(speed);
        }
        if (clientY > bottom - edgeThresholdPx) {
            const ratio: number = Math.max(0, (clientY - (bottom - edgeThresholdPx)) / edgeThresholdPx);
            const speed: number = minSpeedPxPerFrame + (maxSpeedPxPerFrame - minSpeedPxPerFrame) * ratio;
            return Math.round(speed);
        }
        return 0;
    }

    private isWindowObject(target: HTMLElement | Window): target is Window {
        return target === window;
    }

    private getAnchorFromPointerEvent(event: PointerEvent): RangeSelectionAnchor {
        return this.getAnchorFromClientPoint(event.clientX, event.clientY);
    }

    private getAnchorFromClientPoint(clientX: number, clientY: number): RangeSelectionAnchor {
        if (!this.graphic) {
            return undefined;
        }
        const domPoint: PointF2D = new PointF2D(clientX, clientY);
        const svgPoint: PointF2D = this.graphic.domToSvg(domPoint);
        if (!svgPoint) {
            return undefined;
        }
        const osmdPoint: PointF2D = this.graphic.svgToOsmd(svgPoint);
        if (!osmdPoint) {
            return undefined;
        }
        const system: MusicSystem = this.findSystemAtPosition(osmdPoint);
        if (!system) {
            return undefined;
        }
        const leftBoundaryX: number = system.GetLeftBorderAbsoluteXPosition();
        const rightBoundaryX: number = system.GetRightBorderAbsoluteXPosition();
        const zoomScale: number = Math.max(0.0001, this.zoom * 10.0);
        const preStartPaddingPx: number = this.getRangeSelectionPreStartPaddingPx();
        const preStartPaddingOsmd: number = preStartPaddingPx / zoomScale;
        const x: number = Math.min(
            rightBoundaryX,
            Math.max(leftBoundaryX - preStartPaddingOsmd, osmdPoint.x)
        );
        const xPx: number = x * zoomScale;
        const startTime: Fraction = system.GetSystemsFirstTimeStamp();
        const endTime: Fraction = system.GetSystemsLastTimeStamp();
        const totalWidthOsmd: number = Math.max(0.0001, rightBoundaryX - leftBoundaryX);
        const ratio: number = (x - leftBoundaryX) / totalWidthOsmd;
        const clampedRatio: number = Math.max(-(preStartPaddingOsmd / totalWidthOsmd), Math.min(1, ratio));
        const timestampReal: number = startTime.RealValue + (endTime.RealValue - startTime.RealValue) * clampedRatio;
        const timestamp: Fraction = new Fraction(timestampReal, 1);
        if (!timestamp) {
            return undefined;
        }
        const staffEntry: GraphicalStaffEntry = this.graphic.GetNearestStaffEntry(new PointF2D(x, osmdPoint.y));
        const lineBounds: { yPx: number, heightPx: number } = this.getSystemVerticalBoundsInPixels(system);
        return {
            timestamp,
            timestampReal,
            measureIndex: staffEntry?.parentMeasure?.parentSourceMeasure?.measureListIndex
                ?? system.GraphicalMeasures[0]?.[0]?.parentSourceMeasure?.measureListIndex
                ?? 0,
            systemIndex: this.getSystemIndex(system),
            pageNumber: system.Parent?.PageNumber ?? 1,
            staffIndex: staffEntry?.sourceStaffEntry?.ParentStaff?.idInMusicSheet ?? system.StaffLines[0]?.ParentStaff?.idInMusicSheet ?? 0,
            x,
            xPx,
            yPx: lineBounds.yPx,
            heightPx: lineBounds.heightPx
        };
    }

    private createAnchorFromTimestamp(timestamp: Fraction): RangeSelectionAnchor {
        if (!this.graphic) {
            return undefined;
        }
        const result: [number, MusicSystem] = this.graphic.calculateXPositionFromTimestamp(timestamp);
        if (!result || !result[1]) {
            return undefined;
        }
        const x: number = result[0];
        const system: MusicSystem = result[1];
        const systemMeasure: GraphicalMeasure = system.GraphicalMeasures[0]?.[0];
        const lineBounds: { yPx: number, heightPx: number } = this.getSystemVerticalBoundsInPixels(system);
        return {
            timestamp,
            timestampReal: timestamp.RealValue,
            measureIndex: systemMeasure?.parentSourceMeasure?.measureListIndex ?? 0,
            systemIndex: this.getSystemIndex(system),
            pageNumber: system.Parent?.PageNumber ?? 1,
            staffIndex: system.StaffLines[0]?.ParentStaff?.idInMusicSheet ?? 0,
            x,
            xPx: x * this.zoom * 10.0,
            yPx: lineBounds.yPx,
            heightPx: lineBounds.heightPx
        };
    }

    private getSystemVerticalBoundsInPixels(system: MusicSystem): { yPx: number, heightPx: number } {
        const firstStaffLine: MusicSystem["StaffLines"][number] = system.StaffLines[0];
        const lastStaffLine: MusicSystem["StaffLines"][number] = system.StaffLines[system.StaffLines.length - 1];
        const y: number = system.PositionAndShape.AbsolutePosition.y + firstStaffLine.PositionAndShape.RelativePosition.y;
        const bottomY: number = system.PositionAndShape.AbsolutePosition.y + lastStaffLine.PositionAndShape.RelativePosition.y + lastStaffLine.StaffHeight;
        const scale: number = this.zoom * 10.0;
        return {
            yPx: y * scale,
            heightPx: (bottomY - y) * scale
        };
    }

    private getSystemHorizontalBoundsInPixels(system: MusicSystem): { leftPx: number, rightPx: number } {
        const scale: number = this.zoom * 10.0;
        return {
            leftPx: system.GetLeftBorderAbsoluteXPosition() * scale,
            rightPx: system.GetRightBorderAbsoluteXPosition() * scale
        };
    }

    private getSystemIndex(targetSystem: MusicSystem): number {
        let index: number = 0;
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                if (system === targetSystem) {
                    return index;
                }
                index++;
            }
        }
        return -1;
    }

    private findSystemAtPosition(position: PointF2D): MusicSystem {
        if (!this.graphic) {
            return undefined;
        }
        let closestSystem: MusicSystem = undefined;
        let closestDistance: number = Number.MAX_VALUE;
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                const left: number = system.GetLeftBorderAbsoluteXPosition();
                const right: number = system.GetRightBorderAbsoluteXPosition();
                const firstStaffLine: MusicSystem["StaffLines"][number] = system.StaffLines[0];
                const lastStaffLine: MusicSystem["StaffLines"][number] = system.StaffLines[system.StaffLines.length - 1];
                if (!firstStaffLine || !lastStaffLine) {
                    continue;
                }
                const top: number = system.PositionAndShape.AbsolutePosition.y + firstStaffLine.PositionAndShape.RelativePosition.y;
                const bottom: number = system.PositionAndShape.AbsolutePosition.y
                    + lastStaffLine.PositionAndShape.RelativePosition.y + lastStaffLine.StaffHeight;
                if (position.x >= left && position.x <= right && position.y >= top && position.y <= bottom) {
                    return system;
                }
                const dx: number = position.x < left ? left - position.x : (position.x > right ? position.x - right : 0);
                const dy: number = position.y < top ? top - position.y : (position.y > bottom ? position.y - bottom : 0);
                const distance: number = dx + dy;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestSystem = system;
                }
            }
        }
        return closestSystem;
    }

    private isAnchorInsideSelection(anchor: RangeSelectionAnchor, selection: RangeSelectionPayload): boolean {
        if (!anchor || !selection) {
            return false;
        }
        return anchor.timestampReal >= selection.normalizedStart.timestampReal
            && anchor.timestampReal <= selection.normalizedEnd.timestampReal;
    }

    private getDraggedBoundFromAnchor(
        anchor: RangeSelectionAnchor,
        selection: RangeSelectionPayload,
        isTouchInteraction: boolean = false
    ): "start" | "end" | undefined {
        if (!anchor || !selection) {
            return undefined;
        }
        const zoomValue: number = Math.max(0.25, Number.isFinite(this.zoom) ? this.zoom : 1);
        const configuredLineWidthPx: number = this.rangeSelection.options.lineWidthPx ?? 12;
        // Desktop precision should improve as zoom increases (smaller hit target),
        // while touch remains forgiving regardless of zoom.
        const lineHitTolerancePx: number = isTouchInteraction
            ? Math.max(24, Math.min(38, configuredLineWidthPx * 2.2))
            : Math.max(4, Math.min(10, configuredLineWidthPx / Math.sqrt(zoomValue)));
        const matchesStartSystem: boolean = anchor.systemIndex === selection.normalizedStart.systemIndex;
        const matchesEndSystem: boolean = anchor.systemIndex === selection.normalizedEnd.systemIndex;
        const startDistancePx: number = Math.abs(anchor.xPx - selection.normalizedStart.xPx);
        const endDistancePx: number = Math.abs(anchor.xPx - selection.normalizedEnd.xPx);
        const nearStartLine: boolean = matchesStartSystem && startDistancePx <= lineHitTolerancePx;
        const nearEndLine: boolean = matchesEndSystem && endDistancePx <= lineHitTolerancePx;
        if (!nearStartLine && !nearEndLine) {
            return undefined;
        }
        if (nearStartLine && nearEndLine) {
            return startDistancePx <= endDistancePx ? "start" : "end";
        }
        return nearStartLine ? "start" : "end";
    }

    private applySelectionPadding(selection: RangeSelectionPayload, movedBound: "start" | "end" | "both" = "both"): RangeSelectionPayload {
        if (!selection) {
            return selection;
        }
        // Snap-to-notes: align selection boundaries to nearest note positions
        if (this.rangeSelection.options.snapToNotes && this.graphic) {
            const snappedStart: RangeSelectionAnchor = movedBound === "end"
                ? selection.normalizedStart
                : this.snapAnchorToNearestNote(selection.normalizedStart, "start");
            const snappedEnd: RangeSelectionAnchor = movedBound === "start"
                ? selection.normalizedEnd
                : this.snapAnchorToNearestNote(selection.normalizedEnd, "end");
            return this.createSelectionPayload(selection.phase, snappedStart, snappedEnd, selection.isDragging);
        }
        const paddingPx: number = this.rangeSelection.options.applyPaddingPx ?? 0;
        if (!Number.isFinite(paddingPx) || paddingPx <= 0) {
            return selection;
        }
        const paddedStart: RangeSelectionAnchor = movedBound === "end"
            ? selection.normalizedStart
            : this.shiftAnchorX(selection.normalizedStart, -paddingPx);
        const paddedEnd: RangeSelectionAnchor = movedBound === "start"
            ? selection.normalizedEnd
            : this.shiftAnchorX(selection.normalizedEnd, paddingPx);
        return this.createSelectionPayload(selection.phase, paddedStart, paddedEnd, selection.isDragging);
    }

    /**
     * Snap an anchor to the nearest GraphicalStaffEntry note position.
     * For "start" bound: snap to the first note at or after the anchor's timestamp.
     * For "end" bound: snap to the last note at or before the anchor's timestamp.
     */
    private snapAnchorToNearestNote(anchor: RangeSelectionAnchor, bound: "start" | "end"): RangeSelectionAnchor {
        if (!anchor || !this.graphic) {
            return anchor;
        }
        const scale: number = this.zoom * 10.0;
        let bestEntry: GraphicalStaffEntry = undefined;
        let bestSystemIndex: number = -1;
        let bestXPx: number = bound === "start" ? Number.MAX_VALUE : Number.MIN_VALUE;
        let systemIndex: number = 0;
        for (const page of this.graphic.MusicPages) {
            for (const musicSystem of page.MusicSystems) {
                for (const staffLine of musicSystem.StaffLines) {
                    for (const measure of staffLine.Measures) {
                        for (const entry of measure.staffEntries) {
                            if (!this.entryHasPlayableNotes(entry) || !this.isStaffEntryVisibleForRangeSnap(entry)) {
                                continue;
                            }
                            const candidateX: number = entry.PositionAndShape?.AbsolutePosition?.x;
                            if (typeof candidateX !== "number" || !Number.isFinite(candidateX)) {
                                continue;
                            }
                            const candidateXPx: number = candidateX * scale;
                            // Use xPx + systemIndex matching (same criteria as gray-out logic)
                            if (bound === "start") {
                                // Find first note at or after anchor xPx (in same system) or in later system
                                const isAfterAnchor: boolean = systemIndex > anchor.systemIndex
                                    || (systemIndex === anchor.systemIndex && candidateXPx >= anchor.xPx - 1);
                                const isBetterThanBest: boolean = bestEntry === undefined
                                    || systemIndex < bestSystemIndex
                                    || (systemIndex === bestSystemIndex && candidateXPx < bestXPx);
                                if (isAfterAnchor && isBetterThanBest) {
                                    bestEntry = entry;
                                    bestSystemIndex = systemIndex;
                                    bestXPx = candidateXPx;
                                }
                            } else {
                                // Find last note at or before anchor xPx (in same system) or in earlier system
                                const isBeforeAnchor: boolean = systemIndex < anchor.systemIndex
                                    || (systemIndex === anchor.systemIndex && candidateXPx <= anchor.xPx + 1);
                                const isBetterThanBest: boolean = bestEntry === undefined
                                    || systemIndex > bestSystemIndex
                                    || (systemIndex === bestSystemIndex && candidateXPx > bestXPx);
                                if (isBeforeAnchor && isBetterThanBest) {
                                    bestEntry = entry;
                                    bestSystemIndex = systemIndex;
                                    bestXPx = candidateXPx;
                                }
                            }
                        }
                    }
                }
                systemIndex++;
            }
        }
        if (!bestEntry) {
            return anchor;
        }
        const entryX: number = bestEntry.PositionAndShape?.AbsolutePosition?.x ?? anchor.x;
        const entryXPx: number = entryX * scale;
        const widthCompensationPx: number = this.getSnapWidthCompensationPxForEntry(bestEntry, bound, scale);
        const snapPaddingPx: number = this.getRangeSelectionSnapPaddingPx();
        const rawSnappedXPx: number = bound === "start"
            ? entryXPx - snapPaddingPx - widthCompensationPx
            : entryXPx + snapPaddingPx + widthCompensationPx;
        const snappedXPx: number = this.clampSnapBoundaryToAdjacentEntryMidpoint(bestEntry, bound, rawSnappedXPx, scale);
        const snappedX: number = snappedXPx / scale;
        const entryTimestamp: number = bestEntry.getAbsoluteTimestamp()?.RealValue ?? anchor.timestampReal;
        const system: MusicSystem = bestEntry.parentMeasure?.ParentMusicSystem
            ?? this.findSystemByIndex(anchor.systemIndex);
        const lineBounds: { yPx: number, heightPx: number } = system
            ? this.getSystemVerticalBoundsInPixels(system)
            : { yPx: anchor.yPx, heightPx: anchor.heightPx };
        return {
            timestamp: new Fraction(entryTimestamp, 1),
            timestampReal: entryTimestamp,
            measureIndex: bestEntry.parentMeasure?.parentSourceMeasure?.measureListIndex ?? anchor.measureIndex,
            systemIndex: system ? this.getSystemIndex(system) : anchor.systemIndex,
            pageNumber: system?.Parent?.PageNumber ?? anchor.pageNumber,
            staffIndex: bestEntry.sourceStaffEntry?.ParentStaff?.idInMusicSheet ?? anchor.staffIndex,
            x: snappedX,
            xPx: snappedXPx,
            selectionX: entryX,
            selectionXPx: entryXPx,
            yPx: lineBounds.yPx,
            heightPx: lineBounds.heightPx,
        };
    }

    private getRangeSelectionSnapPaddingPx(): number {
        // Keep this aligned with touch auto-scroll edge threshold and
        // scale with zoom so snap spacing remains musically consistent.
        const zoomValue: number = Math.max(0.25, Number.isFinite(this.zoom) ? this.zoom : 1);
        const zoomScaledPaddingPx: number = 18 * Math.sqrt(zoomValue);
        return Math.max(18, Math.min(28, zoomScaledPaddingPx));
    }

    private entryHasPlayableNotes(entry: GraphicalStaffEntry): boolean {
        return entry?.sourceStaffEntry?.VoiceEntries?.some(
            (voiceEntry: any) => voiceEntry.Notes?.some((note: any) => !note.isRest())
        ) ?? false;
    }

    private clampSnapBoundaryToAdjacentEntryMidpoint(
        entry: GraphicalStaffEntry,
        bound: "start" | "end",
        snappedXPx: number,
        scale: number
    ): number {
        if (!entry || !Number.isFinite(snappedXPx) || !Number.isFinite(scale)) {
            return snappedXPx;
        }
        const neighborBoundsXPx: { leftPx: number, rightPx: number } = this.getAdjacentPlayableEntryBoundsXPx(
            entry,
            bound === "start" ? "previous" : "next",
            scale
        );
        const allowMeasureBoundarySnap: boolean = this.isMeasureBoundarySnapAllowed(entry, bound);
        const epsilonPx: number = 0.5;
        const measureBounds: { leftPx: number, rightPx: number } = this.getMeasureHorizontalBoundsInPixels(
            entry?.parentMeasure,
            entry?.parentMeasure?.ParentMusicSystem
        );

        if (bound === "start" && this.isFirstVisiblePlayableEntryInSystem(entry, scale)) {
            const system: MusicSystem = entry?.parentMeasure?.ParentMusicSystem;
            if (system) {
                // For the first visible playable note in a system, allow snapping to the
                // pre-start area left of the opening clef/key/time block so selection can
                // include beat-0 notes and feel anchored to the visual system start.
                const systemBounds: { leftPx: number, rightPx: number } = this.getSystemHorizontalBoundsInPixels(system);
                const leftVisualStartPx: number = Number.isFinite(measureBounds.leftPx)
                    ? Math.min(systemBounds.leftPx, measureBounds.leftPx)
                    : systemBounds.leftPx;
                return leftVisualStartPx - this.getRangeSelectionPreStartPaddingPx();
            }
        }

        // Rule: if this is the first/last visible playable timestamp in the measure,
        // allow measure boundary snapping directly.
        if (allowMeasureBoundarySnap) {
            if (bound === "start") {
                return Number.isFinite(measureBounds.leftPx)
                    ? measureBounds.leftPx
                    : snappedXPx;
            }
            return Number.isFinite(measureBounds.rightPx)
                ? measureBounds.rightPx
                : snappedXPx;
        }

        if (bound === "start") {
            if (neighborBoundsXPx && Number.isFinite(neighborBoundsXPx.rightPx)) {
                // Prefer snapping almost to the previous visible note edge.
                // This keeps the range tight without including that note.
                const entryBoundsXPx: { leftPx: number, rightPx: number } = this.getEntryPlayableBoundsXPx(entry, scale);
                const maxPreviousSnapDistancePx: number = 32;
                const previousNoteSnapXPx: number = neighborBoundsXPx.rightPx + epsilonPx;
                if (entryBoundsXPx && Number.isFinite(entryBoundsXPx.leftPx)) {
                    // Cap how far back start-handle can jump when snapping to previous note.
                    const furthestBackAllowedXPx: number = entryBoundsXPx.leftPx - maxPreviousSnapDistancePx;
                    return Math.max(furthestBackAllowedXPx, previousNoteSnapXPx);
                }
                return previousNoteSnapXPx;
            }
            // No adjacent visible note on this side: fall back to snap padding.
            return snappedXPx;
        }

        if (neighborBoundsXPx && Number.isFinite(neighborBoundsXPx.leftPx)) {
            // Prefer snapping almost to the next visible note edge.
            // This keeps the range tight without including that note.
            return neighborBoundsXPx.leftPx - epsilonPx;
        }
        // No adjacent visible note on this side: fall back to snap padding.
        return snappedXPx;
    }

    private isMeasureBoundarySnapAllowed(
        entry: GraphicalStaffEntry,
        bound: "start" | "end"
    ): boolean {
        const measure: GraphicalMeasure = entry?.parentMeasure;
        if (!measure) {
            return false;
        }
        const entryTimestamp: number = entry?.getAbsoluteTimestamp()?.RealValue;
        if (!Number.isFinite(entryTimestamp)) {
            return false;
        }
        const targetSystem: MusicSystem = measure?.ParentMusicSystem;
        const targetMeasureIndex: number = measure?.parentSourceMeasure?.measureListIndex;
        if (!targetSystem || !Number.isFinite(targetMeasureIndex)) {
            return false;
        }
        const scale: number = this.zoom * 10.0;
        if (!Number.isFinite(scale)) {
            return false;
        }
        type EntryBoundarySnapshot = { timestamp: number, leftPx: number, rightPx: number };
        const boundarySnapshots: EntryBoundarySnapshot[] = [];
        let minTimestamp: number = Number.POSITIVE_INFINITY;
        let maxTimestamp: number = Number.NEGATIVE_INFINITY;
        for (const staffLine of targetSystem.StaffLines ?? []) {
            for (const siblingMeasure of staffLine?.Measures ?? []) {
                if (siblingMeasure?.parentSourceMeasure?.measureListIndex !== targetMeasureIndex) {
                    continue;
                }
                for (const candidateEntry of siblingMeasure?.staffEntries ?? []) {
                    if (!candidateEntry
                        || !this.entryHasPlayableNotes(candidateEntry)
                        || !this.isStaffEntryVisibleForRangeSnap(candidateEntry)) {
                        continue;
                    }
                    const candidateTimestamp: number = candidateEntry.getAbsoluteTimestamp()?.RealValue;
                    if (!Number.isFinite(candidateTimestamp)) {
                        continue;
                    }
                    const candidateBoundsXPx: { leftPx: number, rightPx: number } = this.getEntryPlayableBoundsXPx(candidateEntry, scale);
                    if (!candidateBoundsXPx
                        || !Number.isFinite(candidateBoundsXPx.leftPx)
                        || !Number.isFinite(candidateBoundsXPx.rightPx)) {
                        continue;
                    }
                    minTimestamp = Math.min(minTimestamp, candidateTimestamp);
                    maxTimestamp = Math.max(maxTimestamp, candidateTimestamp);
                    boundarySnapshots.push({
                        timestamp: candidateTimestamp,
                        leftPx: candidateBoundsXPx.leftPx,
                        rightPx: candidateBoundsXPx.rightPx
                    });
                }
            }
        }
        if (!Number.isFinite(minTimestamp) || !Number.isFinite(maxTimestamp) || boundarySnapshots.length === 0) {
            return false;
        }
        const entryBoundsXPx: { leftPx: number, rightPx: number } = this.getEntryPlayableBoundsXPx(entry, scale);
        if (!entryBoundsXPx || !Number.isFinite(entryBoundsXPx.leftPx) || !Number.isFinite(entryBoundsXPx.rightPx)) {
            return false;
        }
        const epsilon: number = Fraction.FloatInaccuracyTolerance;
        const xEpsilonPx: number = 0.5;
        if (bound === "start") {
            if (entryTimestamp > minTimestamp + epsilon) {
                return false;
            }
            let minLeftAtMinTimestamp: number = Number.POSITIVE_INFINITY;
            for (const snapshot of boundarySnapshots) {
                if (snapshot.timestamp <= minTimestamp + epsilon) {
                    minLeftAtMinTimestamp = Math.min(minLeftAtMinTimestamp, snapshot.leftPx);
                }
            }
            return Number.isFinite(minLeftAtMinTimestamp)
                && entryBoundsXPx.leftPx <= minLeftAtMinTimestamp + xEpsilonPx;
        }
        if (entryTimestamp < maxTimestamp - epsilon) {
            return false;
        }
        let maxRightAtMaxTimestamp: number = Number.NEGATIVE_INFINITY;
        for (const snapshot of boundarySnapshots) {
            if (snapshot.timestamp >= maxTimestamp - epsilon) {
                maxRightAtMaxTimestamp = Math.max(maxRightAtMaxTimestamp, snapshot.rightPx);
            }
        }
        return Number.isFinite(maxRightAtMaxTimestamp)
            && entryBoundsXPx.rightPx >= maxRightAtMaxTimestamp - xEpsilonPx;
    }

    private isFirstVisiblePlayableEntryInSystem(entry: GraphicalStaffEntry, scale: number): boolean {
        const system: MusicSystem = entry?.parentMeasure?.ParentMusicSystem;
        if (!system || !Number.isFinite(scale)) {
            return false;
        }
        const entryTimestamp: number = entry?.getAbsoluteTimestamp()?.RealValue;
        const entryBoundsXPx: { leftPx: number, rightPx: number } = this.getEntryPlayableBoundsXPx(entry, scale);
        if (!Number.isFinite(entryTimestamp) || !entryBoundsXPx || !Number.isFinite(entryBoundsXPx.leftPx)) {
            return false;
        }
        let minTimestamp: number = Number.POSITIVE_INFINITY;
        let minLeftAtMinTimestamp: number = Number.POSITIVE_INFINITY;
        for (const staffLine of system.StaffLines ?? []) {
            for (const measure of staffLine?.Measures ?? []) {
                for (const candidateEntry of measure?.staffEntries ?? []) {
                    if (!candidateEntry
                        || !this.entryHasPlayableNotes(candidateEntry)
                        || !this.isStaffEntryVisibleForRangeSnap(candidateEntry)) {
                        continue;
                    }
                    const candidateTimestamp: number = candidateEntry.getAbsoluteTimestamp()?.RealValue;
                    const candidateBoundsXPx: { leftPx: number, rightPx: number } = this.getEntryPlayableBoundsXPx(candidateEntry, scale);
                    if (!Number.isFinite(candidateTimestamp) || !candidateBoundsXPx || !Number.isFinite(candidateBoundsXPx.leftPx)) {
                        continue;
                    }
                    if (candidateTimestamp < minTimestamp - Fraction.FloatInaccuracyTolerance) {
                        minTimestamp = candidateTimestamp;
                        minLeftAtMinTimestamp = candidateBoundsXPx.leftPx;
                    } else if (Math.abs(candidateTimestamp - minTimestamp) <= Fraction.FloatInaccuracyTolerance) {
                        minLeftAtMinTimestamp = Math.min(minLeftAtMinTimestamp, candidateBoundsXPx.leftPx);
                    }
                }
            }
        }
        if (!Number.isFinite(minTimestamp) || !Number.isFinite(minLeftAtMinTimestamp)) {
            return false;
        }
        const xEpsilonPx: number = 0.5;
        return entryTimestamp <= minTimestamp + Fraction.FloatInaccuracyTolerance
            && entryBoundsXPx.leftPx <= minLeftAtMinTimestamp + xEpsilonPx;
    }

    private isStaffEntryVisibleForRangeSnap(entry: GraphicalStaffEntry): boolean {
        if (!entry) {
            return false;
        }
        const parentStaff: any = entry?.sourceStaffEntry?.ParentStaff;
        const isStaffVisible: boolean = typeof parentStaff?.isVisible === "function"
            ? parentStaff.isVisible()
            : parentStaff?.Visible !== false;
        if (!isStaffVisible) {
            return false;
        }
        const parentMeasure: any = entry?.parentMeasure;
        return typeof parentMeasure?.isVisible === "function"
            ? parentMeasure.isVisible()
            : true;
    }

    private getAdjacentPlayableEntryBoundsXPx(
        entry: GraphicalStaffEntry,
        direction: "previous" | "next",
        scale: number
    ): { leftPx: number, rightPx: number } {
        const measure: GraphicalMeasure = entry?.parentMeasure;
        if (!measure || !Number.isFinite(scale)) {
            return undefined;
        }
        const entryCenterXPx: number = (entry.PositionAndShape?.AbsolutePosition?.x ?? NaN) * scale;
        if (!Number.isFinite(entryCenterXPx)) {
            return undefined;
        }
        const targetSystem: MusicSystem = measure?.ParentMusicSystem;
        const targetMeasureIndex: number = measure?.parentSourceMeasure?.measureListIndex;
        if (!targetSystem || !Number.isFinite(targetMeasureIndex)) {
            return undefined;
        }
        let bestCandidateEntry: GraphicalStaffEntry = undefined;
        let candidateCenterXPx: number = direction === "previous" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
        for (const staffLine of targetSystem.StaffLines ?? []) {
            for (const siblingMeasure of staffLine?.Measures ?? []) {
                if (siblingMeasure?.parentSourceMeasure?.measureListIndex !== targetMeasureIndex) {
                    continue;
                }
                for (const candidateEntry of siblingMeasure?.staffEntries ?? []) {
                    if (!candidateEntry
                        || candidateEntry === entry
                        || !this.entryHasPlayableNotes(candidateEntry)
                        || !this.isStaffEntryVisibleForRangeSnap(candidateEntry)) {
                        continue;
                    }
                    // Adjacent-note clamping should consider all visible entries in this
                    // source measure across all currently shown staves.
                    const centerXPx: number = (candidateEntry.PositionAndShape?.AbsolutePosition?.x ?? NaN) * scale;
                    if (!Number.isFinite(centerXPx)) {
                        continue;
                    }
                    if (direction === "previous") {
                        if (centerXPx < entryCenterXPx && centerXPx > candidateCenterXPx) {
                            candidateCenterXPx = centerXPx;
                            bestCandidateEntry = candidateEntry;
                        }
                    } else if (centerXPx > entryCenterXPx && centerXPx < candidateCenterXPx) {
                        candidateCenterXPx = centerXPx;
                        bestCandidateEntry = candidateEntry;
                    }
                }
            }
        }
        if (direction === "previous" && !Number.isFinite(candidateCenterXPx)) {
            return undefined;
        }
        if (direction === "next" && !Number.isFinite(candidateCenterXPx)) {
            return undefined;
        }
        return this.getEntryPlayableBoundsXPx(bestCandidateEntry, scale);
    }

    private getEntryPlayableBoundsXPx(
        entry: GraphicalStaffEntry,
        scale: number
    ): { leftPx: number, rightPx: number } {
        if (!entry || !Number.isFinite(scale)) {
            return undefined;
        }
        const entryXPx: number = (entry.PositionAndShape?.AbsolutePosition?.x ?? NaN) * scale;
        if (!Number.isFinite(entryXPx)) {
            return undefined;
        }
        let minLeftXPx: number = Number.POSITIVE_INFINITY;
        let maxRightXPx: number = Number.NEGATIVE_INFINITY;
        for (const graphicalVoiceEntry of entry.graphicalVoiceEntries ?? []) {
            for (const graphicalNote of graphicalVoiceEntry?.notes ?? []) {
                const sourceNote: any = graphicalNote?.sourceNote;
                if (!sourceNote || sourceNote.isRest()) {
                    continue;
                }
                const noteX: number = graphicalNote.PositionAndShape?.AbsolutePosition?.x;
                if (!Number.isFinite(noteX)) {
                    continue;
                }
                const noteXPx: number = noteX * scale;
                const noteLeftXPx: number = noteXPx + ((graphicalNote.PositionAndShape?.BorderLeft ?? 0) * scale);
                const noteRightXPx: number = noteXPx + ((graphicalNote.PositionAndShape?.BorderRight ?? 0) * scale);
                minLeftXPx = Math.min(minLeftXPx, noteLeftXPx);
                maxRightXPx = Math.max(maxRightXPx, noteRightXPx);
            }
        }
        if (!Number.isFinite(minLeftXPx) || !Number.isFinite(maxRightXPx)) {
            return { leftPx: entryXPx, rightPx: entryXPx };
        }
        return { leftPx: minLeftXPx, rightPx: maxRightXPx };
    }

    private getSnapWidthCompensationPxForEntry(
        entry: GraphicalStaffEntry,
        bound: "start" | "end",
        scale: number
    ): number {
        const entryBoundsXPx: { leftPx: number, rightPx: number } = this.getEntryPlayableBoundsXPx(entry, scale);
        if (!entryBoundsXPx) {
            return 0;
        }
        const entryXPx: number = (entry.PositionAndShape?.AbsolutePosition?.x ?? NaN) * scale;
        if (!Number.isFinite(entryXPx)) {
            return 0;
        }
        return bound === "start"
            ? Math.max(0, entryXPx - entryBoundsXPx.leftPx)
            : Math.max(0, entryBoundsXPx.rightPx - entryXPx);
    }

    private getMeasureHorizontalBoundsInPixels(
        measure: GraphicalMeasure,
        fallbackSystem?: MusicSystem
    ): { leftPx: number, rightPx: number } {
        const scale: number = this.zoom * 10.0;
        const fallbackBounds: { leftPx: number, rightPx: number } = fallbackSystem
            ? this.getSystemHorizontalBoundsInPixels(fallbackSystem)
            : { leftPx: Number.NEGATIVE_INFINITY, rightPx: Number.POSITIVE_INFINITY };
        if (!measure || !Number.isFinite(scale)) {
            return fallbackBounds;
        }

        const absoluteX: number = measure.PositionAndShape?.AbsolutePosition?.x;
        const borderLeft: number = measure.PositionAndShape?.BorderLeft ?? 0;
        const borderRight: number = measure.PositionAndShape?.BorderRight ?? 0;
        const leftPx: number = (absoluteX + borderLeft) * scale;
        const rightPx: number = (absoluteX + borderRight) * scale;
        if (!Number.isFinite(leftPx) || !Number.isFinite(rightPx)) {
            return fallbackBounds;
        }
        const normalizedLeftPx: number = Math.min(leftPx, rightPx);
        const normalizedRightPx: number = Math.max(leftPx, rightPx);
        return {
            leftPx: Number.isFinite(fallbackBounds.leftPx) ? Math.max(normalizedLeftPx, fallbackBounds.leftPx) : normalizedLeftPx,
            rightPx: Number.isFinite(fallbackBounds.rightPx) ? Math.min(normalizedRightPx, fallbackBounds.rightPx) : normalizedRightPx
        };
    }

    private shiftAnchorX(anchor: RangeSelectionAnchor, deltaPx: number): RangeSelectionAnchor {
        if (!anchor || !this.graphic) {
            return anchor;
        }
        const system: MusicSystem = this.findSystemByIndex(anchor.systemIndex);
        if (!system) {
            return anchor;
        }
        const horizontalBounds: { leftPx: number, rightPx: number } = this.getSystemHorizontalBoundsInPixels(system);
        const preStartPaddingPx: number = this.getRangeSelectionPreStartPaddingPx();
        const shiftedXPx: number = Math.min(
            horizontalBounds.rightPx,
            Math.max(horizontalBounds.leftPx - preStartPaddingPx, anchor.xPx + deltaPx)
        );
        const startTime: Fraction = system.GetSystemsFirstTimeStamp();
        const endTime: Fraction = system.GetSystemsLastTimeStamp();
        const widthPx: number = Math.max(1, horizontalBounds.rightPx - horizontalBounds.leftPx);
        const ratio: number = (shiftedXPx - horizontalBounds.leftPx) / widthPx;
        const timestampReal: number = startTime.RealValue + (endTime.RealValue - startTime.RealValue) * ratio;
        return {
            ...anchor,
            timestamp: new Fraction(timestampReal, 1),
            timestampReal,
            xPx: shiftedXPx,
            x: shiftedXPx / (this.zoom * 10.0)
        };
    }

    private findSystemByIndex(targetIndex: number): MusicSystem {
        if (!this.graphic || targetIndex < 0) {
            return undefined;
        }
        let index: number = 0;
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                if (index === targetIndex) {
                    return system;
                }
                index++;
            }
        }
        return undefined;
    }

    private createSelectionPayload(
        phase: "hover" | "dragging" | "committed" | "cleared",
        start: RangeSelectionAnchor,
        end: RangeSelectionAnchor,
        isDragging: boolean
    ): RangeSelectionPayload {
        const normalizedStart: RangeSelectionAnchor = start.timestampReal <= end.timestampReal ? start : end;
        const normalizedEnd: RangeSelectionAnchor = normalizedStart === start ? end : start;
        const direction: RangeSelectionDirection = start.timestampReal <= end.timestampReal ? "forward" : "backward";
        return {
            phase,
            direction,
            start,
            end,
            normalizedStart,
            normalizedEnd,
            isDragging
        };
    }

    private emitRangeSelection(
        phase: "hover" | "dragging" | "committed" | "cleared",
        start: RangeSelectionAnchor,
        end: RangeSelectionAnchor,
        isDragging: boolean
    ): void {
        if (!this.rangeSelection.callbacks.onChange || !start || !end) {
            return;
        }
        this.rangeSelection.callbacks.onChange(this.createSelectionPayload(phase, start, end, isDragging));
    }

    private renderRangeSelection(): void {
        if (!this.rangeInteractionOverlay) {
            return;
        }
        if (this.needsCommittedRangeAnchorRefresh) {
            this.refreshCommittedRangeAnchorsFromTimestamps();
            this.needsCommittedRangeAnchorRefresh = false;
        }
        this.rangeInteractionOverlay.innerHTML = "";
        this.updateRangeSelectionOpacity();
        const hideSelectionVisuals: boolean = this.shouldHideSelectionRangeVisuals();
        if (this.dragStartAnchor && this.dragCurrentAnchor) {
            if (!hideSelectionVisuals && (this.isRangeDragging || this.shouldShowCommittedRangeFill())) {
                this.renderSelectionRangeOverlay(this.dragStartAnchor, this.dragCurrentAnchor);
            }
            if (!hideSelectionVisuals) {
                const lineWidthPx: number = this.getSelectionLineWidthPx();
                this.renderVerticalLine(this.dragStartAnchor, this.getSelectionLineColor(), lineWidthPx);
                this.renderVerticalLine(this.dragCurrentAnchor, this.getSelectionLineColor(), lineWidthPx);
            }
            if (!hideSelectionVisuals && !this.isRangeDragging) {
                const currentSelection: RangeSelectionPayload = this.getRangeSelection();
                this.renderRangeActionButtons(currentSelection);
            }
            return;
        }
        if (!hideSelectionVisuals && !this.isRangeDragging && this.pendingTouchRangeStartAnchor) {
            this.renderVerticalLine(this.pendingTouchRangeStartAnchor, this.getSelectionLineColor(), this.getSelectionLineWidthPx());
            return;
        }
        if (!hideSelectionVisuals && this.shouldShowHoverLine() && !this.isRangeDragging && this.hoverAnchor) {
            this.renderVerticalLine(this.hoverAnchor, this.getSelectionLineColor(), 2);
        }
    }

    private refreshCommittedRangeAnchorsFromTimestamps(): void {
        if (this.isRangeDragging || !this.dragStartAnchor || !this.dragCurrentAnchor || !this.graphic) {
            return;
        }
        const hadForwardDirection: boolean = this.dragStartAnchor.timestampReal <= this.dragCurrentAnchor.timestampReal;
        const refreshedStartAnchor: RangeSelectionAnchor = this.createAnchorFromTimestamp(new Fraction(this.dragStartAnchor.timestampReal, 1));
        const refreshedEndAnchor: RangeSelectionAnchor = this.createAnchorFromTimestamp(new Fraction(this.dragCurrentAnchor.timestampReal, 1));
        if (!refreshedStartAnchor || !refreshedEndAnchor) {
            return;
        }
        const refreshedSelection: RangeSelectionPayload = this.applySelectionPadding(
            this.createSelectionPayload("committed", refreshedStartAnchor, refreshedEndAnchor, false),
            "both"
        );
        if (hadForwardDirection) {
            this.dragStartAnchor = refreshedSelection.normalizedStart;
            this.dragCurrentAnchor = refreshedSelection.normalizedEnd;
            return;
        }
        this.dragStartAnchor = refreshedSelection.normalizedEnd;
        this.dragCurrentAnchor = refreshedSelection.normalizedStart;
    }

    private renderSelectionRangeOverlay(start: RangeSelectionAnchor, end: RangeSelectionAnchor): void {
        if (!this.graphic) {
            return;
        }
        const selection: RangeSelectionPayload = this.createSelectionPayload("dragging", start, end, this.isRangeDragging);
        const firstAnchor: RangeSelectionAnchor = selection.normalizedStart;
        const lastAnchor: RangeSelectionAnchor = selection.normalizedEnd;
        const selectedFill: string = this.rangeSelection.options.fillColor ?? "rgba(47, 169, 224, 0.25)";
        const viewport: { topPx: number, bottomPx: number } = this.getRangeSelectionViewportYPx();
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                if (!this.isSystemInRangeSelectionViewport(system, viewport)) {
                    continue;
                }
                const systemIndex: number = this.getSystemIndex(system);
                if (systemIndex < firstAnchor.systemIndex || systemIndex > lastAnchor.systemIndex) {
                    continue;
                }
                const horizontal: { leftPx: number, rightPx: number } = this.getSystemHorizontalBoundsInPixels(system);
                const vertical: { yPx: number, heightPx: number } = this.getSystemVerticalBoundsInPixels(system);
                let selectionLeft: number = horizontal.leftPx;
                let selectionRight: number = horizontal.rightPx;
                if (systemIndex === firstAnchor.systemIndex) {
                    selectionLeft = firstAnchor.xPx;
                }
                if (systemIndex === lastAnchor.systemIndex) {
                    selectionRight = lastAnchor.xPx;
                }
                if (firstAnchor.systemIndex === lastAnchor.systemIndex) {
                    selectionLeft = Math.min(firstAnchor.xPx, lastAnchor.xPx);
                    selectionRight = Math.max(firstAnchor.xPx, lastAnchor.xPx);
                }
                const minLeftPx: number = systemIndex === firstAnchor.systemIndex
                    ? horizontal.leftPx - this.getRangeSelectionPreStartPaddingPx()
                    : horizontal.leftPx;
                selectionLeft = Math.max(minLeftPx, selectionLeft);
                selectionRight = Math.min(horizontal.rightPx, selectionRight);
                if (selectionRight < selectionLeft) {
                    const temp: number = selectionLeft;
                    selectionLeft = selectionRight;
                    selectionRight = temp;
                }
                this.renderRectangle(selectionLeft, vertical.yPx, Math.max(1, selectionRight - selectionLeft), vertical.heightPx, selectedFill);
            }
        }
    }

    private renderVerticalLine(anchor: RangeSelectionAnchor, color: string, widthPx: number, visualOffsetPx: number = 0): void {
        const line: HTMLDivElement = document.createElement("div");
        const overlayHeight: number = this.rangeInteractionOverlay?.clientHeight ?? 0;
        let topPx: number = anchor.yPx;
        let heightPx: number = anchor.heightPx;
        const lineOutsideOverlay: boolean = overlayHeight > 0 && (topPx + heightPx < 0 || topPx > overlayHeight);
        const invalidLineGeometry: boolean = !Number.isFinite(topPx) || !Number.isFinite(heightPx) || heightPx <= 1 || lineOutsideOverlay;
        if (invalidLineGeometry && overlayHeight > 0) {
            // App layouts with additional wrappers/transforms can shift computed Y bounds.
            // Fall back to overlay height so the cursor remains visible.
            topPx = 0;
            heightPx = overlayHeight;
        } else if (overlayHeight > 0) {
            topPx = Math.max(0, Math.min(topPx, overlayHeight - 1));
            heightPx = Math.max(1, Math.min(heightPx, overlayHeight - topPx));
        }
        line.style.position = "absolute";
        line.style.left = `${anchor.xPx + visualOffsetPx - widthPx / 2}px`;
        line.style.top = `${topPx}px`;
        line.style.width = `${widthPx}px`;
        line.style.height = `${heightPx}px`;
        line.style.borderRadius = "999px";
        line.style.backgroundColor = color;
        this.rangeInteractionOverlay.appendChild(line);
    }

    private renderRectangle(leftPx: number, topPx: number, widthPx: number, heightPx: number, color: string): void {
        if (widthPx <= 0 || heightPx <= 0) {
            return;
        }
        const rect: HTMLDivElement = document.createElement("div");
        rect.style.position = "absolute";
        rect.style.left = `${leftPx}px`;
        rect.style.top = `${topPx}px`;
        rect.style.width = `${widthPx}px`;
        rect.style.height = `${heightPx}px`;
        rect.style.backgroundColor = color;
        this.rangeInteractionOverlay.appendChild(rect);
    }

    private renderRangeActionButtons(selection: RangeSelectionPayload): void {
        if (!selection || !this.rangeSelection.callbacks.onControlsRender) {
            return;
        }
        const buttonsContainer: HTMLDivElement = document.createElement("div");
        buttonsContainer.style.position = "absolute";
        buttonsContainer.style.pointerEvents = "auto";
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.flexDirection = "column";
        buttonsContainer.style.gap = "6px";
        buttonsContainer.style.zIndex = "9";
        this.rangeSelection.callbacks.onControlsRender(buttonsContainer, selection);
        if (buttonsContainer.childElementCount < 1) {
            return;
        }
        const overlayWidthPx: number = this.rangeInteractionOverlay?.clientWidth ?? 0;
        const overlayHeightPx: number = this.rangeInteractionOverlay?.clientHeight ?? 0;
        const controlsWidthPx: number = buttonsContainer.offsetWidth;
        const controlsHeightPx: number = buttonsContainer.offsetHeight;
        const horizontalMarginPx: number = 10;
        const extraLeftOffsetPx: number = 32;
        const verticalMarginPx: number = 8;

        const startAnchor: RangeSelectionAnchor = selection.normalizedStart;
        const endAnchor: RangeSelectionAnchor = selection.normalizedEnd;
        const sameSystemTolerancePx: number = 1;
        let controlsAnchor: RangeSelectionAnchor = startAnchor;
        if (endAnchor.yPx < startAnchor.yPx - sameSystemTolerancePx) {
            // End handle is on a topmost system.
            controlsAnchor = endAnchor;
        } else if (Math.abs(endAnchor.yPx - startAnchor.yPx) <= sameSystemTolerancePx && endAnchor.xPx < startAnchor.xPx) {
            // Same system: use the leftmost handle.
            controlsAnchor = endAnchor;
        }

        // Place controls to the left of the selected anchor handle.
        const preferredLeftPx: number = controlsAnchor.xPx - controlsWidthPx - horizontalMarginPx - extraLeftOffsetPx;
        const fallbackLeftPx: number = controlsAnchor.xPx + horizontalMarginPx;
        let leftPx: number = preferredLeftPx;
        if (leftPx < horizontalMarginPx) {
            leftPx = fallbackLeftPx;
        }
        if (overlayWidthPx > 0) {
            const maxLeftPx: number = Math.max(horizontalMarginPx, overlayWidthPx - controlsWidthPx - horizontalMarginPx);
            leftPx = Math.min(maxLeftPx, Math.max(horizontalMarginPx, leftPx));
        }

        let topPx: number = Math.max(verticalMarginPx, controlsAnchor.yPx);
        if (overlayHeightPx > 0) {
            const maxTopPx: number = Math.max(verticalMarginPx, overlayHeightPx - controlsHeightPx - verticalMarginPx);
            topPx = Math.min(maxTopPx, Math.max(verticalMarginPx, topPx));
        }

        buttonsContainer.style.left = `${leftPx}px`;
        buttonsContainer.style.top = `${topPx}px`;
        this.rangeInteractionOverlay.appendChild(buttonsContainer);
    }

    private getSelectionLineColor(): string {
        return this.rangeSelection.options.lineColor ?? "rgba(47, 169, 224, 0.95)";
    }

    private getSelectionLineWidthPx(): number {
        const baseLineWidthPx: number = this.rangeSelection.options.lineWidthPx ?? 12;
        const zoomValue: number = Number.isFinite(this.zoom) ? this.zoom : 1;
        const zoomScaledLineWidthPx: number = baseLineWidthPx * Math.sqrt(Math.max(0.25, zoomValue));
        return Math.max(6, Math.min(14, zoomScaledLineWidthPx));
    }

    private shouldHideSelectionRangeVisuals(): boolean {
        return this.rangeSelection.options.hideSelectionRange === true;
    }

    private shouldShowHoverLine(): boolean {
        return this.rangeSelection.options.showHoverLine !== false;
    }

    private getRangeSelectionViewportYPx(): { topPx: number, bottomPx: number } {
        if (!this.container) {
            return undefined;
        }
        const containerRect: DOMRect = this.container.getBoundingClientRect();
        if (!containerRect || !Number.isFinite(containerRect.top)) {
            return undefined;
        }
        const scrollContainer: HTMLElement | Window = this.rangeViewportScrollTarget ?? this.getRangeSelectionScrollContainer();
        let viewportTopClientPx: number = 0;
        let viewportBottomClientPx: number = window.innerHeight;
        if (!this.isWindowObject(scrollContainer)) {
            const scrollRect: DOMRect = scrollContainer.getBoundingClientRect();
            viewportTopClientPx = scrollRect.top;
            viewportBottomClientPx = scrollRect.bottom;
        }
        const viewportHeightPx: number = Math.max(1, viewportBottomClientPx - viewportTopClientPx);
        const overscanPx: number = Math.max(240, Math.min(900, viewportHeightPx * 0.75));
        return {
            topPx: viewportTopClientPx - containerRect.top - overscanPx,
            bottomPx: viewportBottomClientPx - containerRect.top + overscanPx
        };
    }

    private isSystemInRangeSelectionViewport(system: MusicSystem, viewport: { topPx: number, bottomPx: number }): boolean {
        if (!system || !viewport) {
            return true;
        }
        const vertical: { yPx: number, heightPx: number } = this.getSystemVerticalBoundsInPixels(system);
        return vertical.yPx + vertical.heightPx >= viewport.topPx && vertical.yPx <= viewport.bottomPx;
    }

    private getRangeSelectionVisibleSystemIndexes(
        viewport: { topPx: number, bottomPx: number }
    ): { indexes: Set<number>, indexBySystem: Map<MusicSystem, number> } {
        const indexes: Set<number> = new Set<number>();
        const indexBySystem: Map<MusicSystem, number> = new Map<MusicSystem, number>();
        if (!this.graphic) {
            return { indexes, indexBySystem };
        }
        let systemIndex: number = 0;
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                if (this.isSystemInRangeSelectionViewport(system, viewport)) {
                    indexes.add(systemIndex);
                    indexBySystem.set(system, systemIndex);
                }
                systemIndex++;
            }
        }
        return { indexes, indexBySystem };
    }

    private getSelectionOverlayZIndex(): number {
        return this.rangeSelection.options.overlayZIndex ?? 8;
    }

    private getRangeSelectionPreStartPaddingPx(): number {
        // Allow hovering and dragging slightly before the first visible system timestamp,
        // so notes at the start boundary (timestamp 0) can still be selected.
        return Math.max(this.getSelectionLineWidthPx() * 4, 48);
    }

    private selectionHasAnyNotes(start: RangeSelectionAnchor, end: RangeSelectionAnchor): boolean {
        if (!this.sheet || !start || !end || !this.graphic) {
            return false;
        }
        const selection: RangeSelectionPayload = this.createSelectionPayload("committed", start, end, false);
        const segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }> = this.getSelectionSegments(selection);
        for (const instrument of this.sheet.Instruments) {
            for (const staff of instrument.Staves) {
                for (const voice of staff.Voices) {
                    for (const voiceEntry of voice.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            if (note.isRest()) {
                                continue;
                            }
                            const graphicalNote: GraphicalNote = this.rules.GNote(note);
                            if (!graphicalNote) {
                                continue;
                            }
                            if (this.isGraphicalNoteInSelection(note, graphicalNote, selection, segments)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    private shouldGrayOutNonSelectedNotes(): boolean {
        return this.rangeSelection.options.grayOutNonSelectedNotes !== false;
    }

    private getNonSelectedNotesOpacity(): number {
        return this.rangeSelection.options.nonSelectedNotesOpacity ?? 0.28;
    }

    private getGrayOutUpdateIntervalMs(): number {
        const configuredIntervalMs: number = this.rangeSelection.options.grayOutUpdateIntervalMs ?? 25;
        const baseIntervalMs: number = Math.max(0, configuredIntervalMs);
        if (!this.isRangeDragging) {
            return baseIntervalMs;
        }
        // Keep drag interaction smooth by lowering opacity update frequency while dragging.
        // A full-fidelity update is still applied when drag settles/commits.
        return Math.max(80, baseIntervalMs);
    }

    private shouldShowCommittedRangeFill(): boolean {
        return this.rangeSelection.options.showCommittedRangeFill === true;
    }

    private updateRangeSelectionOpacity(): void {
        if (!this.dragStartAnchor || !this.dragCurrentAnchor || !this.shouldGrayOutNonSelectedNotes()) {
            this.cancelPendingRangeOpacityUpdate();
            this.resetRangeSelectionNoteOpacity();
            return;
        }
        const intervalMs: number = this.getGrayOutUpdateIntervalMs();
        if (!this.isRangeDragging || intervalMs <= 0) {
            this.cancelPendingRangeOpacityUpdate();
            this.applyRangeSelectionOpacityNow(true);
            return;
        }
        const nowMs: number = Date.now();
        const elapsedMs: number = nowMs - this.lastRangeOpacityUpdateTimestampMs;
        if (!this.hasActiveRangeSelectionOpacity || elapsedMs >= intervalMs) {
            this.cancelPendingRangeOpacityUpdate();
            this.applyRangeSelectionOpacityNow();
            return;
        }
        if (this.rangeOpacityUpdateTimeoutId !== 0) {
            return;
        }
        const remainingMs: number = Math.max(0, intervalMs - elapsedMs);
        this.rangeOpacityUpdateTimeoutId = window.setTimeout((): void => {
            this.rangeOpacityUpdateTimeoutId = 0;
            if (!this.rangeSelection.enabled || !this.dragStartAnchor || !this.dragCurrentAnchor) {
                this.resetRangeSelectionNoteOpacity();
                return;
            }
            this.applyRangeSelectionOpacityNow();
        }, remainingMs);
    }

    private applyRangeSelectionOpacityNow(forceDecorationUpdate: boolean = false): void {
        const nowMs: number = Date.now();
        const shouldUpdateDecorations: boolean = this.shouldUpdateDecorationOpacity(nowMs, forceDecorationUpdate);
        this.applyNoteOpacityForCurrentSelection(shouldUpdateDecorations);
        this.lastRangeOpacityUpdateTimestampMs = nowMs;
    }

    private shouldUpdateDecorationOpacity(nowMs: number, forceDecorationUpdate: boolean): boolean {
        if (forceDecorationUpdate || !this.isRangeDragging || !this.hasActiveRangeSelectionOpacity) {
            return true;
        }
        // Decorations (expressions, tuplets, structural SVG) are expensive to mutate repeatedly.
        // Defer them during drag and apply at the end via forceDecorationUpdate path.
        return false;
    }

    private cancelPendingRangeOpacityUpdate(): void {
        if (this.rangeOpacityUpdateTimeoutId !== 0) {
            window.clearTimeout(this.rangeOpacityUpdateTimeoutId);
            this.rangeOpacityUpdateTimeoutId = 0;
        }
    }

    private applyNoteOpacityForCurrentSelection(includeDecorations: boolean = true): void {
        if (!this.sheet || !this.graphic || !this.shouldGrayOutNonSelectedNotes()) {
            this.resetRangeSelectionNoteOpacity();
            return;
        }
        if (!this.dragStartAnchor || !this.dragCurrentAnchor) {
            this.resetRangeSelectionNoteOpacity();
            return;
        }
        const selection: RangeSelectionPayload = this.createSelectionPayload("committed", this.dragStartAnchor, this.dragCurrentAnchor, this.isRangeDragging);
        const viewport: { topPx: number, bottomPx: number } = this.getRangeSelectionViewportYPx();
        const visibleSystems: { indexes: Set<number>, indexBySystem: Map<MusicSystem, number> } =
            this.getRangeSelectionVisibleSystemIndexes(viewport);
        // Always compute full (un-truncated) segments. Viewport culling is applied at the per-element
        // level below; segments must remain complete so that selectionEndBoundary used in
        // applyStructuralElementOpacityForSelection still reflects the true end of the selection
        // (otherwise end-of-line clefs/braces past the visible viewport would be incorrectly grayed).
        const segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }> =
            this.getSelectionSegments(selection);
        const nonSelectedOpacity: number = this.getNonSelectedNotesOpacity();
        const opacityByTarget: Map<string, { graphicalNote: GraphicalNote, shouldHighlight: boolean }> =
            new Map<string, { graphicalNote: GraphicalNote, shouldHighlight: boolean }>();
        const noteheadOpacityByTarget: Map<string, { graphicalNote: GraphicalNote, shouldHighlight: boolean }> =
            new Map<string, { graphicalNote: GraphicalNote, shouldHighlight: boolean }>();

        for (const verticalContainer of this.graphic.VerticalGraphicalStaffEntryContainers) {
            for (const staffEntry of verticalContainer?.StaffEntries ?? []) {
                if (!staffEntry) {
                    continue;
                }
                const system: MusicSystem = staffEntry.parentMeasure?.ParentMusicSystem;
                const systemIndex: number | undefined = visibleSystems.indexBySystem.get(system);
                if (systemIndex === undefined) {
                    continue;
                }
                for (const graphicalVoiceEntry of staffEntry.graphicalVoiceEntries ?? []) {
                    for (const graphicalNote of graphicalVoiceEntry?.notes ?? []) {
                        const note: any = graphicalNote?.sourceNote;
                        if (!graphicalNote || !note) {
                            continue;
                        }
                        const noteIsSelected: boolean = this.isGraphicalNoteInSelection(
                            note,
                            graphicalNote,
                            selection,
                            segments,
                            systemIndex
                        );
                        const isTieStopNote: boolean = this.isRangeDragging
                            ? false
                            : this.isTieStopNote(note, selection, segments);
                        const shouldHighlight: boolean = noteIsSelected && !isTieStopNote;
                        const targetKey: string = this.getGraphicalOpacityTargetKey(graphicalNote, note);
                        const existingTargetState: { graphicalNote: GraphicalNote, shouldHighlight: boolean } =
                            opacityByTarget.get(targetKey);
                        if (existingTargetState) {
                            existingTargetState.shouldHighlight = existingTargetState.shouldHighlight || shouldHighlight;
                        } else {
                            opacityByTarget.set(targetKey, { graphicalNote, shouldHighlight });
                        }
                        const noteheadKey: string = this.getGraphicalNoteheadOpacityTargetKey(graphicalNote, note);
                        noteheadOpacityByTarget.set(noteheadKey, { graphicalNote, shouldHighlight });
                    }
                }
            }
        }
        for (const targetState of opacityByTarget.values()) {
            targetState.graphicalNote.setOpacity(targetState.shouldHighlight ? 1.0 : nonSelectedOpacity);
            this.rangeOpacityTouchedGraphicalNotes.add(targetState.graphicalNote);
        }
        const shouldUpdateSpecificNoteheads: boolean = !this.isRangeDragging;
        if (shouldUpdateSpecificNoteheads) {
            for (const noteheadState of noteheadOpacityByTarget.values()) {
                this.setSpecificGraphicalNoteheadOpacity(
                    noteheadState.graphicalNote,
                    noteheadState.shouldHighlight ? 1.0 : nonSelectedOpacity
                );
            }
        }
        if (includeDecorations) {
            this.applyStaffEntryElementOpacityForSelection(segments, nonSelectedOpacity, visibleSystems.indexBySystem);
            this.applyMeasureNumberOpacityForSelection(segments, nonSelectedOpacity, visibleSystems.indexes);
            this.applyExpressionOpacityForSelection(segments, nonSelectedOpacity, visibleSystems.indexes);
            this.applyStructuralElementOpacityForSelection(segments, nonSelectedOpacity, viewport);
            this.applyTupletOpacityForSelection(segments, nonSelectedOpacity, viewport);
        }
        this.hasActiveRangeSelectionOpacity = true;
    }

    private resetRangeSelectionNoteOpacity(): void {
        if (!this.hasActiveRangeSelectionOpacity) {
            return;
        }
        if (!this.sheet || !this.graphic) {
            this.rangeOpacityTouchedGraphicalNotes.clear();
            this.rangeOpacityTouchedNoteheadElements.clear();
            this.rangeOpacityTouchedElements.clear();
            this.hasActiveRangeSelectionOpacity = false;
            return;
        }
        for (const graphicalNote of this.rangeOpacityTouchedGraphicalNotes) {
            graphicalNote.setOpacity(1.0);
        }
        for (const noteheadElement of this.rangeOpacityTouchedNoteheadElements) {
            if (noteheadElement?.isConnected) {
                noteheadElement.setAttribute("opacity", "1");
            }
        }
        for (const element of this.rangeOpacityTouchedElements) {
            if (element?.isConnected) {
                element.setAttribute("opacity", "1");
            }
        }
        this.rangeOpacityTouchedGraphicalNotes.clear();
        this.rangeOpacityTouchedNoteheadElements.clear();
        this.rangeOpacityTouchedElements.clear();
        this.hasActiveRangeSelectionOpacity = false;
        this.lastRangeOpacityUpdateTimestampMs = 0;
    }

    private applyStaffEntryElementOpacityForSelection(
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        nonSelectedOpacity: number,
        visibleSystemIndexBySystem: Map<MusicSystem, number>
    ): void {
        if (!this.graphic) {
            return;
        }
        for (const verticalContainer of this.graphic.VerticalGraphicalStaffEntryContainers) {
            for (const staffEntry of verticalContainer?.StaffEntries ?? []) {
                if (!staffEntry) {
                    continue;
                }
                const systemIndex: number | undefined = visibleSystemIndexBySystem.get(staffEntry.parentMeasure?.ParentMusicSystem);
                if (systemIndex === undefined) {
                    continue;
                }
                const entryXPx: number = staffEntry.PositionAndShape.AbsolutePosition.x * this.zoom * 10.0;
                const opacity: number = this.isXInSelection(systemIndex, entryXPx, segments) ? 1.0 : nonSelectedOpacity;
                for (const lyricsEntry of staffEntry.LyricsEntries ?? []) {
                    this.setGraphicalLabelOpacity(lyricsEntry?.GraphicalLabel, opacity);
                }
                for (const fingeringEntry of staffEntry.FingeringEntries ?? []) {
                    this.setGraphicalLabelOpacity(fingeringEntry, opacity);
                }
                for (const chordContainer of staffEntry.graphicalChordContainers ?? []) {
                    this.setGraphicalLabelOpacity(chordContainer?.GraphicalLabel, opacity);
                }
            }
        }
    }

    private setGraphicalLabelOpacity(label: GraphicalLabel, opacity: number): void {
        if (!label?.SVGNode) {
            return;
        }
        const labelNode: Element = label.SVGNode as Element;
        this.setRangeSelectionElementOpacity(labelNode, opacity);
    }

    private setRangeSelectionElementOpacity(element: Element, opacity: number): void {
        if (!element) {
            return;
        }
        element.setAttribute("opacity", opacity.toString());
        this.rangeOpacityTouchedElements.add(element);
    }

    private applyMeasureNumberOpacityForSelection(
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        nonSelectedOpacity: number,
        visibleSystemIndexes: Set<number>
    ): void {
        if (!this.graphic) {
            return;
        }
        const nonNoteSelectionTolerancePx: number = this.getNonNoteSelectionTolerancePx();
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                const systemIndex: number = this.getSystemIndex(system);
                if (!visibleSystemIndexes.has(systemIndex)) {
                    continue;
                }
                for (const measureNumberLabel of system.MeasureNumberLabels ?? []) {
                    const centerXPx: number = this.getGraphicalObjectCenterXPx(measureNumberLabel as any);
                    const opacity: number = this.isXInSelection(
                        systemIndex,
                        centerXPx,
                        segments,
                        nonNoteSelectionTolerancePx
                    ) ? 1.0 : nonSelectedOpacity;
                    this.setGraphicalLabelOpacity(measureNumberLabel, opacity);
                }
            }
        }
    }

    private applyExpressionOpacityForSelection(
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        nonSelectedOpacity: number,
        visibleSystemIndexes: Set<number>
    ): void {
        if (!this.graphic) {
            return;
        }
        const nonNoteSelectionTolerancePx: number = this.getNonNoteSelectionTolerancePx();
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                const systemIndex: number = this.getSystemIndex(system);
                if (!visibleSystemIndexes.has(systemIndex)) {
                    continue;
                }
                for (const staffLine of system.StaffLines ?? []) {
                    for (const expression of staffLine.AbstractExpressions ?? []) {
                        const expressionXPx: number = this.getExpressionCenterXPx(expression);
                        const opacity: number = this.isXInSelection(
                            systemIndex,
                            expressionXPx,
                            segments,
                            nonNoteSelectionTolerancePx
                        ) ? 1.0 : nonSelectedOpacity;
                        this.setGraphicalLabelOpacity(expression?.Label, opacity);
                        this.setExpressionOpacity(expression, opacity);
                    }
                }
            }
        }
    }

    private setExpressionOpacity(expression: AbstractGraphicalExpression, opacity: number): void {
        if (!expression) {
            return;
        }
        const expressionNode: Element = (expression?.PositionAndShape as any)?.SVGNode as Element;
        if (expressionNode) {
            this.setRangeSelectionElementOpacity(expressionNode, opacity);
        }
        const expressionLines: any[] = (expression as any)?.Lines ?? [];
        for (const line of expressionLines) {
            const lineElement: Element = line?.SVGElement as Element;
            if (lineElement) {
                this.setRangeSelectionElementOpacity(lineElement, opacity);
            }
        }
    }

    private getExpressionCenterXPx(expression: AbstractGraphicalExpression): number {
        const expressionLabel: GraphicalLabel = expression?.Label;
        const labelCenterXPx: number = this.getGraphicalObjectCenterXPx(expressionLabel as any);
        if (Number.isFinite(labelCenterXPx)) {
            return labelCenterXPx;
        }
        const expressionCenterXPx: number = this.getGraphicalObjectCenterXPx(expression as any);
        if (Number.isFinite(expressionCenterXPx)) {
            return expressionCenterXPx;
        }
        const expressionLines: any[] = (expression as any)?.Lines ?? [];
        for (const line of expressionLines) {
            const startX: number = line?.Start?.x;
            const endX: number = line?.End?.x;
            if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
                continue;
            }
            return ((startX + endX) / 2) * this.zoom * 10.0;
        }
        return Number.NEGATIVE_INFINITY;
    }

    private getGraphicalObjectCenterXPx(graphicalObject: { PositionAndShape?: any }): number {
        const positionAndShape: any = graphicalObject?.PositionAndShape;
        const absoluteX: number = positionAndShape?.AbsolutePosition?.x;
        if (!Number.isFinite(absoluteX)) {
            return Number.NaN;
        }
        const borderLeft: number = positionAndShape?.BorderLeft ?? 0;
        const borderRight: number = positionAndShape?.BorderRight ?? 0;
        return (absoluteX + (borderLeft + borderRight) / 2) * this.zoom * 10.0;
    }

    private applyStructuralElementOpacityForSelection(
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        nonSelectedOpacity: number,
        viewport: { topPx: number, bottomPx: number }
    ): void {
        const elements: SVGGraphicsElement[] = this.getStructuralSelectionElements();
        const containerRect: DOMRect = this.container.getBoundingClientRect();
        const nonNoteSelectionTolerancePx: number = this.getNonNoteSelectionTolerancePx();
        const selectionEndBoundary: { systemIndex: number, xPx: number } = this.getSelectionEndBoundary(segments);
        const clefBraceRects: DOMRect[] = [];
        const elementMetadata: Array<{
            element: SVGGraphicsElement;
            elementRect: DOMRect;
            centerXPx: number;
            system: MusicSystem;
            systemIndex: number;
        }> = [];
        const connectorExtremesBySystem: Map<number, { minXPx: number, maxXPx: number }> = new Map();
        for (const element of elements) {
            const elementRect: DOMRect = element.getBoundingClientRect();
            if (!this.isElementRectInRangeSelectionViewport(elementRect, containerRect, viewport)) {
                continue;
            }
            if (this.isRightSideOnlyStructuralElement(element)) {
                clefBraceRects.push(elementRect);
            }
            const centerXPx: number = (elementRect.left - containerRect.left) + (elementRect.width / 2);
            const centerYPx: number = (elementRect.top - containerRect.top) + (elementRect.height / 2);
            const system: MusicSystem = this.findSystemAtPosition(new PointF2D(centerXPx / (this.zoom * 10.0), centerYPx / (this.zoom * 10.0)));
            const systemIndex: number = this.getSystemIndex(system);
            elementMetadata.push({ element, elementRect, centerXPx, system, systemIndex });
            if (!this.isConnectorStructuralElement(element) || systemIndex < 0 || !Number.isFinite(centerXPx)) {
                continue;
            }
            const extremes: { minXPx: number, maxXPx: number } = connectorExtremesBySystem.get(systemIndex)
                ?? { minXPx: centerXPx, maxXPx: centerXPx };
            extremes.minXPx = Math.min(extremes.minXPx, centerXPx);
            extremes.maxXPx = Math.max(extremes.maxXPx, centerXPx);
            connectorExtremesBySystem.set(systemIndex, extremes);
        }
        for (const meta of elementMetadata) {
            const { element, elementRect, centerXPx, system, systemIndex } = meta;
            const keepBoundaryConnectorVisible: boolean = this.shouldKeepBoundaryConnectorVisible(
                element,
                system,
                centerXPx,
                nonNoteSelectionTolerancePx,
                systemIndex,
                connectorExtremesBySystem
            );
            const isRightSideOnlyElement: boolean = this.isRightSideOnlyStructuralElement(element)
                || (this.isConnectorStructuralElement(element)
                    && this.isConnectorNearClefOrBrace(elementRect, clefBraceRects));
            const opacity: number = keepBoundaryConnectorVisible
                ? 0.6
                : (isRightSideOnlyElement
                    ? (this.isElementAfterSelectionEnd(systemIndex, centerXPx, selectionEndBoundary, nonNoteSelectionTolerancePx)
                        ? nonSelectedOpacity
                        : 1.0)
                    : (this.isXInSelection(
                        systemIndex,
                        centerXPx,
                        segments,
                        nonNoteSelectionTolerancePx
                    ) ? 1.0 : nonSelectedOpacity));
            this.setRangeSelectionElementOpacity(element, opacity);
        }
    }

    private isElementRectInRangeSelectionViewport(
        elementRect: DOMRect,
        containerRect: DOMRect,
        viewport: { topPx: number, bottomPx: number }
    ): boolean {
        if (!elementRect || !containerRect || !viewport) {
            return true;
        }
        const topPx: number = elementRect.top - containerRect.top;
        const bottomPx: number = elementRect.bottom - containerRect.top;
        return bottomPx >= viewport.topPx && topPx <= viewport.bottomPx;
    }

    private isRightSideOnlyStructuralElement(element: SVGGraphicsElement): boolean {
        if (!element) {
            return false;
        }
        if (element.matches(
            ".vf-clef, .vf-stave-clef, [class*='clef'], [id*='clef'], " +
            ".vf-brace, [class*='brace'], [id*='brace']"
        )) {
            return true;
        }
        return Boolean(
            element.closest(
                ".vf-clef, .vf-stave-clef, [class*='clef'], [id*='clef'], " +
                ".vf-brace, [class*='brace'], [id*='brace']"
            )
        );
    }

    private isConnectorStructuralElement(element: SVGGraphicsElement): boolean {
        if (!element) {
            return false;
        }
        if (element.matches(".vf-connector, [class*='connector'], [id*='connector']")) {
            return true;
        }
        return Boolean(element.closest(".vf-connector, [class*='connector'], [id*='connector']"));
    }

    private isConnectorNearClefOrBrace(connectorRect: DOMRect, clefBraceRects: DOMRect[]): boolean {
        if (!connectorRect || !clefBraceRects?.length) {
            return false;
        }
        const connectorCenterX: number = connectorRect.left + (connectorRect.width / 2);
        for (const anchorRect of clefBraceRects) {
            const anchorCenterX: number = anchorRect.left + (anchorRect.width / 2);
            const horizontalDistancePx: number = Math.abs(connectorCenterX - anchorCenterX);
            if (horizontalDistancePx > 72) {
                continue;
            }
            const verticalOverlapPx: number =
                Math.min(connectorRect.bottom, anchorRect.bottom) - Math.max(connectorRect.top, anchorRect.top);
            if (verticalOverlapPx >= -36) {
                return true;
            }
        }
        return false;
    }

    private shouldKeepBoundaryConnectorVisible(
        element: SVGGraphicsElement,
        system: MusicSystem,
        centerXPx: number,
        tolerancePx: number,
        systemIndex: number,
        connectorExtremesBySystem: Map<number, { minXPx: number, maxXPx: number }>
    ): boolean {
        if (this.rangeSelection.options?.keepBoundaryConnectorsVisible === false) {
            return false;
        }
        if (!this.isConnectorStructuralElement(element) || !system || !Number.isFinite(centerXPx)) {
            return false;
        }
        const connectorExtremes: { minXPx: number, maxXPx: number } = connectorExtremesBySystem.get(systemIndex);
        if (!connectorExtremes) {
            return false;
        }
        const boundaryTolerancePx: number = Math.max(16, tolerancePx * 2);
        const nearLeftmostConnector: boolean = Math.abs(centerXPx - connectorExtremes.minXPx) <= boundaryTolerancePx;
        const nearRightmostConnector: boolean = Math.abs(centerXPx - connectorExtremes.maxXPx) <= boundaryTolerancePx;
        return nearLeftmostConnector || nearRightmostConnector;
    }

    private getSelectionEndBoundary(
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>
    ): { systemIndex: number, xPx: number } {
        let endSystemIndex: number = Number.NEGATIVE_INFINITY;
        let endXPx: number = Number.NEGATIVE_INFINITY;
        for (const segment of segments) {
            if (segment.systemIndex > endSystemIndex) {
                endSystemIndex = segment.systemIndex;
                endXPx = segment.rightPx;
                continue;
            }
            if (segment.systemIndex === endSystemIndex) {
                endXPx = Math.max(endXPx, segment.rightPx);
            }
        }
        return { systemIndex: endSystemIndex, xPx: endXPx };
    }

    private isElementAfterSelectionEnd(
        elementSystemIndex: number,
        elementXPx: number,
        selectionEndBoundary: { systemIndex: number, xPx: number },
        tolerancePx: number
    ): boolean {
        if (!selectionEndBoundary || !Number.isFinite(selectionEndBoundary.systemIndex)) {
            return false;
        }
        if (elementSystemIndex > selectionEndBoundary.systemIndex) {
            return true;
        }
        if (elementSystemIndex < selectionEndBoundary.systemIndex) {
            return false;
        }
        return elementXPx > selectionEndBoundary.xPx + tolerancePx;
    }

    private getSystemIndexForGraphicalNote(graphicalNote: GraphicalNote): number {
        const system: MusicSystem = graphicalNote?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentMusicSystem;
        return this.getSystemIndex(system);
    }

    private getSelectionSegments(
        selection: RangeSelectionPayload
    ): Array<{ systemIndex: number, leftPx: number, rightPx: number }> {
        const segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }> = [];
        if (!this.graphic || !selection) {
            return segments;
        }
        for (const page of this.graphic.MusicPages) {
            for (const system of page.MusicSystems) {
                const systemIndex: number = this.getSystemIndex(system);
                if (systemIndex < selection.normalizedStart.systemIndex || systemIndex > selection.normalizedEnd.systemIndex) {
                    continue;
                }
                const horizontal: { leftPx: number, rightPx: number } = this.getSystemHorizontalBoundsInPixels(system);
                let leftPx: number = horizontal.leftPx;
                let rightPx: number = horizontal.rightPx;
                if (systemIndex === selection.normalizedStart.systemIndex) {
                    leftPx = this.getSelectionBoundaryXPx(selection.normalizedStart);
                }
                if (systemIndex === selection.normalizedEnd.systemIndex) {
                    rightPx = this.getSelectionBoundaryXPx(selection.normalizedEnd);
                }
                const minLeftPx: number = systemIndex === selection.normalizedStart.systemIndex
                    ? horizontal.leftPx - this.getRangeSelectionPreStartPaddingPx()
                    : horizontal.leftPx;
                leftPx = Math.max(minLeftPx, leftPx);
                rightPx = Math.min(horizontal.rightPx, rightPx);
                if (rightPx < leftPx) {
                    const temp: number = leftPx;
                    leftPx = rightPx;
                    rightPx = temp;
                }
                segments.push({ systemIndex, leftPx, rightPx });
            }
        }
        return segments;
    }

    private getSelectionBoundaryXPx(anchor: RangeSelectionAnchor): number {
        if (!anchor) {
            return undefined;
        }
        return Number.isFinite(anchor.selectionXPx) ? anchor.selectionXPx : anchor.xPx;
    }

    private isXInSelection(
        systemIndex: number,
        xPx: number,
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        tolerancePx: number = 0
    ): boolean {
        if (systemIndex < 0) {
            return false;
        }
        for (const segment of segments) {
            if (segment.systemIndex !== systemIndex) {
                continue;
            }
            if (xPx >= segment.leftPx - tolerancePx && xPx <= segment.rightPx + tolerancePx) {
                return true;
            }
        }
        return false;
    }

    private getNonNoteSelectionTolerancePx(): number {
        if (this.rangeSelection.options?.snapToNotes) {
            // Reduce over-dimming around snapped note boundaries for structural symbols.
            return 14;
        }
        return 6;
    }

    private isGraphicalNoteInSelection(
        note: any,
        graphicalNote: GraphicalNote,
        selection: RangeSelectionPayload,
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        knownSystemIndex?: number
    ): boolean {
        const noteSystemIndex: number = knownSystemIndex ?? this.getSystemIndexForGraphicalNote(graphicalNote);
        const noteXPx: number = this.getGraphicalNoteSelectionXPx(graphicalNote);
        if (this.isXInSelection(noteSystemIndex, noteXPx, segments)) {
            return true;
        }
        // When snapToNotes is on, xPx is the authoritative boundary.
        // Don't fall back to timestamp — it re-includes notes at measure boundaries
        // that xPx correctly excluded.
        if (this.rangeSelection.options.snapToNotes) {
            return false;
        }
        const noteTimestampReal: number = this.getAbsoluteTimestampRealForNote(note);
        return this.isTimestampRealInSelection(noteTimestampReal, selection);
    }

    private getGraphicalNoteSelectionXPx(graphicalNote: GraphicalNote): number {
        const zoomScale: number = this.zoom * 10.0;
        const noteXPx: number = graphicalNote?.PositionAndShape?.AbsolutePosition?.x * zoomScale;
        if (!this.rangeSelection.options?.snapToNotes) {
            return noteXPx;
        }
        // Snap boundaries are computed from staff-entry semantic x positions.
        // Use the same semantic x for note inclusion so gray-out matches snap behavior.
        const entryX: number = graphicalNote?.parentVoiceEntry?.parentStaffEntry?.PositionAndShape?.AbsolutePosition?.x;
        const entryXPx: number = entryX * zoomScale;
        return Number.isFinite(entryXPx) ? entryXPx : noteXPx;
    }

    private isTieStopNote(
        note: any,
        selection?: RangeSelectionPayload,
        segments?: Array<{ systemIndex: number, leftPx: number, rightPx: number }>
    ): boolean {
        const tieNotes: any[] = note?.NoteTie?.Notes;
        if (!tieNotes || tieNotes.length < 2) {
            return false;
        }
        const noteIndex: number = tieNotes.indexOf(note);
        if (noteIndex <= 0) {
            return false;
        }
        if (!selection || !segments) {
            return true;
        }
        const parentTieNote: any = tieNotes[noteIndex - 1];
        if (!parentTieNote) {
            return true;
        }
        const parentTieGraphicalNote: GraphicalNote = this.rules.GNote(parentTieNote);
        if (parentTieGraphicalNote) {
            const parentTieInSelection: boolean = this.isGraphicalNoteInSelection(
                parentTieNote,
                parentTieGraphicalNote,
                selection,
                segments
            );
            return !parentTieInSelection;
        }
        const parentTieTimestampReal: number = this.getAbsoluteTimestampRealForNote(parentTieNote);
        const parentTieInSelectionByTimestamp: boolean = this.isTimestampRealInSelection(parentTieTimestampReal, selection);
        return !parentTieInSelectionByTimestamp;
    }

    private getGraphicalOpacityTargetKey(graphicalNote: GraphicalNote, note: any): string {
        const svgId: string = (graphicalNote as any)?.getSVGId?.();
        if (svgId) {
            return `svg:${svgId}`;
        }
        const noteObjectId: number = graphicalNote?.sourceNote?.NoteToGraphicalNoteObjectId;
        if (Number.isFinite(noteObjectId)) {
            return `note:${noteObjectId}`;
        }
        const fallbackTimestampReal: number = this.getAbsoluteTimestampRealForNote(note);
        return `fallback:${fallbackTimestampReal}:${(graphicalNote as any)?.vfnoteIndex ?? -1}`;
    }

    private getGraphicalNoteheadOpacityTargetKey(graphicalNote: GraphicalNote, note: any): string {
        const noteheadIndex: number = (graphicalNote as any)?.vfnoteIndex;
        const targetKey: string = this.getGraphicalOpacityTargetKey(graphicalNote, note);
        return `notehead:${targetKey}:${Number.isFinite(noteheadIndex) ? noteheadIndex : -1}`;
    }

    private setSpecificGraphicalNoteheadOpacity(graphicalNote: GraphicalNote, opacity: number): void {
        const noteheadIndex: number = (graphicalNote as any)?.vfnoteIndex;
        if (!Number.isFinite(noteheadIndex) || noteheadIndex < 0) {
            return;
        }
        const noteheadSvgs: Element[] = (graphicalNote as any)?.getNoteheadSVGs?.() ?? [];
        const noteheadSvg: Element = noteheadSvgs[noteheadIndex];
        if (!noteheadSvg) {
            return;
        }
        const noteheadPaths: NodeListOf<SVGElement> = noteheadSvg.querySelectorAll<SVGElement>("path");
        for (const noteheadPath of noteheadPaths) {
            noteheadPath.setAttribute("opacity", opacity.toString());
            this.rangeOpacityTouchedNoteheadElements.add(noteheadPath);
        }
    }

    private getAbsoluteTimestampRealForNote(note: any): number {
        const timestamp: Fraction = note?.ParentVoiceEntry?.Timestamp;
        const sourceMeasureAbsoluteTimestamp: Fraction =
            note?.ParentVoiceEntry?.ParentSourceStaffEntry?.VerticalContainerParent?.ParentMeasure?.AbsoluteTimestamp
            ?? note?.SourceMeasure?.AbsoluteTimestamp;
        if (!timestamp || !sourceMeasureAbsoluteTimestamp) {
            return undefined;
        }
        return Fraction.plus(sourceMeasureAbsoluteTimestamp, timestamp).RealValue;
    }

    private isTimestampRealInSelection(timestampReal: number, selection: RangeSelectionPayload): boolean {
        if (timestampReal === undefined || !selection?.normalizedStart || !selection?.normalizedEnd) {
            return false;
        }
        const epsilon: number = Fraction.FloatInaccuracyTolerance;
        return timestampReal >= selection.normalizedStart.timestampReal - epsilon
            && timestampReal <= selection.normalizedEnd.timestampReal + epsilon;
    }

    private applyTupletOpacityForSelection(
        segments: Array<{ systemIndex: number, leftPx: number, rightPx: number }>,
        nonSelectedOpacity: number,
        viewport: { topPx: number, bottomPx: number }
    ): void {
        const tupletElements: SVGGraphicsElement[] = this.getTupletElements();
        const containerRect: DOMRect = this.container.getBoundingClientRect();
        const nonNoteSelectionTolerancePx: number = this.getNonNoteSelectionTolerancePx();
        for (const element of tupletElements) {
            const elementRect: DOMRect = element.getBoundingClientRect();
            if (!this.isElementRectInRangeSelectionViewport(elementRect, containerRect, viewport)) {
                continue;
            }
            const centerXPx: number = (elementRect.left - containerRect.left) + (elementRect.width / 2);
            const centerYPx: number = (elementRect.top - containerRect.top) + (elementRect.height / 2);
            const system: MusicSystem = this.findSystemAtPosition(new PointF2D(centerXPx / (this.zoom * 10.0), centerYPx / (this.zoom * 10.0)));
            const systemIndex: number = this.getSystemIndex(system);
            const opacity: number = this.isXInSelection(
                systemIndex,
                centerXPx,
                segments,
                nonNoteSelectionTolerancePx
            ) ? 1.0 : nonSelectedOpacity;
            this.setRangeSelectionElementOpacity(element, opacity);
        }
    }

    private getTupletElements(): SVGGraphicsElement[] {
        return this.rangeSelectionElementCollector.getTupletElements(this.drawer);
    }

    private getStructuralSelectionElements(): SVGGraphicsElement[] {
        return this.rangeSelectionElementCollector.getStructuralElements(this.drawer);
    }

    private setStaffOpacity(staffIndex: number, opacity: number, fallbackOpacity: number): void {
        if (!this.isValidStaffIndex(staffIndex)) {
            return;
        }
        const resolvedOpacity: number = this.clampOpacity(opacity, fallbackOpacity);
        if (resolvedOpacity >= 1) {
            this.staffOpacityOverrides.delete(staffIndex);
        } else {
            this.staffOpacityOverrides.set(staffIndex, resolvedOpacity);
        }
        this.applyOpacityToStaffElements(staffIndex, resolvedOpacity);
    }

    private applyOpacityToStaffElements(staffIndex: number, opacity: number): void {
        const stafflineElements: SVGGElement[] = this.getStafflineElements(staffIndex);
        if (stafflineElements.length === 0) {
            return;
        }
        const opacityString: string = opacity.toString();
        for (const stafflineElement of stafflineElements) {
            if (opacity >= 1) {
                stafflineElement.style.removeProperty("opacity");
            } else {
                stafflineElement.style.opacity = opacityString;
            }
        }
    }

    private getStafflineElements(staffIndex: number): SVGGElement[] {
        if (!Number.isFinite(staffIndex) || staffIndex < 0) {
            return [];
        }
        const selector: string = `.staffline[data-staff-index="${staffIndex}"]`;
        const elements: SVGGElement[] = [];
        const visitedRoots: Set<Element> = new Set();
        const seenElements: Set<SVGGElement> = new Set();
        const addMatches: (root: ParentNode) => void = (root: ParentNode): void => {
            const matches: NodeListOf<SVGGElement> = root.querySelectorAll<SVGGElement>(selector);
            for (const match of matches) {
                if (seenElements.has(match)) {
                    continue;
                }
                seenElements.add(match);
                elements.push(match);
            }
        };

        if (this.drawer?.Backends?.length) {
            for (const backend of this.drawer.Backends) {
                const rootElement: HTMLElement = backend.getRenderElement();
                if (!rootElement || visitedRoots.has(rootElement)) {
                    continue;
                }
                addMatches(rootElement);
                visitedRoots.add(rootElement);
            }
        }

        if (this.container && !visitedRoots.has(this.container)) {
            addMatches(this.container);
        }

        return elements;
    }

    private isValidStaffIndex(staffIndex: number): boolean {
        if (!Number.isFinite(staffIndex) || staffIndex < 0) {
            return false;
        }
        if (!this.sheet) {
            return true;
        }
        return staffIndex < this.sheet.getCompleteNumberOfStaves();
    }

    private clampOpacity(opacity: number, fallbackOpacity: number): number {
        const fallback: number = Number.isFinite(fallbackOpacity) ? fallbackOpacity : 1.0;
        const candidate: number = Number.isFinite(opacity) ? opacity : fallback;
        return Math.min(1, Math.max(0, candidate));
    }

    private reapplyStaffOpacityOverrides(): void {
        if (this.staffOpacityOverrides.size === 0) {
            return;
        }
        for (const [staffIndex, storedOpacity] of this.staffOpacityOverrides.entries()) {
            this.applyOpacityToStaffElements(staffIndex, storedOpacity);
        }
    }
}

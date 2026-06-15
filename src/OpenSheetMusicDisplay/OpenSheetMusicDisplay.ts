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
import { MusicSystem } from "../MusicalScore/Graphical/MusicSystem";
import { GraphicalMeasure } from "../MusicalScore/Graphical/GraphicalMeasure";
import { SourceMeasure } from "../MusicalScore/VoiceData/SourceMeasure";
import { MusicPartManagerIterator } from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import { ITransposeCalculator } from "../MusicalScore/Interfaces/ITransposeCalculator";
import { NoteEnum } from "../Common/DataObjects/Pitch";
import { TemposCalculator } from "../MusicalScore/ScoreIO/MusicSymbolModules/TemposCalculator";

/**
 * The main class and control point of OpenSheetMusicDisplay.<br>
 * It can display MusicXML sheet music files in an HTML element container.<br>
 * After the constructor, use load() and render() to load and render a MusicXML file.
 */
export class OpenSheetMusicDisplay {
    protected version: string = "2.0.0-dev"; // getter: this.Version
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
    protected autoResizeEnabled: boolean;
    protected resizeHandlerAttached: boolean;
    protected followCursor: boolean;
    /** A function that is executed when the XML has been read.
     * The return value will be used as the actual XML OSMD parses,
     * so you can make modifications to the xml that OSMD will use.
     * Note that this is (re-)set on osmd.setOptions as `{return xml}`, unless you specify the function in the options. */
    public OnXMLRead: (xml: string) => string;

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

    /** Lazy rendering (LazyConsistentGraphic): number of systems already drawn into the shared
     *  backend across prior batches. Greedy layout is *usually* forward-stable, so the next batch skips
     *  redrawing these and draws from this index -- but some scores re-position earlier systems as the
     *  prefix grows, so each batch verifies the drawn systems against lazyDrawnSystemY and redraws from
     *  the topmost one that moved (reconciliation). */
    private lazyDrawnSystemCount: number = 0;
    /** Lazy rendering: the absolute Y (in units) each already-drawn system [index] was drawn at,
     *  used to detect when a later batch's full-prefix layout moves an earlier system (forward-stability
     *  is not universal) so it can be redrawn at its corrected position. */
    private lazyDrawnSystemY: number[] = [];
    /** Lazy HORIZONTAL rendering (RenderSingleHorizontalStaffline): number of graphical measures already
     *  drawn into the shared SVG (left-to-right). The next batch draws from here, deferring the prefix's
     *  last measure (it carries an end-barline until it becomes interior), like the vertical path defers
     *  its last system. */
    private lazyDrawnHMeasureCount: number = 0;

    /** Lazy HORIZONTAL: for a multi-staff score, lay the whole score out ONCE on the first batch and reuse that
     *  final layout for every batch (only the drawn x-window grows). A growing partial re-layout would route
     *  slurs/ties along each batch's boundary skyline and size the inter-staff gap to the prefix's max
     *  clearance -- so lower stafflines would drift down batch to batch. A single horizontal staffline always
     *  fits one SVG, so the full layout is safe; only the (expensive) DRAW stays lazy. Single-staff scores keep
     *  the growing layout (lazy layout + draw; nothing below the top line to drift). */
    private lazyHReuseLayout: boolean = false;

    /** Incremental rendering ({@link renderNext}): whether a session is in progress (started, not yet reset). */
    private lazyIncrementalActive: boolean = false;
    /** Incremental rendering: source-measure index where the next batch continues (the drawn frontier). */
    private lazyNextSourceIndex: number = 0;
    /** Incremental rendering: the draw-measure range the lazy layout mutates, saved on begin and restored on
     *  reset, so a later normal render() isn't left limited to the last batch's draw range. */
    private lazySavedMinMeasureToDrawIndex: number = 0;
    private lazySavedMaxMeasureToDrawIndex: number = 0;
    /** Incremental rendering: the scroll listener + its target, while enableIncrementalRenderingOnScroll() is on. */
    private lazyScrollHandler: (() => void) | undefined;
    private lazyScrollTarget: HTMLElement | Window | undefined;

    /** Render the loaded music sheet to the container. */
    public render(): void {
        if (!this.graphic) {
            throw new Error("OSMD: load() needs to be called before render()");
        }
        // A full render() supersedes any incremental render in progress: abandon it and restore the
        // draw-measure range it mutated, so this render isn't limited to the last batch.
        this.resetIncrementalRendering();
        // A normal (non-lazy) render never uses the lazy reuse caches; force the gate off so a prior
        // lazy session can't make them affect this render (they aren't cleared for normal renders).
        this.rules.LazyConsistentGraphic = false;
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

        for (const measure of this.sheet.SourceMeasures) {
            measure.WasRendered = false;
        }
        // Finally, draw
        this.drawer.drawSheet(this.graphic);

        this.enableOrDisableCursors(this.drawingParameters.drawCursors);

        if (this.drawingParameters.drawCursors) {
            // Update the cursor position
            this.cursors.forEach(cursor => {
                cursor.update();
            });
        }
        this.zoomUpdated = false;
        this.rules.RenderCount++;
        //console.log("[OSMD] render finished");
    }

    /** Internal range-based engine behind {@link renderNext} (the public incremental API). Lays out the
     *  whole prefix [0..toMeasureIndex] and APPENDS the newly-stable source measures below previously
     *  rendered batches, without clearing the container, so a large score renders "system by system".
     *  clearFirst=true starts a fresh session (clears prior content, resets the counters). Returns the
     *  source-measure index at which the next batch should continue. fromMeasureIndex is informational --
     *  the drawn frontier is tracked internally. Targets the endless vertical-scroll format and
     *  RenderSingleHorizontalStaffline. `targetNewSystems`, if set, draws that many whole systems this batch
     *  (vertical path only; ignored for the single horizontal staffline, which is one system). */
    private renderAppend(fromMeasureIndex: number, toMeasureIndex: number, clearFirst: boolean = false,
                         targetNewSystems?: number): number {
        if (!this.graphic) {
            throw new Error("OSMD: load() needs to be called before renderNext()");
        }
        // Lazy rendering lays out the whole prefix [0..toMeasureIndex] into one growing, globally-consistent
        // graphic and draws only the newly-stable systems (renderAppendGrowing). LazyConsistentGraphic gates
        // that path's reuse caches; a normal render() forces it off so the caches never affect a non-lazy render.
        this.rules.LazyConsistentGraphic = true;
        if (this.rules.RenderSingleHorizontalStaffline) {
            // Single horizontal staffline: one system growing to the RIGHT; draw only the newly-entered measures.
            return this.renderAppendGrowingHorizontal(fromMeasureIndex, toMeasureIndex, clearFirst);
        }
        return this.renderAppendGrowing(fromMeasureIndex, toMeasureIndex, clearFirst, targetNewSystems);
    }

    /**
     * Incrementally render the loaded sheet one batch at a time, appending each batch so a large score
     * paints progressively ("system by system") instead of blocking on a full render(). The first call --
     * or the first after load(), render() or resetIncrementalRendering() -- starts a fresh session: it
     * clears the container and lays the score out from the first measure. Each later call appends the next
     * batch. Returns progress; once `done` is true the whole sheet is rendered and further calls are no-ops.
     *
     * Pair with {@link enableIncrementalRenderingOnScroll} for scroll-to-load, or {@link renderRemaining}
     * to finish synchronously (e.g. before PDF/image export). Works for the endless vertical-scroll page
     * format and for RenderSingleHorizontalStaffline (one staffline scrolling right).
     *
     * @param options batch options; defaults to 8 visual measures (a multi-rest counts as one). Pass
     *   `systems` instead to advance by whole music systems (vertical only); see {@link IRenderNextOptions}.
     */
    public renderNext(options?: IRenderNextOptions): IRenderNextResult {
        if (!this.graphic) {
            throw new Error("OSMD: load() needs to be called before renderNext()");
        }
        const batchMeasures: number = Math.max(1, options?.measures ?? 8);
        // `systems` (vertical only) advances the frontier by whole music systems instead of measures. A single
        // horizontal staffline is one system, so it ignores `systems` and uses `measures`.
        const systemsOpt: number = options?.systems ?? 0;
        const targetNewSystems: number = systemsOpt > 0 && !this.rules.RenderSingleHorizontalStaffline
            ? Math.max(1, Math.floor(systemsOpt)) : undefined;
        const lastSheetMeasureIndex: number = this.sheet.SourceMeasures.length - 1;
        const totalMeasures: number = this.visualMeasureCount(0, this.sheet.SourceMeasures.length);

        const begin: boolean = !this.lazyIncrementalActive;
        if (begin) {
            this.beginIncrementalRendering();
        }
        if (this.lazyNextSourceIndex > lastSheetMeasureIndex) {
            return {
                done: true, renderedMeasures: totalMeasures, totalMeasures,
                lastRenderedMeasure: this.graphicalMeasuresAtOrBefore(lastSheetMeasureIndex), nextUnrenderedMeasure: []
            };
        }

        const fromMeasureIndex: number = this.lazyNextSourceIndex;
        // In systems mode, seed the layout at the current frontier and let renderAppendGrowing grow it to
        // exactly `targetNewSystems` whole systems; otherwise advance the frontier by the visual-measure count.
        const toMeasureIndex: number = targetNewSystems !== undefined
            ? fromMeasureIndex
            : this.visualBatchEndIndex(fromMeasureIndex, batchMeasures);
        this.lazyNextSourceIndex = this.renderAppend(fromMeasureIndex, toMeasureIndex, begin, targetNewSystems);

        const done: boolean = this.lazyNextSourceIndex > lastSheetMeasureIndex;
        const renderedMeasures: number = done ? totalMeasures : this.visualMeasureCount(0, this.lazyNextSourceIndex);
        return {
            done, renderedMeasures, totalMeasures,
            lastRenderedMeasure: this.graphicalMeasuresAtOrBefore(this.lazyNextSourceIndex - 1),
            nextUnrenderedMeasure: done ? [] : this.graphicalMeasuresAtOrBefore(this.lazyNextSourceIndex)
        };
    }

    /**
     * Finish an in-progress incremental render synchronously: render all remaining measures at once. Useful
     * before PDF/image export or printing, which need every system, not just the ones scrolled into view.
     * No-op if no incremental render is in progress, or it is already complete.
     */
    public renderRemaining(): void {
        if (!this.lazyIncrementalActive) {
            return;
        }
        const total: number = this.sheet.SourceMeasures.length;
        let guard: number = 0;
        while (!this.IncrementalRenderingComplete && guard++ < total + 2) {
            const before: number = this.lazyNextSourceIndex;
            this.renderNext({ measures: total }); // one big batch -> final batch -> done
            if (this.lazyNextSourceIndex <= before) {
                break; // safety: no forward progress
            }
        }
    }

    /** Whether an incremental render ({@link renderNext}) is in progress (started and not yet reset). */
    public get IncrementalRenderingActive(): boolean {
        return this.lazyIncrementalActive;
    }

    /** Whether the in-progress incremental render has rendered the whole sheet (its last measure). */
    public get IncrementalRenderingComplete(): boolean {
        return this.lazyIncrementalActive && !!this.sheet && this.lazyNextSourceIndex > this.sheet.SourceMeasures.length - 1;
    }

    /** Current incremental-render progress as a snapshot (same shape {@link renderNext} returns), queryable
     *  at any time -- e.g. for a progress bar, or to re-render the same extent after a resize. Reports zero
     *  rendered measures when no session is active. */
    public get IncrementalRenderProgress(): IRenderNextResult {
        const totalMeasures: number = this.graphic ? this.visualMeasureCount(0, this.sheet.SourceMeasures.length) : 0;
        const active: boolean = !!this.graphic && this.lazyIncrementalActive;
        const done: boolean = this.IncrementalRenderingComplete;
        const renderedMeasures: number = active
            ? this.visualMeasureCount(0, Math.min(this.lazyNextSourceIndex, this.sheet.SourceMeasures.length)) : 0;
        return {
            done, renderedMeasures, totalMeasures,
            lastRenderedMeasure: active && this.lazyNextSourceIndex > 0 ? this.graphicalMeasuresAtOrBefore(this.lazyNextSourceIndex - 1) : [],
            nextUnrenderedMeasure: active && !done ? this.graphicalMeasuresAtOrBefore(this.lazyNextSourceIndex) : []
        };
    }

    /** All GraphicalMeasures (one per staff/instrument) at the measure position for source-measure index
     *  `sourceIndex`, walking BACK over collapsed multi-rest members (which have no graphical measure of their
     *  own) to the nearest real measure. Empty if there is none at/before it. Used to resolve the last- /
     *  next-measure handles for renderNext(). */
    private graphicalMeasuresAtOrBefore(sourceIndex: number): GraphicalMeasure[] {
        if (!this.graphic) {
            return [];
        }
        const measureList: GraphicalMeasure[][] = this.graphic.MeasureList;
        let li: number = Math.min(sourceIndex, measureList.length - 1);
        while (li >= 0 && !(measureList[li] && measureList[li].some(measure => !!measure))) {
            li--;
        }
        return li >= 0 ? measureList[li].filter(measure => !!measure) : [];
    }

    /**
     * Abandon any in-progress incremental render and restore the draw-measure range it mutated, so a
     * following normal render() draws the whole sheet again. Called
     * automatically by render(), load() and clear(); call it directly only to cancel a session yourself.
     */
    public resetIncrementalRendering(): void {
        if (!this.lazyIncrementalActive) {
            return;
        }
        this.disableIncrementalRenderingOnScroll(); // drop the scroll listener with the session
        this.lazyIncrementalActive = false;
        this.lazyNextSourceIndex = 0;
        this.lazyDrawnSystemCount = 0;
        this.lazyDrawnSystemY = [];
        this.lazyDrawnHMeasureCount = 0;
        this.lazyHReuseLayout = false;
        this.rules.MinMeasureToDrawIndex = this.lazySavedMinMeasureToDrawIndex;
        this.rules.MaxMeasureToDrawIndex = this.lazySavedMaxMeasureToDrawIndex;
    }

    /**
     * Drive {@link renderNext} automatically from scrolling: render the next batch whenever the user scrolls
     * within ~1.5 viewports of the not-yet-rendered edge (the page bottom for the endless vertical format,
     * the right edge for RenderSingleHorizontalStaffline). Renders the first batch immediately if none has
     * been rendered yet, then keeps appending as the user scrolls, and detaches itself once the whole sheet
     * is rendered. Re-enabling replaces any previous listener; reset/render/load also detach it.
     *
     * @param options batch size (as {@link renderNext}) plus an optional `scrollElement` -- the element whose
     *  scrolling drives loading. Defaults to the OSMD container for a single horizontal staffline (it scrolls
     *  horizontally) and to `window` otherwise (the page scrolls vertically).
     */
    public enableIncrementalRenderingOnScroll(options?: IRenderNextOptions & { scrollElement?: HTMLElement | Window }): void {
        if (typeof window === "undefined") {
            return; // no DOM (e.g. headless): nothing to attach to
        }
        this.disableIncrementalRenderingOnScroll(); // drop any previous listener
        const horizontal: boolean = this.rules.RenderSingleHorizontalStaffline;
        const target: HTMLElement | Window = options?.scrollElement ?? (horizontal ? this.container : window);
        const batchOptions: IRenderNextOptions = { measures: options?.measures };
        if (!this.IncrementalRenderingActive) {
            this.renderNext(batchOptions); // paint the first batch so there is something to scroll
        }
        if (this.IncrementalRenderingComplete) {
            return; // the whole sheet fit in the first batch; nothing to load on scroll
        }
        const nearEnd: () => boolean = () => {
            const margin: number = 1.5; // start loading ~1.5 viewports before the edge
            const el: HTMLElement = (target === window ? document.scrollingElement || document.documentElement : target) as HTMLElement;
            if (horizontal) {
                return el.scrollLeft + el.clientWidth >= el.scrollWidth - el.clientWidth * margin;
            }
            if (target === window) {
                return window.scrollY + window.innerHeight >= document.body.scrollHeight - window.innerHeight * margin;
            }
            return el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * margin;
        };
        let loading: boolean = false;
        const onScroll: () => void = () => {
            if (loading || !this.IncrementalRenderingActive || this.IncrementalRenderingComplete) {
                return;
            }
            if (!nearEnd()) {
                return;
            }
            loading = true;
            const result: IRenderNextResult = this.renderNext(batchOptions);
            loading = false;
            if (result.done) {
                this.disableIncrementalRenderingOnScroll();
            } else if (typeof window.requestAnimationFrame === "function") {
                window.requestAnimationFrame(onScroll); // keep filling while still near the edge
            }
        };
        this.lazyScrollTarget = target;
        this.lazyScrollHandler = onScroll;
        target.addEventListener("scroll", onScroll, { passive: true });
        if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(onScroll); // fill the viewport if the first batch was short
        }
    }

    /** Stop driving {@link renderNext} from scrolling (see {@link enableIncrementalRenderingOnScroll}). */
    public disableIncrementalRenderingOnScroll(): void {
        if (this.lazyScrollHandler && this.lazyScrollTarget) {
            this.lazyScrollTarget.removeEventListener("scroll", this.lazyScrollHandler);
        }
        this.lazyScrollHandler = undefined;
        this.lazyScrollTarget = undefined;
    }

    /** Start a fresh incremental session: save the draw-measure range the lazy layout mutates (restored on
     *  reset). Lazy needs the greedy, forward-stable builder so earlier systems keep their position as the
     *  prefix grows -- public OSMD is greedy-only, so that is already in effect (nothing to force). */
    private beginIncrementalRendering(): void {
        this.lazySavedMinMeasureToDrawIndex = this.rules.MinMeasureToDrawIndex;
        this.lazySavedMaxMeasureToDrawIndex = this.rules.MaxMeasureToDrawIndex;
        this.lazyIncrementalActive = true;
        this.lazyNextSourceIndex = 0;
    }

    /** Number of VISUAL measures in the source-measure range [from, toExcl): a multi-rest renders as one
     *  GraphicalMeasure when RenderMultipleRestMeasures collapses it, so it counts as one. */
    private visualMeasureCount(from: number, toExcl: number): number {
        const sourceMeasures: SourceMeasure[] = this.sheet.SourceMeasures;
        const collapse: boolean = this.rules.RenderMultipleRestMeasures;
        let visual: number = 0;
        let i: number = from;
        while (i < toExcl && i < sourceMeasures.length) {
            i += collapse && sourceMeasures[i].multipleRestMeasures > 0 ? sourceMeasures[i].multipleRestMeasures : 1;
            visual++;
        }
        return visual;
    }

    /** Source-measure index (inclusive) at which a batch of `visualCount` visual measures starting at source
     *  index `from` ends -- i.e. the toMeasureIndex to render this batch (multi-rests collapsed; see above). */
    private visualBatchEndIndex(from: number, visualCount: number): number {
        const sourceMeasures: SourceMeasure[] = this.sheet.SourceMeasures;
        const collapse: boolean = this.rules.RenderMultipleRestMeasures;
        let end: number = from;
        let visual: number = 0;
        while (visual < visualCount && end < sourceMeasures.length) {
            end += collapse && sourceMeasures[end].multipleRestMeasures > 0 ? sourceMeasures[end].multipleRestMeasures : 1;
            visual++;
        }
        return Math.min(end - 1, sourceMeasures.length - 1);
    }

    /**
     * Lazy rendering (EngravingRules.LazyConsistentGraphic). Lays out the WHOLE prefix
     * [0..toMeasureIndex] into ONE globally-consistent graphic and draws only the systems that became
     * stable since the previous batch, appending them into the shared backend below what's already drawn.
     *
     * There is no per-batch vertical offset or seam-distance
     * computation: the real Y-layout already stacks and crisp-snaps every system at its final absolute
     * position, and the title space / first-system instrument names fall out of laying the prefix from
     * measure 0 each time. The greedy builder is forward-stable -- every system except the LAST of a
     * prefix is *usually* forward-stable (an interior system keeps its position as the prefix grows), so
     * we skip drawing the already-drawn systems above and DEFER the last system of a non-final batch (it
     * is unstretched and shifts once it becomes an interior, stretched system next batch). But this is NOT
     * universal -- some scores re-position earlier systems by several px as later systems are added -- so
     * each batch first VERIFIES the drawn systems against their drawn Y (lazyDrawnSystemY) and, if any
     * moved, redraws the whole drawn range at the corrected positions (reconciliation). In the common
     * (stable) case nothing is redrawn. See export/inspect_prefix_stability.mjs / inspect_optionb_drawpos.mjs.
     *
     * @returns the source-measure index at which the next batch should continue (past the last drawn system).
     */
    private renderAppendGrowing(fromMeasureIndex: number, toMeasureIndex: number, clearFirst: boolean,
                                targetNewSystems?: number): number {
        if (clearFirst) {
            this.lazyDrawnSystemCount = 0;
            this.lazyDrawnSystemY = [];
            this.graphic.GetCalculator?.clearSkyBottomLineCache(); // fresh lazy session: drop reused sky/bottom lines
        }
        const lastSheetMeasureIndex: number = this.sheet.SourceMeasures.length - 1;

        // Lay out the whole prefix [0..to] (Min stays 0). Earlier systems are re-laid-out identically;
        // only the newly-completed systems are drawn below.
        this.rules.MinMeasureToDrawIndex = 0;
        this.rules.MaxMeasureToDrawIndex = Math.min(toMeasureIndex, lastSheetMeasureIndex);

        const width: number = this.container.offsetWidth;
        this.sheet.pageWidth = width / this.zoom / 10.0;
        this.rules.PageHeight = 100001; // lazy assumes the endless (vertical scroll) page format

        this.graphic.reCalculate();

        // Ensure the prefix yields enough NEW systems to draw beyond the deferred last one (>= drawn +
        // minNewSystems + 1 systems total); otherwise this batch only grew the current last system. Extend the
        // prefix by a batch span and retry until enough systems appear or the sheet ends. minNewSystems is 1 in
        // measures mode (the batch's other complete systems are drawn too) and `targetNewSystems` in systems mode.
        let page: GraphicalMusicPage = this.graphic.MusicPages[0];
        const minNewSystems: number = targetNewSystems ?? 1;
        const extendStep: number = Math.max(4, toMeasureIndex - fromMeasureIndex + 1);
        let extendedTo: number = this.rules.MaxMeasureToDrawIndex;
        while (page && extendedTo < lastSheetMeasureIndex &&
               page.MusicSystems.length < this.lazyDrawnSystemCount + minNewSystems + 1) {
            extendedTo = Math.min(extendedTo + extendStep, lastSheetMeasureIndex);
            this.rules.MaxMeasureToDrawIndex = extendedTo;
            this.graphic.reCalculate();
            page = this.graphic.MusicPages[0];
        }
        if (!page || page.MusicSystems.length === 0) {
            return lastSheetMeasureIndex + 1; // produced nothing (e.g. all-invisible): nothing more to do
        }

        const systemCount: number = page.MusicSystems.length;
        const finalBatch: boolean = extendedTo >= lastSheetMeasureIndex;
        const sysAbsY: (i: number) => number = i => page.MusicSystems[i].StaffLines[0].PositionAndShape.AbsolutePosition.y;
        // Reconciliation: forward-stability is not universal -- this batch's full-prefix layout may have
        // moved an already-drawn system. If the topmost drawn system whose Y changed exists, everything
        // already drawn is stale; clear the backend and redraw the whole drawn range at the corrected
        // positions. In the common (stable) case nothing moved and we only append the new systems.
        let someDrawnSystemMoved: boolean = false;
        for (let i: number = 0; i < this.lazyDrawnSystemCount && i < systemCount; i++) {
            if (Math.abs(sysAbsY(i) - (this.lazyDrawnSystemY[i] ?? sysAbsY(i))) > 1e-4) {
                someDrawnSystemMoved = true;
                break;
            }
        }
        // Recreating the backend erases everything, so a recreate batch redraws from system 0.
        const recreateBackend: boolean = clearFirst || someDrawnSystemMoved;
        const drawFromIdx: number = recreateBackend ? 0 : this.lazyDrawnSystemCount;
        // Hold the last (unstretched, not-yet-stable) system unless this is the final batch, where the last
        // system is the sheet's true last system and never changes again. In systems mode, also cap the draw at
        // `targetNewSystems` new systems (the layout may hold a few more from the last extend step), so each
        // batch advances by exactly that many whole systems; any extra are re-laid-out and drawn next batch.
        let drawToIdxExcl: number;
        if (finalBatch) {
            drawToIdxExcl = systemCount;
        } else if (targetNewSystems !== undefined) {
            drawToIdxExcl = Math.min(systemCount - 1, this.lazyDrawnSystemCount + targetNewSystems);
        } else {
            drawToIdxExcl = systemCount - 1;
        }
        if (drawToIdxExcl <= drawFromIdx) {
            this.lazyDrawnSystemCount = Math.max(this.lazyDrawnSystemCount, drawToIdxExcl);
            return lastSheetMeasureIndex + 1; // no new complete system (only happens at the very end)
        }
        const lastDrawnSystem: MusicSystem = page.MusicSystems[drawToIdxExcl - 1];

        // createOrRefreshRenderBackend rebuilds the drawer (resetting the lazy draw window), so it must
        // run BEFORE setting that window below. A purely-appending batch keeps the existing backend.
        if (recreateBackend) {
            this.createOrRefreshRenderBackend();
        }
        const backend: VexFlowBackend = this.drawer.Backends[0];
        const isCanvas: boolean = backend.getOSMDBackendType() === BackendType.Canvas;
        // Grow the backend to fit through the last system we draw. On the final batch, size exactly as
        // createOrRefreshRenderBackend() does for a full page so the finished image height byte-matches a
        // normal render; on continuation batches, size to the last drawn system (the deferred system's
        // slot is filled next batch).
        let heightUnits: number;
        if (finalBatch) {
            heightUnits = page.PositionAndShape.Size.height + this.rules.PageBottomMargin + page.PositionAndShape.BorderTop;
        } else {
            heightUnits = lastDrawnSystem.PositionAndShape.AbsolutePosition.y
                + lastDrawnSystem.PositionAndShape.BorderBottom + this.rules.PageBottomMargin;
        }
        if (isCanvas) {
            heightUnits += 0.1; // Canvas bug: cuts off the bottom pixel with PageBottomMargin = 0
        }
        if (this.rules.RenderTitle) {
            heightUnits += this.rules.TitleTopDistance; // title sits above the first system
        }
        backend.graphicalMusicPage = page;
        backend.resize(backend.width, heightUnits * 10 * this.zoom);
        // Re-establish the default music color: createOrRefreshRenderBackend sets it on the first batch,
        // but a reused canvas backend keeps stateful context and could inherit a stale fill/stroke color.
        backend.getContext().setFillStyle(this.rules.DefaultColorMusic);
        backend.getContext().setStrokeStyle(this.rules.DefaultColorMusic);
        this.drawer.setZoom(this.zoom);

        if (this.drawingParameters.drawCursors) {
            this.graphic.Cursors.length = 0; // clear any stale graphical cursors before drawing, as render() does
        }
        // Mark everything up to the drawn range as on-screen (for playback/cursor lookups), since the
        // graphic was rebuilt this batch.
        for (let i: number = 0; i < drawToIdxExcl; i++) {
            for (const staffLine of page.MusicSystems[i].StaffLines) {
                for (const measure of staffLine.Measures) {
                    if (measure?.parentSourceMeasure) { // some graphical measures (e.g. extra-instruction) have none
                        measure.parentSourceMeasure.WasRendered = true;
                    }
                }
            }
        }
        // Draw only the new systems (and the title block only on the first batch); see drawPage().
        this.drawer.LazyDrawSystemsFromIndex = drawFromIdx;
        this.drawer.LazyDrawSystemsToIndexExcl = drawToIdxExcl;
        this.drawer.drawSheet(this.graphic);
        this.drawer.LazyDrawSystemsFromIndex = -1;
        this.drawer.LazyDrawSystemsToIndexExcl = Number.POSITIVE_INFINITY;

        // Reposition the HTML cursors for this batch's growing / reconciled layout, mirroring render()'s
        // post-draw cursor handling. When the backend was rebuilt this batch, re-create the cursors on it
        // (enableOrDisableCursors restores their position via RestoreCursorAfterRerender); otherwise just
        // update() them in place. update() no-ops if the cursor's target measure isn't laid out yet (the
        // user hasn't scrolled there) -- a later batch repositions it once that measure is rendered.
        if (this.drawingParameters.drawCursors) {
            if (recreateBackend) {
                this.enableOrDisableCursors(this.drawingParameters.drawCursors);
            }
            this.cursors.forEach(cursor => cursor.update());
        }

        // Record where each drawn system landed, so the next batch can detect (and reconcile) any that
        // the growing layout moves.
        for (let i: number = 0; i < drawToIdxExcl; i++) {
            this.lazyDrawnSystemY[i] = sysAbsY(i);
        }
        this.lazyDrawnSystemY.length = drawToIdxExcl;
        this.lazyDrawnSystemCount = drawToIdxExcl;
        this.rules.RenderCount++;

        if (finalBatch) {
            return lastSheetMeasureIndex + 1;
        }
        // Continue at the deferred (held) system's first source measure.
        const heldMeasures: GraphicalMeasure[] = page.MusicSystems[drawToIdxExcl].StaffLines[0].Measures;
        return this.sheet.SourceMeasures.indexOf(heldMeasures[0].parentSourceMeasure);
    }

    /**
     * Lazy rendering for RenderSingleHorizontalStaffline (one continuous staffline, horizontal scroll).
     * Lays out the whole prefix [0..toMeasureIndex] as ONE system (greedy builder at SheetMaximumWidth so it
     * never breaks) and draws only the measures (and spanning elements) whose right edge first entered the
     * drawn frontier this batch -- the single SVG grows to the RIGHT (and taller if later measures are tall).
     * Measure X and Y are forward-stable here, so unlike the vertical path there is no reconciliation and no
     * deferred last unit: every batch simply appends. SVG backend only (Canvas keeps its existing width cap).
     * @returns the source-measure index at which the next batch should continue.
     */
    private renderAppendGrowingHorizontal(fromMeasureIndex: number, toMeasureIndex: number, clearFirst: boolean): number {
        if (clearFirst) {
            this.lazyDrawnHMeasureCount = 0;
            this.graphic.GetCalculator?.clearSkyBottomLineCache();
            // Multi-staff: lay the whole score out once and reuse that final layout (see lazyHReuseLayout);
            // single-staff: grow the laid-out prefix each batch.
            this.lazyHReuseLayout = this.sheet.getCompleteNumberOfStaves() > 1;
        }
        const lastSheetMeasureIndex: number = this.sheet.SourceMeasures.length - 1;
        // One horizontal staffline: SheetMaximumWidth keeps it a single system; the cursor coordinate region
        // still uses the real container width (mirrors render()).
        this.rules.MinMeasureToDrawIndex = 0;
        this.sheet.pageWidth = this.rules.SheetMaximumWidth / this.zoom / 10.0;
        this.rules.PageHeight = 100001;
        if (this.lazyHReuseLayout) {
            // Lay the whole score out once on the first batch; later batches reuse it (only the drawn x-window
            // grows). This keeps every element at its final, full-score position, so multi-staff batches are
            // byte-identical to a normal render.
            if (clearFirst) {
                this.rules.MaxMeasureToDrawIndex = lastSheetMeasureIndex;
                this.graphic.reCalculate();
            }
        } else {
            this.rules.MaxMeasureToDrawIndex = Math.min(toMeasureIndex, lastSheetMeasureIndex);
            this.graphic.reCalculate();
        }
        const page: GraphicalMusicPage = this.graphic.MusicPages[0];
        if (!page || page.MusicSystems.length === 0 || page.MusicSystems[0].StaffLines.length === 0) {
            return lastSheetMeasureIndex + 1; // produced nothing (e.g. all invisible)
        }
        const system: MusicSystem = page.MusicSystems[0];
        const measures0: GraphicalMeasure[] = system.StaffLines[0].Measures;
        const drawFromIdx: number = Math.min(this.lazyDrawnHMeasureCount, measures0.length);
        let finalBatch: boolean;
        let drawToIdxExcl: number;
        if (this.lazyHReuseLayout) {
            // Reused full layout -- every measure is already final, so draw up to the requested source frontier
            // with no deferral (no growing-prefix end-barline to hold). Find the graphical measures whose source
            // measure is at/before the frontier (mapping handles multi-rests that collapse several into one).
            const frontierSource: number = Math.min(toMeasureIndex, lastSheetMeasureIndex);
            finalBatch = frontierSource >= lastSheetMeasureIndex;
            let f: number = drawFromIdx;
            while (f < measures0.length && measures0[f].parentSourceMeasure.measureListIndex <= frontierSource) {
                f++;
            }
            drawToIdxExcl = f;
        } else {
            // Growing prefix -- HOLD the prefix's last measure: as the prefix end it carries an end-barline and
            // is unstretched, and becomes a normal interior measure (drawn) next batch (the horizontal analog of
            // the vertical path deferring its last system).
            finalBatch = this.rules.MaxMeasureToDrawIndex >= lastSheetMeasureIndex;
            drawToIdxExcl = finalBatch ? measures0.length : measures0.length - 1;
        }
        if (drawToIdxExcl <= drawFromIdx) {
            // No new complete measure this batch; continue at the next undrawn measure (or finish).
            return finalBatch ? lastSheetMeasureIndex + 1
                : this.sheet.SourceMeasures.indexOf(measures0[drawFromIdx].parentSourceMeasure);
        }
        const measureRightX: (m: GraphicalMeasure) => number =
            m => m.PositionAndShape.AbsolutePosition.x + m.PositionAndShape.BorderRight;
        // x-window: only objects whose right edge is in (fromX, toX] -- the measures that newly completed
        // this batch plus any spanning element (slur, ...) whose right end just became available.
        const fromX: number = drawFromIdx > 0 ? measureRightX(measures0[drawFromIdx - 1]) : Number.NEGATIVE_INFINITY;
        const toX: number = measureRightX(measures0[drawToIdxExcl - 1]);

        if (clearFirst) {
            this.createOrRefreshRenderBackend(); // one persistent backend, sized to the first batch's page
        }
        const backend: VexFlowBackend = this.drawer.Backends[0];
        // Grow the single backend to fit what's drawn so far: width to the drawn frontier (so the SVG/scroll
        // width tracks drawn content even when the whole score is laid out in reuse mode), height to the full
        // page (later measures may have taller content). The staff origin is forward-stable, so already-drawn
        // content stays put.
        const widthUnits: number = this.lazyHReuseLayout
            ? toX + this.rules.PageRightMargin
            : this.rules.PageLeftMargin + page.PositionAndShape.Size.width + this.rules.PageRightMargin;
        let heightUnits: number = page.PositionAndShape.Size.height + this.rules.PageBottomMargin + page.PositionAndShape.BorderTop;
        if (this.rules.RenderTitle) {
            heightUnits += this.rules.TitleTopDistance;
        }
        backend.graphicalMusicPage = page;
        backend.resize(widthUnits * 10 * this.zoom, heightUnits * 10 * this.zoom);
        backend.getContext().setFillStyle(this.rules.DefaultColorMusic);
        backend.getContext().setStrokeStyle(this.rules.DefaultColorMusic);
        this.drawer.setZoom(this.zoom);

        if (this.drawingParameters.drawCursors) {
            this.graphic.Cursors.length = 0;
        }
        // Mark the measures drawn so far on-screen (playback / cursor lookups), since the graphic was rebuilt.
        for (let i: number = 0; i < drawToIdxExcl; i++) {
            for (const staffLine of system.StaffLines) {
                const m: GraphicalMeasure = staffLine.Measures[i];
                if (m?.parentSourceMeasure) {
                    m.parentSourceMeasure.WasRendered = true;
                }
            }
        }
        // Each batch draws the measures (and once-only left-edge brackets/labels) up to its frontier. The
        // page labels (title/credits) re-center as the page widens, so they are drawn only on the final batch,
        // at their full-width positions; drawPage() then opens the x-window so none are dropped (see drawPage).
        this.drawer.LazyDrawFromXUnits = fromX;
        this.drawer.LazyDrawToXUnits = toX + 1e-4;
        this.drawer.LazySkipPageLabels = !finalBatch;
        this.drawer.drawSheet(this.graphic);
        this.drawer.LazyDrawFromXUnits = Number.NEGATIVE_INFINITY;
        this.drawer.LazyDrawToXUnits = Number.POSITIVE_INFINITY;
        this.drawer.LazySkipPageLabels = false;

        if (this.drawingParameters.drawCursors) {
            if (clearFirst) {
                this.enableOrDisableCursors(this.drawingParameters.drawCursors);
            }
            this.cursors.forEach(cursor => cursor.update());
        }
        this.lazyDrawnHMeasureCount = drawToIdxExcl;
        this.rules.RenderCount++;
        if (finalBatch) {
            return lastSheetMeasureIndex + 1;
        }
        // Continue at the held (deferred) last measure.
        return this.sheet.SourceMeasures.indexOf(measures0[drawToIdxExcl].parentSourceMeasure);
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

    /** States whether the render() function can be safely called. */
    public IsReadyToRender(): boolean {
        return this.graphic !== undefined;
    }

    /** Clears what OSMD has drawn on its canvas. */
    public clear(): void {
        this.drawer?.clear();
        this.reset(); // without this, resize will draw loaded sheet again
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
            this.cursorsOptions = [{
                type: CursorType.Standard,
                color: this.EngravingRules.DefaultColorCursor,
                alpha: 0.5,
                follow: true
            }];
        }
        if (options.useGeometricSkyBottomLineCalculation !== undefined) {
            this.rules.UseGeometricSkyBottomLineCalculation = options.useGeometricSkyBottomLineCalculation;
        }
        if (options.preferredSkyBottomLineBatchCalculatorBackend !== undefined) {
            this.rules.PreferredSkyBottomLineBatchCalculatorBackend = options.preferredSkyBottomLineBatchCalculatorBackend;
        }
        if (options.skyBottomLineBatchMinMeasures !== undefined) {
            this.rules.SkyBottomLineBatchMinMeasures = options.skyBottomLineBatchMinMeasures;
        }
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
        this.resetIncrementalRendering(); // abandon any incremental session + restore the rules it mutated
        if (this.drawingParameters.drawCursors) {
            this.cursors.forEach(cursor => {
                cursor.hide();
            });
        }
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.rules.RenderCount = 0;
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

        // If the sheet was already rendered when autoResize was enabled, adapt it to the
        // current width right away. (Only in that case: otherwise - e.g. with the default
        // autoResize on creation - these initial timers would re-render the first sheet the
        // application loads and renders a second time, once the timers fire.)
        const renderedBeforeAttach: boolean = this.rules.RenderCount > 0;
        if (renderedBeforeAttach) {
            window.setTimeout(startCallback, 0);
            window.setTimeout(endCallback, 1);
        }
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

    public createBackend(type: BackendType, page: GraphicalMusicPage, idOverride?: string): VexFlowBackend {
        let backend: VexFlowBackend;
        if (type === undefined || type === BackendType.SVG) {
            backend = new SvgVexFlowBackend(this.rules);
        } else {
            backend = new CanvasVexFlowBackend(this.rules);
        }
        backend.graphicalMusicPage = page; // the page the backend renders on. needed to identify DOM element to extract image/SVG
        backend.initialize(this.container, this.zoom, idOverride);
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
}

/** Options for {@link OpenSheetMusicDisplay.renderNext} (incremental, "system by system" rendering). */
export interface IRenderNextOptions {
    /** Target number of visual measures to advance per batch (a multi-rest counts as ONE -- it renders as a
     *  single GraphicalMeasure). Defaults to 8. This is a TARGET, not an exact count: a batch always ends on a
     *  whole music-system (line) boundary, so the system the measure count lands inside is deferred to the next
     *  batch (and a batch always renders at least one whole system). The measures actually drawn may therefore
     *  be somewhat fewer or more than this -- e.g. 8 lands part-way into a system, so only the complete systems
     *  before it are drawn; or if 8 doesn't fill one system, the layout extends until one whole system is ready.
     *  To see what was actually rendered, read the returned {@link IRenderNextResult}: `renderedMeasures` (total
     *  visual measures drawn so far, cumulative) and `lastRenderedMeasure` (the GraphicalMeasures at the last
     *  drawn measure position). Ignored when `systems` is set (and applicable). */
    measures?: number;
    /** How many whole music systems (lines) to render in this batch, instead of advancing by `measures`.
     *  Each batch then ends exactly on a system boundary. Takes precedence over `measures` when > 0.
     *  VERTICAL ONLY: a single horizontal staffline (RenderSingleHorizontalStaffline) is one system, so
     *  `systems` is ignored there and rendering falls back to `measures`. */
    systems?: number;
}

/** Progress returned by {@link OpenSheetMusicDisplay.renderNext}. Measure counts are visual (a multi-rest
 *  counts as one). */
export interface IRenderNextResult {
    /** True once the last measure of the sheet has been rendered -- no more batches remain. */
    done: boolean;
    /** Visual measures rendered so far, cumulative across batches. */
    renderedMeasures: number;
    /** Total visual measures in the sheet. */
    totalMeasures: number;
    /** The last measure position rendered so far (highest measure index): all its GraphicalMeasures, one per
     *  staff/instrument (e.g. 3 for a voice + piano score). Empty if nothing has been rendered yet. They
     *  share one source measure -- reach it and its number/index via any element's `.parentSourceMeasure` and
     *  `.parentSourceMeasure.measureListIndex` (0-based). */
    lastRenderedMeasure: GraphicalMeasure[];
    /** The next measure position not yet rendered (the frontier): all its GraphicalMeasures (one per staff),
     *  or empty once `done`. Same `.parentSourceMeasure` / `.parentSourceMeasure.measureListIndex` accessors. */
    nextUnrenderedMeasure: GraphicalMeasure[];
}

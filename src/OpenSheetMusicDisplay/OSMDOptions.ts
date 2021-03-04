import { DrawingParametersEnum, ColoringModes } from "../MusicalScore/Graphical/DrawingParameters";
import { FontStyles } from "../Common/Enums/FontStyles";

/** Possible options for the OpenSheetMusicDisplay constructor and osmd.setOptions(). None are mandatory.
 *  Note that after using setOptions(), you have to call osmd.render() again to make changes visible.
 *  Example: osmd.setOptions({defaultColorRest: "#AAAAAA", drawSubtitle: false}); osmd.render();
 *
 *  Note that some additional, usually more small scale options are available in EngravingRules,
 *  though not all of them are meant to be manipulated.
 *  The OSMDOptions are the main options we support.
 */
export interface IOSMDOptions {
    /** Whether to let Vexflow align rests to preceding or following notes (Vexflow option). Default false (0).
     * This can naturally reduce collisions of rest notes with other notes.
     * Auto mode (2) only aligns rests when there are multiple voices in a measure,
     * and at least once at the same x-coordinate.
     * Auto is the recommended setting, and would be default,
     * if it couldn't in rare cases deteriorate rest placement for existing users.
     * The on mode (1) always aligns rests,
     * also changing their position when there is no simultaneous note at the same x-coordinate,
     * which is nonstandard.
     */
    alignRests?: AlignRestOption | number;
    /** Whether to automatically create beams for notes that don't have beams set in XML. */
    autoBeam?: boolean;
    /** Options for autoBeaming like whether to beam over rests. See AutoBeamOptions interface. */
    autoBeamOptions?: AutoBeamOptions;
    /** Automatically resize score with canvas size. Default is true. */
    autoResize?: boolean;
    /** Render Backend, will be SVG if given undefined, "SVG" or "svg", otherwise Canvas. */
    backend?: string;
    /** Defines the mode that is used for coloring: XML (0), Boomwhacker(1), CustomColorSet (2). Default XML.
     *  If coloringMode.CustomColorSet (2) is chosen, a coloringSetCustom parameter must be added.
     */
    coloringMode?: ColoringModes;
    /** Set of 8 colors for automatic coloring of 7 notes from C to B + rest note in HTML form (e.g. "#00ff00" for green).  */
    coloringSetCustom?: string[];
    /** Whether to enable coloring noteheads and stems, depending on coloringMode. */
    coloringEnabled?: boolean;
    /** Whether to color the stems of notes the same as their noteheads. Default false. */
    colorStemsLikeNoteheads?: boolean;
    /** Default color for a note head (without stem). Default black (undefined).
     * Only considered before loading a sample, not before render.
     * To change the color after loading a sample and before render, use note(.sourceNote).NoteheadColor.
     * The format is Vexflow format, either "#rrggbb" or "#rrggbboo" where <oo> is opacity (00 = transparent). All hex values.
     * E.g., a half-transparent red would be "#FF000080", invisible/transparent would be "#00000000" or "#12345600".
     */
    defaultColorNotehead?: string;
    /** Default color for a note stem. Default black (undefined). */
    defaultColorStem?: string;
    /** Default color for rests. Default black (undefined). */
    defaultColorRest?: string;
    /** Default color for Labels like title or lyrics. Default black (undefined). */
    defaultColorLabel?: string;
    /** Default color for labels in the title. Overrides defaultColorLabel for title labels like composer. Default black (undefined). */
    defaultColorTitle?: string;
    /** Default font used for text and labels, e.g. title or lyrics. Default Times New Roman
     * Note that OSMD originally always used Times New Roman,
     * so things like layout and spacing may still be optimized for it.
     * Valid options are CSS font families available in the browser used for rendering,
     * e.g. Times New Roman, Helvetica.
     */
    defaultFontFamily?: string;
    /** Default font style, e.g. FontStyles.Bold (1). Default Regular (0). */
    defaultFontStyle?: FontStyles;
    /** Don't show/load cursor. Will override disableCursor in drawingParameters. */
    disableCursor?: boolean;
    /** Follow Cursor: Scroll the page when cursor.next() is called and the cursor moves into a new system outside of the current view frame. */
    followCursor?: boolean;
    /** Broad Parameters like compact or preview mode.
     * Also try "compacttight", which is like compact but also reduces margins.
     * To see what this mode does and maybe adjust the spacing parameters yourself instead of using the mode,
     * see DrawingParameters.ts:setForCompactTightMode().
     */
    drawingParameters?: string | DrawingParametersEnum;
    /** Whether to draw credits (title, subtitle, composer, lyricist) (in future: copyright etc., see <credit>). */
    drawCredits?: boolean;
    /** Whether to draw the title of the piece. If false, disables drawing Subtitle as well. */
    drawTitle?: boolean;
    /** Whether to draw the subtitle of the piece. If true, enables drawing Title as well. */
    drawSubtitle?: boolean;
    /** Whether to draw the composer name (top right of the score). */
    drawComposer?: boolean;
    /** Whether to draw the lyricist's name, if given (top left of the score). */
    drawLyricist?: boolean;
    /** Whether to draw metronome marks. Default true. (currently OSMD can only draw one at the beginning) */
    drawMetronomeMarks?: boolean;
    /** Whether to draw part (instrument) names. Setting this to false also disables drawPartAbbreviations,
     *  unless explicitly enabled (drawPartNames: false, drawPartAbbreviations: true).
     */
    drawPartNames?: boolean;
    /** Whether to draw part (instrument) name abbreviations each system after the first. Only draws if drawPartNames. Default true. */
    drawPartAbbreviations?: boolean;
    /** Whether to draw measure numbers (labels). Default true.
     * Draws a measure number label at first measure, system start measure,
     * and every [measureNumberInterval] measures.
     * See the [measureNumberInterval] option, default is 2.
     */
    drawMeasureNumbers?: boolean;
    /** Whether to only draw measure numbers at the start of a system ("new line"), instead of every [measureNumberInterval] measures. Default false. */
    drawMeasureNumbersOnlyAtSystemStart?: boolean;
    /** Whether to draw time signatures (e.g. 4/4). Default true. */
    drawTimeSignatures?: boolean;
    /** The interval of measure numbers to draw, i.e. it draws the measure number above the beginning label every x measures. Default 2. */
    measureNumberInterval?: number;
    /** Whether to read measure numbers from the "number" attribute in the xml file as opposed to defaulting to start at measure 1. Default true. */
    useXMLMeasureNumbers?: boolean;
    /** Whether to draw fingerings (only left to the note for now). Default true (unless solo part). */
    drawFingerings?: boolean;
    /** Where to draw fingerings (left, right, above, below, or auto).
     * Default left. Auto, above, below experimental (potential collisions because bounding box not correct)
     */
    fingeringPosition?: string;
    /** For above/below fingerings, whether to draw them directly above/below notes (default), or above/below staffline. */
    fingeringInsideStafflines?: boolean;
    /** Whether to draw hidden/invisible notes (print-object="no" in XML). Default false. Not yet supported. */ // TODO
    drawHiddenNotes?: boolean;
    /** Whether to draw lyrics (and their extensions and dashes). */
    drawLyrics?: boolean;
    /** Whether to calculate extra slurs with bezier curves not covered by Vexflow slurs. Default true. */
    drawSlurs?: boolean;
    /** Only draw measure n to m, where m is the number specified. */
    drawUpToMeasureNumber?: number;
    /** Only draw the first n systems, where n is the number specified. */
    drawUpToSystemNumber?: number;
    /** Only draw the first n pages, where n is the number specified. */
    drawUpToPageNumber?: number;
    /** Only draw measure n to m, where n is the number you specify. */
    drawFromMeasureNumber?: number;
    /** Whether to fill measures that don't have notes given in the XML with whole rests (visible = 1, invisible = 2, for layouting). Default No (0). */
    fillEmptyMeasuresWithWholeRest?: FillEmptyMeasuresWithWholeRests | number;
    /** Whether to set the wanted stem direction by xml (default) or automatically. */
    setWantedStemDirectionByXml?: boolean;
    /** Whether tuplets are labeled with ratio (e.g. 5:2 instead of 5 for quintuplets). Default false. */
    tupletsRatioed?: boolean;
    /** Whether all tuplets should be bracketed (e.g. |--5--| instead of 5). Default false.
     * If false, only tuplets given as bracketed in XML (bracket="yes") will be bracketed.
     */
    tupletsBracketed?: boolean;
    /** Whether all triplets should be bracketed. Overrides tupletsBracketed for triplets.
     * If false, only triplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (Bracketing all triplets can be cluttering)
     */
    tripletsBracketed?: boolean;
    /** See OpenSheetMusicDisplay.PageFormatStandards for standard options like "A4 P" or "Endless".
     *  Default Endless.
     *  Uses OpenSheetMusicDisplay.StringToPageFormat().
     *  Unfortunately it would be error-prone to set a PageFormat type directly.
     */
    pageFormat?: string;
    /** A custom page/canvas background color. Default undefined/transparent.
     *  Example: "#FFFFFF" = white. "#12345600" = transparent.
     *  This can be useful when you want to export an image with e.g. white background color
     * instead of transparent, from a CanvasBackend.
     *  Note: Using a background color will prevent the cursor from being visible for now
     * (will be fixed at some point).
     */
    pageBackgroundColor?: string;
    /** This makes OSMD render on one single horizontal (staff-)line.
     * This option should be set before loading a score. It only starts working after load(),
     * calling setOptions() after load and then render() doesn't work in this case.
     */
    renderSingleHorizontalStaffline?: boolean;
    /** Whether to begin a new system ("line break") when given in XML ('new-system="yes"').
     *  Default false, because OSMD does its own layout that will do line breaks interactively
     *  at different measures. So this option may result in a system break after a single measure in a system.
     */
    newSystemFromXML?: boolean;
    /** Whether to begin a new page ("page break") when given in XML ('new-page="yes"').
     *  Default false, because OSMD does its own layout that will do page breaks interactively
     * (when given a PageFormat) at different measures.
     * So this option may result in a page break after a single measure on a page.
     */
    newPageFromXML?: boolean;
    /** A custom function that is executed when the xml is read, modifies it, and returns a new xml string that OSMD then parses. */
    onXMLRead?(xml: string): string;
    /** The cutoff number for rendering percussion clef stafflines as a single line. Default is 4.
     *  This is number of instruments specified, e.g. a drumset:
     *     <score-part id="P1">
     *       <part-name>Drumset</part-name>
     *       <part-abbreviation>D. Set</part-abbreviation>
     *       <score-instrument id="P1-I36">
     *           <instrument-name>Acoustic Bass Drum</instrument-name>
     *           </score-instrument>
     *       <score-instrument id="P1-I37">
     *           <instrument-name>Bass Drum 1</instrument-name>
     *           </score-instrument>
     *       <score-instrument id="P1-I38">
     *           <instrument-name>Side Stick</instrument-name>
     *           </score-instrument>
     *       <score-instrument id="P1-I39">
     *           <instrument-name>Acoustic Snare</instrument-name>
     *           </score-instrument>
     *           ...
     *   Would still render as 5 stafflines by default, since we have 4 (or greater) instruments in this part.
     *   While a snare:
     *   <score-part id="P2">
     *   <part-name>Concert Snare Drum</part-name>
     *   <part-abbreviation>Con. Sn.</part-abbreviation>
     *   <score-instrument id="P2-I38">
     *       <instrument-name>Side Stick</instrument-name>
     *       </score-instrument>
     *   <score-instrument id="P2-I39">
     *       <instrument-name>Acoustic Snare</instrument-name>
     *       </score-instrument>
     *       ...
     *   Would render with 1 line on the staff, since we only have 2 voices.
     *   If this value is 0, the feature is turned off.
     *   If this value is -1, it will render all percussion clefs as a single line.
     */
    percussionOneLineCutoff?: number;
    /** This property is only active if the above property is active (percussionOneLineCutoff)
     *  This is the cutoff for forcing all voices to the single line, instead of rendering them at different
     *  positions above/below the line.
     *  The default is 3, so if a part has less than voices, all of them will be rendered on the line.
     *  This is for cases like a Concert snare, which has multiple 'instruments' available (snare, side stick)
     *  should still render only on the line since there is no ambiguity.
     *  If this value is 0, the feature is turned off.
     *  IF this value is -1, it will render all percussion clef voices on the single line.
     */
    percussionForceVoicesOneLineCutoff?: number;
    /** The softmaxFactor for Vexflow's formatter. Default is 5, default in Vexflow is 100 (voice.js).
     *  Lowering this factor makes the spacing between individual notes smaller (especially from one half note to the next).
     *  So, to get more compact scores, try lowering this value (or set osmd.zoom, which simply scales),
     *  or try 100 for a more expansive layout.
     *  Setting this is the same as setting osmd.EngravingRules.SoftmaxFactorVexFlow.
     */
    spacingFactorSoftmax?: number;
    /**
     * Number in pixels, of spacing between multi-line labels
     */
    spacingBetweenTextLines?: number;
    /**
     * Set to true if the last system line should be streched across the whole page just as the other systems. Default is false
     */
    stretchLastSystemLine?: boolean;
    /**
     * Set to true if subsequent measures full of rests should be auto-converted to multi-rest measure. Default is true
     * This works across instruments- If all instruments have subsequent measures with nothing but rests, multirest measures are generated
     */
    autoGenerateMutipleRestMeasuresFromRestMeasures?: boolean;
}

export enum AlignRestOption {
    Never = 0, // false should also work
    Always = 1, // true should also work
    Auto = 2
}

export enum FillEmptyMeasuresWithWholeRests {
    No = 0,
    YesVisible = 1,
    YesInvisible = 2 // fill with invisible whole rests
}

export enum BackendType {
    SVG = 0,
    Canvas = 1
}

/** Handles [[IOSMDOptions]], e.g. returning default options with OSMDOptionsStandard() */
export class OSMDOptions {
    /** Returns the default options for OSMD.
     * These are e.g. used if no options are given in the [[OpenSheetMusicDisplay]] constructor.
     */
    public static OSMDOptionsStandard(): IOSMDOptions {
        return {
            autoResize: true,
            backend: "svg",
            drawingParameters: DrawingParametersEnum.default,
        };
    }

    public static BackendTypeFromString(value: string): BackendType {
        if (value && value.toLowerCase() === "canvas") {
            return BackendType.Canvas;
        } else {
            return BackendType.SVG;
        }
    }
}

export interface AutoBeamOptions {
    /** Whether to extend beams over rests. Default false. */
    beam_rests?: boolean;
    /** Whether to extend beams only over rests that are in the middle of a potential beam. Default false. */
    beam_middle_rests_only?: boolean;
    /** Whether to maintain stem direction of autoBeamed notes. Discouraged, reduces beams. Default false. */
    maintain_stem_directions?: boolean;
    /** Groups of notes (fractions) to beam within a measure.
     * List of fractions, each fraction being [nominator, denominator].
     * E.g. [[3,4],[1,4]] will beam the first 3 quarters of a measure, then the last quarter.
     */
    groups?: [number[]];
}

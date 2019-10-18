import { DrawingParametersEnum, ColoringModes } from "../MusicalScore/Graphical/DrawingParameters";

/** Possible options for the OpenSheetMusicDisplay constructor and osmd.setOptions(). None are mandatory.
 *  Note that after using setOptions(), you have to call osmd.render() again to make changes visible.
 *  Example: osmd.setOptions({defaultColorRest: "#AAAAAA", drawSubtitle: false}); osmd.render();
 */
export interface IOSMDOptions {
    /** Whether to automatically create beams for notes that don't have beams set in XML. */
    autoBeam?: boolean;
    /** Options for autoBeaming like whether to beam over rests. See AutoBeamOptions interface. */
    autoBeamOptions?: AutoBeamOptions;
    /** Automatically resize score with canvas size. Default is true. */
    autoResize?: boolean;
    /** Render Backend, will be SVG if given undefined, SVG or svg, otherwise Canvas. */
    backend?: string;
    /** Defines the mode that is used for coloring: XML (0), Boomwhacker(1), CustomColorSet (2). Default XML.
     *  If coloringMode.CustomColorSet (2) is chosen, a coloringSetCustom parameter must be added.
     */
    coloringMode?: ColoringModes;
    /** Set of 8 colors for automatic coloring of 7 notes from C to B + rest note in HTML form (e.g. "#00ff00" for green).  */
    coloringSetCustom?: string[];
    /** Whether to enable coloring noteheads and stems, depending on coloringMode. */
    coloringEnabled?: boolean;
    /** Whether to color the stems of notes the same as their noteheads */
    colorStemsLikeNoteheads?: boolean;
    /** Default color for a note head (without stem). Default black (undefined). */
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
     * Note that OSMD originally always used Times New Roman, so things like layout and spacing may still be optimized for it.
     * Valid options are CSS font families available in the browser used for rendering, e.g. Times New Roman, Helvetica.
     */
    defaultFontFamily?: string;
    /** Don't show/load cursor. Will override disableCursor in drawingParameters. */
    disableCursor?: boolean;
    /** Follow Cursor */
    followCursor?: boolean;
    /** Broad Parameters like compact or preview mode. */
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
    /** Whether to draw part (instrument) names. */
    drawPartNames?: boolean;
    /** Whether to draw part (instrument) name abbreviations each system after the first. Only draws if drawPartNames. Default true. */
    drawPartAbbreviations?: boolean;
    /** Whether to draw fingerings (only left to the note for now). Default true (unless solo part). */
    drawFingerings?: boolean;
    /** Whether to draw measure numbers (labels) (default true).
     * Draws a measure number label at first measure, system start measure, and every [measureNumberInterval] measures.
     * See the [measureNumberInterval] option, default is 2.
     */
    drawMeasureNumbers?: boolean;
    /** Where to draw fingerings (left, right, above, below, auto).
     * Default left. Auto, above, below experimental (potential collisions because bounding box not correct)
     */
    fingeringPosition?: string;
    /** For above/below fingerings, whether to draw them directly above/below notes (default), or above/below staffline. */
    fingeringInsideStafflines?: boolean;
    /** Only draw measure n to m, where m is the number you specify. */
    drawUpToMeasureNumber?: number;
    /** Only draw measure n to m, where n is the number you specify. */
    drawFromMeasureNumber?: number;
    /** The interval of measure numbers to draw, i.e. it draws the measure number above the beginning label every x measures. Default 2. */
    measureNumberInterval?: number;
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
    /** Whether to draw hidden/invisible notes (print-object="no" in XML). Default false. Not yet supported. */ // TODO
    drawHiddenNotes?: boolean;
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

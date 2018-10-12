import { DrawingParametersEnum } from "../MusicalScore/Graphical/DrawingParameters";

/** Possible options for the OpenSheetMusicDisplay constructor, none are mandatory. */
export interface IOSMDOptions {
    /** Not yet supported. Will always beam automatically. */ // TODO
    autoBeam?: boolean;
    /** Automatically resize score with canvas size. Default is true. */
    autoResize?: boolean;
    /** Not yet supported. Will always place stems automatically. */ // TODO
    autoStem?: boolean;
    /** Render Backend, will be SVG if given undefined, SVG or svg, otherwise Canvas. */
    backend?: string;
    /** Don't show/load cursor. Will override disableCursor in drawingParameters. */
    disableCursor?: boolean;
    /** Broad Parameters like compact or preview mode. */
    drawingParameters?: string | DrawingParametersEnum;
    /** Whether to draw the title of the piece. If false, disables drawing Subtitle as well. */
    drawTitle?: boolean;
    /** Whether to draw the subtitle of the piece. If true, enables drawing Title as well. */
    drawSubtitle?: boolean;
    /** Whether to draw credits (title, composer, arranger, copyright etc., see <credit>. Not yet supported. */ // TODO
    drawCredits?: boolean;
    /** Whether to draw the lyricist's name, if given. */
    drawLyricist?: boolean;
    /** Whether to draw part (instrument) names. */
    drawPartNames?: boolean;
    /** Whether to draw fingerings (only left to the note for now). Default true. */
    drawFingerings?: boolean;
    /** Where to draw fingerings (left, right, above, below, auto).
     * Default left. Auto, above, below experimental (potential collisions because bounding box not correct)
     */
    fingeringPosition?: string;
    /** For above/below fingerings, whether to draw them directly above/below notes (default), or above/below staffline. */
    fingeringInsideStafflines?: boolean;
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
    /** Default color for a note head (without stem). Default black. Not yet supported. */ // TODO
    defaultColorNoteHead?: string;
    /** Default color for a note stem. Default black. Not yet supported. */ // TODO
    defaultColorStem?: string;
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

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
    /** Whether to draw hidden/invisible notes (print-object="no" in XML). Default false. Not yet supported. */ // TODO
    drawHiddenNotes?: boolean;
    /** Default color for a note head (without stem). Default black. Not yet supported. */ // TODO
    defaultColorNoteHead?: string;
    /** Default color for a note stem. Default black. Not yet supported. */ // TODO
    defaultColorStem?: string;
    /** Whether to draw the title of the piece. */
    drawTitle?: boolean;
    /** Whether to draw credits (title, composer, arranger, copyright etc., see <credit>. */
    drawCredits?: boolean;
    /** Whether to draw part (instrument) names. */
    drawPartNames?: boolean;
    /** Whether to draw the lyricist's name, if given. */
    drawLyricist?: boolean;
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

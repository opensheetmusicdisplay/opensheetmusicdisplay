import { DrawingParametersEnum } from "../MusicalScore/Graphical/DrawingParameters";

/** Possible options for the OpenSheetMusicDisplay constructor, none are mandatory. */
export interface IOSMDOptions {
    /** Not yet supported. Will always beam automatically. */
    autoBeam?: boolean;
    /** Automatically resize score with canvas size. Default is true. */
    autoResize?: boolean;
    /** Not yet supported. Will always place stems automatically. */
    autoStem?: boolean;
    /** Render Backend, will be SVG if given undefined, SVG or svg, otherwise Canvas. */
    backend?: string;
    /** Don't show/load cursor. Will override disableCursor in drawingParameters. */
    disableCursor?: boolean;
    /** Parameters like drawing a Leadsheet or (Thumbnail) Preview, disabling Cursor. */
    drawingParameters?: string | DrawingParametersEnum;
}

/** Handles [[IOSMDOptions]], e.g. returning default options with OSMDOptionsStandard() */
export class OSMDOptions {
    /** Returns the default options for OSMD used if no options are given in the constructor. */
    public static OSMDOptionsStandard(): IOSMDOptions {
        return {
            autoResize: true,
            backend: "svg",
            drawingParameters: DrawingParametersEnum.Default,
        };
    }
}

import { DrawingParametersEnum } from "../MusicalScore/Graphical/DrawingParameters";

/** Possible options for the OpenSheetMusicDisplay constructor, none are mandatory. */
export interface IOSMDOptions {
    autoBeam?: boolean; // not yet supported. will always autoBeam.
    autoResize?: boolean; // default is true
    autoStem?: boolean; // not yet supported. will always autoStem
    backend?: string; // Backend will be SVG if backend.toLowerCase === "svg", otherwise Canvas
    disableCursor?: boolean; // will override this part of drawingParameters
    drawingParametersEnum?: DrawingParametersEnum; // alternative to using the enum. only need to set one of these.
    drawingParametersString?: string; // alternative to using the enum. only need to set one of these.
    // drawingParameters?: DrawingParametersEnum | string; // alternative to using the enum. only need to set one of these.
}

/** Handles [[IOSMDOptions]], e.g. returning default options with OSMDOptionsStandard() */
export class OSMDOptions {
    /** Returns the default options for OSMD used if no options are given in the constructor. */
    public static OSMDOptionsStandard(): IOSMDOptions {
        return {
            autoResize: true,
            backend: "svg",
            drawingParametersEnum: DrawingParametersEnum.Default,
        };
    }
}
